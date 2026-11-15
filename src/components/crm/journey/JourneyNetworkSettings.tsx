import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Pipeline, PipelineStage } from "@/types/crm.types";

type LineConfig = { pipeline_id: string; line_role: "main" | "auxiliary"; order_index: number; entry_stage_id: string | null; terminal_stage_id: string | null };
type DraftConfig = { pipelineId: string; role: "main" | "auxiliary" | "excluded"; entryStageId: string; terminalStageId: string };
interface Props { open: boolean; onOpenChange: (value: boolean) => void; companyId: string; }

export function JourneyNetworkSettings({ open, onOpenChange, companyId }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftConfig[]>([]);
  const pipelinesQuery = useQuery({
    queryKey: ["journey-config-pipelines", companyId], enabled: open && !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pipelines").select("*, stages:pipeline_stages(*)")
        .eq("company_id", companyId).order("order_index");
      if (error) throw error;
      return (data || []) as Pipeline[];
    },
  });
  const configQuery = useQuery({
    queryKey: ["crm-journey-lines", companyId], enabled: open && !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_journey_lines" as any) as any)
        .select("pipeline_id,line_role,order_index,entry_stage_id,terminal_stage_id")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data || []) as LineConfig[];
    },
  });
  useEffect(() => {
    if (!open || !pipelinesQuery.data || !configQuery.data) return;
    const lines = configQuery.data;
    const ordered = [...pipelinesQuery.data].sort((a,b) => {
      const aa = lines.find(x => x.pipeline_id === a.id);
      const bb = lines.find(x => x.pipeline_id === b.id);
      return (aa?.line_role === "main" ? 0 : aa?.line_role === "auxiliary" ? 1 : 2) -
        (bb?.line_role === "main" ? 0 : bb?.line_role === "auxiliary" ? 1 : 2) ||
        (aa?.order_index ?? a.order_index) - (bb?.order_index ?? b.order_index);
    });
    setDraft(ordered.map(p => {
      const line = lines.find(x => x.pipeline_id === p.id);
      return { pipelineId: p.id, role: line?.line_role || "excluded", entryStageId: line?.entry_stage_id || "", terminalStageId: line?.terminal_stage_id || "" };
    }));
  }, [open, pipelinesQuery.data, configQuery.data]);
  const update = (id: string, changes: Partial<DraftConfig>) =>
    setDraft(current => current.map(d => d.pipelineId === id ? { ...d, ...changes } : d));
  const move = (index: number, offset: number) => setDraft(current => {
    const other = index + offset;
    if (other < 0 || other >= current.length || current[index].role !== current[other].role) return current;
    const next = [...current]; [next[index], next[other]] = [next[other], next[index]]; return next;
  });
  const save = useMutation({
    mutationFn: async () => {
      const main = draft.filter(d => d.role === "main");
      if (!main.length) throw new Error("Selecione pelo menos uma pipeline principal.");
      const selected = draft.filter(d => d.role !== "excluded");
      // Update the configuration atomically on the server with company-scoped input.
      const { error } = await (supabase.rpc as any)("crm_save_journey_lines", {
        p_company_id: companyId,
        p_lines: selected.map((d) => ({
          pipeline_id: d.pipelineId,
          line_role: d.role,
          order_index: draft.filter(a => a.role === d.role).findIndex(a => a.pipelineId === d.pipelineId),
          entry_stage_id: d.entryStageId || null,
          terminal_stage_id: d.terminalStageId || null,
        })),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Mapa comercial atualizado."); queryClient.invalidateQueries({ queryKey: ["crm-journey-lines", companyId] }); onOpenChange(false); },
    onError: (error: Error) => toast.error(error.message),
  });
  const pipelines = pipelinesQuery.data || [];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[680px] max-w-[95vw] max-h-[92vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" /> Configurar mapa comercial</DialogTitle>
        <DialogDescription>Ordene as linhas principais e selecione quantas linhas auxiliares quiser. As transferências reais são detectadas automaticamente.</DialogDescription>
      </DialogHeader>
      {pipelinesQuery.isLoading || configQuery.isLoading ? <p>Carregando pipelines...</p> :
       pipelinesQuery.error || configQuery.error ? <p className="text-destructive text-sm">Não foi possível carregar as configurações. Verifique a migração.</p> :
      <div className="space-y-3">
        {draft.map((d,i) => {
          const p = pipelines.find(x => x.id === d.pipelineId);
          if (!p) return null;
          const stages = ([...(p.stages || [])] as PipelineStage[]).sort((a,b)=>a.order_index-b.order_index);
          return <div key={d.pipelineId} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium flex-1 min-w-0 truncate">{p.name}</div>
              <Select value={d.role} onValueChange={(v: DraftConfig["role"]) => update(d.pipelineId, { role:v })}>
                <SelectTrigger className="w-[145px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Principal</SelectItem>
                  <SelectItem value="auxiliary">Auxiliar</SelectItem>
                  <SelectItem value="excluded">Fora do mapa</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" disabled={i===0 || draft[i-1].role!==d.role} onClick={()=>move(i,-1)} aria-label="Subir"><ArrowUp className="h-4 w-4"/></Button>
              <Button variant="ghost" size="icon" disabled={i===draft.length-1 || draft[i+1].role!==d.role} onClick={()=>move(i,1)} aria-label="Descer"><ArrowDown className="h-4 w-4"/></Button>
            </div>
            {d.role !== "excluded" && <div className="grid grid-cols-2 gap-2">
              <div><div className="text-xs text-muted-foreground mb-1">Etapa inicial (opcional)</div>
                <Select value={d.entryStageId || "_none"} onValueChange={v=>update(d.pipelineId,{entryStageId:v==="_none"?"":v})}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Qualquer etapa" /></SelectTrigger><SelectContent><SelectItem value="_none">Qualquer etapa</SelectItem>{stages.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div><div className="text-xs text-muted-foreground mb-1">Etapa final (opcional)</div>
                <Select value={d.terminalStageId || "_none"} onValueChange={v=>update(d.pipelineId,{terminalStageId:v==="_none"?"":v})}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sem definição" /></SelectTrigger><SelectContent><SelectItem value="_none">Sem definição</SelectItem>{stages.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            </div>}
          </div>;
        })}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button>
          <Button disabled={save.isPending || !draft.some(d=>d.role==="main")} onClick={()=>save.mutate()}>{save.isPending?"Salvando...":"Salvar mapa"}</Button>
        </div>
      </div>}
    </DialogContent>
  </Dialog>;
}
