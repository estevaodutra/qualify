import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { group_jid, phone, lid, instance_id, raw_event } = await req.json();

    if (!group_jid || !phone) {
      return new Response(
        JSON.stringify({ error: "group_jid and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[pirate-process-join] Processing join: phone=${phone}, group=${group_jid}, instance=${instance_id}`);

    // Find all active pirate campaign groups monitoring this group_jid
    const { data: campaignGroups, error: cgError } = await supabase
      .from("pirate_campaign_groups")
      .select(`
        id, campaign_id, group_jid, group_name,
        campaign:pirate_campaigns(*)
      `)
      .eq("group_jid", group_jid)
      .eq("is_active", true);

    if (cgError) {
      console.error("[pirate-process-join] Error fetching campaign groups:", cgError);
      throw cgError;
    }

    if (!campaignGroups || campaignGroups.length === 0) {
      console.log(`[pirate-process-join] No active pirate campaigns monitoring group ${group_jid}`);
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;

    for (const cg of campaignGroups) {
      const campaign = cg.campaign as any;
      if (!campaign || campaign.status !== "active") continue;

      // Check for duplicates if configured
      if (campaign.ignore_duplicates) {
        const { data: existing } = await supabase
          .from("pirate_leads")
          .select("id")
          .eq("campaign_id", campaign.id)
          .eq("phone", phone)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[pirate-process-join] Duplicate ignored: phone=${phone}, campaign=${campaign.id}`);
          continue;
        }
      }

      // Create lead in the leads table if auto_create_lead is enabled
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
            source_group_name: cg.group_name || group_jid,
            status: "active",
          })
          .select("id")
          .single();

        if (leadError) {
          console.error(`[pirate-process-join] Error creating lead:`, leadError);
        } else {
          leadId = newLead?.id || null;
          console.log(`[pirate-process-join] Created lead: ${leadId}`);
        }
      }

      // Insert pirate_lead record
      const { data: pirateLead, error: plError } = await supabase
        .from("pirate_leads")
        .insert({
          company_id: campaign.company_id,
          campaign_id: campaign.id,
          user_id: campaign.user_id,
          group_jid,
          phone,
          lid: lid || null,
          lead_id: leadId,
        })
        .select("id")
        .single();

      if (plError) {
        console.error(`[pirate-process-join] Error inserting pirate lead:`, plError);
        continue;
      }

      // Fire user's webhook
      if (campaign.webhook_url) {
        const payload = {
          event: "pirate.lead.joined",
          timestamp: new Date().toISOString(),
          campaign: { id: campaign.id, name: campaign.name },
          group: { id: group_jid, name: cg.group_name },
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

          console.log(`[pirate-process-join] Webhook sent: status=${response.status}`);
        } catch (webhookError) {
          console.error(`[pirate-process-join] Webhook error:`, webhookError);
          await supabase
            .from("pirate_leads")
            .update({ webhook_sent: false, webhook_response_status: 0 })
            .eq("id", pirateLead.id);
        }
      }

      // Increment counters
      await supabase.rpc("increment_pirate_counters", {
        p_campaign_id: campaign.id,
        p_group_jid: group_jid,
      });

      processed++;
    }

    console.log(`[pirate-process-join] Done. Processed ${processed} campaigns.`);

    return new Response(
      JSON.stringify({ success: true, processed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[pirate-process-join] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
