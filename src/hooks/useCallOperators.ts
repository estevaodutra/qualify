import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export type OperatorStatus = "offline" | "available" | "on_call" | "cooldown" | "paused";

export interface CallOperator {
  id: string;
  userId: string;
  operatorName: string;
  extension: string | null;
  isActive: boolean;
  status: OperatorStatus;
  currentCallId: string | null;
  currentCampaignId: string | null;
  personalIntervalSeconds: number | null;
  lastCallEndedAt: string | null;
  totalCalls: number;
  totalCallsAnswered: number;
  createdAt: string;
}

interface DbCallOperator {
  id: string;
  user_id: string;
  operator_name: string;
  extension: string | null;
  is_active: boolean | null;
  status: string | null;
  current_call_id: string | null;
  current_campaign_id: string | null;
  personal_interval_seconds: number | null;
  last_call_ended_at: string | null;
  total_calls: number | null;
  total_calls_answered: number | null;
  created_at: string | null;
}

const transformDbToFrontend = (db: DbCallOperator): CallOperator => ({
  id: db.id,
  userId: db.user_id,
  operatorName: db.operator_name,
  extension: db.extension,
  isActive: db.is_active ?? true,
  status: (db.status as OperatorStatus) || "offline",
  currentCallId: db.current_call_id || null,
  currentCampaignId: db.current_campaign_id || null,
  personalIntervalSeconds: db.personal_interval_seconds || null,
  lastCallEndedAt: db.last_call_ended_at || null,
  totalCalls: db.total_calls ?? 0,
  totalCallsAnswered: db.total_calls_answered ?? 0,
  createdAt: db.created_at || new Date().toISOString(),
});

export function useCallOperators() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: operators = [], isLoading, refetch } = useQuery({
    queryKey: ["call_operators", activeCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_operators")
        .select("*")
        .order("created_at", { ascending: true });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as DbCallOperator[]).map(transformDbToFrontend);
    },
    enabled: !!user && !!activeCompanyId,
  });

  const addOperatorMutation = useMutation({
    mutationFn: async (operator: { operatorName: string; extension: string; personalIntervalSeconds?: number | null }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("call_operators")
        .insert({
          user_id: authUser.id,
          company_id: activeCompanyId,
          operator_name: operator.operatorName,
          extension: operator.extension || null,
          is_active: true,
          personal_interval_seconds: operator.personalIntervalSeconds ?? null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") throw new Error("Já existe um operador com este ramal.");
        throw error;
      }
      return transformDbToFrontend(data as DbCallOperator);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
      toast({ title: "Operador adicionado", description: "Operador adicionado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateOperatorMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{ operatorName: string; extension: string; isActive: boolean; personalIntervalSeconds: number | null }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.operatorName !== undefined) dbUpdates.operator_name = updates.operatorName;
      if (updates.extension !== undefined) dbUpdates.extension = updates.extension;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.personalIntervalSeconds !== undefined) dbUpdates.personal_interval_seconds = updates.personalIntervalSeconds;

      const { error } = await (supabase as any)
        .from("call_operators")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        if (error.code === "23505") throw new Error("Já existe um operador com este ramal.");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
      toast({ title: "Atualizado", description: "Operador atualizado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const removeOperatorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("call_operators")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
      toast({ title: "Removido", description: "Operador removido com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("call_operators")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("call_operators")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    operators,
    isLoading,
    refetch,
    addOperator: addOperatorMutation.mutateAsync,
    updateOperator: updateOperatorMutation.mutateAsync,
    removeOperator: removeOperatorMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    updateOperatorStatus: updateStatusMutation.mutateAsync,
    isAdding: addOperatorMutation.isPending,
  };
}
