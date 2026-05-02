import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface CallPanelEntry {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  leadId: string | null;
  leadName: string | null;
  leadPhone: string | null;
  operatorId: string | null;
  operatorName: string | null;
  operatorExtension: string | null;
  callStatus: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  actionId: string | null;
  externalCallId: string | null;
  createdAt: string;
  leadAttempts: number;
  audioUrl: string | null;
  attemptNumber: number;
  maxAttempts: number;
  isPriority: boolean;
  observations: string | null;
}

export interface CallPanelStats {
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  failed: number;
}

interface DbCallLogJoined {
  id: string;
  campaign_id: string | null;
  lead_id: string | null;
  operator_id: string | null;
  call_status: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  action_id: string | null;
  external_call_id: string | null;
  created_at: string | null;
  audio_url: string | null;
  attempt_number: number | null;
  max_attempts: number | null;
  observations: string | null;
  call_leads: {
    name: string | null;
    phone: string;
    attempts: number | null;
  } | null;
  call_campaigns: {
    name: string;
    is_priority: boolean | null;
  } | null;
  call_operators: {
    operator_name: string | null;
    extension: string | null;
  } | null;
}

const SCHEDULED_STATUSES = ["scheduled", "ready"];
const IN_PROGRESS_STATUSES = ["dialing", "ringing", "answered", "in_progress"];
const COMPLETED_STATUSES = ["completed"];
const FAILED_STATUSES = ["no_answer", "busy", "failed"];
const CANCELLED_STATUSES = ["cancelled"];

function transformEntry(db: DbCallLogJoined): CallPanelEntry {
  return {
    id: db.id,
    campaignId: db.campaign_id,
    campaignName: db.call_campaigns?.name || null,
    leadId: db.lead_id,
    leadName: db.call_leads?.name || null,
    leadPhone: db.call_leads?.phone || null,
    operatorId: db.operator_id,
    operatorName: db.call_operators?.operator_name || null,
    operatorExtension: db.call_operators?.extension || null,
    callStatus: db.call_status || "scheduled",
    scheduledFor: db.scheduled_for,
    startedAt: db.started_at,
    endedAt: db.ended_at,
    durationSeconds: db.duration_seconds,
    notes: db.notes,
    actionId: db.action_id,
    externalCallId: db.external_call_id,
    createdAt: db.created_at || new Date().toISOString(),
    leadAttempts: db.call_leads?.attempts || 0,
    audioUrl: db.audio_url || null,
    attemptNumber: db.attempt_number ?? 1,
    maxAttempts: db.max_attempts ?? 1,
    isPriority: db.call_campaigns?.is_priority ?? false,
    observations: db.observations || null,
  };
}

export function useCallPanel(filters?: {
  status?: string;
  campaignId?: string;
  search?: string;
  date?: string;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [bulkPollingActive, setBulkPollingActive] = useState(false);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["call_panel", filters, activeCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_logs")
        .select("*, call_leads(name, phone, attempts), call_campaigns(name, is_priority), call_operators(operator_name, extension)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }

      if (filters?.campaignId) {
        query = query.eq("campaign_id", filters.campaignId);
      }

      if (filters?.status) {
        let statusList: string[] = [];
        switch (filters.status) {
          case "scheduled": statusList = SCHEDULED_STATUSES; break;
          case "in_progress": statusList = IN_PROGRESS_STATUSES; break;
          case "completed": statusList = COMPLETED_STATUSES; break;
          case "cancelled": statusList = CANCELLED_STATUSES; break;
          case "failed": statusList = FAILED_STATUSES; break;
          default: statusList = [filters.status];
        }
        query = query.in("call_status", statusList);
      }

      if (filters?.date) {
        query = query.gte("created_at", `${filters.date}T00:00:00`).lte("created_at", `${filters.date}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data as DbCallLogJoined[]).map(transformEntry);

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        const sDigits = s.replace(/\D/g, "");
        results = results.filter((e) => {
          const nameMatch = e.leadName?.toLowerCase().includes(s);
          const phoneDigits = (e.leadPhone || "").replace(/\D/g, "");
          const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
          return nameMatch || phoneMatch;
        });
      }

      // Deduplicate by lead_id + campaign_id, keep only the most recent
      const deduped = new Map<string, CallPanelEntry>();
      for (const entry of results) {
        const key = `${entry.leadId}_${entry.campaignId}`;
        const existing = deduped.get(key);
        if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
          deduped.set(key, entry);
        }
      }

      return Array.from(deduped.values());
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const stats: CallPanelStats = {
    scheduled: entries.filter((e) => SCHEDULED_STATUSES.includes(e.callStatus)).length,
    inProgress: entries.filter((e) => IN_PROGRESS_STATUSES.includes(e.callStatus)).length,
    completed: entries.filter((e) => COMPLETED_STATUSES.includes(e.callStatus)).length,
    cancelled: entries.filter((e) => CANCELLED_STATUSES.includes(e.callStatus)).length,
    failed: entries.filter((e) => FAILED_STATUSES.includes(e.callStatus)).length,
  };

  const delayCallMutation = useMutation({
    mutationFn: async ({ callId, minutes }: { callId: string; minutes: number }) => {
      const entry = entries.find((e) => e.id === callId);
      if (!entry?.scheduledFor) throw new Error("No scheduled_for");
      const newTime = new Date(new Date(entry.scheduledFor).getTime() + minutes * 60000).toISOString();
      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ scheduled_for: newTime })
        .eq("id", callId);
      if (error) throw error;
      return newTime;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Reagendado", description: "Horário atualizado." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const rescheduleCallMutation = useMutation({
    mutationFn: async ({ callId, scheduledFor }: { callId: string; scheduledFor: string }) => {
      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ scheduled_for: scheduledFor, call_status: "scheduled" })
        .eq("id", callId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Reagendado", description: "Ligação reagendada." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const cancelCallMutation = useMutation({
    mutationFn: async ({ callId, reason }: { callId: string; reason?: string }) => {
      const entry = entries.find((e) => e.id === callId);

      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ call_status: "cancelled", notes: reason || null, ended_at: new Date().toISOString() })
        .eq("id", callId);
      if (error) throw error;

      // Release operator atomically via RPC
      if (entry?.operatorId && ["dialing", "ringing", "answered", "in_progress"].includes(entry.callStatus)) {
        await (supabase as any).rpc('release_operator', { p_call_id: callId, p_force: true });
      }

      // Remove corresponding call_queue item
      await (supabase as any)
        .from("call_queue")
        .delete()
        .eq("call_log_id", callId);

      if (entry?.leadId) {
        await (supabase as any)
          .from("call_leads")
          .update({ status: "cancelled", assigned_operator_id: null })
          .eq("id", entry.leadId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Cancelada", description: "Ligação cancelada." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateOperatorMutation = useMutation({
    mutationFn: async ({ callId, operatorId }: { callId: string; operatorId: string }) => {
      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ operator_id: operatorId })
        .eq("id", callId);
      if (error) throw error;

      const entry = entries.find((e) => e.id === callId);
      if (entry?.leadId) {
        await (supabase as any)
          .from("call_leads")
          .update({ assigned_operator_id: operatorId })
          .eq("id", entry.leadId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Operador atualizado", description: "Operador da ligação alterado." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const bulkUpdateOperatorMutation = useMutation({
    mutationFn: async ({ callIds, operatorId }: { callIds: string[]; operatorId: string | null }) => {
      for (const callId of callIds) {
        const entry = entries.find((e) => e.id === callId);
        const isStuck = entry && ["dialing", "ringing"].includes(entry.callStatus);

        // If call is stuck in dialing/ringing, revert to ready and release old operator
        const logUpdate: Record<string, unknown> = { operator_id: operatorId };
        if (isStuck) {
          logUpdate.call_status = "ready";
          logUpdate.started_at = null;
        }

        const { error } = await (supabase as any)
          .from("call_logs")
          .update(logUpdate)
          .eq("id", callId);
        if (error) throw error;

        // Release old operator atomically via RPC
        if (isStuck && entry?.operatorId) {
          await (supabase as any).rpc('release_operator', { p_call_id: callId, p_force: true });
        }

        if (entry?.leadId) {
          await (supabase as any)
            .from("call_leads")
            .update({ assigned_operator_id: operatorId, status: "pending" })
            .eq("id", entry.leadId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Operadores atualizados", description: "Operador atribuído em massa." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });


  useEffect(() => {
    if (!bulkPollingActive) return;

    const interval = setInterval(async () => {
      const { data: readyCalls } = await (supabase as any)
        .from("call_logs")
        .select("id, campaign_id")
        .eq("call_status", "ready");

      if (!readyCalls?.length) {
        setBulkPollingActive(false);
        return;
      }

      const campaignIds = [...new Set(readyCalls.map((c: any) => c.campaign_id).filter(Boolean))];

      for (const campaignId of campaignIds) {
        try {
          // Ensure queue state is "running" so the tick won't be rejected
          await (supabase as any)
            .from("queue_execution_state")
            .update({ status: "running" })
            .eq("campaign_id", campaignId);

          await supabase.functions.invoke(
            `queue-processor?campaign_id=${campaignId}&action=tick`
          );
        } catch { /* ignore */ }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [bulkPollingActive]);

  const bulkEnqueueMutation = useMutation({
    mutationFn: async ({ callIds }: { callIds: string[] }) => {
      // Group calls by campaign_id
      const byCampaign: Record<string, string[]> = {};
      for (const callId of callIds) {
        const entry = entries.find((e) => e.id === callId);
        const cid = entry?.campaignId || "__none__";
        if (!byCampaign[cid]) byCampaign[cid] = [];
        byCampaign[cid].push(callId);
      }

      const now = new Date().toISOString();

      for (const [campaignId, ids] of Object.entries(byCampaign)) {
        // Release operators atomically via RPC for each call
        for (const id of ids) {
          await (supabase as any).rpc('release_operator', { p_call_id: id, p_force: true });
        }

        // Batch update: set status to ready, scheduled_for = now, operator_id = null
        const { error } = await (supabase as any)
          .from("call_logs")
          .update({ call_status: "ready", scheduled_for: now, operator_id: null })
          .in("id", ids);
        if (error) throw error;

        // Ensure queue_execution_state is running for this campaign
        if (campaignId !== "__none__") {
          const { data: existing } = await (supabase as any)
            .from("queue_execution_state")
            .select("id, status")
            .eq("campaign_id", campaignId)
            .maybeSingle();

          if (existing) {
            if (existing.status !== "running") {
              await (supabase as any)
                .from("queue_execution_state")
                .update({ status: "running", updated_at: now })
                .eq("id", existing.id);
            }
          } else {
            await (supabase as any)
              .from("queue_execution_state")
              .insert({
                campaign_id: campaignId,
                user_id: user?.id,
                status: "running",
                current_operator_index: 0,
                session_started_at: now,
              });
          }

          // Trigger queue-processor tick
          try {
            await supabase.functions.invoke(
              `queue-processor?campaign_id=${campaignId}&action=tick`,
            );
          } catch {
            // queue-processor may not be available, calls are still enqueued
          }
        }
      }

      return callIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      setBulkPollingActive(true);
      toast({ title: "Enfileiradas", description: `${count} ligações adicionadas à fila de discagem.` });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const dialNowMutation = useMutation({
    mutationFn: async (callId: string) => {
      const startTs = Date.now();
      const entry = entries.find((e) => e.id === callId);
      if (!entry) throw new Error("Ligação não encontrada");

      // Validar max attempts antes de prosseguir
      const { data: logData } = await (supabase as any)
        .from("call_logs")
        .select("attempt_number, max_attempts")
        .eq("id", callId)
        .maybeSingle();

      if (logData && logData.max_attempts && logData.attempt_number >= logData.max_attempts) {
        throw new Error("Máximo de tentativas atingido para este lead");
      }

      // CAMADA 3: Limpeza preventiva — cancelar call_logs ativos do operador antes de reservar
      if (entry.operatorId) {
        await (supabase as any)
          .from("call_logs")
          .update({ call_status: "cancelled", ended_at: new Date().toISOString() })
          .eq("operator_id", entry.operatorId)
          .in("call_status", ["dialing", "ringing", "answered", "in_progress"])
          .neq("id", callId);
      }

      // --- Reserve operator atomically via RPC ---
      let wasRedirected = false;

      // Try preferred operator first, then any available
      const { data: reservation, error: rpcError } = await (supabase as any).rpc('reserve_operator_for_call', {
        p_call_id: callId,
        p_campaign_id: entry.campaignId,
        p_preferred_operator_id: entry.operatorId || null,
      });

      if (rpcError || !reservation?.[0]?.success) {
        // No operator available — queue the call as waiting_operator
        await (supabase as any)
          .from("call_logs")
          .update({ call_status: "waiting_operator" })
          .eq("id", callId);
        return { queued: true };
      }

      const reservedOp = reservation[0];
      const effectiveOperator = {
        id: reservedOp.operator_id,
        name: reservedOp.operator_name,
        extension: reservedOp.operator_extension,
      };

      // Check if operator was redirected (different from original)
      if (entry.operatorId && reservedOp.operator_id !== entry.operatorId) {
        wasRedirected = true;
      }

      // Update call_log and lead with new operator
      await (supabase as any).from("call_logs").update({ operator_id: reservedOp.operator_id }).eq("id", callId);
      if (entry.leadId) {
        await (supabase as any).from("call_leads").update({ assigned_operator_id: reservedOp.operator_id }).eq("id", entry.leadId);
      }


      // Get campaign owner's user_id to resolve webhook
      const { data: campaignData } = await (supabase as any)
        .from("call_campaigns")
        .select("user_id")
        .eq("id", entry.campaignId)
        .single();

      const campaignOwnerId = campaignData?.user_id;

      // Fetch webhook config for "calls" category from campaign owner
      const { data: webhookConfigs } = await (supabase as any)
        .from("webhook_configs")
        .select("*")
        .eq("user_id", campaignOwnerId)
        .eq("category", "calls")
        .eq("is_active", true)
        .limit(1);

      const webhookUrl = webhookConfigs?.[0]?.url;

      if (!webhookUrl) {
        const { error } = await (supabase as any)
          .from("call_logs")
          .update({ scheduled_for: new Date().toISOString(), call_status: "ready" })
          .eq("id", callId);
        if (error) throw error;
        return { wasRedirected, operatorName: effectiveOperator.name };
      }

      // Update status to "dialing"
      const { error: updateErr } = await (supabase as any)
        .from("call_logs")
        .update({ call_status: "dialing", started_at: new Date().toISOString() })
        .eq("id", callId);
      if (updateErr) throw updateErr;

      // Build payload
      const payload = {
        action: "call.dial",
        call: {
          id: entry.id,
          status: "dialing",
          scheduled_for: entry.scheduledFor,
        },
        campaign: {
          id: entry.campaignId,
          name: entry.campaignName,
        },
        lead: {
          id: entry.leadId,
          phone: entry.leadPhone,
          name: entry.leadName,
        },
        operator: {
          id: effectiveOperator.id,
          name: effectiveOperator.name,
          extension: effectiveOperator.extension,
        },
      };

      try {
        const { data: proxyData, error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
          body: { url: webhookUrl, payload },
        });

        if (proxyError) {
          throw new Error(`Webhook respondeu com erro: ${proxyError.message}`);
        }

        // Try to extract external_call_id from proxied response
        try {
          const responseBody = typeof proxyData?.body === "string" ? JSON.parse(proxyData.body) : proxyData?.body;
          const externalId = Array.isArray(responseBody) ? responseBody[0]?.id : responseBody?.id;
          if (externalId) {
            await (supabase as any)
              .from("call_logs")
              .update({ external_call_id: externalId })
              .eq("id", callId);
          }
        } catch {
          // Response may not be JSON, that's fine
        }

        // Log sucesso em api_logs
        await (supabase as any).from("api_logs").insert({
          method: "POST",
          endpoint: "/call-dial",
          status_code: proxyData?.status || 200,
          response_time_ms: Date.now() - startTs,
          user_id: user?.id,
          request_body: payload,
          response_body: { source: "dialNow", call_id: callId, webhook_status: proxyData?.status },
        });
      } catch (webhookError: any) {
        // Log erro em api_logs
        await (supabase as any).from("api_logs").insert({
          method: "POST",
          endpoint: "/call-dial",
          status_code: 502,
          response_time_ms: Date.now() - startTs,
          user_id: user?.id,
          request_body: payload,
          error_message: webhookError.message,
        });

        // Revert status to "ready" on webhook failure and release operator via RPC
        await (supabase as any)
          .from("call_logs")
          .update({ call_status: "ready", started_at: null })
          .eq("id", callId);
        await (supabase as any).rpc('release_operator', { p_call_id: callId, p_force: true });
        throw new Error(`Falha ao acionar webhook: ${webhookError.message}`);
      }

      return { wasRedirected, operatorName: effectiveOperator.name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      if (result?.queued) {
        toast({ title: "Aguardando operador", description: "Ligação será realizada quando um operador estiver disponível." });
        return;
      }
      const desc = result?.wasRedirected
        ? `Operador redirecionado para ${result.operatorName}`
        : "Webhook acionado com sucesso.";
      toast({ title: "Ligação iniciada", description: desc });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const registerActionMutation = useMutation({
    mutationFn: async ({ callId, actionId, notes }: { callId: string; actionId: string; notes?: string }): Promise<{ automationSuccess: boolean; automationError?: string; skipped?: boolean }> => {
      const entry = entries.find((e) => e.id === callId);

      // Only save action_id + notes, do NOT mark as completed or release operator
      // The callback (call-status) is the single authority for ending calls
      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ action_id: actionId, notes: notes || null })
        .eq("id", callId);
      if (error) throw error;

      // Check if the action triggers a sequence automation (wrapped in try/catch to avoid crashing)
      let automationResult: { automationSuccess: boolean; automationError?: string } = { automationSuccess: true };
      try {
        const { data: actionData } = await (supabase as any)
          .from("call_script_actions")
          .select("action_type, action_config")
          .eq("id", actionId)
          .maybeSingle();

        if (actionData?.action_type === "start_sequence" && actionData.action_config) {
          const { campaignId: seqCampaignId, campaignType, sequenceId } = actionData.action_config as {
            campaignId?: string;
            campaignType?: string;
            sequenceId?: string;
          };

          console.log("[CallPanel] Automation config:", { campaignType, sequenceId, seqCampaignId, leadPhone: entry?.leadPhone });

          if (campaignType === "dispatch" && sequenceId) {
            if (!entry?.leadPhone) {
              console.warn("[CallPanel] leadPhone não encontrado para entry:", entry);
              automationResult = { automationSuccess: false, automationError: "Telefone do lead não encontrado para disparo" };
            } else {
              console.log("[CallPanel] Invoking execute-dispatch-sequence:", { campaignId: seqCampaignId, sequenceId, contactPhone: entry.leadPhone });
              const { data: result, error: fnError } = await supabase.functions.invoke("execute-dispatch-sequence", {
                body: {
                  campaignId: seqCampaignId,
                  sequenceId,
                  contactPhone: entry.leadPhone,
                  contactName: entry.leadName || "",
                },
              });
              console.log("[CallPanel] execute-dispatch-sequence response:", { result, fnError });
              if (fnError || result?.error) {
                automationResult = { automationSuccess: false, automationError: result?.error || fnError?.message || "Erro no disparo" };
              }
            }
          } else if (campaignType === "group" && sequenceId && seqCampaignId) {
            console.log("[CallPanel] Invoking execute-message (group):", { seqCampaignId, sequenceId });
            const { error: fnError } = await supabase.functions.invoke("execute-message", {
              body: {
                campaignId: seqCampaignId,
                sequenceId,
                triggerContext: {
                  respondentPhone: entry?.leadPhone || "",
                  respondentName: entry?.leadName || "",
                  respondentJid: entry?.leadPhone ? `${entry.leadPhone}@s.whatsapp.net` : "",
                  groupJid: "",
                  sendPrivate: true,
                },
              },
            });
            if (fnError) {
              console.warn("[CallPanel] Group automation error:", fnError);
              automationResult = { automationSuccess: false, automationError: "Erro ao executar sequência de grupo" };
            }
          } else {
            console.log("[CallPanel] No automation match:", { campaignType, sequenceId, hasLeadPhone: !!entry?.leadPhone });
          }
        }
        // Webhook action
        else if (actionData?.action_type === "webhook" && actionData.action_config?.url) {
          const url = actionData.action_config.url as string;
          const { data: leadData } = await (supabase as any)
            .from("call_leads")
            .select("*")
            .eq("id", entry?.leadId)
            .single();

          const { error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
            body: { url, payload: { lead: leadData, campaignId: entry?.campaignId, actionType: "webhook" } },
          });

          if (proxyError) {
            automationResult = { automationSuccess: false, automationError: `Webhook falhou: ${proxyError.message}` };
          }
        }
        // Add tag
        else if (actionData?.action_type === "add_tag" && actionData.action_config?.tag && entry?.leadId) {
          const tag = actionData.action_config.tag as string;
          const { data: leadData } = await (supabase as any)
            .from("call_leads")
            .select("custom_fields")
            .eq("id", entry.leadId)
            .single();

          const currentFields = (leadData?.custom_fields as Record<string, unknown>) || {};
          const currentTags = Array.isArray(currentFields.tags) ? currentFields.tags : [];

          if (!currentTags.includes(tag)) {
            await (supabase as any)
              .from("call_leads")
              .update({ custom_fields: { ...currentFields, tags: [...currentTags, tag] } })
              .eq("id", entry.leadId);
          }
        }
        // Update status
        else if (actionData?.action_type === "update_status" && actionData.action_config?.status && entry?.leadId) {
          const newStatus = String(actionData.action_config.status);
          await (supabase as any)
            .from("call_leads")
            .update({ status: newStatus })
            .eq("id", entry.leadId);

          if (newStatus !== "completed") {
            await (supabase as any)
              .from("call_logs")
              .update({ call_status: newStatus })
              .eq("id", callId);
          }
        }
      } catch (automationError: any) {
        console.error("[CallPanel] Automation failed:", automationError);
        automationResult = { automationSuccess: false, automationError: automationError?.message || "Erro inesperado" };
      }

      return { ...automationResult, skipped: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      queryClient.invalidateQueries({ queryKey: ["call_leads"] });
      if (result && !result.automationSuccess) {
        toast({ title: "Ação registrada", description: `Automação falhou: ${result.automationError}`, variant: "destructive" });
      } else if (result?.skipped) {
        toast({ title: "Automação executada", description: "Ligação já estava concluída. Mensagem enviada." });
      } else {
        toast({ title: "Ação registrada", description: "Resultado da ligação registrado com sucesso." });
      }
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    entries,
    stats,
    isLoading,
    refetch,
    delayCall: delayCallMutation.mutateAsync,
    rescheduleCall: rescheduleCallMutation.mutateAsync,
    cancelCall: cancelCallMutation.mutateAsync,
    updateOperator: updateOperatorMutation.mutateAsync,
    dialNow: dialNowMutation.mutateAsync,
    registerAction: registerActionMutation.mutateAsync,
    bulkUpdateOperator: bulkUpdateOperatorMutation.mutateAsync,
    bulkEnqueue: bulkEnqueueMutation.mutateAsync,
  };
}
