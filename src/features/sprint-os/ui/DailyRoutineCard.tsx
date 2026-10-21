/**
 * Componente Operacional: 🔁 ROTINA DIÁRIA (Seção 8).
 * Simplificado e recolhível por padrão:
 * - Estado compacto: "ROTINA DIÁRIA — 3/8", barra de progresso simples, botão expandir.
 * - Quando expandido: checklist interativo, adicionar ação, editar, excluir, configurar horário.
 */

import React, { useState } from "react";
import {
  RotateCcw,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSprintOSStore } from "../state/sprintOsStore";
import { dateOf, nowInSaoPaulo } from "../scheduler/time";
import { toggleRoutineOccurrence, upsertRoutine } from "../domain/ops";

export const DailyRoutineCard: React.FC = () => {
  const { workspace, mutate } = useSprintOSStore();
  const [selectedDate] = useState(() => dateOf(nowInSaoPaulo()));
  const [isExpanded, setIsExpanded] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  if (!workspace) return null;

  const routines = Object.values(workspace.routines || {}).filter((r) => !r.archivedAt);
  const totalRoutines = routines.length;

  const doneRoutineIds = new Set(
    Object.values(workspace.routineOccurrences || {})
      .filter((o) => o.date === selectedDate && o.done)
      .map((o) => o.routineId)
  );

  const doneCount = doneRoutineIds.size;
  const pct = totalRoutines > 0 ? Math.round((doneCount / totalRoutines) * 100) : 0;

  const handleToggle = (routineId: string, currentDone: boolean) => {
    mutate((ws, ctx) => {
      toggleRoutineOccurrence(ws, ctx, routineId, selectedDate, !currentDone);
    });
  };

  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    mutate((ws, ctx) => {
      upsertRoutine(ws, ctx, {
        title: newActionTitle.trim(),
        frequency: "daily",
        description: "",
      });
    });

    setNewActionTitle("");
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    mutate((ws, ctx) => {
      if (ws.routines[id]) {
        ws.routines[id].archivedAt = ctx.nowIso;
      }
    });
  };

  return (
    <div className="rounded-2xl p-4 bg-zinc-900/60 border border-white/5 backdrop-blur-xl transition-all">
      {/* Linha Compacta Principal */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Rotina Diária
            </span>
            <span className="text-xs font-mono font-bold text-primary">
              {doneCount}/{totalRoutines}
            </span>
          </div>

          {/* Barra de Progresso Simples */}
          <div className="w-24 hidden sm:block">
            <Progress value={pct} className="h-1.5 bg-white/10" />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-white/50">{pct}% hoje</span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 text-white/40 hover:text-white rounded-lg"
            title={isExpanded ? "Recolher Rotina" : "Expandir Rotina"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Conteúdo Expandido (Sob Demanda) */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5">
          {routines.length === 0 ? (
            <div className="text-xs text-white/40 py-2 text-center">
              Nenhuma ação de rotina diária configurada.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {routines.map((routine) => {
                const isDone = doneRoutineIds.has(routine.id);
                return (
                  <div
                    key={routine.id}
                    className="group flex items-center justify-between p-2 rounded-xl bg-black/30 hover:bg-black/50 border border-white/5 text-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(routine.id, isDone)}
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0" />
                      )}
                      <span className={`truncate ${isDone ? "line-through text-white/40" : "text-white/90"}`}>
                        {routine.title}
                      </span>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {routine.time && (
                        <span className="text-[10px] text-white/40 font-mono">
                          {routine.time}
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(routine.id)}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-opacity p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Adicionar Ação de Rotina */}
          {showAddForm ? (
            <form onSubmit={handleAddAction} className="flex items-center gap-1.5 pt-1">
              <Input
                value={newActionTitle}
                onChange={(e) => setNewActionTitle(e.target.value)}
                placeholder="Nome da rotina diária..."
                className="h-7 text-xs bg-black border-white/10 text-white rounded-lg flex-1"
                autoFocus
              />
              <Button type="submit" size="sm" className="h-7 text-[11px] bg-primary text-white rounded-lg px-2.5">
                Salvar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="h-7 text-[11px] text-white/50"
              >
                Cancelar
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="w-full h-7 text-[11px] text-white/50 hover:text-white hover:bg-white/5 rounded-lg flex items-center justify-center gap-1 border border-dashed border-white/10"
            >
              <Plus className="h-3 w-3" />
              <span>Adicionar Ação de Rotina</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
