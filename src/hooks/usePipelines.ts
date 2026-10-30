import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import type { Pipeline, PipelineStage } from "@/types/crm.types";

export function usePipelines() {
  const { activeCompanyId } = useCompany();

  const pipelinesQuery = useQuery({
    queryKey: ["pipelines_with_stages_and_groups", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("pipelines")
        .select("*, stages:pipeline_stages(*), pipeline_groups:pipeline_groups(id, name, order_index)")
        .eq("company_id", activeCompanyId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        stages: (p.stages || []).sort(
          (a: PipelineStage, b: PipelineStage) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      })) as Pipeline[];
    },
    enabled: !!activeCompanyId,
  });

  const groupsQuery = useQuery({
    queryKey: ["pipeline_groups_list", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("pipeline_groups")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!activeCompanyId,
  });

  return {
    pipelines: pipelinesQuery.data || [],
    groups: groupsQuery.data || [],
    isLoading: pipelinesQuery.isLoading || groupsQuery.isLoading,
    refetch: () => {
      pipelinesQuery.refetch();
      groupsQuery.refetch();
    },
  };
}
