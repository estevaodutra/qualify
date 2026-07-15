import { Button } from "@/components/ui/button";
import { Copy, RotateCcw, Loader2, CheckCircle2, XCircle, Clock, Ban, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowExecution } from "@/hooks/useWorkflowExecutions";
import { useToast } from "@/hooks/use-toast";

interface ExecutionHeaderProps {
  execution: WorkflowExecution;
  onRerun?: () => void;
  isRerunning?: boolean;
  onUseAsReference?: () => void;
  onEdit?: () => void;
}

const STATUS_LABEL: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
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

export function ExecutionHeader({ execution, onRerun, isRerunning, onUseAsReference, onEdit }: ExecutionHeaderProps) {
  const { toast } = useToast();
  const meta = STATUS_LABEL[execution.status];
  const StatusIcon = meta.icon;

  const canRerun = !!onRerun && (execution.status === "success" || execution.status === "error" || execution.status === "cancelled");

  return (
    <div className="flex items-center justify-between bg-white border border-slate-200/60 px-4 py-2.5 rounded-2xl shadow-sm">
      <div className="flex items-center gap-4 min-w-0">
        <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0", meta.className)}>
          <StatusIcon className={cn("h-3 w-3", execution.status === "running" && "animate-spin")} />
          {meta.label}
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(execution.id); toast({ title: "ID copiado" }); }}
          className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-600 truncate"
          title="Copiar ID"
        >
          <span className="truncate">{execution.id}</span>
          <Copy className="h-3 w-3 shrink-0" />
        </button>
        <span className="text-[10px] text-slate-400 shrink-0">Início: {new Date(execution.startedAt).toLocaleString("pt-BR")}</span>
        {execution.finishedAt && (
          <span className="text-[10px] text-slate-400 shrink-0">Término: {new Date(execution.finishedAt).toLocaleString("pt-BR")}</span>
        )}
        <span className="text-[10px] text-slate-400 shrink-0">Duração: {formatDuration(execution.durationMs)}</span>
        {execution.triggerType && (
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Gatilho: {execution.triggerType}</span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {execution.triggerType === "webhook" && onUseAsReference && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[#8A3CFF]/30 hover:bg-[#8A3CFF]/5 text-[#8A3CFF] gap-1.5 h-8 px-3 text-xs font-semibold"
              onClick={onUseAsReference}
            >
              Usar como referência
            </Button>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-[#8A3CFF]/30 hover:bg-[#8A3CFF]/5 text-[#8A3CFF] gap-1.5 h-8 px-3 text-xs font-semibold"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
          </div>
        )}
        {canRerun && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 h-8 px-3 text-xs font-semibold"
            onClick={onRerun}
            disabled={isRerunning}
          >
            {isRerunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Reexecutar
          </Button>
        )}
      </div>
    </div>
  );
}
