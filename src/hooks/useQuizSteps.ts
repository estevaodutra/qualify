import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface QuizStep {
  id: string;
  funnelId: string;
  name: string;
  stepOrder: number;
  showLogo: boolean;
  showProgress: boolean;
  allowBack: boolean;
  createdAt: string;
}

interface DbQuizStep {
  id: string;
  funnel_id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  step_order: number;
  show_logo: boolean;
  show_progress: boolean;
  allow_back: boolean;
  created_at: string;
  updated_at: string;
}

const transform = (db: DbQuizStep): QuizStep => ({
  id: db.id,
  funnelId: db.funnel_id,
  name: db.name,
  stepOrder: db.step_order,
  showLogo: db.show_logo,
  showProgress: db.show_progress,
  allowBack: db.allow_back,
  createdAt: db.created_at,
});

export function useQuizSteps(funnelId: string) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["quiz_steps", funnelId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quiz_steps")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data as DbQuizStep[]).map(transform);
    },
    enabled: !!funnelId && !!user,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, stepOrder }: { name: string; stepOrder: number }) => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Não autenticado");

      const { data, error } = await (supabase as any)
        .from("quiz_steps")
        .insert({ funnel_id: funnelId, user_id: u.id, company_id: activeCompanyId, name, step_order: stepOrder })
        .select()
        .single();
      if (error) throw error;
      return transform(data as DbQuizStep);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_steps", funnelId] }),
    onError: (e: Error) => toast({ title: "Erro ao criar etapa", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{ name: string; show_logo: boolean; show_progress: boolean; allow_back: boolean; step_order: number }>;
    }) => {
      const { error } = await (supabase as any).from("quiz_steps").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_steps", funnelId] }),
    onError: (e: Error) => toast({ title: "Erro ao atualizar etapa", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("quiz_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_steps", funnelId] }),
    onError: (e: Error) => toast({ title: "Erro ao remover etapa", description: e.message, variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await (supabase as any)
          .from("quiz_steps")
          .update({ step_order: i })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_steps", funnelId] }),
    onError: (e: Error) => toast({ title: "Erro ao reordenar", description: e.message, variant: "destructive" }),
  });

  return {
    steps,
    isLoading,
    createStep: createMutation.mutateAsync,
    updateStep: updateMutation.mutateAsync,
    deleteStep: deleteMutation.mutateAsync,
    reorderSteps: reorderMutation.mutateAsync,
  };
}
