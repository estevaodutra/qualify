import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MESSAGES_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages";
const MAX_DELAY_MS = 20000;

interface ExecuteDispatchRequest {
  campaignId: string;
  sequenceId: string;
  contactPhone: string;
  contactName?: string;
  contactId?: string;
  customFields?: Record<string, string>;
  // For resumed executions
  executionId?: string;
  startFromStepIndex?: number;
}

interface DispatchStep {
  id: string;
  step_type: string;
  step_order: number;
  message_type: string | null;
  message_content: string | null;
  message_media_url: string | null;
  message_buttons: unknown[] | null;
  delay_value: number | null;
  delay_unit: string | null;
  condition_type: string | null;
  condition_config: Record<string, unknown> | null;
}

interface InstanceData {
  id: string;
  name: string;
  phone: string;
  provider: string;
  external_instance_id: string;
  external_instance_token: string;
  status: string;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  instance_id: string;
  user_id: string;
  instances: InstanceData;
}

// ============= Formatting helpers =============

const formatLineBreaks = (text: string | null | undefined): string | null => {
  if (!text) return null;
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
};

const getActionForMessageType = (messageType: string | null): string => {
  const actionMap: Record<string, string> = {
    text: "message.send_text",
    image: "message.send_image",
    video: "message.send_video",
    audio: "message.send_audio",
    document: "message.send_document",
    sticker: "message.send_sticker",
    buttons: "message.send_buttons",
    list: "message.send_list",
    media: "message.send_media",
  };
  return actionMap[messageType || "text"] || "message.send_text";
};

const calculateDelayMs = (value: number | null, unit: string | null): number => {
  if (!value || value <= 0) return 0;
  switch (unit) {
    case "seconds": return value * 1000;
    case "minutes": return value * 60000;
    case "hours": return value * 3600000;
    case "days": return value * 86400000;
    default: return value * 1000;
  }
};

const buildStepConfig = (step: DispatchStep): Record<string, unknown> => {
  const config: Record<string, unknown> = {};
  
  if (step.message_content) {
    config.text = formatLineBreaks(step.message_content);
  }
  if (step.message_media_url) {
    config.url = step.message_media_url;
    config.mediaType = step.message_type;
    if (step.message_content) {
      config.caption = formatLineBreaks(step.message_content);
    }
  }
  if (step.message_buttons && Array.isArray(step.message_buttons)) {
    config.buttons = step.message_buttons;
  }
  
  return config;
};

// ============= Variable substitution =============

interface VariableContext {
  contactName: string;
  contactPhone: string;
  campaignName: string;
  customFields: Record<string, string>;
}

const replaceVariablesInText = (text: string, ctx: VariableContext): string => {
  let result = text;
  // Standard variables (support both {{ }} and { } syntax)
  const replacements: Record<string, string> = {
    nome: ctx.contactName,
    name: ctx.contactName,
    telefone: ctx.contactPhone,
    phone: ctx.contactPhone,
    campanha: ctx.campaignName,
    campaign: ctx.campaignName,
  };

  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), value || "");
    result = result.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "gi"), value || "");
  }

  // Custom fields
  if (ctx.customFields) {
    for (const [key, value] of Object.entries(ctx.customFields)) {
      result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), value || "");
      result = result.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "gi"), value || "");
    }
  }

  return result;
};

const applyVariablesToConfig = (config: Record<string, unknown>, ctx: VariableContext): void => {
  if (typeof config.text === "string") config.text = replaceVariablesInText(config.text, ctx);
  if (typeof config.caption === "string") config.caption = replaceVariablesInText(config.caption, ctx);
  if (typeof config.url === "string") config.url = replaceVariablesInText(config.url, ctx);
  if (typeof config.filename === "string") config.filename = replaceVariablesInText(config.filename, ctx);

  if (Array.isArray(config.buttons)) {
    config.buttons = config.buttons.map((btn: unknown) => {
      if (btn && typeof btn === "object" && "label" in (btn as Record<string, unknown>)) {
        const b = btn as Record<string, unknown>;
        if (typeof b.label === "string") b.label = replaceVariablesInText(b.label, ctx);
      }
      return btn;
    });
  }
};

// ============= Main handler =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ExecuteDispatchRequest = await req.json();
    const { campaignId, sequenceId, contactPhone, contactName, contactId, customFields, executionId, startFromStepIndex } = body;

    if (!campaignId || !sequenceId || !contactPhone) {
      return new Response(
        JSON.stringify({ error: "campaignId, sequenceId, and contactPhone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isResumed = !!executionId && startFromStepIndex !== undefined;

    console.log(`[DispatchSequence] Starting - campaign: ${campaignId}, sequence: ${sequenceId}, phone: ${contactPhone}, resumed: ${isResumed}`);

    // Get campaign with instance
    const { data: campaign, error: campaignError } = await supabase
      .from("dispatch_campaigns")
      .select(`
        id, name, status, instance_id, user_id,
        instances!inner(
          id, name, phone, provider,
          external_instance_id, external_instance_token, status
        )
      `)
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("[DispatchSequence] Campaign not found:", campaignError);
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedCampaign = campaign as unknown as CampaignData;
    const instance = typedCampaign.instances;
    const userId = typedCampaign.user_id;

    if (instance.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "Instance is not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sequence steps
    const { data: steps, error: stepsError } = await supabase
      .from("dispatch_sequence_steps")
      .select("*")
      .eq("sequence_id", sequenceId)
      .order("step_order", { ascending: true });

    if (stepsError || !steps || steps.length === 0) {
      console.log("[DispatchSequence] No steps found for sequence, returning gracefully");
      return new Response(
        JSON.stringify({ success: true, warning: "No steps found for this sequence", stepsProcessed: 0, stepsFailed: 0, totalSteps: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedSteps = steps as DispatchStep[];

    // Get webhook config
    const { data: webhookConfig } = await supabase
      .from("webhook_configs")
      .select("url, is_active")
      .eq("user_id", userId)
      .eq("category", "messages")
      .maybeSingle();

    const webhookUrl = (webhookConfig?.is_active && webhookConfig?.url)
      ? webhookConfig.url
      : DEFAULT_MESSAGES_WEBHOOK;

    console.log(`[DispatchSequence] ${typedSteps.length} steps, webhook: ${webhookUrl}`);

    let stepsProcessed = isResumed ? (startFromStepIndex || 0) : 0;
    let stepsFailed = 0;
    const startIndex = isResumed ? (startFromStepIndex || 0) : 0;

    // If resumed, mark as running
    if (isResumed && executionId) {
      await supabase
        .from("sequence_executions")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", executionId);
    }

    for (let i = startIndex; i < typedSteps.length; i++) {
      const step = typedSteps[i];

      console.log(`[DispatchSequence] Processing step ${i + 1}/${typedSteps.length}: ${step.step_type}`);

      // Handle DELAY steps
      if (step.step_type === "delay") {
        const delayMs = calculateDelayMs(step.delay_value, step.delay_unit);

        if (delayMs > MAX_DELAY_MS) {
          // Long delay - persist and pause
          const resumeAt = new Date(Date.now() + delayMs);
          console.log(`[DispatchSequence] ⏱️ Long delay: ${delayMs}ms. Pausing until ${resumeAt.toISOString()}`);

          const { data: savedExecution, error: saveError } = await supabase
            .from("sequence_executions")
            .insert({
              user_id: userId,
              campaign_id: campaignId,
              sequence_id: sequenceId,
              trigger_context: { contactPhone, contactName: contactName || "", contactId: contactId || null, customFields: customFields || {}, campaignType: "dispatch" },
              current_node_index: i + 1,
              nodes_data: typedSteps,
              destinations: [{ phone: contactPhone, name: contactName || "" }],
              status: "paused",
              resume_at: resumeAt.toISOString(),
              nodes_processed: stepsProcessed,
              nodes_failed: stepsFailed,
            })
            .select()
            .single();

          if (saveError) {
            console.error("[DispatchSequence] Failed to save execution state:", saveError);
            const effectiveDelay = Math.min(delayMs, MAX_DELAY_MS);
            await new Promise(resolve => setTimeout(resolve, effectiveDelay));
          } else {
            console.log(`[DispatchSequence] ✅ Execution ${savedExecution.id} paused`);
            return new Response(
              JSON.stringify({ success: true, status: "paused", executionId: savedExecution.id, resumeAt: resumeAt.toISOString(), stepsProcessed }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else if (delayMs > 0) {
          console.log(`[DispatchSequence] ⏱️ Short delay: ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        stepsProcessed++;
        continue;
      }

      // Handle MESSAGE steps
      if (step.step_type === "message") {
        const action = getActionForMessageType(step.message_type);
        const config = buildStepConfig(step);

        // Apply dynamic variable substitution
        const varCtx: VariableContext = {
          contactName: contactName || "",
          contactPhone: contactPhone,
          campaignName: typedCampaign.name,
          customFields: (customFields || {}) as Record<string, string>,
        };
        applyVariablesToConfig(config, varCtx);

        const payload = {
          action,
          node: {
            id: step.id,
            type: step.message_type || "text",
            order: step.step_order,
            config,
          },
          campaign: {
            id: typedCampaign.id,
            name: typedCampaign.name,
          },
          instance: {
            id: instance.id,
            name: instance.name,
            phone: instance.phone || "",
            provider: instance.provider,
            externalId: instance.external_instance_id || "",
            externalToken: instance.external_instance_token || "",
          },
          destination: {
            phone: contactPhone,
            jid: `${contactPhone}@s.whatsapp.net`,
            name: contactName || "",
          },
        };

        try {
          const sendStart = Date.now();
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const responseTimeMs = Date.now() - sendStart;
          const responseText = await response.text();
          let responseData;
          try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }

          // Log to dispatch_sequence_logs AND group_message_logs in parallel
          const logStatus = response.ok ? "sent" : "failed";
          const logError = response.ok ? null : `HTTP ${response.status}: ${responseText.substring(0, 200)}`;
          const now = new Date().toISOString();

          await Promise.all([
            supabase.from("dispatch_sequence_logs").insert({
              user_id: userId,
              sequence_id: sequenceId,
              step_id: step.id,
              contact_id: contactId || null,
              status: logStatus,
              sent_at: now,
              error_message: logError,
            }),
            (async () => {
              const { error: gmlError } = await supabase.from("group_message_logs").insert({
                group_campaign_id: campaignId,
                user_id: userId,
                recipient_phone: contactPhone,
                status: logStatus,
                sent_at: now,
                sequence_id: sequenceId,
                node_type: step.message_type || "text",
                node_order: step.step_order,
                campaign_name: typedCampaign.name,
                group_name: contactName || "",
                instance_name: instance.name,
                instance_id: instance.id,
                error_message: logError,
                response_time_ms: responseTimeMs,
                payload: payload as unknown,
              });
              if (gmlError) {
                console.error("[DispatchSequence] group_message_logs insert FAILED:", JSON.stringify(gmlError));
              }
            })(),
          ]);

          if (response.ok) {
            console.log(`[DispatchSequence] ✅ Step ${step.step_order} sent to ${contactPhone} (${responseTimeMs}ms)`);
            stepsProcessed++;
          } else {
            console.error(`[DispatchSequence] ❌ Step ${step.step_order} failed: HTTP ${response.status}`);
            stepsFailed++;
          }
        } catch (err) {
          stepsFailed++;
          console.error(`[DispatchSequence] ❌ Error sending step ${step.step_order}:`, err);

          const errMsg = err instanceof Error ? err.message : "Unknown error";
          await Promise.all([
            supabase.from("dispatch_sequence_logs").insert({
              user_id: userId,
              sequence_id: sequenceId,
              step_id: step.id,
              contact_id: contactId || null,
              status: "failed",
              error_message: errMsg,
            }),
            (async () => {
              const { error: gmlError } = await supabase.from("group_message_logs").insert({
                group_campaign_id: campaignId,
                user_id: userId,
                recipient_phone: contactPhone,
                status: "failed",
                sent_at: new Date().toISOString(),
                sequence_id: sequenceId,
                node_type: step.message_type || "text",
                node_order: step.step_order,
                campaign_name: typedCampaign.name,
                group_name: contactName || "",
                instance_name: instance.name,
                instance_id: instance.id,
                error_message: errMsg,
              });
              if (gmlError) {
                console.error("[DispatchSequence] group_message_logs insert FAILED:", JSON.stringify(gmlError));
              }
            })(),
          ]);
        }
      }
    }

    // If resumed, mark execution as completed
    if (isResumed && executionId) {
      await supabase
        .from("sequence_executions")
        .update({
          status: stepsFailed === 0 ? "completed" : "partial",
          nodes_processed: stepsProcessed,
          nodes_failed: stepsFailed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", executionId);
    }

    // Update contact progress if contactId provided
    if (contactId) {
      await supabase
        .from("dispatch_campaign_contacts")
        .update({
          current_step: typedSteps.length,
          sequence_completed_at: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", contactId);
    }

    const elapsed = Date.now() - startTime;
    const allSucceeded = stepsFailed === 0 && stepsProcessed > 0;
    console.log(`[DispatchSequence] ${allSucceeded ? '✅' : '⚠️'} Complete: ${stepsProcessed} processed, ${stepsFailed} failed (${elapsed}ms)`);

    return new Response(
      JSON.stringify({
        success: allSucceeded,
        stepsProcessed,
        stepsFailed,
        totalSteps: typedSteps.length,
        elapsedMs: elapsed,
        ...(stepsFailed > 0 ? { error: `${stepsFailed} step(s) failed to send via webhook` } : {}),
      }),
      { status: allSucceeded ? 200 : 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[DispatchSequence] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
