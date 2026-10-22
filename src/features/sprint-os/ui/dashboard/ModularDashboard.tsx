/**
 * Dashboard Minimalista e Totalmente Personalizável (Cockpit 80/20).
 * Especificação: Master Prompt — Seção 01, 02, 03 e Redesign do Painel Superior.
 *
 * Estrutura:
 * - BLOCO 01 — INFRA (6 indicadores compactos: Progresso, Gasto Ads, Vendas, Entradas Grupo, Saídas Grupo, Testes)
 * - BLOCO 02 — DISTRIBUIÇÃO (Filtro Hoje | 7 dias | 30 dias + 3 indicadores: Novos Seguidores, Posts, Views)
 * - BLOCO 03 — FUNIL (Esteira visual progressiva conectada: EM ABERTO → PRÉ-QUALIFICAÇÃO → INTERESSADO → NEGOCIAÇÃO → FOLLOW-UP → VENDA)
 *
 * Recursos:
 * - Drag-and-drop para reordenar cards e blocos
 * - Edição de títulos sem alterar a identificação técnica nem fonte de dados
 * - Menu contextual compacto: Editar, Mover, Arquivar, Remover
 * - Restauração de elementos arquivados / removidos
 * - Persistência automática separando a configuração visual dos dados operacionais
 * - Design minimalista com números em destaque e cards de baixa altura
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
  Minus,
  CheckCircle2,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  Instagram,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  UserMinus,
  FlaskConical,
  Activity,
  Layers,
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
  reorderDashboardBlocks,
  reorderDashboardCards,
  updateDashboardCard,
  updateDashboardBlock,
  resetDashboardLayout,
  sprintTasks,
  updateFunnelStage,
} from "../../domain/ops";
import { ConnectedProgressiveFunnel } from "../funnel/ConnectedProgressiveFunnel";
import { computeProgressMetrics } from "../../metrics/calculations";
import { toast } from "sonner";
import type { DashboardCardConfig, DashboardBlockConfig } from "../../domain/types";

export const ModularDashboard: React.FC = () => {
  const { workspace, activeSprintId, mutate } = useSprintOSStore();

  // Filtro de período para o Bloco de Distribuição (Hoje | 7 dias | 30 dias)
  const [distPeriod, setDistPeriod] = useState<"today" | "7d" | "30d">("7d");

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

  // Modal para ajuste de Gasto Ads
  const [isEditingAdSpend, setIsEditingAdSpend] = useState(false);
  const [adSpendInput, setAdSpendInput] = useState("");

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

  // -------------------------------------------------------------
  // DADOS OPERACIONAIS 100% REAIS (SEM VALORES INVENTADOS)
  // -------------------------------------------------------------
  const tasks = sprintTasks(workspace, activeSprintId);
  const progressMetrics = computeProgressMetrics(workspace, activeSprintId);

  // 1. INFRA — Indicador 1: Progresso Atual
  const pendingTasksCount = tasks.filter((t) => t.status === "pending").length;
  const doingTasksCount = tasks.filter((t) => t.status === "doing").length;
  const doneTasksCount = tasks.filter((t) => t.status === "done").length;

  // 1. INFRA — Indicador 2: Gasto Ads
  const adSpend =
    workspace.contentMetrics?.adSpend ??
    workspace.adsCalculator?.totalSpent ??
    0;

  // 1. INFRA — Indicador 3: Vendas
  const funnelStages = Object.values(workspace.funnel || {})
    .filter((s) => !s.archivedAt)
    .sort((a, b) => a.position - b.position);

  const salesStage = funnelStages.find(
    (s) =>
      s.label.toLowerCase().includes("venda") ||
      s.label.toLowerCase().includes("fechamento") ||
      s.position === funnelStages.length - 1
  );
  const salesCount = salesStage ? salesStage.count : 0;
  const salesRevenue = salesStage?.value || 0;

  // 1. INFRA — Indicador 4 & 5: Entradas e Saídas no Grupo
  const groupEntries =
    workspace.contentMetrics?.groupEntries ??
    Object.values(workspace.publications || {}).reduce((acc, p) => acc + (p.groupEntries || 0), 0);

  const groupExits = workspace.contentMetrics?.groupExits ?? 0;

  // 1. INFRA — Indicador 6: Testes Realizados
  const completedTestsCount =
    workspace.contentMetrics?.testsCompleted ??
    tasks.filter(
      (t) =>
        t.status === "done" &&
        (t.title.toLowerCase().includes("teste") ||
          t.description?.toLowerCase().includes("teste") ||
          t.impactFlags?.includes("operational"))
    ).length;

  // 2. DISTRIBUIÇÃO — Indicadores com Filtro de Período (Hoje | 7 dias | 30 dias)
  const publications = Object.values(workspace.publications || {});
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const filteredPublications = publications.filter((p) => {
    if (!p.publishedAt) return true;
    if (distPeriod === "today") return p.publishedAt === todayStr;
    if (distPeriod === "7d") return p.publishedAt >= sevenDaysAgoStr;
    if (distPeriod === "30d") return p.publishedAt >= thirtyDaysAgoStr;
    return true;
  });

  const followersCount =
    distPeriod === "today"
      ? (workspace.contentMetrics?.followersGainToday ?? 0)
      : distPeriod === "7d"
      ? (workspace.contentMetrics?.followersGain7d ?? workspace.contentMetrics?.newFollowers ?? 0)
      : (workspace.contentMetrics?.followersGain30d ?? workspace.contentMetrics?.newFollowers ?? 0);

  const postsCount = filteredPublications.length || (distPeriod === "30d" ? publications.length : 0);
  const viewsCount =
    filteredPublications.reduce((acc, p) => acc + (p.views || 0), 0) ||
    (distPeriod === "30d" ? publications.reduce((acc, p) => acc + (p.views || 0), 0) : 0);

  // -------------------------------------------------------------
  // AÇÕES OPERACIONAIS RÁPIDAS (AJUSTES DE DADOS)
  // -------------------------------------------------------------
  const handleUpdateGroupEntries = (delta: number) => {
    mutate((ws) => {
      ws.contentMetrics ??= {
        postsPublished: 0,
        postsPerDay: 0,
        reels: 0,
        stories: 0,
        views: 0,
        reach: 0,
        clicks: 0,
        groupEntries: 0,
        leadsCaptured: 0,
        adSpend: 0,
        period: "7d",
      };
      ws.contentMetrics.groupEntries = Math.max(0, (ws.contentMetrics.groupEntries || 0) + delta);
    });
  };

  const handleUpdateGroupExits = (delta: number) => {
    mutate((ws) => {
      ws.contentMetrics ??= {
        postsPublished: 0,
        postsPerDay: 0,
        reels: 0,
        stories: 0,
        views: 0,
        reach: 0,
        clicks: 0,
        groupEntries: 0,
        leadsCaptured: 0,
        adSpend: 0,
        period: "7d",
      };
      ws.contentMetrics.groupExits = Math.max(0, (ws.contentMetrics.groupExits || 0) + delta);
    });
  };

  const handleUpdateTests = (delta: number) => {
    mutate((ws) => {
      ws.contentMetrics ??= {
        postsPublished: 0,
        postsPerDay: 0,
        reels: 0,
        stories: 0,
        views: 0,
        reach: 0,
        clicks: 0,
        groupEntries: 0,
        leadsCaptured: 0,
        adSpend: 0,
        period: "7d",
      };
      ws.contentMetrics.testsCompleted = Math.max(0, (ws.contentMetrics.testsCompleted || 0) + delta);
    });
  };

  const handleUpdateFollowers = (delta: number) => {
    mutate((ws) => {
      ws.contentMetrics ??= {
        postsPublished: 0,
        postsPerDay: 0,
        reels: 0,
        stories: 0,
        views: 0,
        reach: 0,
        clicks: 0,
        groupEntries: 0,
        leadsCaptured: 0,
        adSpend: 0,
        period: "7d",
      };
      if (distPeriod === "today") {
        ws.contentMetrics.followersGainToday = Math.max(0, (ws.contentMetrics.followersGainToday || 0) + delta);
      } else if (distPeriod === "7d") {
        ws.contentMetrics.followersGain7d = Math.max(0, (ws.contentMetrics.followersGain7d || 0) + delta);
        ws.contentMetrics.newFollowers = ws.contentMetrics.followersGain7d;
      } else {
        ws.contentMetrics.followersGain30d = Math.max(0, (ws.contentMetrics.followersGain30d || 0) + delta);
      }
    });
  };

  const handleSaveAdSpend = () => {
    const val = parseFloat(adSpendInput.replace(",", "."));
    if (isNaN(val)) return;
    mutate((ws) => {
      ws.contentMetrics ??= {
        postsPublished: 0,
        postsPerDay: 0,
        reels: 0,
        stories: 0,
        views: 0,
        reach: 0,
        clicks: 0,
        groupEntries: 0,
        leadsCaptured: 0,
        adSpend: 0,
        period: "7d",
      };
      ws.contentMetrics.adSpend = Math.max(0, val);
    });
    setIsEditingAdSpend(false);
    toast.success("Gasto Ads atualizado!");
  };

  const handleUpdateSales = (delta: number) => {
    if (!salesStage) return;
    mutate((ws, ctx) => {
      updateFunnelStage(ws, ctx, salesStage.id, {
        count: Math.max(0, salesStage.count + delta),
      });
    });
  };

  // -------------------------------------------------------------
  // HANDLERS DE DRAG & DROP E PERSONALIZAÇÃO
  // -------------------------------------------------------------
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

  const handleSaveCardTitle = () => {
    if (!editingCard || !editTitleInput.trim()) return;
    mutate((ws, ctx) => {
      updateDashboardCard(ws, ctx, editingCard.id, { title: editTitleInput.trim() });
    });
    setEditingCard(null);
    toast.success("Título atualizado!");
  };

  const handleSaveBlockTitle = () => {
    if (!editingBlock || !editBlockTitleInput.trim()) return;
    mutate((ws, ctx) => {
      updateDashboardBlock(ws, ctx, editingBlock.id, { title: editBlockTitleInput.trim() });
    });
    setEditingBlock(null);
    toast.success("Título do bloco atualizado!");
  };

  const handleArchiveCard = (cardId: string) => {
    mutate((ws, ctx) => {
      updateDashboardCard(ws, ctx, cardId, { archived: true });
    });
    toast.info("Card arquivado.");
  };

  const handleRemoveCard = (cardId: string) => {
    mutate((ws, ctx) => {
      updateDashboardCard(ws, ctx, cardId, { removed: true });
    });
    toast.info("Card removido da exibição.");
  };

  const handleRestoreCard = (cardId: string) => {
    mutate((ws, ctx) => {
      updateDashboardCard(ws, ctx, cardId, { archived: false, removed: false });
    });
    toast.success("Card restaurado com sucesso!");
  };

  const handleArchiveBlock = (blockId: string) => {
    mutate((ws, ctx) => {
      updateDashboardBlock(ws, ctx, blockId, { archived: true });
    });
    toast.info("Bloco arquivado.");
  };

  const handleRestoreBlock = (blockId: string) => {
    mutate((ws, ctx) => {
      updateDashboardBlock(ws, ctx, blockId, { archived: false });
    });
    toast.success("Bloco restaurado!");
  };

  const handleResetLayout = () => {
    mutate((ws, ctx) => {
      resetDashboardLayout(ws, ctx);
    });
    toast.success("Layout redefinido para o padrão!");
  };

  // -------------------------------------------------------------
  // RENDERIZADOR DOS CARDS COMPACTOS MINIMALISTAS
  // -------------------------------------------------------------
  const renderCardContent = (card: DashboardCardConfig) => {
    switch (card.id) {
      // 1. BLOCO INFRA
      case "infra_progress":
      case "infra_pace":
      case "infra_setup":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {progressMetrics.taskProgressPct}%
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {progressMetrics.tasksDone}/{progressMetrics.tasksTotal} tarefas
              </span>
            </div>
            <Progress value={progressMetrics.taskProgressPct} className="h-1.5 bg-muted" />
            <div className="text-[11px] text-muted-foreground truncate pt-0.5">
              {pendingTasksCount} pendentes • {doingTasksCount} fazendo • {doneTasksCount} concluídas
            </div>
          </div>
        );

      case "infra_ad_spend":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black font-mono tracking-tight text-foreground">
                R$ {adSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <button
                onClick={() => {
                  setAdSpendInput(adSpend.toString());
                  setIsEditingAdSpend(true);
                }}
                className="text-[10px] text-primary hover:underline font-medium"
              >
                Ajustar
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Valor investido em tráfego pago
            </div>
          </div>
        );

      case "infra_sales":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {salesCount}
              </span>
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border">
                <button
                  onClick={() => handleUpdateSales(-1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => handleUpdateSales(1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {salesRevenue > 0
                ? `R$ ${salesRevenue.toLocaleString("pt-BR")} acumulado`
                : "Vendas confirmadas"}
            </div>
          </div>
        );

      case "infra_group_entries":
      case "dist_groups":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {groupEntries}
              </span>
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border">
                <button
                  onClick={() => handleUpdateGroupEntries(-1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => handleUpdateGroupEntries(1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Membros adicionados ao grupo
            </div>
          </div>
        );

      case "infra_group_exits":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {groupExits}
              </span>
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border">
                <button
                  onClick={() => handleUpdateGroupExits(-1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => handleUpdateGroupExits(1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Participantes que saíram
            </div>
          </div>
        );

      case "infra_tests":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {completedTestsCount}
              </span>
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border">
                <button
                  onClick={() => handleUpdateTests(-1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => handleUpdateTests(1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Hipóteses e testes validados
            </div>
          </div>
        );

      // 2. BLOCO DISTRIBUIÇÃO (Instagram)
      case "dist_followers":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-primary">
                +{followersCount}
              </span>
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border">
                <button
                  onClick={() => handleUpdateFollowers(-10)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => handleUpdateFollowers(10)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Ganhos de perfil ({distPeriod === "today" ? "Hoje" : distPeriod === "7d" ? "Últimos 7 dias" : "Últimos 30 dias"})
            </div>
          </div>
        );

      case "dist_posts":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {postsCount}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {publications.length} no total
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Publicações no período
            </div>
          </div>
        );

      case "dist_views":
        return (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {viewsCount.toLocaleString("pt-BR")}
              </span>
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Visualizações acumuladas
            </div>
          </div>
        );

      // 3. BLOCO FUNIL
      case "funnel_pipeline":
      case "funnel_visual":
        return (
          <div className="w-full">
            <ConnectedProgressiveFunnel compact={true} />
          </div>
        );

      default:
        return (
          <div className="text-xs text-muted-foreground">
            Métrica operacional ativa.
          </div>
        );
    }
  };

  return (
    <section className="px-6 py-2 space-y-3">
      {/* Barra Superior Compacta de Gestão do Cockpit */}
      <div className="flex items-center justify-between pb-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h2 className="font-extrabold uppercase tracking-wider text-foreground text-[11px]">
            Cockpit Operacional
          </h2>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • 3 blocos modulares
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {totalRestoreItems > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestoreModal(true)}
              className="h-7 text-[11px] font-medium rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/10 gap-1 px-2.5"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restaurar ({totalRestoreItems})</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetLayout}
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground rounded-xl px-2"
            title="Restaurar disposição padrão"
          >
            Disposição Padrão
          </Button>
        </div>
      </div>

      {/* BLOCOS OPERACIONAIS PRINCIPAIS (ARRÁSTAVEIS) */}
      <div className="space-y-3">
        {activeBlocks.map((block) => {
          const isDraggingBlock = draggedBlockId === block.id;
          const isDragOverBlock = dragOverBlockId === block.id;

          // Cards do bloco
          const blockCards = (layout.cards || [])
            .filter((c) => c.blockId === block.id && !c.archived && !c.removed)
            .sort((a, b) => a.order - b.order);

          return (
            <div
              key={block.id}
              draggable
              onDragStart={() => handleBlockDragStart(block.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverBlockId(block.id);
              }}
              onDragLeave={() => setDragOverBlockId(null)}
              onDrop={() => handleBlockDrop(block.id)}
              className={`rounded-2xl border bg-card/60 backdrop-blur-xs p-3 transition-all duration-200 ${
                isDraggingBlock ? "opacity-30 border-dashed border-primary" : ""
              } ${isDragOverBlock ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
            >
              {/* CABEÇALHO DO BLOCO */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground p-0.5 rounded"
                    title="Arraste para reordenar o bloco"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                    {block.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Se for o BLOCO 02 (DISTRIBUIÇÃO), exibe o seletor de período */}
                  {block.id === "distribuicao" && (
                    <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border text-[10px]">
                      {(["today", "7d", "30d"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setDistPeriod(p)}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                            distPeriod === p
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Menu do Bloco */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-6 w-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs p-1">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingBlock(block);
                          setEditBlockTitleInput(block.title);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-2" />
                        Renomear Bloco
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleArchiveBlock(block.id)}
                        className="text-amber-600 focus:text-amber-600"
                      >
                        <Archive className="h-3.5 w-3.5 mr-2" />
                        Arquivar Bloco
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* GRID OU ÁREA DE CONTEÚDO DO BLOCO */}
              {block.id === "funil" ? (
                // O Bloco de Funil renderiza a esteira visual diretamente
                <div className="w-full">
                  <ConnectedProgressiveFunnel compact={true} />
                </div>
              ) : (
                <div
                  className={`grid gap-2.5 ${
                    block.id === "infra"
                      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                      : "grid-cols-1 sm:grid-cols-3"
                  }`}
                >
                  {blockCards.map((card) => {
                    const isDraggingCard = draggedCardId === card.id;
                    const isDragOverCard = dragOverCardId === card.id;

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={() => handleCardDragStart(card.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverCardId(card.id);
                        }}
                        onDragLeave={() => setDragOverCardId(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCardDrop(card.id, block.id);
                        }}
                        className={`rounded-xl border p-2.5 bg-card flex flex-col justify-between transition-all duration-150 relative group ${
                          isDraggingCard ? "opacity-30 border-dashed border-primary" : ""
                        } ${
                          isDragOverCard
                            ? "border-primary ring-2 ring-primary/20 scale-[0.99]"
                            : "border-border/80 hover:border-primary/40 hover:shadow-xs"
                        }`}
                      >
                        {/* Linha Superior do Card: Alça, Título e Menu */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground"
                              title="Arraste para mover o card"
                            >
                              <GripVertical className="h-3 w-3" />
                            </span>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight truncate">
                              {card.title}
                            </span>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs p-1">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingCard(card);
                                  setEditTitleInput(card.title);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-2" />
                                Editar Título
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                                Mover para bloco
                              </div>
                              {activeBlocks
                                .filter((b) => b.id !== block.id && b.id !== "funil")
                                .map((targetB) => (
                                  <DropdownMenuItem
                                    key={targetB.id}
                                    onClick={() => handleMoveCardToBlock(card.id, targetB.id)}
                                  >
                                    <ChevronRight className="h-3 w-3 mr-2" />
                                    {targetB.title}
                                  </DropdownMenuItem>
                                ))}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleArchiveCard(card.id)}
                                className="text-amber-600 focus:text-amber-600"
                              >
                                <Archive className="h-3.5 w-3.5 mr-2" />
                                Arquivar Card
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

                        {/* Conteúdo do Card */}
                        {renderCardContent(card)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: EDITAR TÍTULO DO CARD */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent className="max-w-xs p-5 rounded-2xl bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Editar Nome do Card
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-[11px] text-muted-foreground block">
              Nome de Exibição
            </label>
            <Input
              value={editTitleInput}
              onChange={(e) => setEditTitleInput(e.target.value)}
              className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground">
              A alteração do título não altera os identificadores nem a fonte dos dados.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingCard(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCardTitle}
              className="text-xs bg-primary text-primary-foreground rounded-xl font-bold"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR TÍTULO DO BLOCO */}
      <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
        <DialogContent className="max-w-xs p-5 rounded-2xl bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Renomear Bloco
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-[11px] text-muted-foreground block">
              Título da Seção
            </label>
            <Input
              value={editBlockTitleInput}
              onChange={(e) => setEditBlockTitleInput(e.target.value)}
              className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingBlock(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBlockTitle}
              className="text-xs bg-primary text-primary-foreground rounded-xl font-bold"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: AJUSTAR GASTO ADS */}
      <Dialog open={isEditingAdSpend} onOpenChange={setIsEditingAdSpend}>
        <DialogContent className="max-w-xs p-5 rounded-2xl bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Ajustar Gasto com Anúncios
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-[11px] text-muted-foreground block">
              Valor Investido (R$)
            </label>
            <Input
              type="number"
              step="0.01"
              value={adSpendInput}
              onChange={(e) => setAdSpendInput(e.target.value)}
              className="h-8 text-xs bg-background border-input text-foreground rounded-xl font-mono"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingAdSpend(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAdSpend}
              className="text-xs bg-primary text-primary-foreground rounded-xl font-bold"
            >
              Salvar Valor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RESTAURAR ELEMENTOS ARQUIVADOS OU REMOVIDOS */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              Restaurar Elementos Ocultos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Blocos Arquivados */}
            {archivedBlocks.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Blocos Arquivados ({archivedBlocks.length})
                </span>
                <div className="space-y-1.5">
                  {archivedBlocks.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between"
                    >
                      <span className="font-bold text-foreground">{b.title}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreBlock(b.id)}
                        className="h-6 text-[10px] rounded-lg"
                      >
                        Restaurar Bloco
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cards Arquivados ou Removidos */}
            {archivedOrRemovedCards.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Cards Arquivados / Removidos ({archivedOrRemovedCards.length})
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {archivedOrRemovedCards.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-foreground">{c.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.archived ? "Status: Arquivado" : "Status: Removido da exibição"}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreCard(c.id)}
                        className="h-6 text-[10px] rounded-lg"
                      >
                        Restaurar Card
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalRestoreItems === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                Nenhum elemento arquivado ou removido no momento.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setShowRestoreModal(false)}
              className="text-xs rounded-xl"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
