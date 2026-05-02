import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action_id, lead_id, campaign_id } = await req.json();

    if (!action_id) {
      return new Response(
        JSON.stringify({ error: "Missing action_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[execute-call-action] action_id=${action_id} lead_id=${lead_id} campaign_id=${campaign_id}`);

    // 1. Fetch the action definition
    const { data: action, error: actionError } = await supabase
      .from("call_script_actions")
      .select("id, action_type, action_config, campaign_id, user_id")
      .eq("id", action_id)
      .single();

    if (actionError || !action) {
      console.error("[execute-call-action] Action not found:", actionError?.message);
      return new Response(
        JSON.stringify({ error: "Action not found", details: actionError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionType = action.action_type;
    const actionConfig = (action.action_config || {}) as Record<string, unknown>;
    const results: Record<string, unknown> = { action_type: actionType };

    console.log(`[execute-call-action] type=${actionType} config=${JSON.stringify(actionConfig)}`);

    // Re-fetch action with name to use in payloads
    const { data: actionFull } = await supabase
      .from("call_script_actions")
      .select("id, name")
      .eq("id", action_id)
      .maybeSingle();

    // Helper to build the new standardized webhook payload
    async function buildActionPayload(textOverride?: string | null): Promise<Record<string, unknown>> {
      // Lead
      let leadRow: any = null;
      if (lead_id) {
        const { data } = await supabase
          .from("call_leads")
          .select("id, name, phone")
          .eq("id", lead_id)
          .maybeSingle();
        leadRow = data;
      }

      // Campaign + company
      let campaignRow: any = null;
      let companyRow: any = null;
      if (campaign_id) {
        const { data: c } = await supabase
          .from("call_campaigns")
          .select("id, name, company_id")
          .eq("id", campaign_id)
          .maybeSingle();
        campaignRow = c;
        if (c?.company_id) {
          const { data: comp } = await supabase
            .from("companies")
            .select("id, name")
            .eq("id", c.company_id)
            .maybeSingle();
          companyRow = comp;
        }
      }

      // Latest call_log for this lead+campaign
      let logRow: any = null;
      if (lead_id && campaign_id) {
        const { data } = await supabase
          .from("call_logs")
          .select("id, call_status, attempt_number, duration_seconds, audio_url, custom_message, operator_id")
          .eq("lead_id", lead_id)
          .eq("campaign_id", campaign_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        logRow = data;
      }

      // Operator
      let operatorRow: any = null;
      if (logRow?.operator_id) {
        const { data: op } = await supabase
          .from("call_operators")
          .select("id, operator_name, user_id")
          .eq("id", logRow.operator_id)
          .maybeSingle();
        operatorRow = op;
        if (op?.user_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", op.user_id)
            .maybeSingle();
          if (prof) operatorRow.email = prof.email;
        }
      }

      const actionText =
        textOverride !== undefined
          ? textOverride
          : ((actionConfig.text as string) || "");

      return {
        account: {
          id: companyRow?.id ?? null,
          name: companyRow?.name ?? null,
        },
        lead: {
          id: leadRow?.id ?? null,
          name: leadRow?.name ?? null,
          phone: leadRow?.phone ?? null,
        },
        campaign: {
          id: campaignRow?.id ?? null,
          name: campaignRow?.name ?? null,
        },
        operator: {
          id: operatorRow?.id ?? null,
          name: operatorRow?.operator_name ?? null,
          email: operatorRow?.email ?? null,
        },
        call: {
          id: logRow?.id ?? null,
          status: logRow?.call_status ?? null,
          attempts: logRow?.attempt_number ?? null,
          duration: logRow?.duration_seconds ?? null,
          cost: null,
          recording: logRow?.audio_url ?? null,
          actions: {
            id: actionFull?.id ?? action_id,
            name: actionFull?.name ?? null,
            text: actionText ?? "",
          },
        },
      };
    }

    // 2. Execute based on action type
    switch (actionType) {
      case "add_tag": {
        const tag = actionConfig.tag as string;
        if (!tag || !lead_id) {
          results.skipped = true;
          results.reason = "Missing tag or lead_id";
          break;
        }

        // Get current custom_fields from call_leads
        const { data: lead } = await supabase
          .from("call_leads")
          .select("custom_fields")
          .eq("id", lead_id)
          .single();

        const currentFields = (lead?.custom_fields || {}) as Record<string, unknown>;
        const currentTags = (currentFields.tags as string[]) || [];

        if (!currentTags.includes(tag)) {
          currentTags.push(tag);
          const { error: updateError } = await supabase
            .from("call_leads")
            .update({ custom_fields: { ...currentFields, tags: currentTags } })
            .eq("id", lead_id);

          if (updateError) {
            console.error("[execute-call-action] add_tag error:", updateError.message);
            results.error = updateError.message;
          } else {
            results.success = true;
            results.tag = tag;
          }
        } else {
          results.success = true;
          results.tag_already_present = true;
        }
        break;
      }

      case "update_status": {
        const status = actionConfig.status as string;
        if (!status || !lead_id) {
          results.skipped = true;
          results.reason = "Missing status or lead_id";
          break;
        }

        const { error: updateError } = await supabase
          .from("call_leads")
          .update({ status })
          .eq("id", lead_id);

        if (updateError) {
          console.error("[execute-call-action] update_status error:", updateError.message);
          results.error = updateError.message;
        } else {
          results.success = true;
          results.new_status = status;
        }
        break;
      }

      case "webhook": {
        const webhookUrl = (actionConfig.webhook_url || actionConfig.url) as string;
        if (!webhookUrl) {
          results.skipped = true;
          results.reason = "Missing webhook_url";
          break;
        }

        const payload = await buildActionPayload();

        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([payload]),
          });

          results.success = response.ok;
          results.status_code = response.status;
          if (!response.ok) {
            results.response_body = await response.text().catch(() => "");
          }
        } catch (e) {
          console.error("[execute-call-action] webhook error:", (e as Error).message);
          results.error = (e as Error).message;
        }
        break;
      }

      case "start_sequence": {
        const sequenceId = actionConfig.sequence_id as string;
        const sequenceType = (actionConfig.sequence_type as string) || "dispatch";

        if (!sequenceId) {
          results.skipped = true;
          results.reason = "Missing sequence_id";
          break;
        }

        if (!lead_id) {
          results.skipped = true;
          results.reason = "Missing lead_id for sequence trigger";
          break;
        }

        // Get lead phone for sequence
        const { data: leadForSeq } = await supabase
          .from("call_leads")
          .select("phone, name")
          .eq("id", lead_id)
          .single();

        if (!leadForSeq?.phone) {
          results.skipped = true;
          results.reason = "Lead phone not found";
          break;
        }

        if (sequenceType === "dispatch") {
          try {
            const { error: invokeError } = await supabase.functions.invoke(
              "execute-dispatch-sequence",
              {
                body: {
                  sequenceId,
                  contactPhone: leadForSeq.phone,
                  contactName: leadForSeq.name || "",
                  userId: action.user_id,
                  trigger: "retry_exceeded",
                },
              }
            );
            if (invokeError) {
              console.error("[execute-call-action] dispatch sequence error:", invokeError);
              results.error = String(invokeError);
            } else {
              results.success = true;
            }
          } catch (e) {
            console.error("[execute-call-action] dispatch invoke error:", (e as Error).message);
            results.error = (e as Error).message;
          }
        } else {
          // group sequence
          try {
            const { error: invokeError } = await supabase.functions.invoke(
              "trigger-sequence",
              {
                body: {
                  sequenceId,
                  phone: leadForSeq.phone,
                  userId: action.user_id,
                  trigger: "retry_exceeded",
                },
              }
            );
            if (invokeError) {
              console.error("[execute-call-action] group sequence error:", invokeError);
              results.error = String(invokeError);
            } else {
              results.success = true;
            }
          } catch (e) {
            console.error("[execute-call-action] group invoke error:", (e as Error).message);
            results.error = (e as Error).message;
          }
        }
        break;
      }

      case "custom_message": {
        const webhookUrl = (actionConfig.webhook_url || actionConfig.url) as string;
        if (!webhookUrl) {
          results.skipped = true;
          results.reason = "Missing webhook_url in action config";
          break;
        }

        // Fetch the custom_message text from the latest call_log to use as actions.text
        let customMessageText: string | null = null;
        if (lead_id && campaign_id) {
          const { data: logData } = await supabase
            .from("call_logs")
            .select("custom_message")
            .eq("lead_id", lead_id)
            .eq("campaign_id", campaign_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          customMessageText = logData?.custom_message || null;
        }

        const payload = await buildActionPayload(customMessageText);

        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([payload]),
          });

          results.success = response.ok;
          results.status_code = response.status;
          if (!response.ok) {
            results.response_body = await response.text().catch(() => "");
          }
        } catch (e) {
          console.error("[execute-call-action] custom_message webhook error:", (e as Error).message);
          results.error = (e as Error).message;
        }
        break;
      }

      default:
        results.skipped = true;
        results.reason = `Unknown action type: ${actionType}`;
    }

    console.log(`[execute-call-action] Result:`, JSON.stringify(results));

    // Persist action result to the most recent call_log
    if (lead_id && campaign_id) {
      try {
        const { data: latestLog } = await supabase
          .from("call_logs")
          .select("id, notes")
          .eq("lead_id", lead_id)
          .eq("campaign_id", campaign_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestLog) {
          const automationNote = results.success
            ? `[Automação] ${actionType} executado com sucesso`
            : `[Automação] ${actionType} falhou: ${results.error || results.reason || "erro desconhecido"}`;

          const updatedNotes = latestLog.notes
            ? `${latestLog.notes}\n${automationNote}`
            : automationNote;

          await supabase
            .from("call_logs")
            .update({ action_id: action_id, notes: updatedNotes })
            .eq("id", latestLog.id);

          console.log(`[execute-call-action] Persisted to call_log ${latestLog.id}`);
        }
      } catch (persistErr) {
        console.error("[execute-call-action] Failed to persist to call_log:", (persistErr as Error).message);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[execute-call-action] Error:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
