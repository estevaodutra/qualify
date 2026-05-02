import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { safeBatchUpsert } from "@/lib/supabase-batch";

export type CallLeadStatus = "pending" | "calling" | "in_progress" | "completed" | "no_answer" | "busy" | "failed" | "cancelled";

async function executeActionAutomation(
  actionType: string,
  config: Record<string, unknown>,
  leadId: string,
  campaignId: string,
) {
  try {
    switch (actionType) {
      case "start_sequence": {
        const sequenceId = config.sequenceId as string;
        if (!sequenceId) break;
        const campaignType = config.campaignType as string | undefined;
        // Fetch lead data for the sequence trigger
        const { data: lead } = await (supabase as any)
          .from("call_leads")
          .select("*")
          .eq("id", leadId)
          .single();

        if (campaignType === "dispatch") {
          // Dispatch sequences use execute-dispatch-sequence
          const { data, error: invokeError } = await supabase.functions.invoke("execute-dispatch-sequence", {
            body: {
              campaignId: config.campaignId || campaignId,
              sequenceId,
              contactPhone: lead?.phone,
              contactName: lead?.name,
            },
          });
          if (invokeError) {
            throw new Error(`Falha ao invocar sequência: ${invokeError.message}`);
          }
          if (data && !data.success) {
            throw new Error(data.error || "Webhook não confirmou o envio");
          }
        } else {
          // Group sequences use trigger-sequence
          const { error: invokeError } = await supabase.functions.invoke(`trigger-sequence/${sequenceId}`, {
            body: { lead, campaignId },
          });
          if (invokeError) {
            throw new Error(`Falha ao invocar sequência: ${invokeError.message}`);
          }
        }
        break;
      }
      case "add_tag": {
        const tag = config.tag as string;
        if (!tag) break;
        const { data: lead } = await (supabase as any)
          .from("call_leads")
          .select("custom_fields")
          .eq("id", leadId)
          .single();
        const currentFields = (lead?.custom_fields as Record<string, unknown>) || {};
        const currentTags = Array.isArray(currentFields.tags) ? currentFields.tags : [];
        if (!currentTags.includes(tag)) {
          await (supabase as any)
            .from("call_leads")
            .update({ custom_fields: { ...currentFields, tags: [...currentTags, tag] } })
            .eq("id", leadId);
        }
        break;
      }
      case "webhook": {
        const url = config.url as string;
        if (!url) break;
        const { data: lead } = await (supabase as any)
          .from("call_leads")
          .select("*")
          .eq("id", leadId)
          .single();
        const { error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
          body: { url, payload: { lead, campaignId, actionType } },
        });
        if (proxyError) {
          throw new Error(`Webhook falhou: ${proxyError.message}`);
        }
        break;
      }
      // update_status is handled inline (lead status already set)
      // none: no-op
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Action automation error:", message);
    throw err; // Propagate so caller can handle
  }
}

export interface CallLead {
  id: string;
  campaignId: string;
  phone: string;
  name: string | null;
  email: string | null;
  customFields: Record<string, unknown>;
  status: CallLeadStatus;
  attempts: number;
  lastAttemptAt: string | null;
  resultActionId: string | null;
  resultNotes: string | null;
  assignedOperatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbCallLead {
  id: string;
  campaign_id: string;
  user_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  custom_fields: Record<string, unknown> | null;
  status: string | null;
  attempts: number | null;
  last_attempt_at: string | null;
  result_action_id: string | null;
  result_notes: string | null;
  assigned_operator_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const transformDbToFrontend = (db: DbCallLead): CallLead => ({
  id: db.id,
  campaignId: db.campaign_id,
  phone: db.phone,
  name: db.name,
  email: db.email,
  customFields: db.custom_fields || {},
  status: (db.status as CallLeadStatus) || "pending",
  attempts: db.attempts || 0,
  lastAttemptAt: db.last_attempt_at,
  resultActionId: db.result_action_id,
  resultNotes: db.result_notes,
  assignedOperatorId: db.assigned_operator_id,
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

export interface LeadStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export function useCallLeads(campaignId: string, statusFilter?: CallLeadStatus) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["call_leads", campaignId, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_leads")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as DbCallLead[]).map(transformDbToFrontend);
    },
    enabled: !!campaignId,
  });

  const { data: stats } = useQuery({
    queryKey: ["call_leads_stats", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_leads")
        .select("status")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      const statusList = data as Array<{ status: string | null }>;
      const result: LeadStats = {
        total: statusList.length,
        pending: statusList.filter((l) => l.status === "pending").length,
        inProgress: statusList.filter((l) => ["calling", "in_progress"].includes(l.status || "")).length,
        completed: statusList.filter((l) => l.status === "completed").length,
        failed: statusList.filter((l) => ["no_answer", "busy", "failed"].includes(l.status || "")).length,
      };

      return result;
    },
    enabled: !!campaignId,
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead: {
      phone: string;
      name?: string;
      email?: string;
      customFields?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("call_leads")
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          company_id: activeCompanyId || null,
          phone: lead.phone,
          name: lead.name || null,
          email: lead.email || null,
          custom_fields: lead.customFields || {},
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Mirror para a base global de leads (não bloqueia em caso de erro)
      try {
        const { data: camp } = await (supabase as any)
          .from("call_campaigns")
          .select("name")
          .eq("id", campaignId)
          .maybeSingle();
        await (supabase as any).from("leads").upsert({
          user_id: user.id,
          phone: lead.phone,
          name: lead.name || null,
          email: lead.email || null,
          custom_fields: lead.customFields || {},
          active_campaign_id: campaignId,
          active_campaign_type: "ligacao",
          source_type: "campaign_manual",
          source_campaign_id: campaignId,
          source_name: camp?.name ?? null,
        }, { onConflict: "user_id,phone" });
      } catch (e) {
        console.warn("[addLead] failed to mirror to leads table:", e);
      }

      return transformDbToFrontend(data as DbCallLead);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead adicionado", description: "Lead adicionado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const addLeadsBatchMutation = useMutation({
    mutationFn: async (leadsData: Array<{
      phone: string;
      name?: string;
      email?: string;
      customFields?: Record<string, unknown>;
    }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const inserts = leadsData.map((lead) => ({
        campaign_id: campaignId,
        user_id: user.id,
        company_id: activeCompanyId || null,
        phone: lead.phone,
        name: lead.name || null,
        email: lead.email || null,
        custom_fields: lead.customFields || {},
        status: "pending",
      }));

      const { data, error } = await (supabase as any)
        .from("call_leads")
        .insert(inserts)
        .select();

      if (error) throw error;

      // Mirror para a base global de leads (não bloqueia em caso de erro)
      try {
        const { data: camp } = await (supabase as any)
          .from("call_campaigns")
          .select("name")
          .eq("id", campaignId)
          .maybeSingle();
        const campaignName = camp?.name ?? null;
        const leadsRows = leadsData.map((lead) => ({
          user_id: user.id,
          phone: lead.phone,
          name: lead.name || null,
          email: lead.email || null,
          custom_fields: lead.customFields || {},
          active_campaign_id: campaignId,
          active_campaign_type: "ligacao",
          source_type: "campaign_manual",
          source_campaign_id: campaignId,
          source_name: campaignName,
        }));
        await safeBatchUpsert("leads", leadsRows, "user_id,phone");
      } catch (e) {
        console.warn("[addLeadsBatch] failed to mirror to leads table:", e);
      }

      return (data as DbCallLead[]).map(transformDbToFrontend);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Leads importados", description: `${data.length} leads importados com sucesso.` });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        phone: string;
        name: string;
        email: string;
        customFields: Record<string, unknown>;
        status: CallLeadStatus;
        attempts: number;
        resultActionId: string;
        resultNotes: string;
        assignedOperatorId: string;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.attempts !== undefined) dbUpdates.attempts = updates.attempts;
      if (updates.resultActionId !== undefined) dbUpdates.result_action_id = updates.resultActionId;
      if (updates.resultNotes !== undefined) dbUpdates.result_notes = updates.resultNotes;
      if (updates.assignedOperatorId !== undefined) dbUpdates.assigned_operator_id = updates.assignedOperatorId;

      const { error } = await (supabase as any)
        .from("call_leads")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const completeCallMutation = useMutation({
    mutationFn: async ({ leadId, actionId, notes }: {
      leadId: string;
      actionId?: string;
      notes?: string;
    }) => {
      const { error } = await (supabase as any)
        .from("call_leads")
        .update({
          status: "completed",
          result_action_id: actionId || null,
          result_notes: notes || null,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      toast({ title: "Ligação concluída", description: "Resultado registrado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const completeLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      actionId,
      notes,
      durationSeconds,
      scriptPath,
    }: {
      leadId: string;
      actionId?: string;
      notes?: string;
      durationSeconds?: number;
      scriptPath?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Fetch action config if actionId provided
      let actionData: { action_type: string; action_config: Record<string, unknown> | null } | null = null;
      if (actionId) {
        const { data } = await (supabase as any)
          .from("call_script_actions")
          .select("action_type, action_config")
          .eq("id", actionId)
          .single();
        actionData = data;
      }

      // Determine status based on action config
      const leadStatus = actionData?.action_type === "update_status" && actionData?.action_config?.status
        ? String(actionData.action_config.status)
        : "completed";

      // Update lead status
      const { error: updateError } = await (supabase as any)
        .from("call_leads")
        .update({
          status: leadStatus,
          result_action_id: actionId || null,
          result_notes: notes || null,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (updateError) throw updateError;

      // Create call log
      const { error: logError } = await (supabase as any)
        .from("call_logs")
        .insert({
          campaign_id: campaignId,
          lead_id: leadId,
          user_id: user.id,
          action_id: actionId || null,
          notes: notes || null,
          duration_seconds: durationSeconds || 0,
          script_path: scriptPath || [],
          started_at: new Date(Date.now() - (durationSeconds || 0) * 1000).toISOString(),
          ended_at: new Date().toISOString(),
        });

      if (logError) throw logError;

      // Execute action automation - errors show warning but don't fail the mutation
      let automationError: string | null = null;
      if (actionData && actionId) {
        try {
          await executeActionAutomation(actionData.action_type, actionData.action_config || {}, leadId, campaignId);
        } catch (err) {
          automationError = err instanceof Error ? err.message : String(err);
        }
      }
      return { automationError };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_logs", campaignId] });
      if (result?.automationError) {
        toast({ title: "Ligação registrada", description: `Automação falhou: ${result.automationError}`, variant: "destructive" });
      } else {
        toast({ title: "Ligação concluída", description: "Resultado registrado com sucesso." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("call_leads")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      toast({ title: "Removido", description: "Lead removido com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteAllMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await (supabase as any)
        .from("call_leads")
        .delete()
        .eq("campaign_id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      toast({ title: "Leads removidos", description: "Todos os leads foram removidos da campanha." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const bulkEnqueueByStatusMutation = useMutation({
    mutationFn: async ({ status, limit }: { status: CallLeadStatus; limit?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let leadsQuery = (supabase as any)
        .from("call_leads")
        .select("id, phone, name")
        .eq("campaign_id", campaignId)
        .eq("status", status);

      if (limit) {
        leadsQuery = leadsQuery.limit(limit);
      }

      const { data: matchingLeads, error: fetchErr } = await leadsQuery;
      if (fetchErr) throw fetchErr;
      if (!matchingLeads?.length) throw new Error("Nenhum lead encontrado com esse status");

      // Insert directly into call_queue
      let added = 0;
      for (const lead of matchingLeads) {
        const { error } = await (supabase as any).from("call_queue").insert({
          user_id: user.id,
          company_id: activeCompanyId || null,
          campaign_id: campaignId,
          lead_id: lead.id,
          phone: lead.phone,
          lead_name: lead.name || null,
          source: "bulk_enqueue",
        });
        if (!error) added++;
      }

      // Ensure queue is running
      const now = new Date().toISOString();
      const { data: queueState } = await (supabase as any)
        .from("queue_execution_state")
        .select("id, status")
        .eq("campaign_id", campaignId)
        .maybeSingle();

      if (queueState) {
        if (queueState.status !== "running") {
          await (supabase as any)
            .from("queue_execution_state")
            .update({ status: "running", updated_at: now })
            .eq("id", queueState.id);
        }
      } else {
        await (supabase as any)
          .from("queue_execution_state")
          .insert({
            campaign_id: campaignId,
            user_id: user.id,
            status: "running",
            current_operator_index: 0,
            session_started_at: now,
          });
      }

      // Tick imediato
      await supabase.functions.invoke(
        `queue-processor?campaign_id=${campaignId}&action=tick`,
        { method: "POST" }
      );

      return added;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_logs", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state", campaignId] });
      toast({ title: "Leads enfileirados", description: `${count} leads adicionados à fila de discagem.` });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    leads,
    stats: stats || { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
    isLoading,
    refetch,
    addLead: addLeadMutation.mutateAsync,
    addLeadsBatch: addLeadsBatchMutation.mutateAsync,
    updateLead: updateLeadMutation.mutateAsync,
    completeCall: completeCallMutation.mutateAsync,
    completeLead: completeLeadMutation.mutateAsync,
    deleteLead: deleteLeadMutation.mutateAsync,
    bulkDeleteAll: bulkDeleteAllMutation.mutateAsync,
    isDeletingAll: bulkDeleteAllMutation.isPending,
    bulkEnqueueByStatus: bulkEnqueueByStatusMutation.mutateAsync,
    isBulkEnqueuing: bulkEnqueueByStatusMutation.isPending,
    isAdding: addLeadMutation.isPending,
  };
}
