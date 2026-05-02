import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface N8nParticipant {
  phone: string;
  name?: string;
  isAdmin?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { groupJid, campaignId, instanceId, userId, trigger, senderLid } = await req.json();

    if (!groupJid || !campaignId || !instanceId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync] Start group=${groupJid} campaign=${campaignId} trigger=${trigger}`);

    // 1. Fetch instance
    const { data: inst, error: instErr } = await supabase
      .from("instances")
      .select("id, name, provider, phone, external_instance_id, external_instance_token")
      .eq("id", instanceId)
      .single();

    if (instErr || !inst?.external_instance_id || !inst?.external_instance_token) {
      console.error("[sync] Instance not found:", instErr);
      return new Response(
        JSON.stringify({ success: false, error: "Instance credentials not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch current active members from DB
    const { data: dbMembers } = await supabase
      .from("group_members")
      .select("id, phone, name, status")
      .eq("group_campaign_id", campaignId)
      .eq("status", "active");

    const dbActive = (dbMembers || []).filter((m: any) => m.phone);
    const dbPhoneMap = new Map<string, { id: string; name: string | null }>();
    for (const m of dbActive) {
      dbPhoneMap.set(m.phone, { id: m.id, name: m.name });
    }

    console.log(`[sync] ${dbPhoneMap.size} active members in DB`);

    // 3. Normalize groupJid to "-group" format (n8n expects this format, not @g.us)
    const zapiGroupJid = groupJid.includes("@g.us")
      ? groupJid.replace("@g.us", "-group")
      : groupJid;

    const n8nUrl = "https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent";

    const n8nResp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "group.members",
        instance: {
          id: inst.id,
          name: inst.name || "",
          phone: inst.phone || "",
          provider: inst.provider || "z-api",
          externalId: inst.external_instance_id,
          externalToken: inst.external_instance_token,
        },
        campaign: { id: campaignId },
        group: { jid: zapiGroupJid },
      }),
    });

    if (!n8nResp.ok) {
      const errText = await n8nResp.text();
      console.error(`[sync] n8n error ${n8nResp.status}: ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `n8n error: ${n8nResp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse n8n response (supports array or object with participants/members)
    const rawText = await n8nResp.text();
    console.log(`[sync] n8n raw response (${rawText.length} chars): ${rawText.slice(0, 500)}`);

    let raw: any = null;
    if (rawText.trim().length > 0) {
      try {
        raw = JSON.parse(rawText);
      } catch (e) {
        console.error("[sync] Failed to parse n8n JSON:", e);
      }
    }

    let participants: N8nParticipant[] = [];

    if (Array.isArray(raw)) {
      const first = raw[0];
      if (first?.participants) participants = first.participants;
      else if (first?.members) participants = first.members;
      else if (first?.phone) participants = raw;
    } else if (raw?.participants) {
      participants = raw.participants;
    } else if (raw?.members) {
      participants = raw.members;
    }

    console.log(`[sync] n8n returned ${participants.length} participants`);

    if (participants.length === 0) {
      console.warn("[sync] No participants returned, skipping diff");
      return new Response(
        JSON.stringify({ success: true, entered: 0, left: 0, total: dbPhoneMap.size }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Build n8n phone map
    const n8nPhoneMap = new Map<string, N8nParticipant>();
    for (const p of participants) {
      if (p.phone) n8nPhoneMap.set(p.phone, p);
    }

    // 6. Diff: entered = in n8n but not in DB; left = in DB but not in n8n
    const entered: N8nParticipant[] = [];
    for (const [phone, p] of n8nPhoneMap) {
      if (!dbPhoneMap.has(phone)) entered.push(p);
    }

    const leftPhones: string[] = [];
    for (const phone of dbPhoneMap.keys()) {
      if (!n8nPhoneMap.has(phone)) leftPhones.push(phone);
    }

    console.log(`[sync] Diff: entered=${entered.length}, left=${leftPhones.length}`);

    // 7. Process entered
    if (entered.length > 0) {
      const now = new Date().toISOString();
      const memberRecords = entered.map((p) => ({
        group_campaign_id: campaignId,
        user_id: userId,
        phone: p.phone,
        lid: null as string | null,
        name: p.name || null,
        is_admin: p.isAdmin || false,
        status: "active",
        joined_at: now,
        left_at: null as string | null,
      }));

      for (let i = 0; i < memberRecords.length; i += 100) {
        const { error } = await supabase
          .from("group_members")
          .upsert(memberRecords.slice(i, i + 100), { onConflict: "group_campaign_id,phone" });
        if (error) console.error(`[sync] Upsert members error (chunk ${i}):`, error);
      }

      const historyRecords = entered.map((p) => ({
        group_campaign_id: campaignId,
        user_id: userId,
        member_phone: p.phone,
        action: "join",
      }));

      for (let i = 0; i < historyRecords.length; i += 100) {
        await supabase.from("group_member_history").insert(historyRecords.slice(i, i + 100));
      }

      const leadRecords = entered.map((p) => ({
        user_id: userId,
        phone: p.phone,
        name: p.name || null,
        active_campaign_id: campaignId,
        active_campaign_type: "grupos",
        status: "active",
      }));

      for (let i = 0; i < leadRecords.length; i += 100) {
        await supabase
          .from("leads")
          .upsert(leadRecords.slice(i, i + 100), { onConflict: "phone,user_id", ignoreDuplicates: false });
      }
    }

    // 8. Process left
    if (leftPhones.length > 0) {
      const now = new Date().toISOString();

      for (let i = 0; i < leftPhones.length; i += 100) {
        const chunk = leftPhones.slice(i, i + 100);
        await supabase
          .from("group_members")
          .update({ status: "left", left_at: now })
          .eq("group_campaign_id", campaignId)
          .in("phone", chunk);
      }

      const leaveHistory = leftPhones.map((phone) => ({
        group_campaign_id: campaignId,
        user_id: userId,
        member_phone: phone,
        action: "leave",
      }));

      for (let i = 0; i < leaveHistory.length; i += 100) {
        await supabase.from("group_member_history").insert(leaveHistory.slice(i, i + 100));
      }
    }

    // 9. Resolve senderLid if provided
    let resolvedPhone: string | null = null;
    if (senderLid && entered.length === 1) {
      resolvedPhone = entered[0].phone;
      console.log(`[sync] Resolved LID ${senderLid} -> ${resolvedPhone}`);

      await supabase
        .from("group_members")
        .update({ lid: senderLid })
        .eq("group_campaign_id", campaignId)
        .eq("phone", resolvedPhone);
    }

    return new Response(
      JSON.stringify({
        success: true,
        entered: entered.length,
        left: leftPhones.length,
        total: n8nPhoneMap.size,
        resolvedPhone,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[sync] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
