/**
 * Visão Marcos / Checkpoints de Implementação (Camada A / Seção 25).
 * 5 Marcos Canônicos Editáveis:
 * - MARCO 1: ESTRUTURA COMERCIAL
 * - MARCO 2: AQUISIÇÃO ATIVA
 * - MARCO 3: OPERAÇÃO MONITORADA
 * - MARCO 4: WEBINAR PLANEJADO
 * - MARCO 5: IMPLEMENTAÇÃO ENTREGUE
 */

import React from "react";
import {
  Flag,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  CheckSquare,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { validateMilestone } from "../../domain/ops";
import { fmtDateTime } from "../../scheduler/time";

export const MilestonesView: React.FC = () => {
  const { workspace, activeSprintId, mutate, setSelectedTaskId, setIsTaskModalOpen } =
    useSprintOSStore();

  if (!workspace || !activeSprintId) return null;

  const milestones = Object.values(workspace.milestones)
    .filter((m) => m.sprintId === activeSprintId && !m.archivedAt)
    .sort((a, b) => a.position - b.position);

  const handleToggleValidation = (milestoneId: string, currentValid: boolean) => {
    mutate((ws, ctx) => {
      validateMilestone(ws, ctx, milestoneId, !currentValid);
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
            Checkpoints de Validação da Implementação
          </h3>
          <span className="text-xs text-muted-foreground">
            Validação formal de cada entrega da sprint perante os critérios de aceite
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {milestones.map((m, idx) => {
          const isValidated = !!m.validatedAt;
          const linkedTasks = m.taskIds
            .map((id) => workspace.tasks[id])
            .filter((t) => t && !t.archivedAt);
          const tasksDone = linkedTasks.filter((t) => t.status === "done").length;
          const totalTasks = linkedTasks.length;
          const pct = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;
          const canValidate = totalTasks > 0 && tasksDone === totalTasks;

          return (
            <div
              key={m.id}
              className={`p-5 rounded-2xl border transition-all ${
                isValidated
                  ? "bg-emerald-500/[0.04] border-emerald-500/30 shadow-sm"
                  : "bg-card border-border shadow-sm"
              }`}
            >
              {/* Header do Marco */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isValidated
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{m.title}</span>
                      {isValidated && (
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px]">
                          Validado
                        </Badge>
                      )}
                    </h4>
                    {m.dueDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        Prazo previsto: {m.dueDate.split("-").reverse().join("/")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botão de Validação Formal */}
                <div>
                  <Button
                    onClick={() => handleToggleValidation(m.id, isValidated)}
                    variant={isValidated ? "outline" : "default"}
                    size="sm"
                    className={`text-xs font-bold gap-1.5 ${
                      isValidated
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        : canValidate
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                    disabled={!isValidated && !canValidate}
                    title={!canValidate && !isValidated ? "Conclua todas as tarefas vinculadas primeiro" : ""}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{isValidated ? "Reabrir Marco" : "Validar Marco"}</span>
                  </Button>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                  <span>
                    Entregas Concluídas ({tasksDone}/{totalTasks})
                  </span>
                  <span className="font-bold text-foreground">{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5 bg-muted [&>div]:bg-emerald-500" />
              </div>

              {/* Critérios de Aceite */}
              {m.criteria.length > 0 && (
                <div className="mb-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <div className="text-[11px] uppercase font-bold text-muted-foreground mb-2">
                    Critérios de Aceite:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground">
                    {m.criteria.map((cr, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckSquare className="h-3 w-3 text-primary shrink-0" />
                        <span>{cr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarefas Vinculadas */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <span className="text-[11px] text-muted-foreground mr-1">Tarefas:</span>
                {linkedTasks.map((t) => (
                  <Badge
                    key={t.id}
                    onClick={() => {
                      setSelectedTaskId(t.id);
                      setIsTaskModalOpen(true);
                    }}
                    variant="outline"
                    className={`text-[10px] cursor-pointer hover:border-primary/50 transition-colors ${
                      t.status === "done"
                        ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {t.status === "done" ? "✓" : "○"} {t.title}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
