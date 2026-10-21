/**
 * Modal: 🔃 ATUALIZAR PRAZOS (Camada A / Seção 10).
 * Recalcula o cronograma a partir da data e hora atuais de São Paulo.
 * Exibe PRÉVIA das alterações antes de aplicar:
 * - Previsão anterior vs Nova previsão
 * - Diferença em horas e dias úteis
 * - Tabela de tarefas impactadas (Início/Término anterior vs novo)
 * - Risco de atraso perante o prazo original
 * - Confirmação explícita
 */

import React from "react";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { fmtDateTime, fmtMinutes } from "../../scheduler/time";

export const DeadlineUpdateModal: React.FC = () => {
  const {
    workspace,
    deadlineProposal,
    isDeadlineModalOpen,
    setIsDeadlineModalOpen,
    confirmDeadlineUpdate,
  } = useSprintOSStore();

  if (!deadlineProposal || !workspace) return null;

  const {
    forecastBefore,
    forecastAfter,
    deltaWorkMinutes,
    deltaBusinessDays,
    contractEnd,
    lateRisk,
    changes,
    result,
  } = deadlineProposal;

  return (
    <Dialog open={isDeadlineModalOpen} onOpenChange={setIsDeadlineModalOpen}>
      <DialogContent className="max-w-3xl bg-card border border-border text-card-foreground shadow-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <RefreshCw className="h-4 w-4 animate-spin-hover" />
            <span className="text-xs uppercase font-black tracking-wider">
              Motor de Cronograma · São Paulo
            </span>
          </div>
          <DialogTitle className="text-lg font-black text-foreground">
            Prévia de Atualização de Prazos
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Simulação determinística baseada no estado real de execução, disponibilidade e dependências.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
          {/* Alerta de Risco se houver */}
          {lateRisk && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-rose-300">
                  Atenção: A nova previsão de entrega ultrapassa o prazo original contratado!
                </span>
                <p className="text-muted-foreground">
                  Prazo original contratual: <strong>{contractEnd ? fmtDateTime(contractEnd) : "—"}</strong>.
                  Considere realocar responsáveis ou priorizar atividades críticas.
                </p>
              </div>
            </div>
          )}

          {/* Comparativo de Previsão */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border border-border">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Previsão Anterior</div>
              <div className="text-xs font-bold text-foreground">{forecastBefore ? fmtDateTime(forecastBefore) : "—"}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Nova Previsão</div>
              <div className={`text-xs font-black ${lateRisk ? "text-rose-400" : "text-emerald-400"}`}>
                {forecastAfter ? fmtDateTime(forecastAfter) : "—"}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Variação em Horas</div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{deltaWorkMinutes != null ? fmtMinutes(deltaWorkMinutes) : "0h"}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Variação em Dias</div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>{deltaBusinessDays != null ? `${deltaBusinessDays > 0 ? "+" : ""}${deltaBusinessDays} dia(s)` : "0 dias"}</span>
              </div>
            </div>
          </div>

          {/* Tarefas Não Agendadas se houver */}
          {result.unschedulable.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {result.unschedulable.length} tarefa(s) não puderam ser recalculadas:
              </span>
              <ul className="list-disc pl-5 text-[11px] text-muted-foreground space-y-0.5">
                {result.unschedulable.map((u, i) => (
                  <li key={i}>
                    <strong>{workspace.tasks[u.taskId]?.title || u.taskId}:</strong> {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lista de Tarefas Impactadas */}
          <div>
            <div className="text-xs font-bold text-foreground mb-2 flex items-center justify-between">
              <span>Tarefas Impactadas com Novo Horário ({changes.length})</span>
              <span className="text-[11px] text-muted-foreground">
                Apenas plannedStart e plannedEnd serão atualizados
              </span>
            </div>

            {changes.length === 0 ? (
              <div className="p-4 text-center text-xs text-foreground/30 border border-dashed border-border rounded-xl">
                Nenhuma alteração necessária no cronograma atual.
              </div>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-white/5 max-h-48 overflow-y-auto">
                {changes.map((c) => {
                  const task = workspace.tasks[c.taskId];
                  return (
                    <div key={c.taskId} className="p-2.5 text-xs flex items-center justify-between gap-3">
                      <span className="font-semibold text-foreground/90 truncate flex-1">{task?.title}</span>
                      <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                        <span className="text-muted-foreground">{c.before.plannedStart ? fmtDateTime(c.before.plannedStart) : "—"}</span>
                        <ArrowRight className="h-3 w-3 text-primary" />
                        <span className="text-emerald-400 font-bold">{fmtDateTime(c.after.plannedStart)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeadlineModalOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>

          <Button
            onClick={() => confirmDeadlineUpdate()}
            size="sm"
            disabled={changes.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 shadow-lg"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Confirmar e Aplicar Cronograma</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
