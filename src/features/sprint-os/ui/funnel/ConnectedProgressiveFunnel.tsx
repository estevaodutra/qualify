/**
 * Funil Comercial com Representação Visual Própria (Conectada e Progressiva).
 * Especificação: Master Prompt — Seção 02.
 * - Etapas conectadas com progressão visual
 * - Contadores de leads por etapa com ajustes rápidos (+ / -)
 * - Arraste e reordenação das etapas (Drag-and-Drop)
 * - Edição de títulos diretamente na etapa (duplo-clique ou botão editar)
 * - Taxas de conversão relativas entre etapas subsequentes
 * - Responsivo (horizontal em telas amplas, vertical em telas compactas)
 * - Exclusão segura com realocação de contatos
 */

import React, { useState, useEffect } from "react";
import {
  Filter,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Archive,
  ArrowRight,
  ArrowDown,
  GripVertical,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Users,
  ChevronRight,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSprintOSStore } from "../../state/sprintOsStore";
import {
  createFunnelStage,
  updateFunnelStage,
  deleteFunnelStage,
  reorderFunnelStages,
  ensureDefaultFunnelStages,
} from "../../domain/ops";
import { toast } from "sonner";
import type { FunnelStage } from "../../domain/types";

interface ConnectedProgressiveFunnelProps {
  compact?: boolean;
}

export const ConnectedProgressiveFunnel: React.FC<ConnectedProgressiveFunnelProps> = ({
  compact = false,
}) => {
  const { workspace, mutate } = useSprintOSStore();

  // Estados de Edição / Criação
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [stageLabel, setStageLabel] = useState("");
  const [stageColor, setStageColor] = useState("#6366F1");

  // Inline rename
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");

  // Drag and drop
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);

  // Exclusão segura com realocação
  const [stageToDelete, setStageToDelete] = useState<FunnelStage | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>("");

  // Garantir etapas iniciais se funil estiver vazio
  useEffect(() => {
    if (workspace && (!workspace.funnel || Object.keys(workspace.funnel).length === 0)) {
      mutate((ws, ctx) => {
        ensureDefaultFunnelStages(ws, ctx);
      });
    }
  }, [workspace?.project?.id]);

  if (!workspace) return null;

  const funnelStages = Object.values(workspace.funnel || {})
    .filter((s) => !s.archivedAt)
    .sort((a, b) => a.position - b.position);

  const archivedStages = Object.values(workspace.funnel || {}).filter((s) => !!s.archivedAt);

  const totalContacts = funnelStages.reduce((sum, s) => sum + s.count, 0);
  const totalRevenue = funnelStages.reduce((sum, s) => sum + (s.value || 0), 0);
  const firstStageCount = funnelStages[0]?.count || 0;
  const lastStageCount = funnelStages[funnelStages.length - 1]?.count || 0;
  const globalConversionRate =
    firstStageCount > 0 ? ((lastStageCount / firstStageCount) * 100).toFixed(1) : null;

  // Handlers de Contagem (+ e -)
  const handleStepCount = (stageId: string, delta: number) => {
    const stage = workspace.funnel[stageId];
    if (!stage) return;
    const newCount = Math.max(0, stage.count + delta);
    mutate((ws, ctx) => {
      updateFunnelStage(ws, ctx, stageId, { count: newCount });
    });
  };

  // Reordenação por Drag and Drop
  const handleDragStart = (stageId: string) => {
    setDraggedStageId(stageId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetStageId: string) => {
    if (!draggedStageId || draggedStageId === targetStageId) return;
    const stageIds = funnelStages.map((s) => s.id);
    const fromIdx = stageIds.indexOf(draggedStageId);
    const toIdx = stageIds.indexOf(targetStageId);
    if (fromIdx === -1 || toIdx === -1) return;

    stageIds.splice(fromIdx, 1);
    stageIds.splice(toIdx, 0, draggedStageId);

    mutate((ws, ctx) => {
      reorderFunnelStages(ws, ctx, stageIds);
    });
    setDraggedStageId(null);
    toast.success("Etapas do funil reordenadas!");
  };

  const moveStageDirection = (stageId: string, direction: "prev" | "next") => {
    const stageIds = funnelStages.map((s) => s.id);
    const idx = stageIds.indexOf(stageId);
    if (idx === -1) return;
    const targetIdx = direction === "prev" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= stageIds.length) return;

    stageIds.splice(idx, 1);
    stageIds.splice(targetIdx, 0, stageId);

    mutate((ws, ctx) => {
      reorderFunnelStages(ws, ctx, stageIds);
    });
  };

  // Inline Rename
  const handleCommitInlineRename = (stageId: string) => {
    if (inlineTitle.trim()) {
      mutate((ws, ctx) => {
        updateFunnelStage(ws, ctx, stageId, { label: inlineTitle.trim() });
      });
    }
    setInlineEditingId(null);
  };

  // Modal Save (Novo ou Edição)
  const handleSaveStageModal = () => {
    if (!stageLabel.trim()) return;

    mutate((ws, ctx) => {
      if (editingStage) {
        updateFunnelStage(ws, ctx, editingStage.id, {
          label: stageLabel.trim(),
          color: stageColor,
        });
      } else {
        createFunnelStage(ws, ctx, stageLabel.trim(), stageColor);
      }
    });

    setShowStageModal(false);
    toast.success(editingStage ? "Etapa atualizada!" : "Nova etapa adicionada ao funil!");
  };

  // Arquivar Etapa
  const handleArchiveStage = (stageId: string) => {
    mutate((ws, ctx) => {
      updateFunnelStage(ws, ctx, stageId, { archivedAt: ctx.nowIso });
    });
    toast.success("Etapa arquivada.");
  };

  // Restaurar Etapa
  const handleRestoreStage = (stageId: string) => {
    mutate((ws, ctx) => {
      updateFunnelStage(ws, ctx, stageId, { archivedAt: null });
    });
    toast.success("Etapa restaurada ao funil.");
  };

  // Exclusão com Confirmação e Realocação
  const handleConfirmDelete = () => {
    if (!stageToDelete) return;

    mutate((ws, ctx) => {
      deleteFunnelStage(ws, ctx, stageToDelete.id, reassignTargetId || null);
    });

    setStageToDelete(null);
    setReassignTargetId("");
    toast.success("Etapa excluída.");
  };

  return (
    <div className="space-y-4">
      {/* Barra de Informações do Funil */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Funil Visual Comercial X1
            </h3>
            <span className="text-[10px] text-muted-foreground">
              Progressão contínua de contatos até a venda com taxas de conversão inter-etapas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Métricas Rápidas */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground font-bold">{totalContacts}</span>
              <span className="text-[10px] text-muted-foreground">leads</span>
            </div>

            <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {globalConversionRate ? `${globalConversionRate}%` : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">conv.</span>
            </div>

            {totalRevenue > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <DollarSign className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  R$ {totalRevenue.toLocaleString("pt-BR")}
                </span>
              </div>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditingStage(null);
              setStageLabel("");
              setStageColor("#6366F1");
              setShowStageModal(true);
            }}
            className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Nova Etapa</span>
          </Button>
        </div>
      </div>

      {/* ESTEIRA VISUAL DO FUNIL: PROGRESSÃO CONECTADA (RESPONSIVA) */}
      <div className="w-full overflow-x-auto pb-3 pt-1">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 min-w-full">
          {funnelStages.map((stage, idx) => {
            const nextStage = funnelStages[idx + 1];
            // Taxa de conversão para a próxima etapa
            const convToNext =
              stage.count > 0 && nextStage
                ? Math.round((nextStage.count / stage.count) * 100)
                : null;

            // Largura visual proporcional ou formato funil
            const isDragging = draggedStageId === stage.id;

            return (
              <React.Fragment key={stage.id}>
                {/* CARD DA ETAPA CONECTADA */}
                <div
                  draggable
                  onDragStart={() => handleDragStart(stage.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage.id)}
                  className={`flex-1 min-w-[170px] rounded-2xl border p-3 flex flex-col justify-between transition-all duration-200 relative group select-none shadow-xs ${
                    isDragging
                      ? "opacity-40 border-dashed border-primary scale-95"
                      : "bg-card hover:border-primary/50 hover:shadow-md"
                  }`}
                  style={{
                    borderTopWidth: "3px",
                    borderTopColor: stage.color || "#6366F1",
                  }}
                >
                  {/* Topo do Card: Handle, Título e Menu */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground"
                          title="Arraste para reordenar etapa"
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">
                          #{idx + 1}
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                            <span className="text-xs leading-none">•••</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setInlineEditingId(stage.id);
                              setInlineTitle(stage.label);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-2" />
                            Renomear Etapa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={idx === 0}
                            onClick={() => moveStageDirection(stage.id, "prev")}
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-2 rotate-180" />
                            Mover para Esquerda
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={idx === funnelStages.length - 1}
                            onClick={() => moveStageDirection(stage.id, "next")}
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-2" />
                            Mover para Direita
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleArchiveStage(stage.id)}
                            className="text-amber-600"
                          >
                            <Archive className="h-3.5 w-3.5 mr-2" />
                            Arquivar Etapa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setStageToDelete(stage);
                              const remaining = funnelStages.filter((s) => s.id !== stage.id);
                              setReassignTargetId(remaining[0]?.id || "");
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Excluir Etapa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Título da Etapa com Edição Inline */}
                    {inlineEditingId === stage.id ? (
                      <Input
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        onBlur={() => handleCommitInlineRename(stage.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleCommitInlineRename(stage.id)}
                        autoFocus
                        className="h-6 text-xs font-bold bg-background border-primary text-foreground mb-2"
                      />
                    ) : (
                      <h4
                        onDoubleClick={() => {
                          setInlineEditingId(stage.id);
                          setInlineTitle(stage.label);
                        }}
                        className="text-xs font-bold uppercase tracking-tight text-foreground line-clamp-1 mb-2 cursor-pointer hover:text-primary transition-colors"
                        title="Duplo-clique para renomear"
                      >
                        {stage.label}
                      </h4>
                    )}
                  </div>

                  {/* Contador de Leads e Controles (+ / -) */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-black font-mono text-foreground tracking-tight">
                        {stage.count}
                      </span>
                      <span className="text-[10px] text-muted-foreground block -mt-1">
                        contatos
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleStepCount(stage.id, -1)}
                        className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Diminuir 1 contato"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleStepCount(stage.id, 1)}
                        className="h-6 w-6 rounded-lg text-primary hover:bg-primary/10 border-primary/30"
                        title="Adicionar 1 contato"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* CONECTOR VISUAL DE PROGRESSÃO ENTRE ETAPAS */}
                {nextStage && (
                  <div className="hidden md:flex flex-col items-center justify-center px-1 shrink-0">
                    <div className="flex items-center text-primary/70">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    {convToNext !== null && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono font-bold px-1 py-0 rounded border-primary/20 ${
                          convToNext >= 50
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={`Taxa de passagem de ${stage.label} para ${nextStage.label}`}
                      >
                        {convToNext}%
                      </Badge>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ÁREA DISCRETA: ETAPAS ARQUIVADAS (Se houver) */}
      {archivedStages.length > 0 && (
        <div className="p-3 rounded-2xl bg-muted/30 border border-dashed border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Archive className="h-3.5 w-3.5" />
            <span>
              {archivedStages.length} etapa(s) arquivada(s) no funil:{" "}
              {archivedStages.map((s) => s.label).join(", ")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {archivedStages.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant="ghost"
                onClick={() => handleRestoreStage(s.id)}
                className="h-6 px-2 text-[10px] text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Restaurar {s.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* DIÁLOGO: ADICIONAR / EDITAR ETAPA */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              {editingStage ? "Editar Etapa do Funil" : "Nova Etapa do Pipeline"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="text-muted-foreground font-semibold block mb-1">
                Nome da Etapa
              </label>
              <Input
                value={stageLabel}
                onChange={(e) => setStageLabel(e.target.value)}
                placeholder="Ex: QUALIFICAÇÃO / PITCH"
                className="h-8 text-xs bg-background border-input text-foreground font-bold"
              />
            </div>

            <div>
              <label className="text-muted-foreground font-semibold block mb-1">
                Cor de Destaque Visual
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="h-8 w-12 rounded cursor-pointer border border-input bg-background"
                />
                <span className="font-mono text-muted-foreground text-xs uppercase">
                  {stageColor}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStageModal(false)}
              className="text-xs text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveStageModal}
              size="sm"
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              Salvar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: CONFIRMAÇÃO DE EXCLUSÃO COM DESTINO SEGURO DE LEADS */}
      <Dialog open={!!stageToDelete} onOpenChange={(open) => !open && setStageToDelete(null)}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir Etapa: {stageToDelete?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {stageToDelete && stageToDelete.count > 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-2">
                <p className="font-semibold">
                  Esta etapa possui {stageToDelete.count} contato(s) cadastrado(s).
                </p>
                <p className="text-[11px] leading-relaxed">
                  Para não perder histórico, selecione para qual etapa deseja realocar estes contatos antes de excluir:
                </p>
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  className="w-full h-8 rounded-lg bg-background border border-amber-500/30 text-xs text-foreground px-2"
                >
                  <option value="">Não realocar (zerar contatos)</option>
                  {funnelStages
                    .filter((s) => s.id !== stageToDelete.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Mover para: {s.label} ({s.count} contatos atuais)
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Tem certeza que deseja remover esta etapa do pipeline? Os contatos e dados históricos serão preservados.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStageToDelete(null)}
              className="text-xs text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="text-xs bg-destructive text-destructive-foreground font-bold"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
