import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchZApi } from "../_shared/n8n-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RawParticipant {
  phone?: string;
  id?: string;
  name?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  admin?: string | boolean;
  lid?: string;
  profilePhoto?: string;
  status?: string;
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

    const { instanceId, groupJid } = await req.json();

    if (!instanceId || !groupJid) {
      return new Response(
        JSON.stringify({ success: false, error: "instanceId and groupJid are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch instance details
    const { data: instance, error: instErr } = await supabase
      .from("instances")
      .select("id, user_id, name, phone, external_instance_id, external_instance_token, provider")
      .eq("id", instanceId)
      .maybeSingle();

    if (instErr || !instance) {
      return new Response(
        JSON.stringify({ success: false, error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve company_id
    const targetUserId = userId || instance.user_id;
    let companyId: string | null = null;
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

    const cleanGroupPhone = groupJid.replace(/\D/g, "");
    const normalizedJid = groupJid.includes("@") ? groupJid : `${cleanGroupPhone}@g.us`;

    // 2. Fetch Group Metadata from Provider via n8n-router
    console.log(`[sync-group-info] Fetching metadata for ${normalizedJid} on instance ${instance.name}`);

    let rawMetadata: any = null;
    try {
      const resp = await fetchZApi(
        instance.external_instance_id,
        instance.external_instance_token,
        `/group-info?groupId=${encodeURIComponent(normalizedJid)}`,
        "POST",
        {
          action: "groupInfo",
          groupId: normalizedJid,
          group_jid: normalizedJid,
          groupJid: normalizedJid,
          phone: cleanGroupPhone
        },
        { "Content-Type": "application/json" },
        instance.id,
        true
      );

      if (resp.ok) {
        rawMetadata = await resp.json();
      } else {
        const errTxt = await resp.text();
        console.warn(`[sync-group-info] Provider returned non-200: ${resp.status}`, errTxt);
      }
    } catch (e: any) {
      console.warn(`[sync-group-info] Error fetching group metadata:`, e.message);
    }

    // Normalizar retorno de diferentes provedores (WAHA / Z-API / Evolution / Baileys / n8n)
    let metaObj = Array.isArray(rawMetadata) ? rawMetadata[0] : (rawMetadata || {});
    if (metaObj.group) metaObj = metaObj.group;
    else if (metaObj.data) metaObj = metaObj.data;
    else if (metaObj.details) metaObj = metaObj.details;
    else if (metaObj.body) metaObj = metaObj.body;
    
    const subject =
      metaObj.subject ||
      metaObj.name ||
      metaObj.groupName ||
      metaObj.group_name ||
      metaObj.title ||
      null;

    const description =
      metaObj.description ||
      metaObj.desc ||
      metaObj.topic ||
      metaObj.groupDescription ||
      metaObj.group_description ||
      null;

    const pictureUrl =
      metaObj.pictureUrl ||
      metaObj.picture ||
      metaObj.photo ||
      metaObj.profilePicUrl ||
      metaObj.icon ||
      metaObj.image ||
      metaObj.group_photo ||
      null;

    const ownerJid =
      metaObj.owner ||
      metaObj.creator ||
      metaObj.ownerJid ||
      null;

    // Normalizar participantes
    const rawParticipants: RawParticipant[] =
      metaObj.participants ||
      metaObj.members ||
      metaObj.group_members ||
      [];

    const participants = rawParticipants.map((p) => {
      const rawId = p.id || p.phone || "";
      const phoneDigits = rawId.includes("@") ? rawId.split("@")[0] : rawId;
      const isAdmin = p.isAdmin === true || p.isSuperAdmin === true || p.admin === "admin" || p.admin === "superadmin" || p.admin === true;
      const isSuperAdmin = p.isSuperAdmin === true || p.admin === "superadmin";

      return {
        phone: phoneDigits,
        lid: p.lid || (rawId.includes("@lid") ? rawId : null),
        name: p.name || null,
        isAdmin,
        isSuperAdmin,
        profilePhoto: p.profilePhoto || null,
        status: p.status || "active"
      };
    });

    const participantsCount = participants.length || metaObj.size || metaObj.participantsCount || null;

    // 3. Atualizar ou Criar Lead do Grupo
    let groupLeadId: string | null = null;
    if (companyId) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, name, custom_fields")
        .eq("company_id", companyId)
        .eq("phone", cleanGroupPhone)
        .maybeSingle();

      const existingCustom = (existingLead?.custom_fields as Record<string, any>) || {};
      const updatedCustom = {
        ...existingCustom,
        is_group: true,
        group_jid: normalizedJid,
        description: description || existingCustom.description || null,
        profile_picture_url: pictureUrl || existingCustom.profile_picture_url || null,
        pictureUrl: pictureUrl || existingCustom.pictureUrl || null,
        participants_count: participantsCount || existingCustom.participants_count || participants.length,
        participants: participants.length > 0 ? participants : (existingCustom.participants || []),
        owner_jid: ownerJid || existingCustom.owner_jid || null,
        last_synced_at: new Date().toISOString()
      };

      const groupName = subject || existingLead?.name || "Grupo WhatsApp";

      if (existingLead) {
        groupLeadId = existingLead.id;
        await supabase
          .from("leads")
          .update({
            name: groupName,
            custom_fields: updatedCustom,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingLead.id);
      } else {
        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            user_id: instance.user_id,
            company_id: companyId,
            phone: cleanGroupPhone,
            name: groupName,
            status: "active",
            custom_fields: updatedCustom
          })
          .select("id")
          .single();
        if (newLead) groupLeadId = newLead.id;
      }

      // 4. Atualizar conversa correspondente
      if (groupLeadId) {
        await supabase
          .from("chat_conversations")
          .update({
            contact_name: groupName,
            updated_at: new Date().toISOString()
          })
          .eq("company_id", companyId)
          .eq("lead_id", groupLeadId)
          .eq("instance_id", instance.id);
      }
    }

    const responsePayload = {
      success: true,
      group: {
        jid: normalizedJid,
        phone: cleanGroupPhone,
        name: subject || "Grupo WhatsApp",
        description: description || "",
        pictureUrl: pictureUrl || null,
        participantsCount: participantsCount || participants.length,
        participants: participants,
        ownerJid,
        lastSyncedAt: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("[sync-group-info] Exception:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
