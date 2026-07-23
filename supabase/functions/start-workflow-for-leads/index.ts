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

    const { workflowId, leadIds } = await req.json();

    if (!workflowId || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing workflowId or leadIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch workflow details
    const { data: workflow, error: workflowError } = await supabase
      .from("message_sequences")
      .select("id, name, company_id, user_id")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(
        JSON.stringify({ error: `Workflow not found: ${workflowError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, phone")
      .in("id", leadIds);

    if (leadsError || !leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: `Leads not found: ${leadsError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[StartWorkflowForLeads] Starting workflow ${workflow.name} for ${leads.length} lead(s)`);

    const executeUrl = `${supabaseUrl}/functions/v1/execute-message`;
    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
      if (!lead.phone) {
        console.warn(`[StartWorkflowForLeads] Skipping lead ${lead.name || lead.id}: missing phone number`);
        failCount++;
        continue;
      }

      // Format phone digits
      const cleanPhone = lead.phone.replace(/\D/g, "");

      const executePayload = {
        campaignId: workflow.id,
        sequenceId: workflow.id,
        triggerContext: {
          leadId: lead.id,
          respondentPhone: cleanPhone,
          respondentName: lead.name || "",
          respondentJid: `${cleanPhone}@s.whatsapp.net`,
          sendPrivate: true,
          companyId: workflow.company_id,
        },
      };

      try {
        const response = await fetch(executeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(executePayload),
        });

        const text = await response.text();
        if (response.ok) {
          successCount++;
          // Insert historical log entry or lead activity log if exists
          await supabase.from("lead_activities").insert({
            lead_id: lead.id,
            company_id: workflow.company_id,
            type: "workflow_started",
            description: `Workflow "${workflow.name}" iniciado em massa.`,
          }).select().maybeSingle();
        } else {
          console.error(`[StartWorkflowForLeads] Failed for lead ${lead.id}: ${text}`);
          failCount++;
        }
      } catch (err) {
        console.error(`[StartWorkflowForLeads] Exception for lead ${lead.id}:`, err);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Workflow iniciado para ${successCount} contatos. Falhas/ignorados: ${failCount}.`,
        successCount,
        failCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[StartWorkflowForLeads] Uncaught error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
