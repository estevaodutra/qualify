import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface QuizFunnel {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  designConfig: Record<string, unknown>;
  seoConfig: Record<string, unknown>;
  pixelConfig: Record<string, unknown>;
  webhookConfig: Record<string, unknown>;
  visitsCount: number;
  responsesCount: number;
  leadsCount: number;
  completionsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DbQuizFunnel {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  slug: string;
  status: string;
  design_config: Record<string, unknown>;
  seo_config: Record<string, unknown>;
  pixel_config: Record<string, unknown>;
  webhook_config: Record<string, unknown>;
  visits_count: number;
  responses_count: number;
  leads_count: number;
  completions_count: number;
  created_at: string;
  updated_at: string;
}

const transform = (db: DbQuizFunnel): QuizFunnel => ({
  id: db.id,
  name: db.name,
  slug: db.slug,
  status: db.status as QuizFunnel["status"],
  designConfig: db.design_config || {},
  seoConfig: db.seo_config || {},
  pixelConfig: db.pixel_config || {},
  webhookConfig: db.webhook_config || {},
  visitsCount: db.visits_count,
  responsesCount: db.responses_count,
  leadsCount: db.leads_count,
  completionsCount: db.completions_count,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export function useQuizFunnels() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: funnels = [], isLoading } = useQuery({
    queryKey: ["quiz_funnels", activeCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("quiz_funnels")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      } else {
        query = query.eq("user_id", user?.id).is("company_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as DbQuizFunnel[]).map(transform);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Não autenticado");

      const { data, error } = await (supabase as any)
        .from("quiz_funnels")
        .insert({ name, slug, user_id: u.id, company_id: activeCompanyId })
        .select()
        .single();

      if (error) throw error;
      return transform(data as DbQuizFunnel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_funnels"] });
      toast({ title: "Funil criado com sucesso." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao criar funil", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<DbQuizFunnel, "id" | "user_id" | "created_at">> }) => {
      const { error } = await (supabase as any)
        .from("quiz_funnels")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["quiz_funnels"] });
      queryClient.invalidateQueries({ queryKey: ["quiz_funnel", id] });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("quiz_funnels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_funnels"] });
      toast({ title: "Funil excluído." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await (supabase as any)
        .from("quiz_funnels")
        .update({ status: publish ? "published" : "draft" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { publish }) => {
      queryClient.invalidateQueries({ queryKey: ["quiz_funnels"] });
      toast({ title: publish ? "Funil publicado!" : "Funil despublicado." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Não autenticado");

      // 1. Fetch original funnel
      const { data: sourceFunnel, error: funnelFetchError } = await (supabase as any)
        .from("quiz_funnels")
        .select("*")
        .eq("id", sourceId)
        .single();
      if (funnelFetchError) throw funnelFetchError;

      // 2. Insert new funnel
      const newFunnelId = crypto.randomUUID();
      const newSlug = `${sourceFunnel.slug}-copia-${Math.floor(Math.random() * 1000)}`;
      const { data: newFunnel, error: funnelInsertError } = await (supabase as any)
        .from("quiz_funnels")
        .insert({
          id: newFunnelId,
          user_id: u.id,
          company_id: activeCompanyId,
          name: `${sourceFunnel.name} (Cópia)`,
          slug: newSlug,
          status: "draft",
          design_config: sourceFunnel.design_config,
          seo_config: sourceFunnel.seo_config,
          pixel_config: sourceFunnel.pixel_config,
          webhook_config: sourceFunnel.webhook_config,
        })
        .select()
        .single();
      if (funnelInsertError) throw funnelInsertError;

      // 3. Fetch steps belonging to source funnel
      const { data: sourceSteps, error: stepsFetchError } = await (supabase as any)
        .from("quiz_steps")
        .select("*")
        .eq("funnel_id", sourceId);
      if (stepsFetchError) throw stepsFetchError;

      // 4. Map old step IDs to new step IDs and insert cloned steps
      const stepIdMap: Record<string, string> = {};
      const clonedSteps = (sourceSteps || []).map((step: any) => {
        const newStepId = crypto.randomUUID();
        stepIdMap[step.id] = newStepId;
        return {
          id: newStepId,
          funnel_id: newFunnelId,
          user_id: u.id,
          company_id: activeCompanyId,
          name: step.name,
          step_order: step.step_order,
          show_logo: step.show_logo ?? true,
          show_progress: step.show_progress ?? true,
          allow_back: step.allow_back ?? true,
        };
      });

      if (clonedSteps.length > 0) {
        const { error: insertStepsError } = await (supabase as any)
          .from("quiz_steps")
          .insert(clonedSteps);
        if (insertStepsError) throw insertStepsError;
      }

      // 5. Fetch components belonging to source funnel
      const { data: sourceComponents, error: componentsFetchError } = await (supabase as any)
        .from("quiz_components")
        .select("*")
        .eq("funnel_id", sourceId);
      if (componentsFetchError) throw componentsFetchError;

      // 6. Map them to the new step IDs and insert cloned components
      const clonedComponents = (sourceComponents || [])
        .filter((comp: any) => stepIdMap[comp.step_id])
        .map((comp: any) => {
          return {
            id: crypto.randomUUID(),
            step_id: stepIdMap[comp.step_id],
            funnel_id: newFunnelId,
            user_id: u.id,
            component_type: comp.component_type,
            component_order: comp.component_order,
            config: comp.config,
          };
        });

      if (clonedComponents.length > 0) {
        const { error: insertComponentsError } = await (supabase as any)
          .from("quiz_components")
          .insert(clonedComponents);
        if (insertComponentsError) throw insertComponentsError;
      }

      return transform(newFunnel as DbQuizFunnel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_funnels"] });
      toast({ title: "Funil duplicado com sucesso!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao duplicar funil", description: e.message, variant: "destructive" });
    },
  });

  return {
    funnels,
    isLoading,
    createFunnel: createMutation.mutateAsync,
    updateFunnel: updateMutation.mutateAsync,
    deleteFunnel: deleteMutation.mutateAsync,
    publishFunnel: publishMutation.mutateAsync,
    duplicateFunnel: duplicateMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

export function useQuizFunnel(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quiz_funnel", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quiz_funnels")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return transform(data as DbQuizFunnel);
    },
    enabled: !!id && !!user,
  });
}
