import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendWhatsAppMessage, StandardizedPayload } from "../_shared/whatsapp-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate Authentication JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request body
    const { conversationId, body, mediaUrl, mediaType, isInternal = false } = await req.json();

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: conversationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch conversation and check permissions (company membership)
    const { data: conv, error: convErr } = await adminClient
      .from("chat_conversations")
      .select("id, company_id, lead_id, instance_id")
      .eq("id", conversationId)
      .single();

    if (convErr || !conv) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user is active in the conversation's company
    let hasAccess = false;
    const { data: membership, error: memberErr } = await adminClient
      .from("company_members")
      .select("id")
      .eq("company_id", conv.company_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      hasAccess = true;
    } else {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("is_superadmin")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.is_superadmin) hasAccess = true;
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Forbidden: user is not an active member of this company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Handle internal note (database-only insert)
    if (isInternal) {
      const { data: noteMsg, error: noteErr } = await adminClient
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          sender_type: "operator",
          sender_id: user.id,
          message_type: mediaUrl ? (mediaType || "image") : "text",
          body,
          media_url: mediaUrl || null,
          media_type: mediaType || null,
          is_internal: true,
          status: "read",
        })
        .select()
        .single();

      if (noteErr) {
        throw new Error(`Failed to insert internal note: ${noteErr.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: noteMsg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Handle WhatsApp send (Outbound Message)
    // Fetch instance details
    const { data: inst, error: instErr } = await adminClient
      .from("instances")
      .select("id, name, phone, provider, external_instance_id, external_instance_token")
      .eq("id", conv.instance_id)
      .single();

    if (instErr || !inst?.external_instance_id || !inst?.external_instance_token) {
      return new Response(
        JSON.stringify({ error: "Instance configuration or credentials not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch lead details
    const { data: lead, error: leadErr } = await adminClient
      .from("leads")
      .select("id, phone, name")
      .eq("id", conv.lead_id)
      .single();

    if (leadErr || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead details not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine target WhatsApp action and construct node config
    let action = "message.send_text";
    const nodeConfig: Record<string, any> = {};

    if (mediaUrl) {
      action = "message.send_media";
      nodeConfig.url = mediaUrl;
      nodeConfig.mediaType = mediaType || "image";
      nodeConfig.caption = body || "";
    } else {
      nodeConfig.text = body || "";
    }

    // Map standardized payload structure expected by whatsapp-client
    const payload: StandardizedPayload = {
      action,
      node: {
        id: "chat-crm-node",
        type: mediaUrl ? "media" : "text",
        order: 1,
        config: nodeConfig,
      },
      campaign: {
        id: "chat-crm-direct",
        name: "CRM Chat Outbox",
      },
      instance: {
        id: inst.id,
        name: inst.name,
        phone: inst.phone,
        provider: inst.provider,
        externalId: inst.external_instance_id,
        externalToken: inst.external_instance_token,
      },
      destination: {
        phone: lead.phone,
        jid: lead.phone.includes("@") ? lead.phone : `${lead.phone}@s.whatsapp.net`,
        name: lead.name || "",
      },
    };

    // Trigger Z-API dispatch
    const zapiResult = await sendWhatsAppMessage(payload);

    if (!zapiResult.ok) {
      console.error("[chat-send-message] Z-API dispatch failed:", zapiResult.details);
      return new Response(
        JSON.stringify({ error: "Failed to dispatch message to WhatsApp via Z-API", details: zapiResult.details }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Record outbound message in DB on successful send
    const { data: outboundMsg, error: outErr } = await adminClient
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "operator",
        sender_id: user.id,
        message_type: mediaUrl ? (mediaType || "image") : "text",
        body,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        is_internal: false,
        status: "sent",
        zaap_id: zapiResult.zaapId || null,
        message_id: zapiResult.messageId || null,
      })
      .select()
      .single();

    if (outErr) {
      throw new Error(`Failed to persist sent message to database: ${outErr.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: outboundMsg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[chat-send-message] Error processing send:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
