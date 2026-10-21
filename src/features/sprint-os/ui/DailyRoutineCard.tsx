/**
 * Componente Operacional: 🔁 ROTINA DIÁRIA (Seção 24).
 * Atividades recorrentes com histórico preservado por data:
 * - Checklist com status de ocorrência para a data atual
 * - Progresso diário calibrado:
 *   0–39% — 🔴 Começar
 *   40–69% — 🟡 Em ritmo
 *   70–89% — 🟢 Forte
 *   90–100% — 🔥 Excelente
 */

import React, { useState } from "react";
import {
  RotateCcw,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Flame,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSprintOSStore } from "../state/sprintOsStore";
import { dateOf, nowInSaoPaulo } from "../scheduler/time";
import { toggleRoutineOccurrence } from "../domain/ops";

export const DailyRoutineCard: React.FC = () => {
  const { workspace, activeSprintId, mutate } = useSprintOSStore();
  const [selectedDate, setSelectedDate] = useState(() => dateOf(nowInSaoPaulo()));

  if (!workspace) return null;

  const routines = Object.values(workspace.routines).filter((r) => !r.archivedAt);
  const totalRoutines = routines.length;

  // Ocorrências da data selecionada
  const doneRoutineIds = new Set(
    Object.values(workspace.routineOccurrences)
      .filter((o) => o.date === selectedDate && o.done)
      .map((o) => o.routineId)
  );

  const doneCount = doneRoutineIds.size;
  const pct = totalRoutines > 0 ? Math.round((doneCount / totalRoutines) * 100) : 0;

  // Avaliação de ritmo (Seção 24)
  const getPaceBadge = (pct: number) => {
    if (pct >= 90) return { label: "🔥 Excelente", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    if (pct >= 70) return { label: "🟢 Forte", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    if (pct >= 40) return { label: "🟡 Em ritmo", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" };
    return { label: "🔴 Começar", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  };

  const pace = getPaceBadge(pct);

  const handleToggle = (routineId: string, currentDone: boolean) => {
    mutate((ws, ctx) => {
      toggleRoutineOccurrence(ws, ctx, routineId, selectedDate, !currentDone);
    });
  };

  return (
    <div className="rounded-2xl p-5 bg-zinc-900/60 border border-white/5 backdrop-blur-md flex flex-col justify-between">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white/50">
              Rotina Diária
            </span>
            <span className="text-xs text-white/40">({selectedDate.split("-").reverse().slice(0, 2).join("/")})</span>
          </div>

          <Badge className={`text-[10px] font-black border ${pace.color}`}>
            {pace.label}
          </Badge>
        </div>

        {/* Barra de Progresso */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60">
              {doneCount} de {totalRoutines} concluídas hoje
            </span>
            <span className="font-bold text-white">{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5 bg-white/10 [&>div]:bg-emerald-500" />
        </div>

        {/* Lista de Rotinas com Checkbox real */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
          {routines.map((r) => {
            const isDone = doneRoutineIds.has(r.id);
            return (
              <div
                key={r.id}
                onClick={() => handleToggle(r.id, isDone)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isDone
                    ? "bg-emerald-500/5 border-emerald-500/20 text-white/50"
                    : "bg-white/5 border-white/5 hover:border-white/20 text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-white/40" />
                    )}
                  </div>
                  <div className="truncate">
                    <span className={`text-xs font-medium ${isDone ? "line-through text-white/40" : "text-white/90"}`}>
                      {r.title}
                    </span>
                  </div>
                </div>

                {r.time && (
                  <span className="text-[10px] font-mono text-white/40 shrink-0 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {r.time}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
        <span>Histórico salvo por data</span>
        <span className="text-white/60 font-medium">Ciclo recorrente</span>
      </div>
    </div>
  );
};
