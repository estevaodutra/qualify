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

  return {
    funnels,
    isLoading,
    createFunnel: createMutation.mutateAsync,
    updateFunnel: updateMutation.mutateAsync,
    deleteFunnel: deleteMutation.mutateAsync,
    publishFunnel: publishMutation.mutateAsync,
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
