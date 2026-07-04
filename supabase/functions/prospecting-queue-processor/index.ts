import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logProspectingEvent } from "../_shared/prospecting-events.ts";
import { notifyProspecting } from "../_shared/prospecting-alerts.ts";

// Separate cron entry point from process-scheduled-messages on purpose:
// that function already covers four unrelated concerns (group messages,
// message sequences, dispatch sequences, delay resumption) at ~1400 lines --
// coupling prospecting's timeout/failure profile to it is unnecessary risk.
// Invoke this function on its own schedule (e.g. every 1 minute) via
// pg_cron/pg_net or an external scheduler using the service-role key.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueuePolicy {
  delay_min_seconds?: number;
  delay_max_seconds?: number;
  hourly_limit?: number | null;
  daily_limit?: number | null;
  allowed_days?: number[];
  start_time?: string;
  end_time?: string;
  timezone?: string;
  pause_on_reply?: boolean;
  allow_reentry?: boolean;
}

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const STUCK_PROCESSING_MINUTES = 10;

function resolveNowInTimezone(timezone: string): { currentTime: string; currentDay: number } {
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const dayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" });
  const parts = timeFormatter.formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const currentDay = DAY_MAP[dayFormatter.format(now)] ?? now.getDay();
  return { currentTime: `${hour}:${minute}`, currentDay };
}

function isWithinAllowedWindow(policy: QueuePolicy): boolean {
  const { currentTime, currentDay } = resolveNowInTimezone(policy.timezone || "America/Sao_Paulo");
  const allowedDays = policy.allowed_days ?? [1, 2, 3, 4, 5];
  if (!allowedDays.includes(currentDay)) return false;
  const start = policy.start_time || "00:00";
  const end = policy.end_time || "23:59";
  return currentTime >= start && currentTime <= end;
}

function randomDelaySeconds(policy: QueuePolicy): number {
  const min = policy.delay_min_seconds ?? 120;
  const max = policy.delay_max_seconds ?? 240;
  if (max <= min) return min;
  return Math.floor(min + Math.random() * (max - min));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Orphan cleanup: items stuck "processing" for too long get retried ──
    const stuckThreshold = new Date(Date.now() - STUCK_PROCESSING_MINUTES * 60 * 1000).toISOString();
    const { data: stuckItems } = await supabase
      .from("prospecting_queue")
      .select("id, attempts, max_attempts")
      .eq("status", "processing")
      .lt("updated_at", stuckThreshold);

    for (const stuck of stuckItems ?? []) {
      const nextAttempts = (stuck.attempts ?? 0) + 1;
      await supabase
        .from("prospecting_queue")
        .update({
          status: nextAttempts >= stuck.max_attempts ? "failed" : "pending",
          attempts: nextAttempts,
          last_error: "Preso em 'processing' por mais de 10 minutos, reprocessado automaticamente.",
        })
        .eq("id", stuck.id);
    }

    // ── Active campaigns this tick could dispatch for ──
    const { data: dispatchingCampaigns } = await supabase
      .from("prospecting_campaigns")
      .select("id, company_id, queue_policy, instance_id")
      .eq("status", "dispatching");

    const companyIds = Array.from(new Set((dispatchingCampaigns ?? []).map((c) => c.company_id).filter(Boolean)));

    const results: Record<string, string> = {};

    for (const companyId of companyIds) {
      const { data: claimedRows } = await supabase.rpc("prospecting_queue_get_next", {
        p_company_id: companyId,
        p_max_concurrency: 1,
      });

      const claimed = claimedRows?.[0];
      if (!claimed) {
        results[companyId as string] = "no_eligible_item";
        continue;
      }

      const campaign = (dispatchingCampaigns ?? []).find((c) => c.id === claimed.out_prospecting_campaign_id);
      const policy: QueuePolicy = (campaign?.queue_policy as QueuePolicy) || {};

      const release = async (reason: string) => {
        await supabase.from("prospecting_queue").update({ status: "pending" }).eq("id", claimed.queue_id);
        results[companyId as string] = reason;
      };

      if (!campaign) {
        await release("campaign_not_found");
        continue;
      }

      if (!isWithinAllowedWindow(policy)) {
        await release("outside_allowed_window");
        continue;
      }

      // Hourly / daily limit check, scoped to this specific campaign.
      const hourStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      if (policy.hourly_limit) {
        const { count } = await supabase
          .from("prospecting_queue")
          .select("id", { count: "exact", head: true })
          .eq("prospecting_campaign_id", campaign.id)
          .eq("status", "completed")
          .gte("completed_at", hourStart);
        if ((count ?? 0) >= policy.hourly_limit) {
          await release("hourly_limit_reached");
          continue;
        }
      }

      if (policy.daily_limit) {
        const { count } = await supabase
          .from("prospecting_queue")
          .select("id", { count: "exact", head: true })
          .eq("prospecting_campaign_id", campaign.id)
          .eq("status", "completed")
          .gte("completed_at", dayStart.toISOString());
        if ((count ?? 0) >= policy.daily_limit) {
          await release("daily_limit_reached");
          await logProspectingEvent(supabase, {
            companyId: campaign.company_id,
            campaignId: campaign.id,
            eventType: "prospecting.daily_limit_hit",
          });
          await notifyProspecting(supabase, {
            companyId: campaign.company_id,
            severity: "warning",
            title: "Limite diário atingido",
            description: "O limite diário foi atingido. Os próximos contatos serão retomados amanhã.",
            entity: `prospecting_campaign:${campaign.id}`,
          });
          continue;
        }
      }

      // Instance connectivity check.
      if (claimed.out_instance_id) {
        const { data: instance } = await supabase
          .from("instances")
          .select("status")
          .eq("id", claimed.out_instance_id)
          .maybeSingle();
        if (!instance || instance.status !== "connected") {
          await release("instance_disconnected");
          await logProspectingEvent(supabase, {
            companyId: campaign.company_id,
            campaignId: campaign.id,
            leadId: claimed.out_lead_id,
            eventType: "prospecting.instance_disconnected",
          });
          await notifyProspecting(supabase, {
            companyId: campaign.company_id,
            severity: "warning",
            title: "Instância desconectada",
            description: "A instância de WhatsApp está desconectada. A fila será retomada quando ela reconectar.",
            entity: `prospecting_campaign:${campaign.id}`,
          });
          continue;
        }
      }

      // Re-check "already ran this automation" defensively, unless re-entry is allowed.
      if (!policy.allow_reentry) {
        const { data: alreadyRan } = await supabase
          .from("dispatch_campaign_contacts")
          .select("id")
          .eq("campaign_id", claimed.out_automation_campaign_id)
          .eq("lead_id", claimed.out_lead_id)
          .eq("status", "completed")
          .maybeSingle();
        if (alreadyRan) {
          await supabase.from("prospecting_queue").update({ status: "skipped" }).eq("id", claimed.queue_id);
          results[companyId as string] = "skipped_already_ran";
          continue;
        }
      }

      const { data: lead } = await supabase
        .from("leads")
        .select("phone, name")
        .eq("id", claimed.out_lead_id)
        .maybeSingle();

      try {
        const dispatchResponse = await fetch(`${supabaseUrl}/functions/v1/execute-dispatch-sequence`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            campaignId: claimed.out_automation_campaign_id,
            sequenceId: claimed.out_automation_sequence_id,
            contactPhone: lead?.phone,
            contactName: lead?.name,
            contactId: claimed.out_lead_id,
          }),
        });

        const dispatchData = await dispatchResponse.json().catch(() => ({}));

        if (dispatchResponse.ok && dispatchData?.error === undefined) {
          await supabase
            .from("prospecting_queue")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", claimed.queue_id);
          await logProspectingEvent(supabase, {
            companyId: campaign.company_id,
            campaignId: campaign.id,
            leadId: claimed.out_lead_id,
            eventType: "prospecting.lead_dispatched",
          });
          results[companyId as string] = "dispatched";
        } else {
          throw new Error(dispatchData?.error || `HTTP ${dispatchResponse.status}`);
        }
      } catch (dispatchError) {
        const nextAttempts = (claimed.out_attempts ?? 0) + 1;
        const willRetry = nextAttempts < (claimed.out_max_attempts ?? 3);
        await supabase
          .from("prospecting_queue")
          .update({
            status: willRetry ? "pending" : "failed",
            attempts: nextAttempts,
            scheduled_at: willRetry ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null,
            last_error: String(dispatchError),
          })
          .eq("id", claimed.queue_id);
        await logProspectingEvent(supabase, {
          companyId: campaign.company_id,
          campaignId: campaign.id,
          leadId: claimed.out_lead_id,
          eventType: "prospecting.lead_failed",
          payload: { error: String(dispatchError) },
        });
        results[companyId as string] = "dispatch_failed";
      }

      // Stagger the next pending item for this same campaign by a random delay.
      const { data: nextPending } = await supabase
        .from("prospecting_queue")
        .select("id")
        .eq("prospecting_campaign_id", campaign.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextPending) {
        const delaySeconds = randomDelaySeconds(policy);
        await supabase
          .from("prospecting_queue")
          .update({ scheduled_at: new Date(Date.now() + delaySeconds * 1000).toISOString() })
          .eq("id", nextPending.id);
      }

      // If nothing is left pending/scheduled/processing for this campaign, close it out.
      const { count: remaining } = await supabase
        .from("prospecting_queue")
        .select("id", { count: "exact", head: true })
        .eq("prospecting_campaign_id", campaign.id)
        .in("status", ["pending", "scheduled", "processing"]);

      if (!remaining) {
        const { count: failedCount } = await supabase
          .from("prospecting_queue")
          .select("id", { count: "exact", head: true })
          .eq("prospecting_campaign_id", campaign.id)
          .in("status", ["failed", "skipped"]);

        const finalStatus = (failedCount ?? 0) > 0 ? "partially_completed" : "completed";
        await supabase.from("prospecting_campaigns").update({ status: finalStatus }).eq("id", campaign.id);
        await logProspectingEvent(supabase, {
          companyId: campaign.company_id,
          campaignId: campaign.id,
          eventType: finalStatus === "completed" ? "prospecting.completed" : "prospecting.failed",
        });
        await notifyProspecting(supabase, {
          companyId: campaign.company_id,
          severity: finalStatus === "completed" ? "success" : "warning",
          title: finalStatus === "completed" ? "Prospecção concluída" : "Prospecção concluída com erros",
          description:
            finalStatus === "completed"
              ? "Todos os leads da fila foram processados."
              : "A fila foi processada, mas alguns leads falharam ou foram pulados.",
          entity: `prospecting_campaign:${campaign.id}`,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, companiesProcessed: companyIds.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ProspectingQueueProcessor] Unhandled error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
