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
  // Path: /leads-api/...
  const subPath = pathParts.slice(1); // remove function name

  try {
    // GET /leads/stats
    if (req.method === "GET" && subPath[0] === "leads" && subPath[1] === "stats") {
      const { count: total } = await supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).eq("user_id", userId);
      const { count: active } = await supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active");
      const { count: inCampaign } = await supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).eq("user_id", userId).not("active_campaign_id", "is", null);
      const { count: inactive } = await supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "inactive");
      return new Response(JSON.stringify({ total, active, in_campaign: inCampaign, inactive }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /leads/:id/history
    if (req.method === "GET" && subPath[0] === "leads" && subPath[2] === "history") {
      const leadId = subPath[1];
      const { data, error } = await supabaseAdmin.from("lead_campaign_history").select("*").eq("lead_id", leadId).eq("user_id", userId).order("started_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /leads/:id
    if (req.method === "GET" && subPath[0] === "leads" && subPath[1] && subPath[1] !== "stats") {
      const { data, error } = await supabaseAdmin.from("leads").select("*").eq("id", subPath[1]).eq("user_id", userId).single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /leads
    if (req.method === "GET" && subPath[0] === "leads") {
      const search = url.searchParams.get("search");
      const tags = url.searchParams.get("tags");
      const status = url.searchParams.get("status");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      let query = supabaseAdmin.from("leads").select("*", { count: "exact" }).eq("user_id", userId).order("created_at", { ascending: false });
      if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      if (status) query = query.eq("status", status);
      if (tags) query = query.overlaps("tags", tags.split(","));

      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ data, total: count, page, limit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /leads/import
    if (req.method === "POST" && subPath[0] === "leads" && subPath[1] === "import") {
      const body = await req.json();
      const { leads, options } = body;
      let imported = 0, updated = 0, skipped = 0;

      for (const lead of leads) {
        const tags = [...(lead.tags || []), ...(options?.default_tags || [])];
        const campaignId = lead.campaign_id || options?.default_campaign_id || null;
        const campaignType = lead.campaign_type || options?.default_campaign_type || null;

        const insertData: Record<string, unknown> = { user_id: userId, phone: lead.phone, name: lead.name, email: lead.email, tags };
        if (campaignId) {
          insertData.active_campaign_id = campaignId;
          insertData.active_campaign_type = campaignType;
        }

        const { error } = await supabaseAdmin.from("leads").insert(insertData);
        if (error) {
          if (error.message.includes("duplicate") && options?.update_existing) {
            const updateData: Record<string, unknown> = { name: lead.name, email: lead.email, tags };
            if (campaignId) {
              updateData.active_campaign_id = campaignId;
              updateData.active_campaign_type = campaignType;
            }
            await supabaseAdmin.from("leads").update(updateData).eq("phone", lead.phone).eq("user_id", userId);
            updated++;
          } else skipped++;
        } else imported++;
      }
      return new Response(JSON.stringify({ success: true, imported, updated, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /leads/bulk/tags
    if (req.method === "POST" && subPath[0] === "leads" && subPath[1] === "bulk" && subPath[2] === "tags") {
      const { lead_ids, tags } = await req.json();
      for (const id of lead_ids) {
        const { data: lead } = await supabaseAdmin.from("leads").select("tags").eq("id", id).eq("user_id", userId).single();
        if (lead) {
          const merged = [...new Set([...(lead.tags || []), ...tags])];
          await supabaseAdmin.from("leads").update({ tags: merged }).eq("id", id);
        }
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE /leads/bulk
    if (req.method === "DELETE" && subPath[0] === "leads" && subPath[1] === "bulk") {
      const { lead_ids } = await req.json();
      await supabaseAdmin.from("leads").delete().in("id", lead_ids).eq("user_id", userId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /leads
    if (req.method === "POST" && subPath[0] === "leads") {
      const body = await req.json();
      const { data, error } = await supabaseAdmin.from("leads").insert({ user_id: userId, ...body }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PUT /leads/:id
    if (req.method === "PUT" && subPath[0] === "leads" && subPath[1]) {
      const body = await req.json();
      const { data, error } = await supabaseAdmin.from("leads").update(body).eq("id", subPath[1]).eq("user_id", userId).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE /leads/:id
    if (req.method === "DELETE" && subPath[0] === "leads" && subPath[1]) {
      await supabaseAdmin.from("leads").delete().eq("id", subPath[1]).eq("user_id", userId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
