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

    const { workflowId, leadIds, instanceId } = await req.json();

    if (!workflowId || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing workflowId or leadIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch workflow details
    const { data: workflow, error: workflowError } = await supabase
      .from("message_sequences")
      .select("id, name, company_id, user_id, trigger_config, trigger_type")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(
        JSON.stringify({ error: `Workflow not found: ${workflowError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const triggerConfig = (workflow.trigger_config || {}) as Record<string, any>;
    const isGroupMode = triggerConfig.destinationMode === "groups" || 
                        (triggerConfig.destinationMode !== "individual" && (
                          triggerConfig.isGroup === true ||
                          (Array.isArray(triggerConfig.selectedGroupJids) && triggerConfig.selectedGroupJids.length > 0)
                        ));

    console.log(`[StartWorkflowForLeads] Workflow ${workflow.name} destinationMode: ${triggerConfig.destinationMode || 'default'}, isGroupMode: ${isGroupMode}`);

    // 2. Fetch leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, phone, email, company_name, document, custom_fields")
      .in("id", leadIds);

    if (leadsError || !leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: `Leads not found: ${leadsError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[StartWorkflowForLeads] Starting workflow ${workflow.name} for ${leads.length} lead(s) (isGroupMode=${isGroupMode})`);

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

      // Prepare custom fields from lead
      const customFields: Record<string, any> = {
        name: lead.name || "",
        nome: lead.name || "",
        phone: cleanPhone,
        telefone: cleanPhone,
        email: lead.email || "",
        document: lead.document || "",
        cpf: lead.document || "",
        company_name: lead.company_name || "",
        empresa: lead.company_name || "",
      };
      if (lead.custom_fields && typeof lead.custom_fields === "object") {
        for (const [cfKey, cfVal] of Object.entries(lead.custom_fields)) {
          customFields[cfKey] = cfVal;
          customFields[`custom_fields.${cfKey}`] = cfVal;
        }
      }

      // Check if lead represents a WhatsApp group
      const leadCustomFields = (lead.custom_fields && typeof lead.custom_fields === "object" ? lead.custom_fields : {}) as Record<string, any>;
      const isGroupLead = !!(
        leadCustomFields.is_group ||
        cleanPhone.startsWith("1203") ||
        leadCustomFields.group_jid ||
        lead.phone?.includes("@g.us") ||
        lead.phone?.includes("-group")
      );

      const targetGroupJid = leadCustomFields.group_jid || 
                             (cleanPhone.startsWith("1203") ? `${cleanPhone}@g.us` : null) ||
                             (lead.phone?.includes("@g.us") ? lead.phone.trim() : null);

      const effectiveGroupMode = isGroupMode || isGroupLead;
      const targetGroupJids = targetGroupJid 
        ? Array.from(new Set([...(triggerConfig.selectedGroupJids || []), targetGroupJid]))
        : (triggerConfig.selectedGroupJids || []);

      // Conexão Padrão: resolver a instância ativa onde o lead está conversando
      let leadInstanceId = instanceId;
      if (!leadInstanceId) {
        try {
          const suffix = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;
          let convQ = supabase
            .from("chat_conversations")
            .select("instance_id, last_message_at, updated_at")
            .not("instance_id", "is", null);

          if (isGroupLead && targetGroupJid) {
            convQ = convQ.eq("contact_phone", targetGroupJid);
          } else if (suffix) {
            convQ = convQ.or(`lead_id.eq.${lead.id},contact_phone.ilike.%${suffix}%`);
          } else {
            convQ = convQ.eq("lead_id", lead.id);
          }

          const { data: convList } = await convQ
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false })
            .limit(1);

          if (convList && convList.length > 0 && convList[0].instance_id) {
            leadInstanceId = convList[0].instance_id;
            console.log(`[StartWorkflowForLeads] Resolved active conversation instance ${leadInstanceId} for lead ${lead.id} (${cleanPhone})`);
          }
        } catch (convErr) {
          console.warn("[StartWorkflowForLeads] Could not resolve conversation instance for lead:", convErr);
        }
      }

      const executePayload = {
        campaignId: workflow.id,
        sequenceId: workflow.id,
        triggerContext: {
          leadId: lead.id,
          respondentPhone: cleanPhone,
          respondentName: lead.name || "",
          respondentJid: isGroupLead ? (targetGroupJid || `${cleanPhone}@g.us`) : `${cleanPhone}@s.whatsapp.net`,
          groupJid: isGroupLead ? (targetGroupJid || `${cleanPhone}@g.us`) : undefined,
          sendPrivate: !effectiveGroupMode,
          destinationMode: effectiveGroupMode ? "groups" : "individual",
          selectedGroupJids: targetGroupJids,
          customFields,
          companyId: workflow.company_id,
          instanceId: leadInstanceId || undefined,
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
