import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import type { Pipeline, PipelineStage } from "@/types/crm.types";

export function usePipelines() {
  const { activeCompanyId } = useCompany();

  const query = useQuery({
    queryKey: ["pipelines_with_stages", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("pipelines")
        .select("*, stages:pipeline_stages(*)")
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

  return {
    pipelines: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
