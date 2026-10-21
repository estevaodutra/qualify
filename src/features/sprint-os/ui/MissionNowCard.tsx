/**
 * Componente Executivo: 🧭 MISSÃO AGORA (Seção 22).
 * Exibe automaticamente a próxima ação executável calculada a partir de:
 * - Tarefas não concluídas
 * - Dependências técnicas satisfeitas
 * - Sem bloqueios ativos
 * - Priorização P0 > P1 > P2 > P3 e Impacto Financeiro
 * - Suporta alternar para visualização por responsável
 */

import React from "react";
import {
  Compass,
  ArrowRight,
  User,
  AlertCircle,
  Clock,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSprintOSStore } from "../state/sprintOsStore";
import { computeMissionNow } from "../metrics/calculations";
import { fmtDateTime } from "../scheduler/time";
import { PRIORITY_LABEL } from "../domain/types";

export const MissionNowCard: React.FC = () => {
  const { workspace, activeSprintId, filterAssigneeId, setSelectedTaskId, setIsTaskModalOpen } =
    useSprintOSStore();

  if (!workspace || !activeSprintId) return null;

  const mission = computeMissionNow(workspace, activeSprintId, filterAssigneeId);

  return (
    <div className="rounded-2xl p-5 bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950/80 border border-primary/20 shadow-xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Compass className="h-4 w-4 animate-pulse" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-primary">
            Missão Agora
          </span>
          <span className="text-white/40 text-xs">· Próxima entrega desbloqueada</span>
        </div>

        {filterAssigneeId && (
          <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
            Filtrado por responsável
          </Badge>
        )}
      </div>

      {/* Conteúdo da Missão */}
      {mission.task ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={`text-[10px] font-black ${
                  mission.task.priority === "P0"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : mission.task.priority === "P1"
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}
              >
                {PRIORITY_LABEL[mission.task.priority]}
              </Badge>

              {mission.task.financialImpact && (
                <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold gap-1">
                  <DollarSign className="h-2.5 w-2.5" />
                  Impacto Financeiro
                </Badge>
              )}

              <span className="text-xs text-white/50">{mission.stageTitle}</span>
            </div>

            <h3 className="text-lg font-black text-white hover:text-primary transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedTaskId(mission.task!.id);
                  setIsTaskModalOpen(true);
                }}>
              {mission.task.title}
            </h3>

            <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-white/40" />
                <strong className="text-white">{mission.assigneeName}</strong>
              </span>

              {mission.task.plannedStart && (
                <span className="flex items-center gap-1.5 text-white/60">
                  <Clock className="h-3.5 w-3.5 text-white/40" />
                  Início previsto: {fmtDateTime(mission.task.plannedStart)}
                </span>
              )}

              <span className="flex items-center gap-1.5 text-white/60">
                <CheckCircle2 className="h-3.5 w-3.5 text-white/40" />
                Subtarefas: {mission.subtasksDone}/{mission.subtasksTotal}
              </span>
            </div>

            {/* Próxima Ação Direta */}
            <div className="pt-2 flex items-center gap-2 text-xs">
              <span className="font-bold text-white/40 uppercase tracking-wider text-[10px]">
                Ação Imediata:
              </span>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {mission.nextAction}
              </span>
            </div>
          </div>

          {/* Botão de Abrir */}
          <div className="shrink-0 flex items-center">
            <Button
              onClick={() => {
                setSelectedTaskId(mission.task!.id);
                setIsTaskModalOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-2 shadow-lg"
            >
              <span>Abrir Detalhes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        /* Caso sem tarefa desbloqueada (Exibição de Bloqueio Principal - Seção 22) */
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-white text-sm">
              {mission.blockReason || "Nenhuma tarefa executável no momento"}
            </div>
            <div className="text-white/60">
              {mission.unblockingAction || mission.nextAction}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
