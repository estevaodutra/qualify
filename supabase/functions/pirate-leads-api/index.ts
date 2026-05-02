import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = await validateApiKey(supabase, authHeader);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Empty payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ group_id: string; phone: string; status: string; detail?: string }> = [];
    let processed = 0;

    for (const item of items) {
      const groupId = item.group?.id;
      const groupName = item.group?.name || groupId;
      const phone = item.lead?.phone;
      const lid = item.lead?.["@lid"] || null;

      if (!groupId || !phone) {
        results.push({ group_id: groupId || "unknown", phone: phone || "unknown", status: "skipped", detail: "Missing group.id or lead.phone" });
        continue;
      }

      console.log(`[pirate-leads-api] Processing: phone=${phone}, group=${groupId}`);

      // Find active pirate campaign groups monitoring this group_id
      const { data: campaignGroups, error: cgError } = await supabase
        .from("pirate_campaign_groups")
        .select(`id, campaign_id, group_jid, group_name, campaign:pirate_campaigns(*)`)
        .eq("group_jid", groupId)
        .eq("is_active", true);

      if (cgError) {
        console.error("[pirate-leads-api] Error fetching campaign groups:", cgError);
        results.push({ group_id: groupId, phone, status: "error", detail: (cgError as Error).message });
        continue;
      }

      if (!campaignGroups || campaignGroups.length === 0) {
        results.push({ group_id: groupId, phone, status: "skipped", detail: "No active campaigns monitoring this group" });
        continue;
      }

      for (const cg of campaignGroups) {
        const campaign = cg.campaign as any;
        if (!campaign || campaign.status !== "active") continue;

        // Check user ownership
        if (campaign.user_id !== userId) continue;

        // Dedup
        if (campaign.ignore_duplicates) {
          const { data: existing } = await supabase
            .from("pirate_leads")
            .select("id")
            .eq("campaign_id", campaign.id)
            .eq("phone", phone)
            .limit(1);

          if (existing && existing.length > 0) {
            results.push({ group_id: groupId, phone, status: "duplicate", detail: `Campaign ${campaign.id}` });
            continue;
          }
        }

        // Auto create lead
        let leadId: string | null = null;
        if (campaign.auto_create_lead) {
          const { data: newLead, error: leadError } = await supabase
            .from("leads")
            .insert({
              user_id: campaign.user_id,
              phone,
              name: phone,
              source_type: "pirate",
              source_name: campaign.name,
              source_group_name: groupName,
              status: "active",
            })
            .select("id")
            .single();

          if (leadError) {
            console.error("[pirate-leads-api] Error creating lead:", leadError);
          } else {
            leadId = newLead?.id || null;
          }
        }

        // Insert pirate_lead
        const { data: pirateLead, error: plError } = await supabase
          .from("pirate_leads")
          .insert({
            company_id: campaign.company_id,
            campaign_id: campaign.id,
            user_id: campaign.user_id,
            group_jid: groupId,
            phone,
            lid: lid || null,
            lead_id: leadId,
          })
          .select("id")
          .single();

        if (plError) {
          console.error("[pirate-leads-api] Error inserting pirate lead:", plError);
          results.push({ group_id: groupId, phone, status: "error", detail: (plError as Error).message });
          continue;
        }

        // Fire webhook
        if (campaign.webhook_url) {
          const payload = {
            event: "pirate.lead.joined",
            timestamp: new Date().toISOString(),
            campaign: { id: campaign.id, name: campaign.name },
            group: { id: groupId, name: groupName },
            lead: { id: pirateLead?.id, phone, lid: lid || null, lead_id: leadId },
          };

          try {
            const webhookHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              ...(campaign.webhook_headers || {}),
            };

            const response = await fetch(campaign.webhook_url, {
              method: "POST",
              headers: webhookHeaders,
              body: JSON.stringify(payload),
            });

            await supabase
              .from("pirate_leads")
              .update({
                webhook_sent: true,
                webhook_sent_at: new Date().toISOString(),
                webhook_response_status: response.status,
              })
              .eq("id", pirateLead.id);
          } catch (webhookError) {
            console.error("[pirate-leads-api] Webhook error:", webhookError);
            await supabase
              .from("pirate_leads")
              .update({ webhook_sent: false, webhook_response_status: 0 })
              .eq("id", pirateLead.id);
          }
        }

        // Increment counters
        await supabase.rpc("increment_pirate_counters", {
          p_campaign_id: campaign.id,
          p_group_jid: groupId,
        });

        processed++;
        results.push({ group_id: groupId, phone, status: "processed", detail: `Campaign ${campaign.id}` });
      }
    }

    console.log(`[pirate-leads-api] Done. Processed ${processed} leads.`);

    return new Response(
      JSON.stringify({ success: true, processed, total: items.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[pirate-leads-api] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
