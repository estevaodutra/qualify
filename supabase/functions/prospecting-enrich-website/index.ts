import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scoreLead } from "../_shared/prospecting-qualification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichWebsiteRequest {
  leadId: string;
  prospectingCampaignId: string;
  url: string;
}

interface WebsiteResult {
  email: string | null;
  whatsapp: string | null;
  redes_sociais: string[];
  descricao: string | null;
  servicos: string | null;
}

const FETCH_TIMEOUT_MS = 10000;
const SERVICE_KEYWORDS = ["serviços", "servicos", "soluções", "solucoes", "o que fazemos", "nossos serviços"];

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

function extractWebsiteData(html: string): WebsiteResult {
  const emailMatch =
    html.match(/mailto:([^"'\s?]+)/i)?.[1] ||
    html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ||
    null;

  const whatsappMatch =
    html.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\d{8,15})/i)?.[1] || null;

  const socialLinks = new Set<string>();
  const socialPattern = /https?:\/\/(?:www\.)?(instagram|facebook|linkedin|tiktok)\.com\/[a-zA-Z0-9_.\-/]+/gi;
  let match: RegExpExecArray | null;
  while ((match = socialPattern.exec(html)) !== null) {
    socialLinks.add(match[0]);
  }

  const description =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    null;

  let servicos: string | null = null;
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  for (const keyword of SERVICE_KEYWORDS) {
    const idx = textOnly.toLowerCase().indexOf(keyword);
    if (idx !== -1) {
      const snippet = textOnly
        .slice(idx, idx + 400)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (snippet.length > keyword.length + 5) {
        servicos = snippet.slice(0, 300);
        break;
      }
    }
  }

  return {
    email: emailMatch,
    whatsapp: whatsappMatch,
    redes_sociais: Array.from(socialLinks),
    descricao: description ? description.trim() : null,
    servicos,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: EnrichWebsiteRequest = await req.json();
    if (!body.leadId || !body.prospectingCampaignId) {
      return new Response(JSON.stringify({ error: "leadId e prospectingCampaignId são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("id, company_id, custom_fields")
      .eq("id", body.leadId)
      .maybeSingle();

    const jobBase = {
      company_id: lead?.company_id ?? null,
      prospecting_campaign_id: body.prospectingCampaignId,
      lead_id: body.leadId,
      layer_type: "website",
    };

    if (!body.url) {
      await supabase.from("prospecting_enrichment_jobs").upsert(
        { ...jobBase, status: "not_found", completed_at: new Date().toISOString() },
        { onConflict: "lead_id,layer_type,prospecting_campaign_id" }
      );
      return new Response(JSON.stringify({ success: true, status: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("prospecting_enrichment_jobs").upsert(
      { ...jobBase, status: "processing", input_data: { url: body.url }, started_at: new Date().toISOString() },
      { onConflict: "lead_id,layer_type,prospecting_campaign_id" }
    );

    let result: WebsiteResult;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const response = await fetch(normalizeUrl(body.url), {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        await supabase.from("prospecting_enrichment_jobs").upsert(
          { ...jobBase, status: "failed", last_error: `HTTP ${response.status}`, completed_at: new Date().toISOString() },
          { onConflict: "lead_id,layer_type,prospecting_campaign_id" }
        );
        return new Response(JSON.stringify({ success: true, status: "failed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const html = await response.text();
      result = extractWebsiteData(html);
    } catch (fetchError) {
      // A failed/timed-out site scrape never touches the google_maps job row
      // for this lead -- each layer is an independent row.
      await supabase.from("prospecting_enrichment_jobs").upsert(
        { ...jobBase, status: "failed", last_error: String(fetchError), completed_at: new Date().toISOString() },
        { onConflict: "lead_id,layer_type,prospecting_campaign_id" }
      );
      return new Response(JSON.stringify({ success: true, status: "failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("prospecting_enrichment_jobs").upsert(
      { ...jobBase, status: "completed", result_data: result, completed_at: new Date().toISOString() },
      { onConflict: "lead_id,layer_type,prospecting_campaign_id" }
    );

    // Recompute qualification now that both google_maps and website signals exist.
    const { data: gmJob } = await supabase
      .from("prospecting_enrichment_jobs")
      .select("result_data")
      .eq("lead_id", body.leadId)
      .eq("prospecting_campaign_id", body.prospectingCampaignId)
      .eq("layer_type", "google_maps")
      .maybeSingle();

    const qualification = scoreLead(gmJob?.result_data ?? lead?.custom_fields, result);
    await supabase
      .from("leads")
      .update({ qualification_score: qualification.score, qualification_label: qualification.label })
      .eq("id", body.leadId);

    return new Response(JSON.stringify({ success: true, status: "completed", result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ProspectingEnrichWebsite] Unhandled error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
