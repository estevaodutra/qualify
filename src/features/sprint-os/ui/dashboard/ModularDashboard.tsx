/**
 * Dashboard Totalmente Personalizável e Modular.
 * Especificação: Master Prompt — Seções 01, 03 e 04.
 * - Três blocos operacionais: INFRA | DISTRIBUIÇÃO | FUNIL
 * - Drag-and-drop para reordenar cards dentro de um bloco e entre blocos
 * - Drag-and-drop para reordenar blocos principais
 * - Edição de títulos sem alterar a identificação técnica nem as fontes de dados
 * - Menu contextual compacto: Editar, Mover, Arquivar, Remover
 * - Área discreta para consultar e restaurar elementos arquivados / removidos
 * - Persistência automática separando a configuração visual dos dados operacionais
 */

import React, { useState } from "react";
import {
  GripVertical,
  MoreVertical,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Plus,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FolderArchive,
  Calendar,
  Instagram,
  Eye,
  MousePointerClick,
  Users,
  DollarSign,
  TrendingUp,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSprintOSStore } from "../../state/sprintOsStore";
import {
  getDashboardLayout,
  saveDashboardLayout,
  reorderDashboardBlocks,
  reorderDashboardCards,
  updateDashboardCard,
  updateDashboardBlock,
  resetDashboardLayout,
  sprintTasks,
} from "../../domain/ops";
import { ConnectedProgressiveFunnel } from "../funnel/ConnectedProgressiveFunnel";
import { computeProgressMetrics } from "../../metrics/calculations";
import { toast } from "sonner";
import type { DashboardCardConfig, DashboardBlockConfig } from "../../domain/types";

export const ModularDashboard: React.FC = () => {
  const { workspace, activeSprintId, mutate, setSelectedTaskId, setIsTaskModalOpen } =
    useSprintOSStore();

  // Estados de Drag & Drop
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // Estados do Modal de Edição de Elemento
  const [editingCard, setEditingCard] = useState<DashboardCardConfig | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [editingBlock, setEditingBlock] = useState<DashboardBlockConfig | null>(null);
  const [editBlockTitleInput, setEditBlockTitleInput] = useState("");

  // Modal de Restauração de Elementos
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  if (!workspace || !activeSprintId) return null;

  const layout = getDashboardLayout(workspace);

  // Blocos ativos ordenados
  const activeBlocks = (layout.blocks || [])
    .filter((b) => !b.archived)
    .sort((a, b) => a.order - b.order);

  // Elementos arquivados ou removidos para restauração
  const archivedOrRemovedCards = (layout.cards || []).filter((c) => c.archived || c.removed);
  const archivedBlocks = (layout.blocks || []).filter((b) => b.archived);
  const totalRestoreItems = archivedOrRemovedCards.length + archivedBlocks.length;

  // Cálculos Reais de Dados Operacionais
  const tasks = sprintTasks(workspace, activeSprintId);
  const progressMetrics = computeProgressMetrics(workspace, activeSprintId);

  // Dados INFRA
  const infraTasks = tasks.filter(
    (t) => t.impactFlags?.includes("infrastructure") || t.stageId === Object.keys(workspace.stages)[0]
  );
  const infraDoneTasks = infraTasks.filter((t) => t.status === "done");
  const activeBlocksList = tasks.filter((t) => !!(t.blockInfo?.active || t.blockedReason));
  const deliverables = tasks.flatMap((t) => t.deliverableMaterials || []);
  const deliverablesApproved = deliverables.filter((d) => d.reviewStatus === "aprovado");

  const nextMilestone = Object.values(workspace.milestones || {})
    .filter((m) => !m.archivedAt && !m.validatedAt)
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))[0];

  // Dados DISTRIBUIÇÃO
  const publications = Object.values(workspace.publications || {});
  const reelsPosts = publications.filter((p) => p.type === "reels");
  const totalReelsViews = reelsPosts.reduce((acc, p) => acc + p.views, 0);
  const distinctReelsDates = new Set(reelsPosts.map((p) => p.publishedAt)).size || 1;
  const avgDailyReelsViews = Math.round(totalReelsViews / distinctReelsDates);
  const dailyReelsTarget = workspace.contentDistributionConfig?.dailyReelsTarget ?? 1000;
  const totalViews = publications.reduce((acc, p) => acc + p.views, 0);
  const avgViewsPerPost = publications.length ? Math.round(totalViews / publications.length) : 0;
  const totalClicks = publications.reduce((acc, p) => acc + p.clicks, 0);
  const totalGroupEntries = publications.reduce((acc, p) => acc + p.groupEntries, 0);

  // Dados FUNIL
  const funnelStages = Object.values(workspace.funnel || {})
    .filter((s) => !s.archivedAt)
    .sort((a, b) => a.position - b.position);
  const totalFunnelLeads = funnelStages.reduce((acc, s) => acc + s.count, 0);
  const totalRevenue = funnelStages.reduce((acc, s) => acc + (s.value || 0), 0);

  // --- Handlers de Drag & Drop de Blocos ---
  const handleBlockDragStart = (blockId: string) => {
    setDraggedBlockId(blockId);
  };

  const handleBlockDrop = (targetBlockId: string) => {
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      return;
    }
    const blockIds = activeBlocks.map((b) => b.id);
    const fromIdx = blockIds.indexOf(draggedBlockId);
    const toIdx = blockIds.indexOf(targetBlockId);
    if (fromIdx !== -1 && toIdx !== -1) {
      blockIds.splice(fromIdx, 1);
      blockIds.splice(toIdx, 0, draggedBlockId);
      mutate((ws, ctx) => {
        reorderDashboardBlocks(ws, ctx, blockIds);
      });
      toast.success("Blocos reposicionados!");
    }
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  // --- Handlers de Drag & Drop de Cards ---
  const handleCardDragStart = (cardId: string) => {
    setDraggedCardId(cardId);
  };

  const handleCardDrop = (targetCardId: string, targetBlockId: string) => {
    if (!draggedCardId) return;

    const blockCards = (layout.cards || [])
      .filter((c) => c.blockId === targetBlockId && !c.archived && !c.removed)
      .sort((a, b) => a.order - b.order);

    let cardIds = blockCards.map((c) => c.id).filter((id) => id !== draggedCardId);
    const targetIdx = cardIds.indexOf(targetCardId);

    if (targetIdx !== -1) {
      cardIds.splice(targetIdx, 0, draggedCardId);
    } else {
      cardIds.push(draggedCardId);
    }

    mutate((ws, ctx) => {
      reorderDashboardCards(ws, ctx, cardIds, targetBlockId);
    });

    setDraggedCardId(null);
    setDragOverCardId(null);
    toast.success("Card reposicionado!");
  };

  // Mover Card para outro Bloco via Menu
  const handleMoveCardToBlock = (cardId: string, toBlockId: string) => {
    const targetBlockCards = (layout.cards || [])
      .filter((c) => c.blockId === toBlockId && !c.archived && !c.removed)
      .map((c) => c.id);

    targetBlockCards.push(cardId);

    mutate((ws, ctx) => {
      reorderDashboardCards(ws, ctx, targetBlockCards, toBlockId);
    });
    toast.success("Card movido de bloco!");
  };

  // Edição de Título
  const handleSaveCardTitle = () => {
    if (!editingCard || !editTitleInput.trim()) return;
    mutate((ws, ctx) => {
      updateDashboardCard(ws, ctx, editingCard.id, { title: editTitleInput.trim() });
    });
    setEditingCard(null);
    toast.success("Título do card atualizado!");
  };

  const handleSaveBlockTitle = () => {
    if (!editingBlock || !editBlockTitleInput.trim()) return;
    mutate((ws, ctx) => {
      updateDashboardBlock(ws, ctx, editingBlock.id, { title: editBlockTitleInput.trim() });
    });
    setEditingBlock(null);
    toast.success("Título do bloco atualizado!");
  };

  // Arquivar / Remover Card
  const handleArchiveCard = (cardId: string) => {
    mutate((ws, ctx) => {
      updateDashboardCard(ws, ctx, cardId, { archived: true });
    });
    toast.success("Card arquivado.");
  };

  const handleRemoveCard = (cardId: string) => {
    mutate((ws, ctx) => {
      updateDashboardCard(ws, ctx, cardId, { removed: true });
    });
    toast.success("Card removido da exibição.");
  };

  // Restaurar Card
  const handleRestoreCard = (cardId: string) => {
    mutate((ws, ctx) => {
      updateDashboardCard(ws, ctx, cardId, { archived: false, removed: false });
    });
    toast.success("Card restaurado ao dashboard!");
  };

  // Restaurar Bloco
  const handleRestoreBlock = (blockId: string) => {
    mutate((ws, ctx) => {
      updateDashboardBlock(ws, ctx, blockId, { archived: false });
    });
    toast.success("Bloco restaurado ao dashboard!");
  };

  // Resetar Layout
  const handleResetLayout = () => {
    mutate((ws, ctx) => {
      resetDashboardLayout(ws, ctx);
    });
    setShowRestoreModal(false);
    toast.success("Layout padrão do dashboard restaurado!");
  };

  // RENDERIZADOR DOS CARDS POR ID ESTÁVEL
  const renderCardContent = (card: DashboardCardConfig) => {
    switch (card.id) {
      case "infra_setup":
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-foreground">
                {infraDoneTasks.length}/{infraTasks.length || tasks.length}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {infraTasks.length
                  ? `${Math.round((infraDoneTasks.length / infraTasks.length) * 100)}%`
                  : "0%"}
              </span>
            </div>
            <Progress
              value={infraTasks.length ? (infraDoneTasks.length / infraTasks.length) * 100 : 0}
              className="h-1.5 bg-muted [&>div]:bg-blue-500"
            />
            <span className="text-[11px] text-muted-foreground block truncate">
              {infraTasks.length - infraDoneTasks.length} tarefa(s) pendente(s)
            </span>
          </div>
        );

      case "infra_blocks":
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-black font-mono ${
                  activeBlocksList.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-500"
                }`}
              >
                {activeBlocksList.length}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] font-mono ${
                  activeBlocksList.length > 0
                    ? "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                    : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                }`}
              >
                {activeBlocksList.length > 0 ? "Trava Ativa" : "Fluxo Livre"}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block truncate">
              {activeBlocksList.length > 0
                ? `${activeBlocksList[0].title}: ${activeBlocksList[0].blockInfo?.reason || "Aguardando"}`
                : "Nenhum bloqueio operacional no momento."}
            </span>
          </div>
        );

      case "infra_deliverables":
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-foreground">
                {deliverablesApproved.length}/{deliverables.length}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {deliverables.length
                  ? `${Math.round((deliverablesApproved.length / deliverables.length) * 100)}%`
                  : "—"}
              </span>
            </div>
            <Progress
              value={deliverables.length ? (deliverablesApproved.length / deliverables.length) * 100 : 0}
              className="h-1.5 bg-muted [&>div]:bg-purple-500"
            />
            <span className="text-[11px] text-muted-foreground block truncate">
              {deliverables.length - deliverablesApproved.length} entregável(is) aguardando revisão
            </span>
          </div>
        );

      case "infra_pace":
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-primary">
                {progressMetrics.taskProgressPct}%
              </span>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                Sprint Geral
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block truncate">
              {nextMilestone
                ? `Próx. Marco: ${nextMilestone.title} (${nextMilestone.dueDate?.split("-").reverse().join("/") || "sem data"})`
                : "Nenhum marco pendente."}
            </span>
          </div>
        );

      case "dist_reels":
        const reelsPct = Math.min(100, Math.round((avgDailyReelsViews / dailyReelsTarget) * 100));
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {avgDailyReelsViews.toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Meta: {dailyReelsTarget.toLocaleString("pt-BR")}/dia
              </span>
            </div>
            <Progress value={reelsPct} className="h-1.5 bg-muted [&>div]:bg-amber-500" />
            <span className="text-[11px] text-muted-foreground block truncate">
              {reelsPct >= 100 ? "🟢 Meta diária atingida" : `${reelsPct}% da meta diária de atração`}
            </span>
          </div>
        );

      case "dist_posts":
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-foreground">
                {publications.length}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {totalViews.toLocaleString("pt-BR")} views
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground block truncate">
              Média: {avgViewsPerPost.toLocaleString("pt-BR")} visualizações por post
            </span>
          </div>
        );

      case "dist_clicks":
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                {totalClicks.toLocaleString("pt-BR")}
              </span>
              <MousePointerClick className="h-4 w-4 text-blue-500/70" />
            </div>
            <span className="text-[11px] text-muted-foreground block truncate">
              Cliques diretos em links de conversão e bio
            </span>
          </div>
        );

      case "dist_groups":
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {totalGroupEntries.toLocaleString("pt-BR")}
              </span>
              <Users className="h-4 w-4 text-emerald-500/70" />
            </div>
            <span className="text-[11px] text-muted-foreground block truncate">
              Leads reais que entraram no grupo VIP
            </span>
          </div>
        );

      case "funnel_visual":
        return (
          <div className="pt-1">
            <ConnectedProgressiveFunnel compact />
          </div>
        );

      case "funnel_kpis":
        return (
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Leads</span>
              <span className="text-lg font-black font-mono text-foreground">{totalFunnelLeads}</span>
            </div>
            <div className="p-2 rounded-xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Conv. Final</span>
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                {funnelStages[0]?.count > 0 && funnelStages[funnelStages.length - 1]?.count
                  ? `${Math.round((funnelStages[funnelStages.length - 1].count / funnelStages[0].count) * 100)}%`
                  : "0%"}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Receita</span>
              <span className="text-xs font-black font-mono text-primary truncate block mt-1">
                R$ {totalRevenue.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-3 text-xs text-muted-foreground italic">
            Elemento configurável do dashboard.
          </div>
        );
    }
  };

  return (
    <section className="px-6 pt-4 pb-2 space-y-4">
      {/* Topo do Cockpit: Barra de Personalização Discreta */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LayoutGrid className="h-3.5 w-3.5 text-primary" />
          <span className="font-bold uppercase tracking-wider text-[11px] text-foreground">
            Cockpit Modular de Operação
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            (Arraste blocos ou cards para reorganizar seu cockpit)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {totalRestoreItems > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRestoreModal(true)}
              className="h-7 text-xs border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl flex items-center gap-1.5"
            >
              <Archive className="h-3 w-3" />
              <span>Restaurar Elementos ({totalRestoreItems})</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetLayout}
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground rounded-lg"
            title="Redefinir disposição dos blocos e cards para o padrão original"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            <span className="hidden md:inline">Layout Padrão</span>
          </Button>
        </div>
      </div>

      {/* BLOCOS PRINCIPAIS REORDENÁVEIS (INFRA | DISTRIBUIÇÃO | FUNIL) */}
      <div className="space-y-4">
        {activeBlocks.map((block) => {
          const blockCards = (layout.cards || [])
            .filter((c) => c.blockId === block.id && !c.archived && !c.removed)
            .sort((a, b) => a.order - b.order);

          const isBlockDragging = draggedBlockId === block.id;

          // Se for o bloco FUNIL, damos largura total para o pipeline visual brilhar
          const isFunnelBlock = block.id === "funil";

          return (
            <div
              key={block.id}
              draggable
              onDragStart={() => handleBlockDragStart(block.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverBlockId(block.id);
              }}
              onDrop={() => handleBlockDrop(block.id)}
              className={`rounded-3xl border transition-all duration-200 p-4 ${
                isBlockDragging
                  ? "opacity-30 border-dashed border-primary"
                  : "bg-card border-border shadow-xs hover:border-border/80"
              }`}
            >
              {/* Header do Bloco com Handle de Arraste e Menu Contextual */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground"
                    title="Arraste para reordenar este bloco no dashboard"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <h3
                    onDoubleClick={() => {
                      setEditingBlock(block);
                      setEditBlockTitleInput(block.title);
                    }}
                    className="text-xs font-black uppercase tracking-wider text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                    title="Duplo-clique para renomear bloco"
                  >
                    {block.title}
                  </h3>
                  <Badge variant="outline" className="text-[9px] font-mono border-border text-muted-foreground py-0">
                    {blockCards.length} elemento(s)
                  </Badge>
                </div>

                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingBlock(block);
                          setEditBlockTitleInput(block.title);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-2" />
                        Renomear Bloco
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          mutate((ws, ctx) => {
                            updateDashboardBlock(ws, ctx, block.id, { archived: true });
                          });
                          toast.success("Bloco arquivado.");
                        }}
                        className="text-amber-600"
                      >
                        <Archive className="h-3.5 w-3.5 mr-2" />
                        Arquivar Bloco
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* GRID DE CARDS DENTRO DO BLOCO */}
              {blockCards.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground/60 border border-dashed border-border rounded-2xl">
                  Nenhum card neste bloco. Arraste cards de outros blocos ou restaure elementos arquivados.
                </div>
              ) : (
                <div
                  className={`grid gap-3.5 ${
                    isFunnelBlock
                      ? "grid-cols-1"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  }`}
                >
                  {blockCards.map((card) => {
                    const isCardDragging = draggedCardId === card.id;

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleCardDragStart(card.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverCardId(card.id);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCardDrop(card.id, block.id);
                        }}
                        className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-200 select-none ${
                          isCardDragging
                            ? "opacity-30 border-dashed border-primary scale-95"
                            : "bg-background/80 hover:bg-background border-border/80 hover:border-primary/40 shadow-xs hover:shadow-sm"
                        }`}
                      >
                        {/* Header do Card: Título Editável, Drag Handle e Menu Contextual */}
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground shrink-0"
                              title="Arraste para reposicionar este card"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>
                            <span
                              onDoubleClick={() => {
                                setEditingCard(card);
                                setEditTitleInput(card.title);
                              }}
                              className="text-[11px] font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                              title="Duplo-clique para editar título"
                            >
                              {card.title}
                            </span>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
                                <span className="text-xs leading-none">•••</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingCard(card);
                                  setEditTitleInput(card.title);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-2" />
                                Editar Título
                              </DropdownMenuItem>

                              {/* Mover para outro bloco compatível */}
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">
                                Mover para bloco:
                              </div>
                              {activeBlocks
                                .filter((b) => b.id !== block.id)
                                .map((b) => (
                                  <DropdownMenuItem
                                    key={b.id}
                                    onClick={() => handleMoveCardToBlock(card.id, b.id)}
                                  >
                                    → {b.title}
                                  </DropdownMenuItem>
                                ))}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleArchiveCard(card.id)}
                                className="text-amber-600"
                              >
                                <Archive className="h-3.5 w-3.5 mr-2" />
                                Arquivar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRemoveCard(card.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Remover da Exibição
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Conteúdo Dinâmico do Card */}
                        <div className="flex-1 min-w-0">
                          {renderCardContent(card)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DIÁLOGO: EDITAR TÍTULO DO CARD */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Editar Título do Card
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <label className="text-muted-foreground font-semibold block">Nome de Exibição</label>
            <Input
              value={editTitleInput}
              onChange={(e) => setEditTitleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveCardTitle()}
              placeholder="Novo título para o card..."
              className="h-8 text-xs bg-background border-input text-foreground"
            />
            <span className="text-[10px] text-muted-foreground block">
              A alteração de nome é puramente visual e não modifica a identificação nem a fonte de dados do indicador.
            </span>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingCard(null)} className="text-xs text-muted-foreground">
              Cancelar
            </Button>
            <Button onClick={handleSaveCardTitle} size="sm" className="text-xs bg-primary text-primary-foreground font-bold">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EDITAR TÍTULO DO BLOCO */}
      <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Editar Título do Bloco
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <label className="text-muted-foreground font-semibold block">Nome do Bloco</label>
            <Input
              value={editBlockTitleInput}
              onChange={(e) => setEditBlockTitleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveBlockTitle()}
              placeholder="Novo título para o bloco..."
              className="h-8 text-xs bg-background border-input text-foreground font-bold"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingBlock(null)} className="text-xs text-muted-foreground">
              Cancelar
            </Button>
            <Button onClick={handleSaveBlockTitle} size="sm" className="text-xs bg-primary text-primary-foreground font-bold">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: RESTAURAR ELEMENTOS ARQUIVADOS OU REMOVIDOS */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-500" />
              Elementos Arquivados e Removidos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs max-h-72 overflow-y-auto">
            {totalRestoreItems === 0 ? (
              <p className="text-muted-foreground italic text-center py-4">
                Nenhum elemento arquivado ou removido no momento.
              </p>
            ) : (
              <>
                {archivedBlocks.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Blocos Arquivados:
                    </span>
                    {archivedBlocks.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border"
                      >
                        <span className="font-bold text-foreground">{b.title}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreBlock(b.id)}
                          className="h-6 text-[10px] text-primary"
                        >
                          Restaurar Bloco
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {archivedOrRemovedCards.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Cards Arquivados ou Removidos:
                    </span>
                    {archivedOrRemovedCards.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border"
                      >
                        <div>
                          <span className="font-medium text-foreground block">{c.title}</span>
                          <span className="text-[10px] text-muted-foreground">
                            Bloco de destino: {c.blockId.toUpperCase()} {c.removed ? "· Removido" : "· Arquivado"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreCard(c.id)}
                          className="h-6 text-[10px] text-primary"
                        >
                          Restaurar Card
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetLayout}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Restaurar Layout Padrão
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestoreModal(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
