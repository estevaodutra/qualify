import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ScriptOption {
  text: string;
  targetNodeId?: string;
  actionId?: string;
}

export interface CallScriptNode {
  id: string;
  type: "start" | "speech" | "question" | "note" | "end";
  data: {
    label?: string;
    text?: string;
    options?: ScriptOption[];
  };
  order: number;
}

export interface CallScriptEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CallScript {
  id: string;
  campaignId: string;
  name: string;
  nodes: CallScriptNode[];
  edges: CallScriptEdge[];
  createdAt: string;
  updatedAt: string;
}

interface DbCallScript {
  id: string;
  campaign_id: string;
  user_id: string;
  name: string;
  nodes: CallScriptNode[] | null;
  edges: CallScriptEdge[] | null;
  created_at: string | null;
  updated_at: string | null;
}

const transformDbToFrontend = (db: DbCallScript): CallScript => ({
  id: db.id,
  campaignId: db.campaign_id,
  name: db.name,
  nodes: (db.nodes as CallScriptNode[]) || [],
  edges: (db.edges as CallScriptEdge[]) || [],
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

const createInitialScript = (): { nodes: CallScriptNode[]; edges: CallScriptEdge[] } => ({
  nodes: [
    { id: "start-1", type: "start", data: { text: "Início da ligação" }, order: 0 },
    { id: "end-1", type: "end", data: { text: "Fim da ligação" }, order: 1 },
  ],
  edges: [
    { id: "edge-1", source: "start-1", target: "end-1" },
  ],
});

export function useCallScript(campaignId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: script, isLoading, refetch } = useQuery({
    queryKey: ["call_script", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_scripts")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        return transformDbToFrontend(data as DbCallScript);
      }

      // No script exists — only auto-create if the current user owns the campaign
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: campaign } = await (supabase as any)
        .from("call_campaigns")
        .select("user_id")
        .eq("id", campaignId)
        .maybeSingle();

      // If operator (not owner), return null instead of creating
      if (!campaign || campaign.user_id !== user.id) {
        return null;
      }

      const initialScript = createInitialScript();
      const { data: newScript, error: createError } = await (supabase as any)
        .from("call_scripts")
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          name: "Roteiro Principal",
          nodes: initialScript.nodes,
          edges: initialScript.edges,
        })
        .select()
        .single();

      if (createError) throw createError;
      return transformDbToFrontend(newScript as DbCallScript);
    },
    enabled: !!campaignId,
  });

  const saveScriptMutation = useMutation({
    mutationFn: async ({ nodes, edges }: { nodes: CallScriptNode[]; edges: CallScriptEdge[] }) => {
      if (!script) throw new Error("Script not loaded");

      const { error } = await (supabase as any)
        .from("call_scripts")
        .update({ nodes, edges })
        .eq("id", script.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_script", campaignId] });
      toast({ title: "Salvo", description: "Roteiro salvo com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    script,
    isLoading,
    refetch,
    saveScript: saveScriptMutation.mutateAsync,
    isSaving: saveScriptMutation.isPending,
  };
}
