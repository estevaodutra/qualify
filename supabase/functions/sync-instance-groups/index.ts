import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchZApi } from "../_shared/n8n-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    const { instanceId, companyId: reqCompanyId } = await req.json();

    if (!instanceId) {
      return new Response(
        JSON.stringify({ success: false, error: "instanceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch instance details
    const { data: instance, error: instErr } = await supabase
      .from("instances")
      .select("id, user_id, company_id, name, phone, external_instance_id, external_instance_token, provider")
      .eq("id", instanceId)
      .maybeSingle();

    if (instErr || !instance) {
      return new Response(
        JSON.stringify({ success: false, error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve company_id
    let companyId: string | null = reqCompanyId || (instance as any).company_id || null;

    if (!companyId) {
      const targetUserId = userId || instance.user_id;
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", targetUserId)
        .limit(1)
        .maybeSingle();

      if (company?.id) {
        companyId = company.id;
      } else {
        const { data: member } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", targetUserId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (member?.company_id) companyId = member.company_id;
      }
    }

    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Company not found for user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-instance-groups] Executing action group.list for instance ${instance.name} (${instance.id}) company ${companyId}`);

    let rawChats: any[] = [];
    let providerStatus = 0;
    let rawResponseSnippet = "";

    // 2. Execute action "group.list" via fetchZApi / n8n-router
    try {
      const resp = await fetchZApi(
        instance.external_instance_id,
        instance.external_instance_token,
        "/group/list",
        "POST",
        {
          action: "group.list",
          instanceId: instance.id,
          external_instance_id: instance.external_instance_id,
        },
        { "Content-Type": "application/json" },
        instance.id,
        true
      );

      providerStatus = resp.status;

      if (resp.ok) {
        const json = await resp.json();
        rawResponseSnippet = JSON.stringify(json).slice(0, 300);

        if (Array.isArray(json)) {
          if (json.length > 0 && Array.isArray(json[0].groups)) rawChats = json[0].groups;
          else if (json.length > 0 && Array.isArray(json[0].data)) rawChats = json[0].data;
          else if (json.length > 0 && Array.isArray(json[0].chats)) rawChats = json[0].chats;
          else rawChats = json;
        } else if (typeof json === "object" && json !== null) {
          rawChats = json.groups || json.data || json.chats || json.result || json.items || json.response || [];
        }
      }
    } catch (e: any) {
      console.warn(`[sync-instance-groups] Provider API error:`, e.message);
    }

    // Fallback: try GET /chats or GET /groups if group.list returned empty
    if (rawChats.length === 0) {
      try {
        const respFallback = await fetchZApi(
          instance.external_instance_id,
          instance.external_instance_token,
          "/chats",
          "GET",
          null,
          {},
          instance.id,
          true
        );

        if (respFallback.ok) {
          const jsonF = await respFallback.json();
          if (Array.isArray(jsonF)) rawChats = jsonF;
          else if (typeof jsonF === "object" && jsonF !== null) {
            rawChats = jsonF.chats || jsonF.data || jsonF.groups || jsonF.result || [];
          }
        }
      } catch (e: any) {
        console.warn(`[sync-instance-groups] Fallback GET /chats error:`, e.message);
      }
    }

    let syncedCount = 0;
    const upsertedJids = new Set<string>();

    // 3. Process provider chats and populate whatsapp_groups, chat_conversations, and group_campaigns
    for (const chat of rawChats) {
      const jid = chat.id || chat.phone || chat.jid || chat.groupJid || chat.group_jid || chat.chatId;
      if (!jid) continue;

      const strJid = String(jid);
      const isGroup = strJid.includes("@g.us") || chat.isGroup || chat.is_group;

      if (!isGroup) continue;

      const groupJid = strJid.includes("@") ? strJid : `${strJid.replace(/\D/g, "")}@g.us`;
      const name = chat.name || chat.subject || chat.groupName || chat.group_name || chat.title || groupJid.split("@")[0];

      // Upsert into whatsapp_groups
      const { error: upsertGroupErr } = await supabase
        .from("whatsapp_groups" as any)
        .upsert(
          {
            company_id: companyId,
            user_id: instance.user_id,
            instance_id: instance.id,
            group_jid: groupJid,
            name: name || "Grupo WhatsApp",
            description: chat.description || chat.desc || null,
            picture_url: chat.pictureUrl || chat.profilePictureUrl || chat.picture_url || chat.photo || null,
            participants_count: Array.isArray(chat.participants) ? chat.participants.length : (chat.participants_count || 0),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,group_jid" }
        );

      // ALSO Upsert into chat_conversations
      const { error: upsertConvErr } = await supabase
        .from("chat_conversations")
        .upsert(
          {
            company_id: companyId,
            user_id: instance.user_id,
            instance_id: instance.id,
            contact_name: groupJid,
            contact_phone: groupJid,
            status: "open",
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,instance_id,contact_name" }
        );

      // ALSO Upsert into group_campaigns
      await supabase
        .from("group_campaigns")
        .upsert(
          {
            company_id: companyId,
            user_id: instance.user_id,
            instance_id: instance.id,
            group_jid: groupJid,
            group_name: name || "Grupo WhatsApp",
            name: name || "Grupo WhatsApp",
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,group_jid" }
        ).catch(() => {});

      if (!upsertGroupErr || !upsertConvErr) {
        syncedCount++;
        upsertedJids.add(groupJid);
      }
    }

    // 4. Fallback: Check local chat_conversations for existing groups and sync to whatsapp_groups
    const { data: dbConvs } = await supabase
      .from("chat_conversations")
      .select("id, contact_name, instance_id, user_id, updated_at")
      .eq("company_id", companyId)
      .eq("instance_id", instance.id);

    if (dbConvs) {
      for (const conv of dbConvs) {
        const contactName = conv.contact_name || "";
        if (contactName.includes("@g.us") || contactName.toLowerCase().includes("grupo")) {
          const groupJid = contactName.includes("@g.us") ? contactName : `${conv.id}@g.us`;
          if (!upsertedJids.has(groupJid)) {
            await supabase.from("whatsapp_groups" as any).upsert(
              {
                company_id: companyId,
                user_id: instance.user_id,
                instance_id: instance.id,
                group_jid: groupJid,
                name: contactName.split("@")[0] || "Grupo WhatsApp",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "company_id,group_jid" }
            );
            syncedCount++;
            upsertedJids.add(groupJid);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        instanceId: instance.id,
        instanceName: instance.name,
        syncedCount,
        totalRawChatsFound: rawChats.length,
        providerStatus,
        snippet: rawResponseSnippet,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[sync-instance-groups] Internal Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
