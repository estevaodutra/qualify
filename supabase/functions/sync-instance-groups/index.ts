import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchZApi } from "../_shared/n8n-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Universal group objects extractor to handle all WAHA / Z-API / Evolution / Baileys response formats.
 * Traverses nested structures and handles dictionary formats where group objects are keyed by group JID:
 * [ { "120363412175102479@g.us": { id: "120363412175102479@g.us", subject: "GRUPO TESTE", ... }, ... } ]
 */
function extractGroupObjects(rawJson: any): any[] {
  if (!rawJson) return [];

  const foundObjects: any[] = [];

  function walk(node: any) {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }

    if (typeof node === "object" && node !== null) {
      // Check n8n wrappers like { body: ... } or { json: ... } or { data: ... }
      if (node.body) walk(node.body);
      if (node.json) walk(node.json);
      if (node.data && Array.isArray(node.data)) walk(node.data);
      if (node.groups && Array.isArray(node.groups)) walk(node.groups);
      if (node.chats && Array.isArray(node.chats)) walk(node.chats);
      if (node.result && Array.isArray(node.result)) walk(node.result);

      // Check if node itself is a single group object
      const directId = node.id || node.jid || node.groupJid || node.group_jid;
      if (directId && (String(directId).includes("@g.us") || String(directId).startsWith("1203") || node.subject || node.name)) {
        foundObjects.push(node);
        return;
      }

      // Check key-value pairs (WAHA dict format where keys are JIDs "120363412175102479@g.us")
      for (const [key, val] of Object.entries(node)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const subObj = { ...(val as any) };
          const isJidKey = key.includes("@g.us") || key.startsWith("1203");
          if (isJidKey || subObj.id || subObj.subject || subObj.name || subObj.participants) {
            if (!subObj.id && isJidKey) {
              subObj.id = key;
            }
            if (subObj.id || subObj.subject || subObj.name || isJidKey) {
              foundObjects.push(subObj);
            }
          }
        }
      }
    }
  }

  walk(rawJson);

  // Deduplicate by JID / ID
  const map = new Map<string, any>();
  for (const item of foundObjects) {
    const jid = item.id || item.jid || item.groupJid || item.phone;
    if (jid) {
      const key = String(jid).includes("@") ? String(jid) : `${String(jid).replace(/\D/g, "")}@g.us`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values());
}

async function upsertGroup(supabase: any, groupData: any): Promise<boolean> {
  const { error: err1 } = await supabase
    .from("whatsapp_groups" as any)
    .upsert(groupData, { onConflict: "company_id,group_jid" });

  if (!err1) return true;

  const { error: err2 } = await supabase
    .from("whatsapp_groups" as any)
    .upsert(groupData, { onConflict: "group_jid" });

  if (!err2) return true;

  const { data: existing } = await supabase
    .from("whatsapp_groups" as any)
    .select("id")
    .eq("company_id", groupData.company_id)
    .eq("group_jid", groupData.group_jid)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("whatsapp_groups" as any)
      .update(groupData)
      .eq("id", existing.id);
    return !error;
  } else {
    const { error } = await supabase
      .from("whatsapp_groups" as any)
      .insert(groupData);
    return !error;
  }
}

async function upsertConversation(supabase: any, convData: any): Promise<boolean> {
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("company_id", convData.company_id)
    .eq("contact_name", convData.contact_name)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("chat_conversations")
      .update({
        instance_id: convData.instance_id,
        last_message_at: convData.last_message_at,
        updated_at: convData.updated_at,
      })
      .eq("id", existing.id);
    return !error;
  } else {
    const { error } = await supabase
      .from("chat_conversations")
      .insert(convData);
    return !error;
  }
}

async function upsertGroupCampaign(supabase: any, gcData: any): Promise<boolean> {
  const { data: existing } = await supabase
    .from("group_campaigns")
    .select("id")
    .eq("company_id", gcData.company_id)
    .eq("group_jid", gcData.group_jid)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("group_campaigns")
      .update({
        instance_id: gcData.instance_id,
        group_name: gcData.group_name,
        name: gcData.name,
        group_description: gcData.group_description,
        updated_at: gcData.updated_at,
      })
      .eq("id", existing.id);
    return !error;
  } else {
    const { error } = await supabase
      .from("group_campaigns")
      .insert(gcData);
    return !error;
  }
}

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
        rawResponseSnippet = JSON.stringify(json).slice(0, 500);
        rawChats = extractGroupObjects(json);
      }
    } catch (e: any) {
      console.warn(`[sync-instance-groups] Provider API error:`, e.message);
    }

    // Fallback GET /chats if group.list returned 0 items
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
          rawChats = extractGroupObjects(jsonF);
        }
      } catch (e: any) {
        console.warn(`[sync-instance-groups] Fallback GET /chats error:`, e.message);
      }
    }

    console.log(`[sync-instance-groups] Extracted ${rawChats.length} group objects from response`);

    let syncedCount = 0;
    const upsertedJids = new Set<string>();

    // 3. Process each group object
    for (const chat of rawChats) {
      const jid = chat.id || chat.phone || chat.jid || chat.groupJid || chat.group_jid || chat.chatId;
      const subject = chat.subject || chat.name || chat.groupName || chat.group_name || chat.title;

      let groupJid = jid ? String(jid) : "";
      if (!groupJid && subject) continue;
      if (!groupJid.includes("@")) {
        groupJid = `${groupJid.replace(/\D/g, "")}@g.us`;
      }

      if (!groupJid.includes("@g.us") && !groupJid.startsWith("1203")) continue;

      const finalName = subject || groupJid.split("@")[0] || "Grupo WhatsApp";
      const participants = Array.isArray(chat.participants) ? chat.participants : [];
      const participantsCount = chat.size || chat.participantsCount || (participants.length > 0 ? participants.length : 0);

      // Upsert into whatsapp_groups
      const gOk = await upsertGroup(supabase, {
        company_id: companyId,
        user_id: instance.user_id,
        instance_id: instance.id,
        group_jid: groupJid,
        name: finalName,
        description: chat.desc || chat.description || null,
        picture_url: chat.pictureUrl || chat.profilePictureUrl || chat.picture_url || chat.photo || null,
        participants_count: participantsCount,
        updated_at: new Date().toISOString(),
      });

      // Upsert into chat_conversations
      const cOk = await upsertConversation(supabase, {
        company_id: companyId,
        user_id: instance.user_id,
        instance_id: instance.id,
        contact_name: groupJid,
        contact_phone: groupJid,
        status: "open",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Upsert into group_campaigns
      await upsertGroupCampaign(supabase, {
        company_id: companyId,
        user_id: instance.user_id,
        instance_id: instance.id,
        group_jid: groupJid,
        group_name: finalName,
        name: finalName,
        group_description: chat.desc || chat.description || null,
        status: "active",
        updated_at: new Date().toISOString(),
      });

      // Sync members into group_members if present
      if (participants.length > 0) {
        for (const p of participants) {
          const rawPhone = p.phoneNumber || p.phone || p.id || "";
          const cleanPhone = String(rawPhone).replace(/\D/g, "");
          if (cleanPhone) {
            const isAdmin = p.admin === "admin" || p.admin === "superadmin" || p.isAdmin === true;
            await supabase.from("group_members").upsert(
              {
                user_id: instance.user_id,
                group_jid: groupJid,
                phone: cleanPhone,
                role: isAdmin ? "admin" : "member",
                is_admin: isAdmin,
                name: p.name || p.pushName || null,
              },
              { onConflict: "user_id,group_jid,phone" }
            ).catch(() => {});
          }
        }
      }

      if (gOk || cOk) {
        syncedCount++;
        upsertedJids.add(groupJid);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        instanceId: instance.id,
        instanceName: instance.name,
        syncedCount,
        totalExtracted: rawChats.length,
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
