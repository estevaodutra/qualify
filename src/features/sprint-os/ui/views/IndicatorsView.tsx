/**
 * Visão Indicadores Dinâmicos & Distribuição de Conteúdo.
 * Especificação: Master Prompt v9.0 — Seções 15 e 16.
 * - KPI Builder: criação de métricas sem alterar código (Contador, Meta, Moeda, etc.)
 * - Fixação de indicador no Cockpit 80/20
 * - Preset Oficial: Distribuição de Conteúdo (Posts, Reels, Stories, Visualizações, Entradas no grupo, Leads)
 */

import React, { useState } from "react";
import {
  BarChart3,
  Plus,
  Pin,
  Trash2,
  Share2,
  TrendingUp,
  Instagram,
  Eye,
  Users,
  Layers,
  Sparkles,
  DollarSign,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useSprintOSStore } from "../../state/sprintOsStore";
import type { CustomIndicator, IndicatorType } from "../../domain/types";

export const IndicatorsView: React.FC = () => {
  const {
    workspace,
    upsertIndicatorAction,
    deleteIndicatorAction,
    togglePinIndicatorAction,
    updateContentMetricsAction,
  } = useSprintOSStore();

  const [activeSubTab, setActiveSubTab] = useState<"kpis" | "content">("kpis");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<IndicatorType>("counter");
  const [currentValue, setCurrentValue] = useState(0);
  const [targetValue, setTargetValue] = useState<number | undefined>(undefined);
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<any>("geral");

  if (!workspace) return null;

  const indicators = Object.values(workspace.indicators || {}).filter((i) => !i.archivedAt);
  const content = workspace.contentMetrics || {
    postsPublished: 12,
    postsPerDay: 1.2,
    reels: 4,
    stories: 25,
    views: 8400,
    reach: 5200,
    clicks: 340,
    groupEntries: 85,
    leadsCaptured: 42,
    adSpend: 500,
    period: "sprint",
  };

  const handleCreateKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await upsertIndicatorAction({
      name: name.trim(),
      type,
      currentValue: Number(currentValue) || 0,
      targetValue: targetValue ? Number(targetValue) : null,
      unit: unit.trim(),
      category,
    });

    setName("");
    setCurrentValue(0);
    setTargetValue(undefined);
    setUnit("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header da Aba com Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/40 border border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("kpis")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "kpis"
                ? "bg-primary text-white shadow-sm shadow-primary/20"
                : "bg-white/5 text-white/60 hover:text-white"
            }`}
          >
            📊 KPI Builder ({indicators.length})
          </button>
          <button
            onClick={() => setActiveSubTab("content")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "content"
                ? "bg-primary text-white shadow-sm shadow-primary/20"
                : "bg-white/5 text-white/60 hover:text-white"
            }`}
          >
            📣 Distribuição de Conteúdo
          </button>
        </div>

        {activeSubTab === "kpis" && (
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-white font-medium rounded-xl flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Indicador</span>
          </Button>
        )}
      </div>

      {/* Conteúdo: KPI Builder */}
      {activeSubTab === "kpis" && (
        <div>
          {indicators.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950/40">
              <BarChart3 className="h-8 w-8 text-white/20 mb-2" />
              <div className="text-xs font-semibold text-white/80">Nenhum indicador personalizado cadastrado</div>
              <p className="text-[11px] text-white/40 max-w-sm mt-0.5 mb-3">
                Crie métricas customizadas para acompanhar no cockpit (ex: Reuniões Realizadas, CPL Médio, etc.).
              </p>
              <Button
                onClick={() => setShowAddModal(true)}
                size="sm"
                className="text-xs bg-primary text-white rounded-xl"
              >
                + Criar Primeiro KPI
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicators.map((kpi) => {
                const pct = kpi.targetValue ? Math.min(100, Math.round((kpi.currentValue / kpi.targetValue) * 100)) : null;

                return (
                  <div
                    key={kpi.id}
                    className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-white/40 border-white/10">
                          {kpi.category}
                        </Badge>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePinIndicatorAction(kpi.id)}
                            className={`p-1 rounded-lg transition-colors ${
                              kpi.pinnedToCockpit ? "text-primary bg-primary/10" : "text-white/30 hover:text-white"
                            }`}
                            title={kpi.pinnedToCockpit ? "Fixado na Visão Geral" : "Fixar no Cockpit"}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteIndicatorAction(kpi.id)}
                            className="p-1 text-white/30 hover:text-red-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-sm font-bold text-white mb-1">{kpi.name}</div>
                      <div className="text-2xl font-extrabold text-white font-mono mb-2">
                        {kpi.unit} {kpi.currentValue}
                      </div>

                      {pct !== null && (
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-[11px] text-white/50">
                            <span>Meta: {kpi.unit} {kpi.targetValue}</span>
                            <span className="font-mono text-white/80">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5 bg-white/5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo: Distribuição de Conteúdo */}
      {activeSubTab === "content" && (
        <div className="space-y-5">
          {/* Top 3 Métricas Oficiais (Regra 80/20) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-primary/20">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1 font-medium">
                <span>1. Conteúdos Publicados</span>
                <Instagram className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{content.postsPublished}</div>
              <div className="text-[11px] text-white/40 mt-1">{content.postsPerDay} posts/dia média</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1 font-medium">
                <span>2. Visualizações Geradas</span>
                <Eye className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">
                {content.views.toLocaleString("pt-BR")}
              </div>
              <div className="text-[11px] text-white/40 mt-1">{content.reach.toLocaleString("pt-BR")} alcance estimado</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1 font-medium">
                <span>3. Entradas no Grupo</span>
                <Users className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{content.groupEntries}</div>
              <div className="text-[11px] text-white/40 mt-1">{content.leadsCaptured} leads diretos</div>
            </div>
          </div>

          {/* Editor Rápido de Métricas de Conteúdo */}
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-white/60">
              Atualizar Registros de Mídia e Conteúdo
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-white/40 block mb-1">Posts Publicados</label>
                <Input
                  type="number"
                  value={content.postsPublished}
                  onChange={(e) => updateContentMetricsAction({ postsPublished: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                />
              </div>
              <div>
                <label className="text-white/40 block mb-1">Visualizações</label>
                <Input
                  type="number"
                  value={content.views}
                  onChange={(e) => updateContentMetricsAction({ views: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                />
              </div>
              <div>
                <label className="text-white/40 block mb-1">Entradas Grupo</label>
                <Input
                  type="number"
                  value={content.groupEntries}
                  onChange={(e) => updateContentMetricsAction({ groupEntries: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                />
              </div>
              <div>
                <label className="text-white/40 block mb-1">Gasto Anúncios (R$)</label>
                <Input
                  type="number"
                  value={content.adSpend}
                  onChange={(e) => updateContentMetricsAction({ adSpend: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de KPI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#12161F] border border-white/10 text-white max-w-md w-full p-6 rounded-3xl space-y-4">
            <div className="text-base font-bold text-white">Criar Novo Indicador (KPI)</div>
            <form onSubmit={handleCreateKPI} className="space-y-3 text-xs">
              <div>
                <label className="text-white/60 block mb-1">Nome da Métrica</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Reuniões Realizadas"
                  className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/60 block mb-1">Valor Atual</label>
                  <Input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value) || 0)}
                    className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Meta (Opcional)</label>
                  <Input
                    type="number"
                    value={targetValue || ""}
                    onChange={(e) => setTargetValue(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Ex: 50"
                    className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/60 block mb-1">Unidade / Prefixo</label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Ex: R$, %, un"
                    className="h-8 text-xs bg-black border-white/10 text-white rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-8 px-2 rounded-xl bg-black border border-white/10 text-white text-xs focus:outline-none"
                  >
                    <option value="geral">Geral</option>
                    <option value="comercial">Comercial</option>
                    <option value="midia">Mídia & Conteúdo</option>
                    <option value="financeiro">Financeiro</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs text-white/50"
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-primary text-white rounded-xl">
                  Salvar Indicador
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
