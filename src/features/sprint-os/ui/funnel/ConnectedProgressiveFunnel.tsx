/**
 * Funil Comercial com Representação Visual Própria (Vertical, Compacta e Progressivamente Afunilada).
 * Especificação: AJ-015 — Refatoração Pontual do Funil Visual Comercial X1.
 *
 * Características da Refatoração:
 * 1. Orientação Vertical: Representação gráfica em faixas horizontais empilhadas, afunilando progressivamente (sem rolagem lateral).
 * 2. Segmentos Compactos: Altura e espaçamentos reduzidos, parecendo fatias/segmentos de um gráfico analítico.
 * 3. Geometria Proporcional: Largura visual decrescente do topo à base combinada com taxas reais de conversão inter-etapas.
 * 4. Interação com Etapas: Clique na faixa abre modal detalhado com ajustes finos de quantidade, valor financeiro e métricas.
 * 5. Etapas de Encerramento: Venda Realizada, Venda Perdida e Lead Frio diferenciadas visualmente com badges e cores dedicadas.
 * 6. Preservação Total de Recursos: Drag-and-drop vertical, duplo-clique para renomear, exclusão segura com realocação, persistência no workspace.
 */

import React, { useState, useEffect } from "react";
import {
  Filter,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Archive,
  ArrowDown,
  GripVertical,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Users,
  CheckCircle2,
  XCircle,
  Snowflake,
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

  // Estados de Criação / Edição Rápida
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [stageLabel, setStageLabel] = useState("");
  const [stageColor, setStageColor] = useState("#6366F1");

  // Modal de Detalhes da Etapa (ao clicar na faixa)
  const [detailedStage, setDetailedStage] = useState<FunnelStage | null>(null);
  const [detailLabel, setDetailLabel] = useState("");
  const [detailColor, setDetailColor] = useState("#6366F1");
  const [detailCount, setDetailCount] = useState<number>(0);
  const [detailValue, setDetailValue] = useState<string>("");

  // Inline rename (duplo clique)
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");

  // Modo de visualização do funil: 'leads' (tamanho da barra proporcional aos leads) ou 'geometric' (afunilamento fixo)
  const [funnelViewMode, setFunnelViewMode] = useState<"leads" | "geometric">("leads");

  // Drag and drop vertical
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Exclusão segura com realocação de contatos
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

  // Classificação visual de desfechos / encerramento
  const getOutcomeType = (label: string): "win" | "lost" | "cold" | null => {
    const l = label.toLowerCase();
    // 1. Checa perda antes de venda para não classificar 'venda perdida' como ganho
    if (l.includes("perd") || l.includes("descarte") || l.includes("cancelad") || l.includes("rejeit")) {
      return "lost";
    }
    // 2. Frio / Standby
    if (l.includes("frio") || l.includes("inativ") || l.includes("standby") || l.includes("nutri") || l.includes("gelad")) {
      return "cold";
    }
    // 3. Vendas / Ganhos
    if (l.includes("venda") || l.includes("ganh") || l.includes("fechad") || l.includes("cliente") || l.includes("sucesso")) {
      return "win";
    }
    return null;
  };

  // Handlers de Contagem (+ e -)
  const handleStepCount = (stageId: string, delta: number) => {
    const stage = workspace.funnel[stageId];
    if (!stage) return;
    const newCount = Math.max(0, stage.count + delta);
    mutate((ws, ctx) => {
      updateFunnelStage(ws, ctx, stageId, { count: newCount });
    });
  };

  // Reordenação por Drag and Drop Vertical
  const handleDragStart = (stageId: string) => {
    setDraggedStageId(stageId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragOverStageId !== targetId) {
      setDragOverStageId(targetId);
    }
  };

  const handleDrop = (targetStageId: string) => {
    if (!draggedStageId || draggedStageId === targetStageId) {
      setDraggedStageId(null);
      setDragOverStageId(null);
      return;
    }
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
    setDragOverStageId(null);
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

  // Abrir Modal de Detalhes da Etapa (ao clicar na faixa)
  const handleOpenStageDetails = (stage: FunnelStage) => {
    setDetailedStage(stage);
    setDetailLabel(stage.label);
    setDetailColor(stage.color || "#6366F1");
    setDetailCount(stage.count || 0);
    setDetailValue(stage.value !== undefined && stage.value !== null ? String(stage.value) : "");
  };

  // Salvar Modal de Detalhes
  const handleSaveStageDetails = () => {
    if (!detailedStage || !detailLabel.trim()) return;
    const parsedValue = detailValue.trim() ? parseFloat(detailValue.replace(",", ".")) : null;

    mutate((ws, ctx) => {
      updateFunnelStage(ws, ctx, detailedStage.id, {
        label: detailLabel.trim(),
        color: detailColor,
        count: Math.max(0, detailCount),
        value: isNaN(parsedValue as any) ? null : parsedValue,
      });
    });

    setDetailedStage(null);
    toast.success("Informações da etapa atualizadas com sucesso!");
  };

  // Modal Novo/Editar rápido
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

  // Cálculo da geometria proporcional decrescente do funil (Funnel Tapering) e Volume de Leads
  const totalStages = funnelStages.length;
  const maxStageCount = Math.max(...funnelStages.map((s) => s.count), 0);
  const minWidthPct = totalStages > 1 ? 62 : 100;
  const widthStep = totalStages > 1 ? (100 - minWidthPct) / (totalStages - 1) : 0;

  return (
    <div className="space-y-3">
      {/* Barra Superior Compacta de Métricas do Funil */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Filter className="h-3 w-3" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Funil Visual Comercial X1
            </h3>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Progressão analítica vertical de contatos até o fechamento
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor do Modo de Visualização: Por Leads (proporcional à quantidade de leads) vs Afunilado */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/80 border border-border text-[10px]">
            <button
              type="button"
              onClick={() => setFunnelViewMode("leads")}
              className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                funnelViewMode === "leads"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="O tamanho da barra corresponde diretamente à quantidade de leads em cada etapa"
            >
              <TrendingUp className="h-2.5 w-2.5 text-primary" />
              <span>Por Leads</span>
            </button>
            <button
              type="button"
              onClick={() => setFunnelViewMode("geometric")}
              className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                funnelViewMode === "geometric"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Afunilamento geométrico tradicional"
            >
              <Filter className="h-2.5 w-2.5" />
              <span>Afunilado</span>
            </button>
          </div>

          {/* Métricas Rápidas Compactas */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <div
              className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-lg border border-border"
              title="Total de leads no funil"
            >
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground font-bold">{totalContacts}</span>
              <span className="text-[10px] text-muted-foreground">leads</span>
            </div>

            <div
              className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-lg border border-border"
              title="Taxa de conversão do topo até a etapa final"
            >
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {globalConversionRate ? `${globalConversionRate}%` : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">conv.</span>
            </div>

            {totalRevenue > 0 && (
              <div
                className="hidden md:flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
                title="Receita acumulada em vendas"
              >
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
            className="h-6.5 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-1 px-2.5"
          >
            <Plus className="h-3 w-3" />
            <span>Nova Etapa</span>
          </Button>
        </div>
      </div>

      {/* REPRESENTAÇÃO GRÁFICA VERTICAL: TAMANHO DA BARRA CORRESPONDE À QUANTIDADE DE LEADS */}
      <div className="w-full max-w-3xl mx-auto py-1 space-y-1">
        {funnelStages.map((stage, idx) => {
          const nextStage = funnelStages[idx + 1];
          const outcomeType = getOutcomeType(stage.label);

          // Taxa de conversão para a próxima etapa calculada com base nos dados reais
          const convToNext =
            stage.count > 0 && nextStage
              ? Math.round((nextStage.count / stage.count) * 100)
              : null;

          // Taxa relativa acumulada desde o topo
          const retentionFromTop =
            firstStageCount > 0 ? Math.round((stage.count / firstStageCount) * 100) : null;

          // Largura da barra correspondente à quantidade de leads seguindo efeito de funil
          let stageWidthPct: number;
          if (funnelViewMode === "leads") {
            if (maxStageCount === 0) {
              // Se nenhuma etapa tiver contatos, mantém afunilamento suave uniforme
              stageWidthPct = Math.round(100 - idx * widthStep);
            } else {
              // Proporcional aos leads: etapa com maior número de leads tem 100% de largura;
              // Etapa com 0 leads fica com 38% de largura (mínimo funcional para exibir nome, contador e botões).
              const ratio = stage.count / maxStageCount;
              stageWidthPct = Math.round(38 + ratio * 62);
            }
          } else {
            // Modo geométrico tradicional
            stageWidthPct = Math.round(100 - idx * widthStep);
          }

          let nextStageWidthPct = stageWidthPct;
          if (nextStage) {
            if (funnelViewMode === "leads") {
              if (maxStageCount === 0) {
                nextStageWidthPct = Math.round(100 - (idx + 1) * widthStep);
              } else {
                const nextRatio = nextStage.count / maxStageCount;
                nextStageWidthPct = Math.round(38 + nextRatio * 62);
              }
            } else {
              nextStageWidthPct = Math.round(100 - (idx + 1) * widthStep);
            }
          }

          const isDragging = draggedStageId === stage.id;
          const isDragOver = dragOverStageId === stage.id;

          return (
            <React.Fragment key={stage.id}>
              {/* FAIXA HORIZONTAL COMPACTA DA ETAPA */}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", stage.id);
                  handleDragStart(stage.id);
                }}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={() => {
                  if (dragOverStageId === stage.id) setDragOverStageId(null);
                }}
                onDrop={() => handleDrop(stage.id)}
                onDragEnd={() => {
                  setDraggedStageId(null);
                  setDragOverStageId(null);
                }}
                onClick={() => handleOpenStageDetails(stage)}
                className={`group relative flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer mx-auto shadow-2xs overflow-hidden ${
                  isDragging
                    ? "opacity-30 border-dashed border-primary scale-[0.98]"
                    : isDragOver
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5 scale-[1.01]"
                    : outcomeType === "win"
                    ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60"
                    : outcomeType === "lost"
                    ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/30 hover:border-rose-500/60"
                    : outcomeType === "cold"
                    ? "bg-slate-500/5 hover:bg-slate-500/10 border-slate-500/30 hover:border-slate-500/60"
                    : "bg-card/90 hover:bg-card border-border hover:border-primary/50 hover:shadow-xs"
                }`}
                style={{
                  width: `clamp(270px, ${stageWidthPct}%, 100%)`,
                  borderLeftWidth: "4px",
                  borderLeftColor: stage.color || "#6366F1",
                }}
              >
                {/* Barra interna de preenchimento proporcional ao volume de leads */}
                {maxStageCount > 0 && stage.count > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-xl pointer-events-none transition-all duration-300 opacity-12"
                    style={{
                      width: `${Math.round((stage.count / maxStageCount) * 100)}%`,
                      backgroundColor: stage.color || "#6366F1",
                    }}
                  />
                )}

                {/* LADO ESQUERDO: Alça de arraste, Numeração, Título e Tag de Desfecho */}
                <div className="flex items-center gap-2 min-w-0 relative z-1">
                  <span
                    data-stage-handle="true"
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground p-0.5 -ml-1 rounded shrink-0"
                    title="Arraste para reordenar etapa verticalmente"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>

                  <span className="text-[10px] font-mono font-black text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-md shrink-0">
                    #{idx + 1}
                  </span>

                  {inlineEditingId === stage.id ? (
                    <div onClick={(e) => e.stopPropagation()} className="min-w-0 flex-1">
                      <Input
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        onBlur={() => handleCommitInlineRename(stage.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCommitInlineRename(stage.id);
                          if (e.key === "Escape") setInlineEditingId(null);
                        }}
                        autoFocus
                        className="h-6 text-xs font-bold uppercase tracking-tight bg-background border-primary text-foreground w-48"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setInlineEditingId(stage.id);
                          setInlineTitle(stage.label);
                        }}
                        className="text-xs font-black uppercase tracking-tight text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                        title="Duplo clique para renomear"
                      >
                        {stage.label}
                      </h4>

                      {/* Diferenciação Visual das Etapas de Encerramento */}
                      {outcomeType === "win" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-0.5 shrink-0"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Venda Realizada</span>
                        </Badge>
                      )}
                      {outcomeType === "lost" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 flex items-center gap-0.5 shrink-0"
                        >
                          <XCircle className="h-2.5 w-2.5" />
                          <span>Venda Perdida</span>
                        </Badge>
                      )}
                      {outcomeType === "cold" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 flex items-center gap-0.5 shrink-0"
                        >
                          <Snowflake className="h-2.5 w-2.5" />
                          <span>Lead Frio</span>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* LADO DIREITO: Quantidade de contatos, Ajustes rápidos (+/-), Valor e Menu de Ações */}
                <div
                  className="flex items-center gap-2 shrink-0 relative z-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* % do total de contatos no funil */}
                  {totalContacts > 0 && stage.count > 0 && (
                    <span
                      className="text-[9px] font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md hidden lg:inline"
                      title={`${stage.count} de ${totalContacts} leads (${Math.round((stage.count / totalContacts) * 100)}% do funil)`}
                    >
                      {Math.round((stage.count / totalContacts) * 100)}% do total
                    </span>
                  )}

                  {/* Valor monetário registrado, se houver */}
                  {stage.value && stage.value > 0 ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded hidden sm:inline">
                      R$ {stage.value.toLocaleString("pt-BR")}
                    </span>
                  ) : null}

                  {/* Contador de Contatos com Destaque Numérico */}
                  <div className="flex items-baseline gap-1 bg-muted/40 px-2 py-0.5 rounded-lg border border-border/60">
                    <span className="text-sm font-black font-mono tracking-tight text-foreground">
                      {stage.count}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                      {stage.count === 1 ? "contato" : "contatos"}
                    </span>
                  </div>

                  {/* Botões Rápidos de Ajuste (+ / -) */}
                  <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStepCount(stage.id, -1)}
                      className="h-5 w-5 rounded text-muted-foreground hover:text-foreground"
                      title="Diminuir 1 contato"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStepCount(stage.id, 1)}
                      className="h-5 w-5 rounded text-primary hover:bg-primary/10"
                      title="Adicionar 1 contato"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </Button>
                  </div>

                  {/* Menu de Ações (•••) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-xs leading-none">•••</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-xs">
                      <DropdownMenuItem onClick={() => handleOpenStageDetails(stage)}>
                        <Edit2 className="h-3.5 w-3.5 mr-2 text-primary" />
                        Editar Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setInlineEditingId(stage.id);
                          setInlineTitle(stage.label);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-2" />
                        Renomear Etapa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={idx === 0}
                        onClick={() => moveStageDirection(stage.id, "prev")}
                      >
                        <ArrowDown className="h-3.5 w-3.5 mr-2 rotate-180" />
                        Mover para Cima
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={idx === funnelStages.length - 1}
                        onClick={() => moveStageDirection(stage.id, "next")}
                      >
                        <ArrowDown className="h-3.5 w-3.5 mr-2" />
                        Mover para Baixo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleArchiveStage(stage.id)}
                        className="text-amber-600 focus:text-amber-600"
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
              </div>

              {/* CONECTOR VISUAL COM INDICADOR DE CONVERSÃO INTER-ETAPAS */}
              {nextStage && (
                <div
                  className="flex items-center justify-center my-0.5 mx-auto transition-all duration-300"
                  style={{
                    width: `clamp(270px, ${Math.round((stageWidthPct + nextStageWidthPct) / 2)}%, 100%)`,
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/80 py-0.5">
                    <span className="text-[10px] leading-none text-muted-foreground/50">↓</span>
                    {convToNext !== null ? (
                      <span
                        className={`px-1.5 py-0.2 rounded-md font-bold text-[9px] ${
                          convToNext >= 50
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={`Taxa de passagem de ${stage.label} para ${nextStage.label}: ${convToNext}%`}
                      >
                        {convToNext}% conv.
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-[9px]">•</span>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ÁREA DISCRETA: ETAPAS ARQUIVADAS (Se houver) */}
      {archivedStages.length > 0 && (
        <div className="p-2.5 rounded-xl bg-muted/30 border border-dashed border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Archive className="h-3.5 w-3.5" />
            <span>
              {archivedStages.length} etapa(s) arquivada(s) no funil:{" "}
              {archivedStages.map((s) => s.label).join(", ")}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
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

      {/* MODAL DETALHADO DA ETAPA (Acionado ao clicar na faixa) */}
      <Dialog open={!!detailedStage} onOpenChange={(open) => !open && setDetailedStage(null)}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              <span>Detalhes da Etapa: {detailedStage?.label}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Nome da Etapa */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Nome da Etapa
              </label>
              <Input
                value={detailLabel}
                onChange={(e) => setDetailLabel(e.target.value)}
                placeholder="Ex: ICP / QUALIFICAÇÃO"
                className="h-8 text-xs bg-background border-input text-foreground font-bold rounded-xl"
              />
            </div>

            {/* Cor de Destaque */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Cor de Destaque
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={detailColor}
                  onChange={(e) => setDetailColor(e.target.value)}
                  className="h-8 w-12 rounded-lg cursor-pointer border border-input bg-background"
                />
                <span className="font-mono text-muted-foreground text-xs uppercase">
                  {detailColor}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  {["#64748B", "#3B82F6", "#6366F1", "#F59E0B", "#EC4899", "#10B981"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDetailColor(c)}
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Quantidade de Contatos e Ajustes */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Quantidade de Contatos / Leads
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  value={detailCount}
                  onChange={(e) => setDetailCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="h-8 text-xs font-mono font-bold bg-background border-input text-foreground rounded-xl"
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailCount((c) => Math.max(0, c - 1))}
                    className="h-8 px-2 text-xs"
                  >
                    -1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailCount((c) => c + 1)}
                    className="h-8 px-2 text-xs font-bold text-primary"
                  >
                    +1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailCount((c) => c + 5)}
                    className="h-8 px-2 text-xs font-bold"
                  >
                    +5
                  </Button>
                </div>
              </div>
            </div>

            {/* Valor Monetário (Receita Associada) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Valor Total em Vendas / Receita (R$)
              </label>
              <Input
                type="text"
                placeholder="Ex: 5000"
                value={detailValue}
                onChange={(e) => setDetailValue(e.target.value)}
                className="h-8 text-xs font-mono bg-background border-input text-foreground rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailedStage(null)}
              className="text-xs text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveStageDetails}
              size="sm"
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: ADICIONAR NOVA ETAPA */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              <span>{editingStage ? "Editar Etapa do Funil" : "Nova Etapa do Pipeline"}</span>
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
                className="h-8 text-xs bg-background border-input text-foreground font-bold rounded-xl"
                autoFocus
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
                <div className="flex items-center gap-1 ml-auto">
                  {["#64748B", "#3B82F6", "#6366F1", "#F59E0B", "#EC4899", "#10B981"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setStageColor(c)}
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
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
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl"
            >
              Salvar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: CONFIRMAÇÃO DE EXCLUSÃO COM DESTINO SEGURO DE LEADS */}
      <Dialog open={!!stageToDelete} onOpenChange={(open) => !open && setStageToDelete(null)}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>Excluir Etapa: {stageToDelete?.label}</span>
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
                Tem certeza que deseja remover esta etapa do pipeline? Os dados históricos do projeto serão preservados.
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
              className="text-xs bg-destructive text-destructive-foreground font-bold rounded-xl"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
