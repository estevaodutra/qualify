import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecutionList {
  id: string;
  user_id: string;
  campaign_id: string;
  window_type: string;
  window_start_time: string | null;
  window_end_time: string | null;
  window_duration_hours: number | null;
  monitored_events: string[];
  action_type: string;
  webhook_url: string | null;
  webhook_params: Record<string, any> | Array<{ id?: string; name: string; type: string; value: string }> | null;
  message_template: string | null;
  call_campaign_id: string | null;
  current_cycle_id: string;
  current_window_start: string | null;
  current_window_end: string | null;
  is_active: boolean;
  execution_schedule_type: string;
  execution_scheduled_time: string | null;
  execution_days_of_week: number[] | null;
}

interface ExecutionLead {
  id: string;
  phone: string;
  name: string | null;
  origin_event: string | null;
  origin_detail: string | null;
  lid?: string | null;
}

// Recursive variable substitution: replaces {{entity.field}} and {{field}} in strings,
// arrays, and objects. Unknown variables remain literal for easier debugging.
function replaceVariables(obj: any, ctx: Record<string, any>): any {
  if (typeof obj === "string") {
    return obj
      .replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, entity, field) => {
        const value = ctx?.[entity]?.[field];
        return value !== undefined && value !== null ? String(value) : match;
      })
      .replace(/\{\{(\w+)\}\}/g, (match, field) => {
        const value = ctx?.[field];
        return value !== undefined && value !== null && typeof value !== "object"
          ? String(value)
          : match;
      });
  }
  if (Array.isArray(obj)) return obj.map((item) => replaceVariables(item, ctx));
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) result[k] = replaceVariables(v, ctx);
    return result;
  }
  return obj;
}

// Convert webhook_params (array of typed key-value fields OR legacy object) to a plain object,
// applying variable substitution and type coercion. Empty/invalid → {}.
function paramsToObject(params: any, ctx: Record<string, any>): Record<string, any> {
  if (Array.isArray(params)) {
    const result: Record<string, any> = {};
    for (const field of params) {
      const name = typeof field?.name === "string" ? field.name.trim() : "";
      if (!name) continue;
      const rawValue = field?.value ?? "";
      const substituted = replaceVariables(String(rawValue), ctx);
      const type = field?.type;
      if (type === "number") {
        const n = Number(substituted);
        result[name] = Number.isFinite(n) ? n : 0;
      } else if (type === "boolean") {
        result[name] = substituted === "true" || substituted === "1";
      } else {
        result[name] = substituted;
      }
    }
    return result;
  }
  if (params && typeof params === "object") {
    return replaceVariables(params, ctx) as Record<string, any>;
  }
  return {};
}

function calculateNextWindow(list: ExecutionList): { nextStart: string; nextEnd: string } {
  const now = new Date();

  if (list.window_type === "duration") {
    const hours = list.window_duration_hours || 6;
    const nextStart = list.current_window_end ? new Date(list.current_window_end) : now;
    const nextEnd = new Date(nextStart.getTime() + hours * 60 * 60 * 1000);
    return { nextStart: nextStart.toISOString(), nextEnd: nextEnd.toISOString() };
  }

  // Fixed window: calculate next day's window
  const startParts = (list.window_start_time || "08:00:00").split(":");
  const endParts = (list.window_end_time || "18:00:00").split(":");

  const startH = parseInt(startParts[0]);
  const startM = parseInt(startParts[1] || "0");
  const endH = parseInt(endParts[0]);
  const endM = parseInt(endParts[1] || "0");

  // Start from tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(startH, startM, 0, 0);

  const nextEnd = new Date(tomorrow);
  nextEnd.setHours(endH, endM, 0, 0);

  // Handle overnight windows (e.g., 22:00 -> 06:00)
  if (endH < startH || (endH === startH && endM <= startM)) {
    nextEnd.setDate(nextEnd.getDate() + 1);
  }

  return { nextStart: tomorrow.toISOString(), nextEnd: nextEnd.toISOString() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const forcedListId: string | null = body?.list_id ?? null;
    const forcedLeadIds: string[] | null = Array.isArray(body?.lead_ids) && body.lead_ids.length > 0 ? body.lead_ids : null;
    const manualMembers: Array<{ phone: string; lid?: string | null; name?: string | null }> | null =
      Array.isArray(body?.members) && body.members.length > 0 ? body.members : null;
    const intervalSeconds: number = Number(body?.interval_seconds) > 0 ? Number(body.interval_seconds) : 0;

    // ── Manual execution: trigger list action for arbitrary members (from Members tab) ──
    if (forcedListId && manualMembers) {
      const { data: list, error: listErr } = await supabase
        .from("group_execution_lists")
        .select("*")
        .eq("id", forcedListId)
        .maybeSingle();

      if (listErr || !list) {
        return new Response(JSON.stringify({ ok: false, error: listErr?.message || "List not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cycleId = (list as ExecutionList).current_cycle_id || crypto.randomUUID();
      const totalMembers = manualMembers.length;

      // Run in background to avoid 150s edge function timeout when sending many
      // members or when intervalSeconds is large.
      const backgroundTask = (async () => {
        let processed = 0;
        let errors = 0;
        for (let i = 0; i < manualMembers.length; i++) {
          const member = manualMembers[i];
          const phone = String(member.phone || "").trim();
          if (!phone) continue;

          const { data: inserted, error: insertErr } = await supabase
            .from("group_execution_leads")
            .insert({
              list_id: forcedListId,
              cycle_id: cycleId,
              user_id: (list as ExecutionList).user_id,
              phone,
              lid: member.lid ?? null,
              name: member.name ?? null,
              origin_event: "manual_execute",
              origin_detail: "members_tab",
              status: "pending",
            })
            .select("id, phone, name, origin_event, origin_detail, lid")
            .maybeSingle();

          if (insertErr || !inserted) {
            errors++;
            console.error(`[group-execution-processor] Manual insert failed:`, insertErr?.message);
            continue;
          }

          try {
            await executeAction(supabaseUrl, supabaseKey, supabase, list as ExecutionList, inserted as ExecutionLead);
            await supabase
              .from("group_execution_leads")
              .update({ status: "executed", executed_at: new Date().toISOString() })
              .eq("id", inserted.id);
            processed++;
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            await supabase
              .from("group_execution_leads")
              .update({ status: "failed", error_message: errorMsg, executed_at: new Date().toISOString() })
              .eq("id", inserted.id);
            errors++;
            console.error(`[group-execution-processor] Manual lead ${inserted.id} failed:`, errorMsg);
          }

          if (intervalSeconds > 0 && i < manualMembers.length - 1) {
            await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
          }
        }
        console.log(`[group-execution-processor] Manual run done: ${processed} ok, ${errors} failed`);
      })();

      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(backgroundTask);
      } else {
        // Fallback: fire-and-forget
        backgroundTask.catch((e) => console.error("[group-execution-processor] bg task error:", e));
      }

      return new Response(
        JSON.stringify({ ok: true, mode: "manual", queued: totalMembers, background: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Selective re-execution: process only specified leads, do not rotate cycle ──
    if (forcedListId && forcedLeadIds) {
      const { data: list, error: listErr } = await supabase
        .from("group_execution_lists")
        .select("*")
        .eq("id", forcedListId)
        .maybeSingle();

      if (listErr || !list) {
        return new Response(JSON.stringify({ ok: false, error: listErr?.message || "List not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: leads } = await supabase
        .from("group_execution_leads")
        .select("id, phone, name, origin_event, origin_detail, lid")
        .in("id", forcedLeadIds);

      let processed = 0;
      let errors = 0;
      for (const lead of (leads || []) as ExecutionLead[]) {
        try {
          // Reset to pending before re-executing
          await supabase
            .from("group_execution_leads")
            .update({ status: "pending", executed_at: null, error_message: null })
            .eq("id", lead.id);

          await executeAction(supabaseUrl, supabaseKey, supabase, list as ExecutionList, lead);
          await supabase
            .from("group_execution_leads")
            .update({ status: "executed", executed_at: new Date().toISOString() })
            .eq("id", lead.id);
          processed++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          await supabase
            .from("group_execution_leads")
            .update({ status: "failed", error_message: errorMsg, executed_at: new Date().toISOString() })
            .eq("id", lead.id);
          errors++;
          console.error(`[group-execution-processor] Re-exec lead ${lead.id} failed:`, errorMsg);
        }
      }

      return new Response(JSON.stringify({ ok: true, mode: "selective", processed, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lists ready for execution
    let query = supabase
      .from("group_execution_lists")
      .select("*")
      .eq("is_active", true);

    if (forcedListId) {
      query = query.eq("id", forcedListId);
    }

    const { data: allLists, error: listError } = await query;

    if (listError) {
      console.error("[group-execution-processor] Error fetching lists:", listError);
      return new Response(JSON.stringify({ ok: false, error: listError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter lists based on schedule type
    const now = new Date();
    const lists = forcedListId
      ? (allLists || [])
      : (allLists || []).filter((list: ExecutionList) => {
          // Immediate lists are always processed by the trigger, not by the cron
          if (list.execution_schedule_type === "immediate") return false;

          if (list.execution_schedule_type === "scheduled") {
            if (!list.execution_scheduled_time) return false;
            const [h, m] = list.execution_scheduled_time.split(":").map(Number);
            const scheduledToday = new Date(now);
            scheduledToday.setHours(h, m, 0, 0);
            if (now < scheduledToday) return false;
            if (list.execution_days_of_week && list.execution_days_of_week.length > 0) {
              if (!list.execution_days_of_week.includes(now.getDay())) return false;
            }
            if (list.last_executed_at) {
              const lastExec = new Date(list.last_executed_at);
              if (lastExec >= scheduledToday) return false;
            }
            return true;
          }
          // Default: window_end — execute when window has ended
          return list.current_window_end && new Date(list.current_window_end) <= now;
        });

    if (!lists || lists.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "No lists ready" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ list_id: string; leads_processed: number; errors: number }> = [];

    for (const list of lists as ExecutionList[]) {
      let processed = 0;
      let errors = 0;

      // Fetch pending leads for current cycle
      const { data: leads } = await supabase
        .from("group_execution_leads")
        .select("id, phone, name, origin_event, origin_detail, lid")
        .eq("cycle_id", list.current_cycle_id)
        .eq("status", "pending");

      if (leads && leads.length > 0) {
        for (const lead of leads as ExecutionLead[]) {
          try {
            await executeAction(supabaseUrl, supabaseKey, supabase, list, lead);
            await supabase
              .from("group_execution_leads")
              .update({ status: "executed", executed_at: new Date().toISOString() })
              .eq("id", lead.id);
            processed++;
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            await supabase
              .from("group_execution_leads")
              .update({ status: "failed", error_message: errorMsg })
              .eq("id", lead.id);
            errors++;
            console.error(`[group-execution-processor] Lead ${lead.id} failed:`, errorMsg);
          }
        }
      }

      // Check if fulltime (24h) — cumulative mode: keep same cycle
      const isFulltimeList =
        list.window_type === "fixed" &&
        (list.window_start_time || "").startsWith("00:00") &&
        (list.window_end_time || "").startsWith("23:59");

      if (isFulltimeList) {
        // Cumulative: only update last_executed_at, keep cycle_id
        await supabase
          .from("group_execution_lists")
          .update({
            last_executed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", list.id);
      } else {
        // Normal: new cycle + new window
        const { nextStart, nextEnd } = calculateNextWindow(list);
        await supabase
          .from("group_execution_lists")
          .update({
            last_executed_at: new Date().toISOString(),
            current_cycle_id: crypto.randomUUID(),
            current_window_start: nextStart,
            current_window_end: nextEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", list.id);
      }

      results.push({ list_id: list.id, leads_processed: processed, errors });
      console.log(`[group-execution-processor] List ${list.id}: ${processed} executed, ${errors} failed`);
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[group-execution-processor] Error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function executeAction(
  supabaseUrl: string,
  supabaseKey: string,
  supabase: ReturnType<typeof createClient>,
  list: ExecutionList,
  lead: ExecutionLead
): Promise<void> {
  switch (list.action_type) {
    case "webhook": {
      if (!list.webhook_url) throw new Error("No webhook URL configured");

      // Enrich context with campaign + group info for variable substitution
      const { data: campaign } = await supabase
        .from("group_campaigns")
        .select("id, name, instance_id")
        .eq("id", list.campaign_id)
        .maybeSingle();
      const { data: campaignGroups } = await supabase
        .from("campaign_groups")
        .select("group_jid")
        .eq("campaign_id", list.campaign_id)
        .limit(1);
      const groupJid = (campaignGroups && campaignGroups[0]?.group_jid) || null;

      const timestamp = new Date().toISOString();
      const basePayload: Record<string, any> = {
        phone: lead.phone,
        name: lead.name,
        origin_event: lead.origin_event,
        origin_detail: lead.origin_detail,
        campaign_id: list.campaign_id,
        cycle_id: list.current_cycle_id,
        executed_at: timestamp,
      };

      // Build variable substitution context
      const ctx: Record<string, any> = {
        lead: {
          phone: lead.phone,
          name: lead.name,
          email: null,
          lid: lead.lid ?? null,
        },
        campaign: {
          id: list.campaign_id,
          name: campaign?.name ?? null,
        },
        group: { id: groupJid },
        event: { type: lead.origin_event ?? null },
        timestamp,
      };

      const customParams = paramsToObject(list.webhook_params, ctx);

      const finalPayload = { ...basePayload, ...customParams };

      const resp = await fetch(list.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Webhook returned ${resp.status}: ${text.slice(0, 200)}`);
      }
      await resp.text();
      break;
    }

    case "message": {
      if (!list.message_template) throw new Error("No message template configured");
      const message = list.message_template
        .replace(/\{\{name\}\}/g, lead.name || "")
        .replace(/\{\{phone\}\}/g, lead.phone);

      // Get campaign instance
      const { data: campaign } = await supabase
        .from("group_campaigns")
        .select("instance_id")
        .eq("id", list.campaign_id)
        .maybeSingle();

      if (!campaign?.instance_id) throw new Error("Campaign has no instance");

      const { data: instance } = await supabase
        .from("instances")
        .select("external_instance_id, external_instance_token")
        .eq("id", campaign.instance_id)
        .maybeSingle();

      if (!instance?.external_instance_id || !instance?.external_instance_token) {
        throw new Error("Instance credentials not found");
      }

      const zapiUrl = `https://api.z-api.io/instances/${instance.external_instance_id}/token/${instance.external_instance_token}/send-text`;
      const resp = await fetch(zapiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": Deno.env.get("ZAPI_CLIENT_TOKEN") || "" },
        body: JSON.stringify({ phone: lead.phone, message }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Z-API returned ${resp.status}: ${text.slice(0, 200)}`);
      }
      await resp.text();
      break;
    }

    case "call": {
      if (!list.call_campaign_id) throw new Error("No call campaign configured");

      // Get call campaign to find user_id
      const { data: callCampaign } = await supabase
        .from("call_campaigns")
        .select("id, user_id, company_id")
        .eq("id", list.call_campaign_id)
        .maybeSingle();

      if (!callCampaign) throw new Error("Call campaign not found");

      const { error: insertError } = await supabase.from("call_queue").insert({
        campaign_id: list.call_campaign_id,
        user_id: callCampaign.user_id,
        company_id: callCampaign.company_id,
        phone: lead.phone,
        lead_name: lead.name,
        source: "execution_list",
        status: "waiting",
      });

      if (insertError) throw new Error(`Insert to call_queue failed: ${insertError.message}`);
      break;
    }

    default:
      throw new Error(`Unknown action type: ${list.action_type}`);
  }
}
