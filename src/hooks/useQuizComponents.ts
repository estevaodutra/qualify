import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type QuizComponentType =
  | "text"
  | "image"
  | "button"
  | "options"
  | "field_name"
  | "field_email"
  | "field_phone";

export interface QuizComponent {
  id: string;
  stepId: string;
  funnelId: string;
  componentType: QuizComponentType;
  componentOrder: number;
  config: Record<string, unknown>;
  createdAt: string;
}

interface DbQuizComponent {
  id: string;
  step_id: string;
  funnel_id: string;
  user_id: string;
  component_type: string;
  component_order: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const transform = (db: DbQuizComponent): QuizComponent => ({
  id: db.id,
  stepId: db.step_id,
  funnelId: db.funnel_id,
  componentType: db.component_type as QuizComponentType,
  componentOrder: db.component_order,
  config: db.config || {},
  createdAt: db.created_at,
});

export function useQuizComponents(stepId: string, funnelId: string) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: components = [], isLoading } = useQuery({
    queryKey: ["quiz_components", stepId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quiz_components")
        .select("*")
        .eq("step_id", stepId)
        .order("component_order", { ascending: true });
      if (error) throw error;
      return (data as DbQuizComponent[]).map(transform);
    },
    enabled: !!stepId && !!user,
  });

  const createMutation = useMutation({
    mutationFn: async ({ componentType, config }: { componentType: QuizComponentType; config?: Record<string, unknown> }) => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Não autenticado");

      const maxOrder = components.reduce((m, c) => Math.max(m, c.componentOrder), -1);

      const { data, error } = await (supabase as any)
        .from("quiz_components")
        .insert({
          step_id: stepId,
          funnel_id: funnelId,
          user_id: u.id,
          component_type: componentType,
          component_order: maxOrder + 1,
          config: config || getDefaultConfig(componentType),
        })
        .select()
        .single();
      if (error) throw error;
      return transform(data as DbQuizComponent);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_components", stepId] }),
    onError: (e: Error) => toast({ title: "Erro ao adicionar componente", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, unknown> }) => {
      const { error } = await (supabase as any)
        .from("quiz_components")
        .update({ config })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_components", stepId] }),
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("quiz_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_components", stepId] }),
    onError: (e: Error) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await (supabase as any)
          .from("quiz_components")
          .update({ component_order: i })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz_components", stepId] }),
    onError: (e: Error) => toast({ title: "Erro ao reordenar", description: e.message, variant: "destructive" }),
  });

  return {
    components,
    isLoading,
    createComponent: createMutation.mutateAsync,
    updateComponent: updateMutation.mutateAsync,
    deleteComponent: deleteMutation.mutateAsync,
    reorderComponents: reorderMutation.mutateAsync,
  };
}

export function useAllQuizComponents(funnelId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quiz_all_components", funnelId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quiz_components")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("component_order", { ascending: true });
      if (error) throw error;
      return (data as DbQuizComponent[]).map(transform);
    },
    enabled: !!funnelId && !!user,
  });
}

function getDefaultConfig(type: QuizComponentType): Record<string, unknown> {
  switch (type) {
    case "text":
      return { content: "Digite seu texto aqui...", align: "center" };
    case "image":
      return { url: "", alt: "", width: "100%" };
    case "button":
      return { text: "Continuar", destination: null, style: "primary" };
    case "options":
      return {
        question: "Qual é sua pergunta?",
        required: true,
        multiple: false,
        autoAdvance: true,
        options: [
          { id: crypto.randomUUID(), text: "Opção A", image: null, points: 0, value: "A", destination: null },
          { id: crypto.randomUUID(), text: "Opção B", image: null, points: 0, value: "B", destination: null },
        ],
      };
    case "field_name":
      return { label: "Seu nome", placeholder: "Digite seu nome", required: true, variableName: "name" };
    case "field_email":
      return { label: "Seu e-mail", placeholder: "email@exemplo.com", required: true, variableName: "email" };
    case "field_phone":
      return { label: "Seu telefone", placeholder: "(00) 00000-0000", required: true, variableName: "phone" };
    default:
      return {};
  }
}
