import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function validateApiKey(supabaseAdmin: any, authHeader: string) {
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.functions.invoke("validate-api-key", {
    body: { apiKey: token },
  });
  if (error || !data?.valid) return null;
  return data.user_id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = await validateApiKey(supabaseAdmin, authHeader);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const subPath = pathParts.slice(1);

  try {
    // POST /add
    if (req.method === "POST" && subPath[0] === "add") {
      const { campaign_id, lead_ids, position = "end" } = await req.json();

      const { data: existing } = await supabaseAdmin.from("call_queue").select("position").eq("campaign_id", campaign_id).order("position", { ascending: false }).limit(1);
      let startPos = position === "end" ? ((existing?.[0]?.position || 0) + 1) : 1;

      if (position === "start" && existing?.length) {
        const { data: all } = await supabaseAdmin.from("call_queue").select("id, position").eq("campaign_id", campaign_id).order("position", { ascending: true });
        for (const entry of all || []) {
          await supabaseAdmin.from("call_queue").update({ position: entry.position + lead_ids.length }).eq("id", entry.id);
        }
      }

      let added = 0, skipped = 0;
      for (let i = 0; i < lead_ids.length; i++) {
        const { error } = await supabaseAdmin.from("call_queue").insert({
          user_id: userId, campaign_id, lead_id: lead_ids[i], position: startPos + i,
        });
        if (error) skipped++; else added++;
      }

      const { count } = await supabaseAdmin.from("call_queue").select("*", { count: "exact", head: true }).eq("campaign_id", campaign_id);
      return new Response(JSON.stringify({ success: true, added, skipped, queue_size: count }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /:campaign_id/next
    if (req.method === "GET" && subPath[1] === "next") {
      const campaignId = subPath[0];
      const { data: entry } = await supabaseAdmin
        .from("call_queue")
        .select("*, leads(id, name, phone)")
        .eq("campaign_id", campaignId)
        .eq("status", "waiting")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      const { count } = await supabaseAdmin.from("call_queue").select("*", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "waiting");

      if (!entry) {
        return new Response(JSON.stringify({ success: true, lead: null, queue_size: 0, remaining: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        success: true,
        lead: { id: entry.leads?.id, name: entry.leads?.name, phone: entry.leads?.phone, position: entry.position, attempts: entry.attempts },
        queue_size: count, remaining: (count || 1) - 1,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /:campaign_id
    if (req.method === "GET" && subPath[0]) {
      const { data, error } = await supabaseAdmin.from("call_queue").select("*, leads(name, phone)").eq("campaign_id", subPath[0]).eq("user_id", userId).order("position", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE /:campaign_id/:lead_id
    if (req.method === "DELETE" && subPath[0] && subPath[1]) {
      await supabaseAdmin.from("call_queue").delete().eq("campaign_id", subPath[0]).eq("lead_id", subPath[1]).eq("user_id", userId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /no-answer/:call_id
    if (req.method === "POST" && subPath[0] === "no-answer" && subPath[1]) {
      const callId = subPath[1];
      // Get call log to find campaign and lead
      const { data: callLog } = await supabaseAdmin.from("call_logs").select("campaign_id, lead_id").eq("id", callId).single();
      if (!callLog) throw new Error("Call not found");

      // Update call status
      await supabaseAdmin.from("call_logs").update({ call_status: "no_answer" }).eq("id", callId);

      // Move lead to end of queue
      const { data: maxPos } = await supabaseAdmin.from("call_queue").select("position").eq("campaign_id", callLog.campaign_id).order("position", { ascending: false }).limit(1);
      const newPosition = (maxPos?.[0]?.position || 0) + 1;

      await supabaseAdmin.from("call_queue").update({
        position: newPosition,
        
        last_attempt_at: new Date().toISOString(),
        last_result: "no_answer",
      }).eq("campaign_id", callLog.campaign_id).eq("lead_id", callLog.lead_id);

      // Increment attempts manually
      const { data: queueEntry } = await supabaseAdmin.from("call_queue").select("attempts").eq("campaign_id", callLog.campaign_id).eq("lead_id", callLog.lead_id).single();
      if (queueEntry) {
        await supabaseAdmin.from("call_queue").update({ attempts: (queueEntry.attempts || 0) + 1 }).eq("campaign_id", callLog.campaign_id).eq("lead_id", callLog.lead_id);
      }

      return new Response(JSON.stringify({ success: true, lead_id: callLog.lead_id, new_position: newPosition, attempts: (queueEntry?.attempts || 0) + 1 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
