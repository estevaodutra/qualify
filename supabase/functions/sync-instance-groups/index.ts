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
 * Robust extraction of phone number and @lid from any WAHA / Z-API / Evolution / Baileys participant object
 */
function extractPhoneAndLid(p: any): { phone: string | null; lid: string | null } {
  if (!p) return { phone: null, lid: null };

  let phone: string | null = null;
  let lid: string | null = null;

  const rawPhone = p.phoneNumber || p.phone || p.phoneNumberPn || p.pn || p.jid || p.id || "";
  const phoneStr = String(rawPhone);

  if (phoneStr.includes("@s.whatsapp.net") || phoneStr.includes("@c.us") || (!phoneStr.includes("@lid") && phoneStr.replace(/\D/g, "").length >= 10)) {
    const digits = phoneStr.split("@")[0].replace(/\D/g, "");
    if (digits.length >= 10) phone = digits;
  }

  const rawLid = p.lid || p.subjectOwner || p.owner || p.id || "";
  const lidStr = String(rawLid);

  if (lidStr.includes("@lid")) {
    lid = lidStr.trim();
  }

  return { phone, lid };
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

async function saveChatConversation(supabase: any, convData: any): Promise<boolean> {
  try {
    const cleanData = {
      company_id: convData.company_id,
      user_id: convData.user_id,
      instance_id: convData.instance_id,
      contact_name: sanitizeText(convData.contact_name) || convData.contact_phone,
      contact_phone: convData.contact_phone,
      status: "open",
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("company_id", convData.company_id)
      .eq("contact_name", cleanData.contact_name)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("chat_conversations")
        .update({
          instance_id: cleanData.instance_id,
          user_id: cleanData.user_id,
          last_message_at: cleanData.last_message_at,
          updated_at: cleanData.updated_at,
        })
        .eq("id", existing.id);
      if (error) console.warn("[saveChatConversation] update error:", error.message);
      return !error;
    } else {
      const { error } = await supabase
        .from("chat_conversations")
        .insert(cleanData);
      if (error) {
        cleanData.contact_name = sanitizeTextNoSurrogates(convData.contact_name) || convData.contact_phone;
        const { error: errRetry } = await supabase.from("chat_conversations").insert(cleanData);
        if (errRetry) console.warn("[saveChatConversation] insert retry error:", errRetry.message);
        return !errRetry;
      }
      return true;
    }
  } catch (e: any) {
    console.error("[saveChatConversation] exception:", e.message);
    return false;
  }
}

async function saveGroupCampaign(supabase: any, gcData: any): Promise<{ success: boolean; id?: string }> {
  try {
    const cleanData = {
      company_id: gcData.company_id,
      user_id: gcData.user_id,
      instance_id: gcData.instance_id,
      group_jid: gcData.group_jid,
      group_name: sanitizeText(gcData.group_name) || "Grupo WhatsApp",
      name: sanitizeText(gcData.name) || "Grupo WhatsApp",
      group_description: sanitizeText(gcData.group_description),
      status: "active",
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("group_campaigns")
      .select("id")
      .eq("company_id", gcData.company_id)
      .eq("group_jid", gcData.group_jid)
      .maybeSingle();

    if (existing?.id) {
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
      return { success: !error, id: existing.id };
    } else {
      const { data: inserted, error } = await supabase
        .from("group_campaigns")
        .insert(cleanData)
        .select("id")
        .maybeSingle();

      if (error) {
        cleanData.group_name = sanitizeTextNoSurrogates(gcData.group_name) || "Grupo WhatsApp";
        cleanData.name = sanitizeTextNoSurrogates(gcData.name) || "Grupo WhatsApp";
        cleanData.group_description = sanitizeTextNoSurrogates(gcData.group_description);
        const { data: insertedRetry, error: errRetry } = await supabase.from("group_campaigns").insert(cleanData).select("id").maybeSingle();
        return { success: !errRetry, id: insertedRetry?.id };
      }
      return { success: true, id: inserted?.id };
    }
  } catch (e: any) {
    console.error("[saveGroupCampaign] exception:", e.message);
    return { success: false };
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

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        if (token && token.length > 30) {
          const { data } = await supabase.auth.getUser(token);
          if (data?.user) userId = data.user.id;
        }
      } catch (_e) {
        // Safe catch
      }
    }

    const requestJson = await req.json().catch(() => ({}));
    const { instanceId, companyId: reqCompanyId, userId: reqUserId, singleGroupJid, fetchOnly, groups: inputGroups, selectedJids } = requestJson;

    if (!instanceId) {
      return new Response(
        JSON.stringify({ success: false, error: "instanceId is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve company_id
    let companyId: string | null = reqCompanyId || (instance as any).company_id || null;

    if (!companyId) {
      const targetUserId = reqUserId || userId || instance.user_id;
      if (targetUserId) {
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
    }

    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Company not found for user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // If singleGroupJid specified (e.g. clicking "Buscar Membros"), invoke n8n manager_groups with action groupInfo
    if (singleGroupJid) {
      console.log(`[sync-instance-groups] Invoking n8n /group-info for single group JID: ${singleGroupJid}`);
      try {
        const respInfo = await fetchZApi(
          instance.external_instance_id,
          instance.external_instance_token,
          "/group-info",
          "POST",
          {
            action: "groupInfo",
            phone: singleGroupJid,
            groupJid: singleGroupJid,
            instanceId: instance.id,
            external_instance_id: instance.external_instance_id,
          },
          { "Content-Type": "application/json" },
          instance.id,
          true
        );

        if (respInfo.ok) {
          const jsonInfo = await respInfo.json();
          const singleGroups = extractGroupObjects(jsonInfo);
          if (singleGroups.length > 0) {
            targetGroups = singleGroups;
          }
        }
      } catch (e: any) {
        console.warn(`[sync-instance-groups] Single group-info warning:`, e.message);
      }
    }

    // If frontend passed selected groups directly in request payload, use them!
    if (targetGroups.length === 0 && Array.isArray(inputGroups) && inputGroups.length > 0) {
      console.log(`[sync-instance-groups] Received ${inputGroups.length} selected group objects directly from frontend`);
      targetGroups = inputGroups;
    } else if (targetGroups.length === 0) {
      // Otherwise fetch from provider via action group.list
      console.log(`[sync-instance-groups] Fetching group list from provider for instance ${instance.name}`);
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
        console.warn(`[sync-instance-groups] Provider API warning:`, e.message);
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
          console.warn(`[sync-instance-groups] Fallback GET /chats warning:`, e.message);
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

    // Process and save each selected group to group_campaigns, chat_conversations, group_members, and LEADS!
    for (const group of targetGroups) {
      const groupJid = group.groupJid || group.id || group.jid;
      if (!groupJid) continue;

      const finalName = group.name || group.subject || groupJid.split("@")[0] || "Grupo WhatsApp";
      const description = group.description || group.desc || null;
      const participants = Array.isArray(group.participants) ? group.participants : [];

      // 1. Save into group_campaigns and obtain group_campaign_id
      const gcRes = await saveGroupCampaign(supabase, {
        company_id: companyId,
        user_id: targetUserId,
        instance_id: instance.id,
        group_jid: groupJid,
        group_name: finalName,
        name: finalName,
        group_description: description,
      });

      const campaignId = gcRes.id;

      // 2. Save into chat_conversations
      const cOk = await saveChatConversation(supabase, {
        company_id: companyId,
        user_id: targetUserId,
        instance_id: instance.id,
        contact_name: groupJid,
        contact_phone: groupJid,
      });

      // 3. Save members into group_members AND leads capturing phone and @lid
      if (campaignId && participants.length > 0) {
        for (const p of participants) {
          const { phone: cleanPhone, lid: lidVal } = extractPhoneAndLid(p);

          if (cleanPhone || lidVal) {
            const isAdmin = p.admin === "admin" || p.admin === "superadmin" || p.isAdmin === true;
            const cleanName = sanitizeText(p.name || p.pushName) || null;

            // A. Save to group_members
            try {
              const { data: existingM } = await supabase
                .from("group_members")
                .select("id")
                .eq("group_campaign_id", campaignId)
                .eq("phone", cleanPhone || lidVal)
                .maybeSingle();

              if (existingM?.id) {
                await supabase
                  .from("group_members")
                  .update({
                    user_id: targetUserId,
                    lid: lidVal,
                    is_admin: isAdmin,
                    name: cleanName,
                  })
                  .eq("id", existingM.id);
              } else {
                await supabase
                  .from("group_members")
                  .insert({
                    group_campaign_id: campaignId,
                    user_id: targetUserId,
                    phone: cleanPhone || lidVal,
                    lid: lidVal,
                    is_admin: isAdmin,
                    name: cleanName,
                  });
              }
            } catch (e: any) {
              console.warn("[sync-instance-groups] group_members save error:", e.message);
            }

            // B. ALWAYS save/update into leads table with phone and @lid matching existing leads by phone or lid!
            try {
              let existingLeadId: string | null = null;

              if (cleanPhone) {
                const { data: exByPhone } = await supabase
                  .from("leads")
                  .select("id")
                  .eq("phone", cleanPhone)
                  .limit(1)
                  .maybeSingle();
                if (exByPhone?.id) existingLeadId = exByPhone.id;
              }

              if (!existingLeadId && lidVal) {
                const { data: exByLid } = await supabase
                  .from("leads")
                  .select("id")
                  .eq("lid", lidVal)
                  .limit(1)
                  .maybeSingle();
                if (exByLid?.id) existingLeadId = exByLid.id;
              }

              const leadName = cleanName && !cleanName.includes("@g.us") ? cleanName : (cleanPhone ? `Participante ${cleanPhone}` : `LID ${lidVal}`);

              const leadPayload = {
                company_id: companyId,
                user_id: targetUserId,
                name: leadName,
                phone: cleanPhone || null,
                lid: lidVal || null,
                source_group_name: finalName,
                source_type: "grupo",
                status: "novo",
                updated_at: new Date().toISOString(),
              };

              if (existingLeadId) {
                await supabase.from("leads").update(leadPayload).eq("id", existingLeadId);
              } else {
                await supabase.from("leads").insert(leadPayload);
              }
            } catch (e: any) {
              console.warn("[sync-instance-groups] leads save error:", e.message);
            }
          }
        }
      }

      if (gcRes.success || cOk) {
        syncedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        instanceId: instance.id,
        syncedCount,
        totalTargetGroups: targetGroups.length,
        groups: targetGroups,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[sync-instance-groups] Caught Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
