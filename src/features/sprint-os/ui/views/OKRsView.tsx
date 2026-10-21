/**
 * Visão OKR Builder (Objetivos e Resultados-Chave).
 * Especificação: Master Prompt v9.0 — Seção 17.
 * Hierarquia: Objetivo -> Resultados-chave (KRs) -> Metas -> Progresso.
 * Regra 80/20: Mostra inicialmente Nome do objetivo, progresso e próximo KR; detalhes ao expandir.
 */

import React, { useState } from "react";
import {
  Target,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSprintOSStore } from "../../state/sprintOsStore";
import type { OKRGoal, OKRKeyResult } from "../../domain/types";
import { newId } from "../../domain/ops";

export const OKRsView: React.FC = () => {
  const { workspace, upsertOKRAction, deleteOKRAction } = useSprintOSStore();
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDesc, setGoalDesc] = useState("");

  if (!workspace) return null;

  const okrs = Object.values(workspace.okrs || {}).filter((g) => !g.archivedAt);

  const toggleGoal = (id: string) => {
    setExpandedGoals((p) => ({ ...p, [id]: !p[id] }));
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    await upsertOKRAction({
      title: goalTitle.trim(),
      description: goalDesc.trim(),
      keyResults: [
        {
          id: newId(),
          title: "Resultado-Chave 01",
          current: 0,
          target: 100,
          unit: "%",
          weight: 1,
        },
      ],
    });

    setGoalTitle("");
    setGoalDesc("");
    setShowAddGoalModal(false);
  };

  const handleAddKR = async (goal: OKRGoal) => {
    const title = prompt("Título do novo Resultado-Chave (KR):", "Publicar 30 conteúdos");
    if (!title) return;

    const newKR: OKRKeyResult = {
      id: newId(),
      title,
      current: 0,
      target: 30,
      unit: "un",
      weight: 1,
    };

    await upsertOKRAction({
      ...goal,
      keyResults: [...goal.keyResults, newKR],
    });
  };

  const handleUpdateKRCurrent = async (goal: OKRGoal, krId: string, current: number) => {
    const updatedKRs = goal.keyResults.map((kr) =>
      kr.id === krId ? { ...kr, current: Math.max(0, current) } : kr
    );
    await upsertOKRAction({
      ...goal,
      keyResults: updatedKRs,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/40 border border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Objetivos e Resultados-Chave (OKRs)</h3>
            <p className="text-xs text-white/50">Alinhe metas estratégicas ao ritmo de execução.</p>
          </div>
        </div>

        <Button
          onClick={() => setShowAddGoalModal(true)}
          size="sm"
          className="h-8 text-xs bg-primary hover:bg-primary/90 text-white font-medium rounded-xl flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Criar Objetivo</span>
        </Button>
      </div>

      {/* Lista de OKRs */}
      {okrs.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950/40">
          <Target className="h-8 w-8 text-white/20 mb-2" />
          <div className="text-xs font-semibold text-white/80">Nenhum objetivo cadastrado</div>
          <p className="text-[11px] text-white/40 max-w-sm mt-0.5 mb-3">
            Exemplo: Objetivo: "Gerar demanda orgânica" com KRs para posts, views e entradas.
          </p>
          <Button
            onClick={() => setShowAddGoalModal(true)}
            size="sm"
            className="text-xs bg-primary text-white rounded-xl"
          >
            + Criar Primeiro Objetivo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {okrs.map((goal) => {
            const isExpanded = expandedGoals[goal.id] ?? false;

            // Calcula progresso ponderado
            let totalWeight = 0;
            let achievedWeight = 0;
            goal.keyResults.forEach((kr) => {
              const w = kr.weight || 1;
              totalWeight += w;
              const ratio = kr.target > 0 ? Math.min(1, kr.current / kr.target) : 0;
              achievedWeight += ratio * w;
            });
            const goalPct = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;

            const nextKR = goal.keyResults.find((kr) => kr.current < kr.target);

            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-white/5 bg-zinc-900/40 overflow-hidden transition-all shadow-sm"
              >
                {/* Linha Compacta do Objetivo (Regra 80/20) */}
                <div className="p-4 flex items-center justify-between gap-3 bg-zinc-950/60">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleGoal(goal.id)}
                      className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white truncate">{goal.title}</span>
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/20 bg-primary/10 font-mono">
                          {goalPct}%
                        </Badge>
                      </div>

                      {nextKR && (
                        <div className="text-[11px] text-white/40 truncate">
                          <span className="text-white/60 font-medium">Próximo resultado:</span>{" "}
                          {nextKR.title} ({nextKR.current}/{nextKR.target} {nextKR.unit})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 hidden sm:block">
                      <Progress value={goalPct} className="h-2 bg-white/5" />
                    </div>

                    <Button
                      onClick={() => handleDeleteGoal(goal.id)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/30 hover:text-red-400 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Detalhes Expandidos: Resultados-Chave (KRs) */}
                {isExpanded && (
                  <div className="p-4 border-t border-white/5 space-y-3 bg-black/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                        Resultados-Chave ({goal.keyResults.length})
                      </span>
                      <Button
                        onClick={() => handleAddKR(goal)}
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-primary hover:text-primary/90 hover:bg-primary/10 rounded-lg"
                      >
                        + Adicionar KR
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {goal.keyResults.map((kr) => {
                        const krPct = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0;

                        return (
                          <div
                            key={kr.id}
                            className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white/90">{kr.title}</span>
                              <span className="font-mono text-white/60 font-bold">{krPct}%</span>
                            </div>

                            <Progress value={krPct} className="h-1.5 bg-white/5" />

                            <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                              <div className="flex items-center gap-1.5">
                                <span>Atual:</span>
                                <Input
                                  type="number"
                                  value={kr.current}
                                  onChange={(e) =>
                                    handleUpdateKRCurrent(goal, kr.id, Number(e.target.value) || 0)
                                  }
                                  className="h-6 w-16 text-[11px] bg-black border-white/10 text-white rounded font-mono px-1.5"
                                />
                                <span>/ {kr.target} {kr.unit}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar Objetivo */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#12161F] border border-white/10 text-white max-w-md w-full p-6 rounded-3xl space-y-4">
            <div className="text-base font-bold text-white">Criar Objetivo Estratégico (OKR)</div>
            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="text-white/60 block mb-1">Título do Objetivo</label>
                <Input
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="Ex: Gerar demanda orgânica acelerada"
                  className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Descrição</label>
                <Input
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  placeholder="Ex: Ativar canais de atração para nutrir o CRM com leads qualificados"
                  className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddGoalModal(false)}
                  className="text-xs text-white/50"
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-primary text-white rounded-xl">
                  Criar Objetivo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
