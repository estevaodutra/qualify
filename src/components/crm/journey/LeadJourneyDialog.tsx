import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Route, GitBranch, Clock3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type JourneyEvent = {
  id: number;
  deal_id: string;
  event_type: "created" | "moved" | "status_changed";
  from_pipeline_id: string | null;
  to_pipeline_id: string | null;
  from_stage_name: string | null;
  to_stage_name: string | null;
  from_pipeline_name: string | null;
  to_pipeline_name: string | null;
  from_status: string | null;
  to_status: string | null;
  occurred_at: string;
};
type JourneyLine = { pipeline_id: string; line_role: "main" | "auxiliary"; order_index: number };
type JourneyNode = JourneyEvent & { label: string; line: string; color: string; x: number; y: number };
const palette = ["#6366f1", "#f97316", "#14b8a6", "#d946ef", "#eab308", "#0ea5e9"];

interface LeadJourneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  leadId: string;
  leadName?: string | null;
}

export function LeadJourneyDialog({ open, onOpenChange, companyId, leadId, leadName }: LeadJourneyDialogProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [onlyRoute, setOnlyRoute] = useState(true);
  const eventsQuery = useQuery({
    queryKey: ["crm-journey-events", companyId, leadId],
    enabled: open && !!companyId && !!leadId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_journey_events" as any) as any)
        .select("id,deal_id,event_type,from_pipeline_id,to_pipeline_id,from_stage_name,to_stage_name,from_pipeline_name,to_pipeline_name,from_status,to_status,occurred_at")
        .eq("company_id", companyId).eq("lead_id", leadId)
        .order("occurred_at", { ascending: true }).order("id", { ascending: true });
      if (error) throw error;
      return (data || []) as JourneyEvent[];
    },
  });
  const linesQuery = useQuery({
    queryKey: ["crm-journey-lines", companyId],
    enabled: open && !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("crm_journey_lines" as any) as any)
        .select("pipeline_id,line_role,order_index").eq("company_id", companyId);
      if (error) throw error;
      return (data || []) as JourneyLine[];
    },
  });
  const events = eventsQuery.data || [];
  const lines = linesQuery.data || [];
  const nodes = useMemo(() => {
    const trackIds = Array.from(new Set(events.map(e => e.to_pipeline_id).filter(Boolean))) as string[];
    const main = lines.filter(l => l.line_role === "main").sort((a, b) => a.order_index - b.order_index).map(l => l.pipeline_id);
    const aux = lines.filter(l => l.line_role === "auxiliary").sort((a, b) => a.order_index - b.order_index).map(l => l.pipeline_id);
    const ordered = [...main, ...aux, ...trackIds.filter(id => !main.includes(id) && !aux.includes(id))];
    const unique = Array.from(new Set(ordered));
    const rowOf = (id: string | null) => Math.max(0, unique.indexOf(id || ""));
    const colorOf = (id: string | null) => {
      const index = unique.indexOf(id || "");
      return index === 0 ? "#2563eb" : palette[Math.max(0, index - 1) % palette.length];
    };
    const items: JourneyNode[] = events.map((e, i) => ({
      ...e, label: e.to_stage_name || e.to_pipeline_name || e.to_status || "Entrada",
      line: e.to_pipeline_name || "Sem pipeline",
      x: 90 + i * 154, y: 68 + rowOf(e.to_pipeline_id) * 100, color: colorOf(e.to_pipeline_id),
    }));
    return { items, ordered: unique };
  }, [events, lines]);
  const selected = nodes.items.find(n => n.id === selectedId) || nodes.items[nodes.items.length - 1];
  const width = Math.max(740, nodes.items.length * 154 + 130);
  const height = Math.max(165, nodes.ordered.length * 100 + 48);
  const transitions = nodes.items.filter((n, i) => i > 0 && nodes.items[i - 1].to_pipeline_id !== n.to_pipeline_id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[1100px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center"><Route className="h-5 w-5 text-primary" /> Trajetória do Lead</DialogTitle>
          <DialogDescription>{leadName || "Lead"} — percurso real registrado no CRM</DialogDescription>
        </DialogHeader>
        {eventsQuery.isLoading || linesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground py-8">Carregando trajetória...</p>
        ) : eventsQuery.error || linesQuery.error ? (
          <p className="text-sm text-destructive py-8">Não foi possível carregar a trajetória. Verifique se a migração foi aplicada e se você tem acesso à empresa.</p>
        ) : !events.length ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Route className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Nenhuma movimentação rastreada</p>
            <p className="text-sm text-muted-foreground mt-1">O histórico começa após a ativação do rastreamento. Não são criadas passagens antigas fictícias.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{nodes.items.length} eventos</Badge>
                <Badge variant="secondary">{nodes.ordered.length} linhas visitadas/configuradas</Badge>
                <Badge variant="secondary">{transitions} baldeações</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOnlyRoute(v => !v)}>
                {onlyRoute ? "Ver linhas configuradas" : "Ver somente trajetória"}
              </Button>
            </div>
            <div className="overflow-auto rounded-xl border bg-muted/10" aria-label="Mapa cronológico da trajetória">
              <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapa de estações percorridas pelo lead">
                {!onlyRoute && nodes.ordered.map((id, index) => {
                  const first = nodes.items.find(n => n.to_pipeline_id === id);
                  return <g key={id}><line x1="25" x2={width - 25} y1={68 + index * 100} y2={68 + index * 100} stroke={index === 0 ? "#2563eb" : palette[(index - 1) % palette.length]} strokeWidth="3" opacity=".17" strokeDasharray="7 6" /><text x="20" y={38 + index * 100} fontSize="12" fill="currentColor">{first?.line || "Pipeline"}</text></g>;
                })}
                {nodes.items.slice(1).map((n, i) => {
                  const before = nodes.items[i];
                  const isTransfer = n.to_pipeline_id !== before.to_pipeline_id;
                  return <path key={n.id} d={`M ${before.x} ${before.y} L ${n.x} ${n.y}`} fill="none" stroke={isTransfer ? "#64748b" : n.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={isTransfer ? "8 5" : undefined} />;
                })}
                {nodes.items.map((n, i) => (
                  <g key={n.id} onClick={() => setSelectedId(n.id)} style={{ cursor: "pointer" }}>
                    <circle cx={n.x} cy={n.y} r={selected?.id === n.id ? 12 : 9} fill="white" stroke={n.color} strokeWidth="4"/>
                    <text x={n.x} y={n.y - 19} fontSize="11" textAnchor="middle" fill="currentColor">{n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label}</text>
                    <text x={n.x} y={n.y + 30} fontSize="10" textAnchor="middle" fill="#64748b">{i + 1} · {format(new Date(n.occurred_at), "dd/MM HH:mm")}</text>
                  </g>
                ))}
              </svg>
            </div>
            {selected && (
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                <div className="font-semibold flex gap-2 items-center"><GitBranch className="h-4 w-4" /> {selected.line} / {selected.label}</div>
                <p className="text-muted-foreground">Evento: {selected.event_type === "moved" ? "Movimentação" : selected.event_type === "created" ? "Entrada" : "Mudança de status"}</p>
                <p className="text-muted-foreground">Origem: {selected.from_pipeline_name || "—"} / {selected.from_stage_name || "—"}</p>
                <p className="text-muted-foreground flex gap-1 items-center"><Clock3 className="h-3.5 w-3.5" /> {format(new Date(selected.occurred_at), "dd/MM/yyyy HH:mm:ss")}</p>
              </div>
            )}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Histórico cronológico</h3>
              <div className="max-h-52 overflow-auto space-y-1">
                {nodes.items.map((n, i) => (
                  <button key={n.id} type="button" onClick={() => setSelectedId(n.id)} className={`w-full rounded-md px-3 py-2 text-left text-xs flex gap-3 items-center hover:bg-muted ${selected?.id === n.id ? "bg-muted" : ""}`}>
                    <span className="text-muted-foreground w-6">{i + 1}.</span>
                    <span className="flex-1">{n.line} → {n.label}</span>
                    <span className="text-muted-foreground">{format(new Date(n.occurred_at), "dd/MM HH:mm")}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
