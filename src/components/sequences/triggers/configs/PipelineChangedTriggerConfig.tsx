import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { TriggerConfig } from "@/components/group-campaigns/sequences/triggerTypes";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2 } from "lucide-react";

interface PipelineChangedTriggerConfigProps {
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

export function PipelineChangedTriggerConfig({ config, onChange }: PipelineChangedTriggerConfigProps) {
  const { activeCompanyId } = useCompany();
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStages, setIsLoadingStages] = useState(false);

  const selectedPipelineId = (config.pipelineId as string) || "";
  const selectedStageId = (config.stageId as string) || "";

  useEffect(() => {
    async function fetchPipelines() {
      setIsLoading(true);
      const { data } = await supabase
        .from("pipelines")
        .select("id, name")
        .eq("company_id", activeCompanyId)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      
      if (data) {
        setPipelines(data);
      }
      setIsLoading(false);
    }
    if (activeCompanyId) {
      fetchPipelines();
    }
  }, [activeCompanyId]);

  useEffect(() => {
    async function fetchStages() {
      if (!selectedPipelineId) {
        setStages([]);
        return;
      }
      setIsLoadingStages(true);
      const { data } = await supabase
        .from("pipeline_stages")
        .select("id, name, order_index")
        .eq("pipeline_id", selectedPipelineId)
        .is("deleted_at", null)
        .order("order_index", { ascending: true });
      
      if (data) {
        setStages(data);
      }
      setIsLoadingStages(false);
    }
    fetchStages();
  }, [selectedPipelineId]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="space-y-2">
        <Label>Pipeline (Funil)</Label>
        <Select 
          value={selectedPipelineId} 
          onValueChange={(val) => onChange({ ...config, pipelineId: val, stageId: "" })}
        >
          <SelectTrigger>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Selecione um pipeline..." />}
          </SelectTrigger>
          <SelectContent>
            {pipelines.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPipelineId && (
        <div className="space-y-2">
          <Label>Coluna (Etapa)</Label>
          <Select 
            value={selectedStageId} 
            onValueChange={(val) => onChange({ ...config, stageId: val })}
          >
            <SelectTrigger>
              {isLoadingStages ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Qualquer etapa..." />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer etapa</SelectItem>
              {stages.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">A automação iniciará quando o negócio entrar nesta etapa.</p>
        </div>
      )}
    </div>
  );
}
