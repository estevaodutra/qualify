/**
 * Módulo Comercial: FUNIL X1 (Seções 8 e 9).
 * - Gráfico de Funil com faixas horizontais centralizadas e proporcionais
 * - Pipeline totalmente flexível e editável (+ Adicionar, Editar, Reordenar, Excluir)
 * - Indicadores superiores reais sem dados fictícios
 */

import React, { useState } from "react";
import {
  TrendingUp,
  Minus,
  Plus,
  Users,
  CheckCircle2,
  DollarSign,
  Filter,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSprintOSStore } from "../../state/sprintOsStore";
import type { FunnelStage } from "../../domain/types";

export const FunnelView: React.FC = () => {
  const {
    workspace,
    createFunnelStageAction,
    updateFunnelStageAction,
    deleteFunnelStageAction,
    reorderFunnelStagesAction,
  } = useSprintOSStore();

  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [stageLabel, setStageLabel] = useState("");
  const [stageColor, setStageColor] = useState("#6366F1");

  // Exclusão com realocação
  const [stageToDelete, setStageToDelete] = useState<FunnelStage | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>("");

  if (!workspace) return null;

  const funnelStages = Object.values(workspace.funnel || {}).sort(
    (a, b) => a.position - b.position
  );

  const totalContacts = funnelStages.reduce((sum, s) => sum + s.count, 0);
  const totalRevenue = funnelStages.reduce((sum, s) => sum + (s.value || 0), 0);

  // Vendas realizadas: busca etapa com label contendo "venda realizada" ou "fechamento"
  const closedWonStage = funnelStages.find((s) =>
    s.label.toLowerCase().includes("venda realizada") || s.label.toLowerCase().includes("fechado")
  );
  const salesCount = closedWonStage ? closedWonStage.count : 0;
  const conversionRate = totalContacts > 0 ? ((salesCount / totalContacts) * 100).toFixed(1) : null;

  const maxCount = Math.max(1, ...funnelStages.map((s) => s.count));

  const handleStepCount = async (stageId: string, delta: number) => {
    const stage = workspace.funnel[stageId];
    if (!stage) return;
    await updateFunnelStageAction(stageId, { count: Math.max(0, stage.count + delta) });
  };

  const handleUpdateValue = async (stageId: string, val: number) => {
    await updateFunnelStageAction(stageId, { value: Math.max(0, val) });
  };

  const handleOpenAdd = () => {
    setEditingStage(null);
    setStageLabel("");
    setStageColor("#6366F1");
    setShowAddStageModal(true);
  };

  const handleOpenEdit = (stage: FunnelStage) => {
    setEditingStage(stage);
    setStageLabel(stage.label);
    setStageColor(stage.color || "#6366F1");
    setShowAddStageModal(true);
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageLabel.trim()) return;

    if (editingStage) {
      await updateFunnelStageAction(editingStage.id, {
        label: stageLabel.trim(),
        color: stageColor,
      });
    } else {
      await createFunnelStageAction(stageLabel.trim(), stageColor, 0);
    }
    setShowAddStageModal(false);
  };

  const handleMoveStage = async (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= funnelStages.length) return;
    const list = [...funnelStages];
    const temp = list[index];
    list[index] = list[newIdx];
    list[newIdx] = temp;
    await reorderFunnelStagesAction(list.map((s) => s.id));
  };

  const handleConfirmDelete = async () => {
    if (!stageToDelete) return;
    await deleteFunnelStageAction(stageToDelete.id, reassignTargetId || null);
    setStageToDelete(null);
    setReassignTargetId("");
  };

  return (
    <div className="space-y-6">
      {/* 1. Indicadores Superiores Reais (Sem dados fictícios) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="text-xs uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Total de Contatos
          </div>
          <div className="text-2xl font-black text-foreground font-mono">{totalContacts}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Soma de todas as etapas</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="text-xs uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Vendas Realizadas
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{salesCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Etapa de fechamento</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="text-xs uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Taxa de Conversão
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {conversionRate !== null ? `${conversionRate}%` : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Contatos para vendas</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="text-xs uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            Receita Atribuída
          </div>
          <div className="text-2xl font-black text-primary font-mono">
            R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Valor total registrado</div>
        </div>
      </div>

      {/* 2. Layout em Duas Colunas: Gráfico de Funil (Esq) vs Lista de Etapas (Dir) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: FUNIL DE VENDAS GRÁFICO (Seção 9) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Funil de Vendas Visual
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {funnelStages.length} etapas ativas
              </span>
            </div>

            {funnelStages.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                Nenhuma etapa cadastrada no funil.
              </div>
            ) : (
              <div className="space-y-2 flex flex-col items-center w-full">
                {funnelStages.map((stage) => {
                  // Largura proporcional com mínimo de 20% para visibilidade
                  const widthPct = Math.max(
                    20,
                    Math.round((stage.count / maxCount) * 100)
                  );

                  return (
                    <div
                      key={stage.id}
                      className="w-full flex flex-col items-center group transition-all"
                    >
                      <div
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: stage.color || "#6366F1",
                        }}
                        className="h-10 rounded-xl flex items-center justify-between px-3 text-white shadow-md transition-all duration-300 relative overflow-hidden"
                      >
                        <span className="text-xs font-bold truncate drop-shadow-sm">
                          {stage.label}
                        </span>
                        <Badge className="bg-black/40 text-white border-none font-mono text-xs font-bold px-2 py-0.5 shrink-0">
                          {stage.count}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted-foreground text-center">
            As larguras das faixas refletem o volume informado em cada etapa do pipeline.
          </div>
        </div>

        {/* COLUNA DIREITA: ETAPAS DO PIPELINE COM GERENCIAMENTO (Seção 8) */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Etapas do Pipeline
            </h3>
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>Adicionar Etapa</span>
            </Button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {funnelStages.map((stage, idx) => (
              <div
                key={stage.id}
                className="p-3 rounded-2xl bg-muted/40 border border-border flex flex-col gap-2 group hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      style={{ backgroundColor: stage.color || "#6366F1" }}
                      className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                    />
                    <span className="text-xs font-bold text-foreground truncate">
                      {stage.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveStage(idx, "up")}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 rounded"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      disabled={idx === funnelStages.length - 1}
                      onClick={() => handleMoveStage(idx, "down")}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 rounded"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(stage)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setStageToDelete(stage)}
                      className="p-1 text-muted-foreground hover:text-red-500 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Contadores e Valores Financeiros */}
                <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                  {/* Stepper [-] count [+] */}
                  <div className="flex items-center gap-1 bg-background rounded-lg p-0.5 border border-input">
                    <button
                      onClick={() => handleStepCount(stage.id, -1)}
                      className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-mono font-bold text-foreground px-2">
                      {stage.count}
                    </span>
                    <button
                      onClick={() => handleStepCount(stage.id, 1)}
                      className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Valor Financeiro da Etapa */}
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>R$</span>
                    <Input
                      type="number"
                      value={stage.value || ""}
                      onChange={(e) => handleUpdateValue(stage.id, Number(e.target.value) || 0)}
                      placeholder="0"
                      className="h-6 w-20 text-[11px] bg-background border-input text-foreground rounded font-mono px-1 text-right"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: Adicionar / Editar Etapa do Funil */}
      <Dialog open={showAddStageModal} onOpenChange={setShowAddStageModal}>
        <DialogContent className="bg-card border border-border text-card-foreground max-w-sm p-6 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingStage ? "Editar Etapa do Funil" : "Nova Etapa do Pipeline"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveStage} className="space-y-4 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Nome da Etapa</label>
              <Input
                value={stageLabel}
                onChange={(e) => setStageLabel(e.target.value)}
                placeholder="Ex: Call Agendada"
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">Cor de Destaque</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="h-8 w-12 rounded-lg bg-background border border-input cursor-pointer"
                />
                <Input
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl flex-1 font-mono"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddStageModal(false)}
                className="text-xs text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button type="submit" className="text-xs bg-primary text-primary-foreground rounded-xl">
                Salvar Etapa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Exclusão Segura com Realocação de Registros */}
      <Dialog open={!!stageToDelete} onOpenChange={(open) => !open && setStageToDelete(null)}>
        <DialogContent className="bg-card border border-border text-card-foreground max-w-md p-6 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir Etapa "{stageToDelete?.label}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs text-muted-foreground">
            {stageToDelete && stageToDelete.count > 0 ? (
              <>
                <p className="leading-relaxed">
                  Esta etapa possui <strong className="text-foreground">{stageToDelete.count} contatos registrados</strong>.
                  Para onde deseja transferi-los antes de remover a etapa?
                </p>
                <div>
                  <label className="text-muted-foreground block mb-1">Etapa de Destino</label>
                  <select
                    value={reassignTargetId}
                    onChange={(e) => setReassignTargetId(e.target.value)}
                    className="w-full h-8 px-2 rounded-xl bg-background border border-input text-foreground text-xs"
                    required
                  >
                    <option value="">Selecione a etapa de destino...</option>
                    {funnelStages
                      .filter((s) => s.id !== stageToDelete.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} ({s.count} contatos)
                        </option>
                      ))}
                  </select>
                </div>
              </>
            ) : (
              <p className="leading-relaxed">
                Tem certeza que deseja remover esta etapa do pipeline? Nenhum contato será afetado.
              </p>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStageToDelete(null)}
              className="text-xs text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={stageToDelete && stageToDelete.count > 0 && !reassignTargetId}
              variant="destructive"
              className="text-xs rounded-xl"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
