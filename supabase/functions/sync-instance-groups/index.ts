import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchZApi } from "../_shared/n8n-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.replace(/\u0000/g, "").trim();
  return clean || null;
}

function sanitizeTextNoSurrogates(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.replace(/\u0000/g, "").replace(/[\uD800-\uDFFF]/g, "").trim();
  return clean || null;
}

/**
 * Universal group objects extractor to handle all WAHA / Z-API / Evolution / Baileys response formats.
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
      if (node.body) walk(node.body);
      if (node.json) walk(node.json);
      if (node.data && Array.isArray(node.data)) walk(node.data);
      if (node.groups && Array.isArray(node.groups)) walk(node.groups);
      if (node.chats && Array.isArray(node.chats)) walk(node.chats);
      if (node.result && Array.isArray(node.result)) walk(node.result);

      const directId = node.id || node.jid || node.groupJid || node.group_jid;
      if (directId && (String(directId).includes("@g.us") || String(directId).startsWith("1203") || node.subject || node.name)) {
        foundObjects.push(node);
        return;
      }

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

async function upsertGroup(supabase: any, groupData: any): Promise<{ success: boolean; error?: string }> {
  const cleanData = {
    ...groupData,
    name: sanitizeText(groupData.name) || "Grupo WhatsApp",
    description: sanitizeText(groupData.description),
  };

  const { error: err1 } = await supabase
    .from("whatsapp_groups" as any)
    .upsert(cleanData, { onConflict: "company_id,group_jid" });

  if (!err1) return { success: true };

  const safeData = {
    ...groupData,
    name: sanitizeTextNoSurrogates(groupData.name) || "Grupo WhatsApp",
    description: sanitizeTextNoSurrogates(groupData.description),
  };

  const { error: err2 } = await supabase
    .from("whatsapp_groups" as any)
    .upsert(safeData, { onConflict: "company_id,group_jid" });

  if (!err2) return { success: true };

  const { data: existing } = await supabase
    .from("whatsapp_groups" as any)
    .select("id")
    .eq("company_id", groupData.company_id)
    .eq("group_jid", groupData.group_jid)
    .maybeSingle();

  if (existing) {
    const { error: err3 } = await supabase
      .from("whatsapp_groups" as any)
      .update(safeData)
      .eq("id", existing.id);
    return err3 ? { success: false, error: err3.message } : { success: true };
  } else {
    const { error: err4 } = await supabase
      .from("whatsapp_groups" as any)
      .insert(safeData);
    return err4 ? { success: false, error: err4.message } : { success: true };
  }
}

async function upsertConversation(supabase: any, convData: any): Promise<{ success: boolean; error?: string }> {
  const cleanData = {
    ...convData,
    contact_name: sanitizeText(convData.contact_name) || convData.contact_phone,
  };

  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("company_id", convData.company_id)
    .eq("contact_name", cleanData.contact_name)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("chat_conversations")
      .update({
        instance_id: cleanData.instance_id,
        user_id: cleanData.user_id,
        last_message_at: cleanData.last_message_at,
        updated_at: cleanData.updated_at,
      })
      .eq("id", existing.id);
    return error ? { success: false, error: error.message } : { success: true };
  } else {
    const { error } = await supabase
      .from("chat_conversations")
      .insert(cleanData);

    if (error) {
      cleanData.contact_name = sanitizeTextNoSurrogates(convData.contact_name) || convData.contact_phone;
      const { error: errRetry } = await supabase.from("chat_conversations").insert(cleanData);
      return errRetry ? { success: false, error: errRetry.message } : { success: true };
    }
    return { success: true };
  }
}

async function upsertGroupCampaign(supabase: any, gcData: any): Promise<{ success: boolean; error?: string }> {
  const cleanData = {
    ...gcData,
    group_name: sanitizeText(gcData.group_name) || "Grupo WhatsApp",
    name: sanitizeText(gcData.name) || "Grupo WhatsApp",
    group_description: sanitizeText(gcData.group_description),
  };

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
        instance_id: cleanData.instance_id,
        user_id: cleanData.user_id,
        group_name: cleanData.group_name,
        name: cleanData.name,
        group_description: cleanData.group_description,
        updated_at: cleanData.updated_at,
      })
      .eq("id", existing.id);
    return error ? { success: false, error: error.message } : { success: true };
  } else {
    const { error } = await supabase
      .from("group_campaigns")
      .insert(cleanData);

    if (error) {
      cleanData.group_name = sanitizeTextNoSurrogates(gcData.group_name) || "Grupo WhatsApp";
      cleanData.name = sanitizeTextNoSurrogates(gcData.name) || "Grupo WhatsApp";
      cleanData.group_description = sanitizeTextNoSurrogates(gcData.group_description);
      const { error: errRetry } = await supabase.from("group_campaigns").insert(cleanData);
      return errRetry ? { success: false, error: errRetry.message } : { success: true };
    }
    return { success: true };
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

    const { instanceId, companyId: reqCompanyId, userId: reqUserId, fetchOnly, groups: inputGroups, selectedJids } = await req.json();

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
      const targetUserId = reqUserId || userId || instance.user_id;
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

    // Resolve targetUserId guaranteed non-null
    let targetUserId: string | null = reqUserId || userId || instance.user_id || null;

    if (!targetUserId && companyId) {
      const { data: comp } = await supabase.from("companies").select("owner_id").eq("id", companyId).maybeSingle();
      if (comp?.owner_id) targetUserId = comp.owner_id;
    }

    if (!targetUserId) {
      const { data: cm } = await supabase.from("company_members").select("user_id").eq("company_id", companyId).limit(1).maybeSingle();
      if (cm?.user_id) targetUserId = cm.user_id;
    }

    console.log(`[sync-instance-groups] Target User ID: ${targetUserId}, Company ID: ${companyId}`);

    let targetGroups: any[] = [];

    // If frontend passed selected groups directly in request payload, use them!
    if (Array.isArray(inputGroups) && inputGroups.length > 0) {
      console.log(`[sync-instance-groups] Received ${inputGroups.length} selected group objects directly from frontend`);
      targetGroups = inputGroups;
    } else {
      // Otherwise fetch from provider via action group.list
      console.log(`[sync-instance-groups] Fetching groups from provider for instance ${instance.name}`);
      let rawChats: any[] = [];

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

        if (resp.ok) {
          const json = await resp.json();
          rawChats = extractGroupObjects(json);
        }
      } catch (e: any) {
        console.warn(`[sync-instance-groups] Provider API error:`, e.message);
      }

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

      const formattedGroups = rawChats.map((chat) => {
        const jid = chat.id || chat.phone || chat.jid || chat.groupJid || chat.group_jid || chat.chatId;
        const subject = chat.subject || chat.name || chat.groupName || chat.group_name || chat.title;

        let groupJid = jid ? String(jid) : "";
        if (!groupJid && subject) groupJid = `${subject}@g.us`;
        if (!groupJid.includes("@")) groupJid = `${groupJid.replace(/\D/g, "")}@g.us`;

        const participants = Array.isArray(chat.participants) ? chat.participants : [];
        const participantsCount = chat.size || chat.participantsCount || (participants.length > 0 ? participants.length : 0);

        return {
          groupJid,
          name: subject || groupJid.split("@")[0] || "Grupo WhatsApp",
          description: chat.desc || chat.description || null,
          pictureUrl: chat.pictureUrl || chat.profilePictureUrl || chat.picture_url || chat.photo || null,
          participantsCount,
          participants,
        };
      }).filter((g) => g.groupJid.includes("@g.us") || g.groupJid.startsWith("1203"));

      if (fetchOnly) {
        return new Response(
          JSON.stringify({
            success: true,
            instanceId: instance.id,
            instanceName: instance.name,
            groups: formattedGroups,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const selectedSet = Array.isArray(selectedJids) && selectedJids.length > 0 ? new Set(selectedJids) : null;
      targetGroups = selectedSet
        ? formattedGroups.filter((g) => selectedSet.has(g.groupJid))
        : formattedGroups;
    }

    let syncedCount = 0;
    const errorsList: string[] = [];

    // Process and upsert each selected group
    for (const group of targetGroups) {
      const groupJid = group.groupJid || group.id || group.jid;
      if (!groupJid) continue;

      const finalName = group.name || group.subject || groupJid.split("@")[0] || "Grupo WhatsApp";
      const description = group.description || group.desc || null;
      const pictureUrl = group.pictureUrl || group.picture_url || group.profilePictureUrl || null;
      const participants = Array.isArray(group.participants) ? group.participants : [];
      const participantsCount = group.participantsCount || group.size || (participants.length > 0 ? participants.length : 0);

      // 1. Upsert into whatsapp_groups
      const gRes = await upsertGroup(supabase, {
        company_id: companyId,
        user_id: targetUserId,
        instance_id: instance.id,
        group_jid: groupJid,
        name: finalName,
        description,
        picture_url: pictureUrl,
        participants_count: participantsCount,
        updated_at: new Date().toISOString(),
      });
      if (!gRes.success && gRes.error) errorsList.push(`whatsapp_groups: ${gRes.error}`);

      // 2. Upsert into chat_conversations
      const cRes = await upsertConversation(supabase, {
        company_id: companyId,
        user_id: targetUserId,
        instance_id: instance.id,
        contact_name: groupJid,
        contact_phone: groupJid,
        status: "open",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (!cRes.success && cRes.error) errorsList.push(`chat_conversations: ${cRes.error}`);

      // 3. Upsert into group_campaigns
      const gcRes = await upsertGroupCampaign(supabase, {
        company_id: companyId,
        user_id: targetUserId,
        instance_id: instance.id,
        group_jid: groupJid,
        group_name: finalName,
        name: finalName,
        group_description: description,
        status: "active",
        updated_at: new Date().toISOString(),
      });
      if (!gcRes.success && gcRes.error) errorsList.push(`group_campaigns: ${gcRes.error}`);

      // 4. Sync members into group_members
      if (participants.length > 0) {
        for (const p of participants) {
          const rawPhone = p.phoneNumber || p.phone || p.id || "";
          const cleanPhone = String(rawPhone).replace(/\D/g, "");
          if (cleanPhone) {
            const isAdmin = p.admin === "admin" || p.admin === "superadmin" || p.isAdmin === true;
            await supabase.from("group_members").upsert(
              {
                user_id: targetUserId,
                group_jid: groupJid,
                phone: cleanPhone,
                role: isAdmin ? "admin" : "member",
                is_admin: isAdmin,
                name: sanitizeText(p.name || p.pushName) || null,
              },
              { onConflict: "user_id,group_jid,phone" }
            ).catch(() => {});
          }
        }
      }

      if (gRes.success || cRes.success || gcRes.success) {
        syncedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        instanceId: instance.id,
        syncedCount,
        totalTargetGroups: targetGroups.length,
        errors: errorsList,
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
