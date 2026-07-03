import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, CheckCircle2, XCircle, Loader2, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowExecution, WorkflowExecutionStatus } from "@/hooks/useWorkflowExecutions";

interface ExecutionsListProps {
  executions: WorkflowExecution[];
  isLoading: boolean;
  error: Error | null;
  selectedExecutionId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

const STATUS_META: Record<WorkflowExecutionStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  success: { label: "Sucesso", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  error: { label: "Erro", icon: XCircle, className: "text-destructive bg-destructive/5 border-destructive/20" },
  running: { label: "Em andamento", icon: Loader2, className: "text-amber-600 bg-amber-50 border-amber-200" },
  waiting: { label: "Aguardando", icon: Clock, className: "text-sky-600 bg-sky-50 border-sky-200" },
  cancelled: { label: "Cancelado", icon: Ban, className: "text-slate-500 bg-slate-100 border-slate-200" },
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function ExecutionsList({ executions, isLoading, error, selectedExecutionId, onSelect, onRefresh }: ExecutionsListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return executions.filter(exec => {
      if (statusFilter !== "all" && exec.status !== statusFilter) return false;
      if (search.trim() && !exec.id.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [executions, search, statusFilter]);

  return (
    <Card className="w-[300px] shrink-0 flex flex-col border-slate-200/60 bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Execuções</h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">{filtered.length}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-slate-50" onClick={onRefresh} title="Atualizar">
              <RefreshCw className={cn("h-3.5 w-3.5 text-slate-500", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID..."
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="running">Em andamento</SelectItem>
            <SelectItem value="waiting">Aguardando</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            {error ? (
              <div className="text-destructive p-2 rounded-lg bg-destructive/5 border border-destructive/10 text-left overflow-hidden break-words font-mono text-[10px]">
                Erro: {error instanceof Error ? error.message : String(error)}
              </div>
            ) : isLoading ? (
              "Carregando execuções..."
            ) : (
              "Nenhuma execução encontrada."
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filtered.map((exec) => {
              const meta = STATUS_META[exec.status];
              const StatusIcon = meta.icon;
              const isSelected = selectedExecutionId === exec.id;
              return (
                <button
                  key={exec.id}
                  onClick={() => onSelect(exec.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-xl border transition-colors",
                    isSelected ? "border-[#8A3CFF] bg-[#8A3CFF]/5" : "border-transparent hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border", meta.className)}>
                      <StatusIcon className={cn("h-2.5 w-2.5", exec.status === "running" && "animate-spin")} />
                      {meta.label}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">{formatDuration(exec.durationMs)}</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 truncate">{exec.id}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-slate-400">{new Date(exec.startedAt).toLocaleString("pt-BR")}</span>
                    {exec.triggerType && <span className="text-[9px] text-slate-400 uppercase font-bold">{exec.triggerType}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
