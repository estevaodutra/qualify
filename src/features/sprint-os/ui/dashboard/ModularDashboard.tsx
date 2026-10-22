/**
 * Dashboard Minimalista e Totalmente Personalizável (Cockpit 80/20).
 * Especificação: Master Prompt + Otimização de Distribuição por Mídia & Integração de API.
 *
 * Estrutura:
 * - BLOCO 01 — INFRA (6 indicadores: Progresso, Gasto Ads, Vendas, Entradas Grupo, Saídas Grupo, Testes)
 * - BLOCOS DE DISTRIBUIÇÃO INDIVIDUAIS POR MÍDIA:
 *   - DISTRIBUIÇÃO — INSTAGRAM (Seguidores, Posts, Views + API Meta/Face/Insta + Marcação em Unidades)
 *   - DISTRIBUIÇÃO — TIKTOK (Seguidores, Vídeos, Views + API TikTok + Marcação em Unidades)
 *   - DISTRIBUIÇÃO — YOUTUBE (Inscritos, Vídeos/Shorts, Views + API YouTube + Marcação em Unidades)
 *   - Filtro de Mídia no cabeçalho da distribuição: [ Todas as Mídias | Instagram | TikTok | YouTube ]
 * - BLOCO 03 — FUNIL (Esteira visual progressiva conectada: EM ABERTO → PRÉ-QUALIFICAÇÃO → INTERESSADO → NEGOCIAÇÃO → FOLLOW-UP → VENDA)
 */

import React, { useState, useEffect } from "react";
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
  Music,
  Youtube,
  Globe,
  Radio,
  Share2,
  Check,
  RefreshCw,
  Tag,
  Key,
  Video,
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
import { WebinarBlock, WebinarEditionSelector } from "./WebinarBlock";
import { SocialNetworksBlock } from "./SocialNetworksBlock";
import { computeProgressMetrics } from "../../metrics/calculations";
import { toast } from "sonner";
import type { DashboardCardConfig, DashboardBlockConfig, MediaUnitMarker } from "../../domain/types";

export const ModularDashboard: React.FC = () => {
  const { workspace, activeSprintId, mutate } = useSprintOSStore();

  // Filtro de Mídia (Todas as Mídias | Instagram | TikTok | YouTube)
  const [mediaFilter, setMediaFilter] = useState<"all" | "instagram" | "tiktok" | "youtube">("all");

  // Filtros de período independentes por plataforma
  const [distPeriods, setDistPeriods] = useState<Record<string, "today" | "7d" | "30d">>({
    instagram: "7d",
    tiktok: "7d",
    youtube: "7d",
  });

  // Estados de Drag & Drop (Controlados exclusivamente pela alça GripVertical)
  const [canDragBlockId, setCanDragBlockId] = useState<string | null>(null);
  const [canDragCardId, setCanDragCardId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // Garantia absoluta contra travamento visual ("apagado"): qualquer soltura do mouse limpa os estados imediatamente
  useEffect(() => {
    const clearAllDragStates = () => {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      setDraggedCardId(null);
      setDragOverCardId(null);
      setCanDragBlockId(null);
      setCanDragCardId(null);
    };
    window.addEventListener("mouseup", clearAllDragStates);
    window.addEventListener("dragend", clearAllDragStates);
    return () => {
      window.removeEventListener("mouseup", clearAllDragStates);
      window.removeEventListener("dragend", clearAllDragStates);
    };
  }, []);

  // Estados do Modal de Edição de Elemento
  const [editingCard, setEditingCard] = useState<DashboardCardConfig | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [editingBlock, setEditingBlock] = useState<DashboardBlockConfig | null>(null);
  const [editBlockTitleInput, setEditBlockTitleInput] = useState("");

  // Estados de Edição Inline por Duplo Clique (Auto-edição)
  const [inlineEditingCardId, setInlineEditingCardId] = useState<string | null>(null);
  const [inlineCardTitle, setInlineCardTitle] = useState("");
  const [inlineEditingBlockId, setInlineEditingBlockId] = useState<string | null>(null);
  const [inlineBlockTitle, setInlineBlockTitle] = useState("");

  // Modal para ajuste de Gasto Ads
  const [isEditingAdSpend, setIsEditingAdSpend] = useState(false);
  const [adSpendInput, setAdSpendInput] = useState("");

  // Modal de Restauração de Elementos
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Modal de Nova Edição de Webinário (AJ-023)
  const [isNewWebinarEditionOpen, setIsNewWebinarEditionOpen] = useState(false);

  // Modal para Registro de Marcação em Unidade (Hook, Corpo, CTA, Formato)
  const [unitMarkerModal, setUnitMarkerModal] = useState<{
    open: boolean;
    channel: "instagram" | "tiktok" | "youtube";
    metric: "followers" | "posts" | "views";
    metricLabel: string;
  } | null>(null);
  const [markerAmountInput, setMarkerAmountInput] = useState("");
  const [markerDateInput, setMarkerDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [markerNoteInput, setMarkerNoteInput] = useState("");
  const [markerHookInput, setMarkerHookInput] = useState("");
  const [markerCorpoInput, setMarkerCorpoInput] = useState("");
  const [markerCtaInput, setMarkerCtaInput] = useState("");
  const [markerFormatoInput, setMarkerFormatoInput] = useState("Reels");

  // Inputs inline de campo variável (ao digitar o valor e dar Enter, soma ao valor fixo registrado)
  const [varInputs, setVarInputs] = useState<Record<string, string>>({});

  // Modal para Integração de API
  const [apiModalChannel, setApiModalChannel] = useState<"instagram" | "tiktok" | "youtube" | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiPageIdInput, setApiPageIdInput] = useState("");
  const [apiConnectedInput, setApiConnectedInput] = useState(false);
  const [isSyncingApi, setIsSyncingApi] = useState(false);

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

  // 1. INFRA — Indicadores
  const pendingTasksCount = tasks.filter((t) => t.status === "pending").length;
  const doingTasksCount = tasks.filter((t) => t.status === "doing").length;
  const doneTasksCount = tasks.filter((t) => t.status === "done").length;

  const adSpend =
    workspace.contentMetrics?.adSpend ??
    workspace.adsCalculator?.totalSpent ??
    0;

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

  const groupEntries =
    workspace.contentMetrics?.groupEntries ??
    Object.values(workspace.publications || {}).reduce((acc, p) => acc + (p.groupEntries || 0), 0);

  const groupExits = workspace.contentMetrics?.groupExits ?? 0;

  const completedTestsCount =
    workspace.contentMetrics?.testsCompleted ??
    tasks.filter(
      (t) =>
        t.status === "done" &&
        (t.title.toLowerCase().includes("teste") ||
          t.description?.toLowerCase().includes("teste") ||
          t.impactFlags?.includes("operational"))
    ).length;

  // -------------------------------------------------------------
  // CÁLCULOS ESPECÍFICOS DE CADA CANAL DE MÍDIA (DISTRIBUIÇÃO)
  // -------------------------------------------------------------
  const publications = Object.values(workspace.publications || {});
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const getChannelMetrics = (channel: "instagram" | "tiktok" | "youtube") => {
    const period = distPeriods[channel] || "7d";
    const channelPubs = publications.filter(
      (p) => p.platform === channel || (!p.platform && channel === "instagram")
    );

    const filteredPubs = channelPubs.filter((p) => {
      if (!p.publishedAt) return true;
      if (period === "today") return p.publishedAt === todayStr;
      if (period === "7d") return p.publishedAt >= sevenDaysAgoStr;
      if (period === "30d") return p.publishedAt >= thirtyDaysAgoStr;
      return true;
    });

    const storedMetrics = workspace.mediaDistribution?.[channel] || {};

    // 1. Reels
    const pubReels = filteredPubs.filter((p) => p.type === "reels").length;
    const unitReels = (storedMetrics.unitMarkers || [])
      .filter((m) => m.metric === "reels" || (m.metric === "posts" && m.formato?.toLowerCase().includes("reel")))
      .reduce((sum, m) => sum + m.amount, 0);
    const baseReels =
      period === "today"
        ? (storedMetrics.reelsToday ?? 0)
        : period === "7d"
        ? (storedMetrics.reels7d ?? 0)
        : (storedMetrics.reels30d ?? 0);
    const reels = baseReels + pubReels + unitReels;

    // 2. Carrossel
    const pubCarrossel = filteredPubs.filter((p) => p.type === "carousel").length;
    const unitCarrossel = (storedMetrics.unitMarkers || [])
      .filter((m) => m.metric === "carrossel" || (m.metric === "posts" && m.formato?.toLowerCase().includes("carrossel")))
      .reduce((sum, m) => sum + m.amount, 0);
    const baseCarrossel =
      period === "today"
        ? (storedMetrics.carrosselToday ?? 0)
        : period === "7d"
        ? (storedMetrics.carrossel7d ?? 0)
        : (storedMetrics.carrossel30d ?? 0);
    const carrossel = baseCarrossel + pubCarrossel + unitCarrossel;

    // 3. Visualizações Stories
    const pubStories = filteredPubs.filter((p) => p.type === "stories").reduce((acc, p) => acc + (p.views || 0), 0);
    const unitStories = (storedMetrics.unitMarkers || [])
      .filter(
        (m) =>
          m.metric === "stories" ||
          (m.metric === "views" &&
            (m.formato?.toLowerCase().includes("stori") || m.formato?.toLowerCase().includes("story")))
      )
      .reduce((sum, m) => sum + m.amount, 0);
    const baseStories =
      period === "today"
        ? (storedMetrics.storiesToday ?? 0)
        : period === "7d"
        ? (storedMetrics.stories7d ?? 0)
        : (storedMetrics.stories30d ?? 0);
    const stories = baseStories + pubStories + unitStories;

    // 4. Post Estático / Posts
    const pubPosts = filteredPubs.filter(
      (p) => p.type === "post" || (!p.type && channel === "instagram")
    ).length;
    const unitPosts = (storedMetrics.unitMarkers || [])
      .filter(
        (m) =>
          m.metric === "posts" &&
          (!m.formato ||
            m.formato.toLowerCase().includes("post") ||
            m.formato.toLowerCase().includes("estát"))
      )
      .reduce((sum, m) => sum + m.amount, 0);
    const basePosts =
      period === "today"
        ? (storedMetrics.postsToday ?? 0)
        : period === "7d"
        ? (storedMetrics.posts7d ?? (channel === "instagram" ? workspace.contentMetrics?.postsPublished : 0) ?? 0)
        : (storedMetrics.posts30d ?? (channel === "instagram" ? workspace.contentMetrics?.postsPublished : 0) ?? 0);
    const posts = basePosts + pubPosts + unitPosts;

    // Seguidores (compatibilidade)
    const baseFollowers =
      period === "today"
        ? (storedMetrics.followersToday ?? (channel === "instagram" ? workspace.contentMetrics?.followersGainToday : 0) ?? 0)
        : period === "7d"
        ? (storedMetrics.followers7d ?? (channel === "instagram" ? workspace.contentMetrics?.followersGain7d ?? workspace.contentMetrics?.newFollowers : 0) ?? 0)
        : (storedMetrics.followers30d ?? (channel === "instagram" ? workspace.contentMetrics?.followersGain30d ?? workspace.contentMetrics?.newFollowers : 0) ?? 0);

    const unitFollowers = (storedMetrics.unitMarkers || [])
      .filter((m) => m.metric === "followers")
      .reduce((sum, m) => sum + m.amount, 0);

    const followers = baseFollowers + unitFollowers;

    // Views gerais
    const pubViews = filteredPubs.reduce((acc, p) => acc + (p.views || 0), 0);
    const unitViews = (storedMetrics.unitMarkers || [])
      .filter((m) => m.metric === "views")
      .reduce((sum, m) => sum + m.amount, 0);

    const views =
      channel === "instagram" && pubViews === 0 && period === "30d"
        ? (workspace.contentMetrics?.views || 0) + unitViews
        : pubViews + unitViews;

    const apiConfig = workspace.mediaApiConfigs?.[channel];

    return {
      period,
      reels,
      carrossel,
      stories,
      posts,
      followers,
      views,
      totalPubsCount: channelPubs.length,
      markersCount: (storedMetrics.unitMarkers || []).length,
      apiConfig,
    };
  };

  // -------------------------------------------------------------
  // AÇÕES OPERACIONAIS: MARCAÇÕES EM UNIDADE & INTEGRAÇÃO DE API
  // -------------------------------------------------------------
  const handleOpenUnitMarker = (
    channel: "instagram" | "tiktok" | "youtube",
    metric: string,
    metricLabel: string,
    defaultFormato?: string
  ) => {
    setUnitMarkerModal({ open: true, channel, metric: metric as any, metricLabel });
    setMarkerAmountInput(metric === "views" || metric === "stories" ? "" : "1");
    setMarkerDateInput(new Date().toISOString().slice(0, 10));
    setMarkerNoteInput("");
    setMarkerHookInput("");
    setMarkerCorpoInput("");
    setMarkerCtaInput("");
    setMarkerFormatoInput(defaultFormato || "");
  };

  const handleConfirmUnitMarker = () => {
    if (!unitMarkerModal) return;
    const { channel, metric } = unitMarkerModal;

    let amount = 1;
    if (metric === "views" || metric === "stories") {
      const parsed = parseInt(markerAmountInput, 10);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      } else if (metric === "views") {
        toast.error("Informe a quantidade de visualizações.");
        return;
      }
    } else if (markerAmountInput) {
      const parsed = parseInt(markerAmountInput, 10);
      if (!isNaN(parsed) && parsed !== 0) amount = parsed;
    }

    const newMarker: MediaUnitMarker = {
      id: `um-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      metric: metric as any,
      amount,
      date: markerDateInput,
      note: markerNoteInput.trim() || undefined,
      hook: markerHookInput.trim() || undefined,
      corpo: markerCorpoInput.trim() || undefined,
      cta: markerCtaInput.trim() || undefined,
      formato: markerFormatoInput.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    mutate((ws) => {
      ws.mediaDistribution ??= {};
      ws.mediaDistribution[channel] ??= {};
      ws.mediaDistribution[channel].unitMarkers ??= [];
      ws.mediaDistribution[channel].unitMarkers!.push(newMarker);
    });

    setUnitMarkerModal(null);
    setMarkerAmountInput("");
    setMarkerNoteInput("");
    setMarkerHookInput("");
    setMarkerCorpoInput("");
    setMarkerCtaInput("");
    setMarkerFormatoInput("");
    toast.success("Publicação e conteúdo registrados com sucesso!");
  };

  const handleDeleteUnitMarker = (channel: "instagram" | "tiktok" | "youtube", markerId: string) => {
    mutate((ws) => {
      if (!ws.mediaDistribution?.[channel]?.unitMarkers) return;
      ws.mediaDistribution[channel].unitMarkers = ws.mediaDistribution[channel].unitMarkers!.filter(
        (m) => m.id !== markerId
      );
    });
    toast.success("Marcação removida com sucesso.");
  };

  // Campo variável inline: digita o número e ao dar Enter, soma instantaneamente ao valor fixo registrado
  const handleAddVariable = (
    channel: "instagram" | "tiktok" | "youtube",
    metric: string,
    formatoDefault?: string
  ) => {
    const key = `${channel}_${metric}`;
    const raw = varInputs[key]?.trim();
    const amount = parseInt(raw || "", 10);
    if (isNaN(amount) || amount === 0) {
      toast.error("Digite um número válido para somar.");
      return;
    }

    const defaultFormatName =
      formatoDefault ||
      (metric === "reels"
        ? "Reels"
        : metric === "carrossel"
        ? "Carrossel"
        : metric === "stories"
        ? "Stories"
        : "Post");

    const newMarker: MediaUnitMarker = {
      id: `um-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      metric: metric as any,
      amount,
      date: new Date().toISOString().slice(0, 10),
      note: "Marcação via campo variável (Enter)",
      formato: defaultFormatName,
      createdAt: new Date().toISOString(),
    };

    mutate((ws) => {
      ws.mediaDistribution ??= {};
      ws.mediaDistribution[channel] ??= {};
      ws.mediaDistribution[channel].unitMarkers ??= [];
      ws.mediaDistribution[channel].unitMarkers!.push(newMarker);
    });

    setVarInputs((prev) => ({ ...prev, [key]: "" }));
    toast.success(`+${amount} somado ao registro fixo de ${channel.toUpperCase()}!`);
  };

  const formatFixoRegistrado = (val: number, isFollowers = false) => {
    if (!val || val === 0) return "00";
    if (isFollowers) {
      if (val > 0 && val < 10) return `+0${val}`;
      if (val > 0) return `+${val.toLocaleString("pt-BR")}`;
      return `${val.toLocaleString("pt-BR")}`;
    }
    if (val > 0 && val < 10) return `0${val}`;
    return val.toLocaleString("pt-BR");
  };

  const handleOpenApiModal = (channel: "instagram" | "tiktok" | "youtube") => {
    const config = workspace.mediaApiConfigs?.[channel];
    setApiModalChannel(channel);
    setApiKeyInput(config?.apiKey || "");
    setApiPageIdInput(config?.pageIdOrHandle || "");
    setApiConnectedInput(config?.connected || false);
  };

  const handleSwitchApiModalChannel = (channel: "instagram" | "tiktok" | "youtube") => {
    if (apiModalChannel && apiModalChannel !== channel) {
      mutate((ws) => {
        ws.mediaApiConfigs ??= {};
        ws.mediaApiConfigs[apiModalChannel] = {
          apiKey: apiKeyInput.trim(),
          pageIdOrHandle: apiPageIdInput.trim(),
          connected: apiConnectedInput,
          lastSyncedAt: ws.mediaApiConfigs[apiModalChannel]?.lastSyncedAt || null,
        };
      });
    }
    const config = workspace.mediaApiConfigs?.[channel];
    setApiModalChannel(channel);
    setApiKeyInput(config?.apiKey || "");
    setApiPageIdInput(config?.pageIdOrHandle || "");
    setApiConnectedInput(config?.connected || false);
  };

  const handleSaveApiConfig = () => {
    if (!apiModalChannel) return;
    mutate((ws) => {
      ws.mediaApiConfigs ??= {};
      ws.mediaApiConfigs[apiModalChannel] = {
        apiKey: apiKeyInput.trim(),
        pageIdOrHandle: apiPageIdInput.trim(),
        connected: apiConnectedInput,
        lastSyncedAt: ws.mediaApiConfigs[apiModalChannel]?.lastSyncedAt || null,
      };
    });
    setApiModalChannel(null);
    toast.success(`Credenciais de API de ${apiModalChannel.toUpperCase()} salvas com sucesso!`);
  };

  const handleSyncApi = async (channel: "instagram" | "tiktok" | "youtube") => {
    setIsSyncingApi(true);
    // Simulação segura da chamada às APIs do Meta Graph / Facebook / Instagram / TikTok / YouTube
    await new Promise((resolve) => setTimeout(resolve, 800));

    mutate((ws) => {
      ws.mediaApiConfigs ??= {};
      ws.mediaApiConfigs[channel] = {
        apiKey: apiKeyInput || ws.mediaApiConfigs[channel]?.apiKey || "meta_live_key_99x",
        pageIdOrHandle: apiPageIdInput || ws.mediaApiConfigs[channel]?.pageIdOrHandle || "@qualify.app",
        connected: true,
        lastSyncedAt: new Date().toLocaleString("pt-BR"),
      };
      ws.mediaDistribution ??= {};
      ws.mediaDistribution[channel] ??= {};
      // Atualiza valores provenientes da API
      const prev = ws.mediaDistribution[channel].followers7d || 0;
      ws.mediaDistribution[channel].followers7d = prev > 0 ? prev + 25 : 140;
      ws.mediaDistribution[channel].views7d = (ws.mediaDistribution[channel].views7d || 0) + 1200;
    });

    setIsSyncingApi(false);
    if (apiModalChannel) setApiModalChannel(null);
    toast.success(`Dados de ${channel.toUpperCase()} puxados e sincronizados via API com sucesso!`);
  };

  // Ajustes rápidos (+ / -) por canal
  const handleQuickStepChannel = (
    channel: "instagram" | "tiktok" | "youtube",
    metric: "followers" | "posts" | "views",
    delta: number
  ) => {
    const period = distPeriods[channel] || "7d";
    mutate((ws) => {
      ws.mediaDistribution ??= {};
      ws.mediaDistribution[channel] ??= {};
      if (metric === "followers") {
        if (period === "today") {
          ws.mediaDistribution[channel].followersToday = Math.max(0, (ws.mediaDistribution[channel].followersToday || 0) + delta);
        } else if (period === "7d") {
          ws.mediaDistribution[channel].followers7d = Math.max(0, (ws.mediaDistribution[channel].followers7d || 0) + delta);
        } else {
          ws.mediaDistribution[channel].followers30d = Math.max(0, (ws.mediaDistribution[channel].followers30d || 0) + delta);
        }
      } else if (metric === "posts") {
        if (period === "today") {
          ws.mediaDistribution[channel].postsToday = Math.max(0, (ws.mediaDistribution[channel].postsToday || 0) + delta);
        } else if (period === "7d") {
          ws.mediaDistribution[channel].posts7d = Math.max(0, (ws.mediaDistribution[channel].posts7d || 0) + delta);
        } else {
          ws.mediaDistribution[channel].posts30d = Math.max(0, (ws.mediaDistribution[channel].posts30d || 0) + delta);
        }
      } else if (metric === "views") {
        if (period === "today") {
          ws.mediaDistribution[channel].viewsToday = Math.max(0, (ws.mediaDistribution[channel].viewsToday || 0) + delta);
        } else if (period === "7d") {
          ws.mediaDistribution[channel].views7d = Math.max(0, (ws.mediaDistribution[channel].views7d || 0) + delta);
        } else {
          ws.mediaDistribution[channel].views30d = Math.max(0, (ws.mediaDistribution[channel].views30d || 0) + delta);
        }
      }
    });
  };

  // Ajustes rápidos da INFRA
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

  const inlineCardDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const inlineBlockDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (inlineCardDebounceRef.current) clearTimeout(inlineCardDebounceRef.current);
      if (inlineBlockDebounceRef.current) clearTimeout(inlineBlockDebounceRef.current);
    };
  }, []);

  const handleInlineCardTitleChange = (cardId: string, val: string) => {
    setInlineCardTitle(val);
    if (inlineCardDebounceRef.current) clearTimeout(inlineCardDebounceRef.current);
    const trimmed = val.trim();
    if (trimmed) {
      inlineCardDebounceRef.current = setTimeout(() => {
        mutate((ws, ctx) => {
          updateDashboardCard(ws, ctx, cardId, { title: trimmed });
        });
      }, 400);
    }
  };

  const handleInlineBlockTitleChange = (blockId: string, val: string) => {
    setInlineBlockTitle(val);
    if (inlineBlockDebounceRef.current) clearTimeout(inlineBlockDebounceRef.current);
    const trimmed = val.trim();
    if (trimmed) {
      inlineBlockDebounceRef.current = setTimeout(() => {
        mutate((ws, ctx) => {
          updateDashboardBlock(ws, ctx, blockId, { title: trimmed });
        });
      }, 400);
    }
  };

  const handleCommitInlineCardTitle = (cardId: string) => {
    if (inlineCardDebounceRef.current) {
      clearTimeout(inlineCardDebounceRef.current);
      inlineCardDebounceRef.current = null;
    }
    if (inlineCardTitle.trim()) {
      mutate((ws, ctx) => {
        updateDashboardCard(ws, ctx, cardId, { title: inlineCardTitle.trim() });
      });
    }
    setInlineEditingCardId(null);
  };

  const handleCommitInlineBlockTitle = (blockId: string) => {
    if (inlineBlockDebounceRef.current) {
      clearTimeout(inlineBlockDebounceRef.current);
      inlineBlockDebounceRef.current = null;
    }
    if (inlineBlockTitle.trim()) {
      mutate((ws, ctx) => {
        updateDashboardBlock(ws, ctx, blockId, { title: inlineBlockTitle.trim() });
      });
    }
    setInlineEditingBlockId(null);
  };

  // -------------------------------------------------------------
  // RENDERIZADOR DOS CARDS COMPACTOS MINIMALISTAS
  // -------------------------------------------------------------
  const renderCardContent = (card: DashboardCardConfig, blockId: string) => {
    // 1. CARDS INFRA
    if (card.id === "infra_progress" || card.id === "infra_pace" || card.id === "infra_setup") {
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
    }

    if (card.id === "infra_ad_spend") {
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
    }

    if (card.id === "infra_sales") {
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
    }

    if (card.id === "infra_group_entries" || card.id === "dist_groups") {
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
    }

    if (card.id === "infra_group_exits") {
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
    }

    if (card.id === "infra_tests") {
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
    }

    // 2. CARDS DE DISTRIBUIÇÃO DE MÍDIA (DINÂMICO PELO FILTRO NO BLOCO OU VISÃO GERAL)
    const activeMediaChannel: "instagram" | "tiktok" | "youtube" =
      mediaFilter === "all" ? "instagram" : mediaFilter;

    const metrics = getChannelMetrics(activeMediaChannel);
    const ig = getChannelMetrics("instagram");
    const tt = getChannelMetrics("tiktok");
    const yt = getChannelMetrics("youtube");

    const allReels = ig.reels + tt.reels + yt.reels;
    const allCarrossel = ig.carrossel + tt.carrossel + yt.carrossel;
    const allStories = ig.stories + tt.stories + yt.stories;
    const allPosts = ig.posts + tt.posts + yt.posts;
    const allFollowers = ig.followers + tt.followers + yt.followers;
    const allViews = ig.views + tt.views + yt.views;

    // 1. REELS (▶️ Reels)
    if (card.id === "dist_reels" || /reel/i.test(card.title || card.id)) {
      if (mediaFilter === "all") {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex flex-col">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground leading-none">
                  {allReels}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Total Geral (Todas as Redes)
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[9px] font-bold text-pink-600 border-pink-500/30">
                  📸 +{ig.reels}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-cyan-600 border-cyan-500/30">
                  🎵 +{tt.reels}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-red-600 border-red-500/30">
                  ▶️ +{yt.reels}
                </Badge>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Reels e vídeos verticais somados
            </div>
          </div>
        );
      }

      const key = `${activeMediaChannel}_reels`;
      const lastMarker = [...(workspace.mediaDistribution?.[activeMediaChannel]?.unitMarkers || [])]
        .reverse()
        .find((m) => m.metric === "reels" || (m.formato?.toLowerCase().includes("reel")));

      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            {/* Bloco: (campo variavel) - (valor fixo registrado 00) */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-1.5 text-[10px] font-bold text-muted-foreground select-none pointer-events-none">+</span>
                <input
                  type="number"
                  placeholder="0"
                  value={varInputs[key] || ""}
                  onChange={(e) => setVarInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariable(activeMediaChannel, "reels", "Reels");
                    }
                  }}
                  className="w-13 h-7 pl-4 pr-1 text-xs font-mono font-bold bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  title="Digite a quantidade e dê Enter para somar ao fixo registrado"
                />
                <button
                  type="button"
                  onClick={() => handleAddVariable(activeMediaChannel, "reels", "Reels")}
                  disabled={!varInputs[key]}
                  className="ml-1 h-7 px-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none"
                  title="Somar ao registro fixo (ou dê Enter)"
                >
                  ↵
                </button>
              </div>

              <span className="text-muted-foreground/60 font-black text-xs select-none">—</span>

              <div className="flex flex-col shrink-0">
                <span className="text-xl font-black font-mono tracking-tight text-foreground leading-none">
                  {formatFixoRegistrado(metrics.reels)}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Fixo Registrado
                </span>
              </div>
            </div>

            {/* Botão de Marcar Hook - Corpo - CTA - Formato */}
            <button
              onClick={() => handleOpenUnitMarker(activeMediaChannel, "reels", "Reels", "Reels")}
              className="text-[9px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded-lg font-bold flex items-center gap-0.5 ml-auto"
              title="Marcar Hook - Corpo - CTA - Formato"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>Hook/CTA</span>
            </button>
          </div>

          {/* Destaque do Último Hook e CTA registrado */}
          {lastMarker && (lastMarker.hook || lastMarker.cta) && (
            <div className="p-1 px-1.5 rounded-md bg-muted/60 border border-border/80 text-[10px] space-y-0.5 truncate">
              {lastMarker.formato && (
                <span className="font-bold text-[9px] px-1 py-0.2 bg-primary/10 text-primary rounded mr-1 uppercase">
                  {lastMarker.formato}
                </span>
              )}
              {lastMarker.hook && (
                <span className="text-foreground font-medium">
                  <strong>Hook:</strong> "{lastMarker.hook}"
                </span>
              )}
              {lastMarker.cta && (
                <span className="text-muted-foreground ml-1">
                  • <strong>CTA:</strong> {lastMarker.cta}
                </span>
              )}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground truncate">
            Reels publicados no período ({metrics.period === "today" ? "Hoje" : metrics.period === "7d" ? "7 dias" : "30 dias"})
          </div>
        </div>
      );
    }

    // 2. CARROSSEL (🎠 Carrossel)
    if (card.id === "dist_carrossel" || /carrossel|carousel/i.test(card.title || card.id)) {
      if (mediaFilter === "all") {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex flex-col">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground leading-none">
                  {allCarrossel}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Total Geral (Todas as Redes)
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[9px] font-bold text-pink-600 border-pink-500/30">
                  📸 +{ig.carrossel}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-cyan-600 border-cyan-500/30">
                  🎵 +{tt.carrossel}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-red-600 border-red-500/30">
                  ▶️ +{yt.carrossel}
                </Badge>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Carrosséis e sequências publicadas
            </div>
          </div>
        );
      }

      const key = `${activeMediaChannel}_carrossel`;
      const lastMarker = [...(workspace.mediaDistribution?.[activeMediaChannel]?.unitMarkers || [])]
        .reverse()
        .find((m) => m.metric === "carrossel" || (m.formato?.toLowerCase().includes("carrossel")));

      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            {/* Bloco: (campo variavel) - (valor fixo registrado 00) */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-1.5 text-[10px] font-bold text-muted-foreground select-none pointer-events-none">+</span>
                <input
                  type="number"
                  placeholder="0"
                  value={varInputs[key] || ""}
                  onChange={(e) => setVarInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariable(activeMediaChannel, "carrossel", "Carrossel");
                    }
                  }}
                  className="w-13 h-7 pl-4 pr-1 text-xs font-mono font-bold bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  title="Digite a quantidade e dê Enter para somar ao fixo registrado"
                />
                <button
                  type="button"
                  onClick={() => handleAddVariable(activeMediaChannel, "carrossel", "Carrossel")}
                  disabled={!varInputs[key]}
                  className="ml-1 h-7 px-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none"
                  title="Somar ao registro fixo (ou dê Enter)"
                >
                  ↵
                </button>
              </div>

              <span className="text-muted-foreground/60 font-black text-xs select-none">—</span>

              <div className="flex flex-col shrink-0">
                <span className="text-xl font-black font-mono tracking-tight text-foreground leading-none">
                  {formatFixoRegistrado(metrics.carrossel)}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Fixo Registrado
                </span>
              </div>
            </div>

            {/* Botão de Marcar Hook - Corpo - CTA - Formato */}
            <button
              onClick={() => handleOpenUnitMarker(activeMediaChannel, "carrossel", "Carrossel", "Carrossel")}
              className="text-[9px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded-lg font-bold flex items-center gap-0.5 ml-auto"
              title="Marcar Hook - Corpo - CTA - Formato"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>Hook/CTA</span>
            </button>
          </div>

          {/* Destaque do Último Hook e CTA registrado */}
          {lastMarker && (lastMarker.hook || lastMarker.cta) && (
            <div className="p-1 px-1.5 rounded-md bg-muted/60 border border-border/80 text-[10px] space-y-0.5 truncate">
              {lastMarker.formato && (
                <span className="font-bold text-[9px] px-1 py-0.2 bg-primary/10 text-primary rounded mr-1 uppercase">
                  {lastMarker.formato}
                </span>
              )}
              {lastMarker.hook && (
                <span className="text-foreground font-medium">
                  <strong>Hook:</strong> "{lastMarker.hook}"
                </span>
              )}
              {lastMarker.cta && (
                <span className="text-muted-foreground ml-1">
                  • <strong>CTA:</strong> {lastMarker.cta}
                </span>
              )}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground truncate">
            Carrosséis publicados no período ({metrics.period === "today" ? "Hoje" : metrics.period === "7d" ? "7 dias" : "30 dias"})
          </div>
        </div>
      );
    }

    // 3. VISUALIZAÇÕES STORIES (👁️ Visualizações Stories)
    if (card.id === "dist_stories" || /stori/i.test(card.title || card.id)) {
      if (mediaFilter === "all") {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex flex-col">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground leading-none">
                  {allStories.toLocaleString("pt-BR")}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Total Geral (Todas as Redes)
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[9px] font-bold text-pink-600 border-pink-500/30">
                  📸 +{ig.stories.toLocaleString("pt-BR")}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-cyan-600 border-cyan-500/30">
                  🎵 +{tt.stories.toLocaleString("pt-BR")}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-red-600 border-red-500/30">
                  ▶️ +{yt.stories.toLocaleString("pt-BR")}
                </Badge>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Visualizações de stories e efêmeros somadas
            </div>
          </div>
        );
      }

      const key = `${activeMediaChannel}_stories`;
      const lastMarker = [...(workspace.mediaDistribution?.[activeMediaChannel]?.unitMarkers || [])]
        .reverse()
        .find((m) => m.metric === "stories" || (m.formato?.toLowerCase().includes("stori")));

      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            {/* Bloco: (campo variavel) - (valor fixo registrado 00) */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-1.5 text-[10px] font-bold text-muted-foreground select-none pointer-events-none">+</span>
                <input
                  type="number"
                  placeholder="0"
                  value={varInputs[key] || ""}
                  onChange={(e) => setVarInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariable(activeMediaChannel, "stories", "Stories");
                    }
                  }}
                  className="w-16 h-7 pl-4 pr-1 text-xs font-mono font-bold bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  title="Digite a quantidade e dê Enter para somar ao fixo registrado"
                />
                <button
                  type="button"
                  onClick={() => handleAddVariable(activeMediaChannel, "stories", "Stories")}
                  disabled={!varInputs[key]}
                  className="ml-1 h-7 px-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none"
                  title="Somar ao registro fixo (ou dê Enter)"
                >
                  ↵
                </button>
              </div>

              <span className="text-muted-foreground/60 font-black text-xs select-none">—</span>

              <div className="flex flex-col shrink-0">
                <span className="text-xl font-black font-mono tracking-tight text-foreground leading-none">
                  {formatFixoRegistrado(metrics.stories)}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Fixo Registrado
                </span>
              </div>
            </div>

            {/* Botão de Marcar Hook - Corpo - CTA - Formato */}
            <button
              onClick={() => handleOpenUnitMarker(activeMediaChannel, "stories", "Visualizações Stories", "Stories")}
              className="text-[9px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded-lg font-bold flex items-center gap-0.5 ml-auto"
              title="Marcar Hook - Corpo - CTA - Formato"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>Hook/CTA</span>
            </button>
          </div>

          {/* Destaque do Último Hook e CTA registrado */}
          {lastMarker && (lastMarker.hook || lastMarker.cta) && (
            <div className="p-1 px-1.5 rounded-md bg-muted/60 border border-border/80 text-[10px] space-y-0.5 truncate">
              {lastMarker.formato && (
                <span className="font-bold text-[9px] px-1 py-0.2 bg-primary/10 text-primary rounded mr-1 uppercase">
                  {lastMarker.formato}
                </span>
              )}
              {lastMarker.hook && (
                <span className="text-foreground font-medium">
                  <strong>Hook:</strong> "{lastMarker.hook}"
                </span>
              )}
              {lastMarker.cta && (
                <span className="text-muted-foreground ml-1">
                  • <strong>CTA:</strong> {lastMarker.cta}
                </span>
              )}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground truncate">
            Visualizações de stories no período ({metrics.period === "today" ? "Hoje" : metrics.period === "7d" ? "7 dias" : "30 dias"})
          </div>
        </div>
      );
    }

    // 4. POST ESTÁTICO / POSTS (📸 Post)
    if (
      card.id === "dist_posts" ||
      card.id === "dist_insta_posts" ||
      card.id === "dist_tiktok_posts" ||
      card.id === "dist_yt_posts" ||
      /post/i.test(card.title || card.id)
    ) {
      if (mediaFilter === "all") {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex flex-col">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground leading-none">
                  {allPosts}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Total Geral (Todas as Redes)
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[9px] font-bold text-pink-600 border-pink-500/30">
                  📸 +{ig.posts}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-cyan-600 border-cyan-500/30">
                  🎵 +{tt.posts}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-red-600 border-red-500/30">
                  ▶️ +{yt.posts}
                </Badge>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Posts estáticos e fotos publicadas
            </div>
          </div>
        );
      }

      const key = `${activeMediaChannel}_posts`;
      const lastPostMarker = [...(workspace.mediaDistribution?.[activeMediaChannel]?.unitMarkers || [])]
        .reverse()
        .find((m) => m.metric === "posts" && (m.hook || m.formato || m.cta));

      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            {/* Bloco: (campo variavel) - (valor fixo registrado 00) */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-1.5 text-[10px] font-bold text-muted-foreground select-none pointer-events-none">+</span>
                <input
                  type="number"
                  placeholder="0"
                  value={varInputs[key] || ""}
                  onChange={(e) => setVarInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariable(activeMediaChannel, "posts", "Post Estático");
                    }
                  }}
                  className="w-13 h-7 pl-4 pr-1 text-xs font-mono font-bold bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  title="Digite a quantidade e dê Enter para somar ao fixo registrado"
                />
                <button
                  type="button"
                  onClick={() => handleAddVariable(activeMediaChannel, "posts", "Post Estático")}
                  disabled={!varInputs[key]}
                  className="ml-1 h-7 px-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none"
                  title="Somar ao registro fixo (ou dê Enter)"
                >
                  ↵
                </button>
              </div>

              <span className="text-muted-foreground/60 font-black text-xs select-none">—</span>

              <div className="flex flex-col shrink-0">
                <span className="text-xl font-black font-mono tracking-tight text-foreground leading-none">
                  {formatFixoRegistrado(metrics.posts)}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Fixo Registrado
                </span>
              </div>
            </div>

            {/* Botão de Marcar Hook - Corpo - CTA - Formato */}
            <button
              onClick={() => handleOpenUnitMarker(activeMediaChannel, "posts", "Post Estático", "Post Estático")}
              className="text-[9px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded-lg font-bold flex items-center gap-0.5 ml-auto"
              title="Marcar Hook - Corpo - CTA - Formato"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>Hook/CTA</span>
            </button>
          </div>

          {/* Destaque do Último Hook e CTA registrado */}
          {lastPostMarker && (lastPostMarker.hook || lastPostMarker.cta) && (
            <div className="p-1 px-1.5 rounded-md bg-muted/60 border border-border/80 text-[10px] space-y-0.5 truncate">
              {lastPostMarker.formato && (
                <span className="font-bold text-[9px] px-1 py-0.2 bg-primary/10 text-primary rounded mr-1 uppercase">
                  {lastPostMarker.formato}
                </span>
              )}
              {lastPostMarker.hook && (
                <span className="text-foreground font-medium">
                  <strong>Hook:</strong> "{lastPostMarker.hook}"
                </span>
              )}
              {lastPostMarker.cta && (
                <span className="text-muted-foreground ml-1">
                  • <strong>CTA:</strong> {lastPostMarker.cta}
                </span>
              )}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground truncate">
            {activeMediaChannel === "youtube" || activeMediaChannel === "tiktok" ? "Vídeos publicados" : "Posts realizados"} no período
          </div>
        </div>
      );
    }

    // Compatibilidade / Fallback para Seguidores
    if (
      card.id.includes("followers") ||
      card.id === "dist_followers" ||
      card.id === "dist_insta_followers" ||
      card.id === "dist_tiktok_followers" ||
      card.id === "dist_yt_followers"
    ) {
      if (mediaFilter === "all") {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex flex-col">
                <span className="text-2xl font-black font-mono tracking-tight text-primary leading-none">
                  +{allFollowers}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Total Geral (Todas as Redes)
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[9px] font-bold text-pink-600 border-pink-500/30">
                  📸 +{ig.followers}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-cyan-600 border-cyan-500/30">
                  🎵 +{tt.followers}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-red-600 border-red-500/30">
                  ▶️ +{yt.followers}
                </Badge>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Novos seguidores e inscritos somados
            </div>
          </div>
        );
      }

      const key = `${activeMediaChannel}_followers`;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-1.5 text-[10px] font-bold text-muted-foreground select-none pointer-events-none">+</span>
                <input
                  type="number"
                  placeholder="0"
                  value={varInputs[key] || ""}
                  onChange={(e) => setVarInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariable(activeMediaChannel, "followers");
                    }
                  }}
                  className="w-13 h-7 pl-4 pr-1 text-xs font-mono font-bold bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  title="Digite a quantidade e dê Enter para somar ao fixo registrado"
                />
                <button
                  type="button"
                  onClick={() => handleAddVariable(activeMediaChannel, "followers")}
                  disabled={!varInputs[key]}
                  className="ml-1 h-7 px-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none"
                  title="Somar ao registro fixo (ou dê Enter)"
                >
                  ↵
                </button>
              </div>

              <span className="text-muted-foreground/60 font-black text-xs select-none">—</span>

              <div className="flex flex-col shrink-0">
                <span className="text-xl font-black font-mono tracking-tight text-primary leading-none">
                  {formatFixoRegistrado(metrics.followers, true)}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Fixo Registrado
                </span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {activeMediaChannel === "youtube" ? "Inscritos conquistados" : "Ganhos de perfil"} ({metrics.period === "today" ? "Hoje" : metrics.period === "7d" ? "7 dias" : "30 dias"})
          </div>
        </div>
      );
    }

    // Views
    if (
      card.id.includes("views") ||
      card.id === "dist_views" ||
      card.id === "dist_insta_views" ||
      card.id === "dist_tiktok_views" ||
      card.id === "dist_yt_views"
    ) {
      if (mediaFilter === "all") {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex flex-col">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground leading-none">
                  {allViews.toLocaleString("pt-BR")}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Total Visualizações
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[9px] font-bold text-pink-600 border-pink-500/30">
                  📸 {ig.views.toLocaleString("pt-BR")}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-cyan-600 border-cyan-500/30">
                  🎵 {tt.views.toLocaleString("pt-BR")}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-red-600 border-red-500/30">
                  ▶️ {yt.views.toLocaleString("pt-BR")}
                </Badge>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Visualizações consolidadas em todas as plataformas
            </div>
          </div>
        );
      }

      const key = `${activeMediaChannel}_views`;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-1.5 text-[10px] font-bold text-muted-foreground select-none pointer-events-none">+</span>
                <input
                  type="number"
                  placeholder="0"
                  value={varInputs[key] || ""}
                  onChange={(e) => setVarInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariable(activeMediaChannel, "views");
                    }
                  }}
                  className="w-16 h-7 pl-4 pr-1 text-xs font-mono font-bold bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  title="Digite a quantidade e dê Enter para somar ao fixo registrado"
                />
                <button
                  type="button"
                  onClick={() => handleAddVariable(activeMediaChannel, "views")}
                  disabled={!varInputs[key]}
                  className="ml-1 h-7 px-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none"
                  title="Somar ao registro fixo (ou dê Enter)"
                >
                  ↵
                </button>
              </div>

              <span className="text-muted-foreground/60 font-black text-xs select-none">—</span>

              <div className="flex flex-col shrink-0">
                <span className="text-xl font-black font-mono tracking-tight text-foreground leading-none">
                  {formatFixoRegistrado(metrics.views)}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold leading-tight mt-0.5 whitespace-nowrap">
                  Fixo Registrado
                </span>
              </div>
            </div>

            {/* Ação de detalhes */}
            <button
              onClick={() => handleOpenUnitMarker(activeMediaChannel, "views", "Visualizações")}
              className="text-[9px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded-lg font-bold flex items-center gap-0.5 ml-auto"
              title="Registrar marcação completa de views"
            >
              <Eye className="h-2.5 w-2.5" />
              <span>Marcar</span>
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            Visualizações acumuladas
          </div>
        </div>
      );
    }

    // 3. CARDS DO FUNIL
    if (card.id === "funnel_pipeline" || card.id === "funnel_visual") {
      return (
        <div className="w-full">
          <ConnectedProgressiveFunnel compact={true} />
        </div>
      );
    }

    return (
      <div className="text-xs text-muted-foreground">
        Métrica operacional ativa.
      </div>
    );
  };

  // Blocos ativos a exibir (INFRA | DISTRIBUIÇÃO DE MÍDIA | FUNIL)
  const visibleBlocks = activeBlocks;

  return (
    <section className="px-6 py-2 space-y-3">
      {/* Barra Superior Compacta de Gestão do Cockpit */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h2 className="font-extrabold uppercase tracking-wider text-foreground text-[11px]">
            Cockpit Operacional
          </h2>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Gestão Modular 80/20
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
        {visibleBlocks.map((block) => {
          const isDraggingBlock = draggedBlockId === block.id;
          const isDragOverBlock = dragOverBlockId === block.id;

          // Identifica se é o bloco de distribuição
          const isMediaBlock = block.id === "dist_midia" || block.id.startsWith("dist_");
          const isWebinarBlock = block.id === "webinario";
          const blockChannel: "instagram" | "tiktok" | "youtube" =
            mediaFilter === "all" ? "instagram" : mediaFilter;

          const currentDistPeriod = distPeriods[mediaFilter] || distPeriods["instagram"] || "7d";

          // Cards do bloco (lidos diretamente do layout para permitir edição e persistência completa)
          const blockCards = (layout.cards || [])
            .filter((c) => c.blockId === block.id && !c.archived && !c.removed)
            .sort((a, b) => a.order - b.order);

          const finalBlockCards =
            blockCards.length > 0
              ? blockCards
              : isMediaBlock
              ? [
                  { id: "dist_reels", blockId: block.id, title: "▶️ Reels", order: 0 },
                  { id: "dist_carrossel", blockId: block.id, title: "🎠 Carrossel", order: 1 },
                  { id: "dist_stories", blockId: block.id, title: "👁️ Visualizações Stories", order: 2 },
                  { id: "dist_posts", blockId: block.id, title: "📸 Post", order: 3 },
                ]
              : isWebinarBlock
              ? [
                  { id: "webinar_invites", blockId: block.id, title: "Convites recebidos", order: 0 },
                  { id: "webinar_confirmed", blockId: block.id, title: "Confirmaram presença", order: 1 },
                  { id: "webinar_live", blockId: block.id, title: "Entraram ao vivo", order: 2 },
                  { id: "webinar_retention", blockId: block.id, title: "Até o final", order: 3 },
                  { id: "webinar_buyers", blockId: block.id, title: "Compraram", order: 4 },
                ]
              : [];

          return (
            <div
              key={block.id}
              draggable={canDragBlockId === block.id}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", block.id);
                e.dataTransfer.effectAllowed = "move";
                handleBlockDragStart(block.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverBlockId(block.id);
              }}
              onDragLeave={() => setDragOverBlockId(null)}
              onDrop={() => handleBlockDrop(block.id)}
              onDragEnd={() => {
                setDraggedBlockId(null);
                setDragOverBlockId(null);
                setCanDragBlockId(null);
              }}
              className={`rounded-2xl border bg-card/60 backdrop-blur-xs p-3 transition-all duration-200 ${
                isDraggingBlock ? "border-primary/50 ring-1 ring-primary/20" : ""
              } ${isDragOverBlock ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
            >
              {isMediaBlock ? (
                <SocialNetworksBlock
                  workspace={workspace}
                  mutate={mutate}
                  onOpenApiModal={(ch) =>
                    handleOpenApiModal((ch === "tiktok" || ch === "youtube" ? ch : "instagram") as any)
                  }
                  onOpenUnitMarkerModal={(ch) =>
                    handleOpenUnitMarker(
                      (ch === "tiktok" || ch === "youtube" ? ch : "instagram") as any,
                      "reels",
                      "Reels",
                      "Reels"
                    )
                  }
                  onMouseDownDragHandle={() => setCanDragBlockId(block.id)}
                  onMouseUpDragHandle={() => setCanDragBlockId(null)}
                />
              ) : (
                <>
                  {/* CABEÇALHO DO BLOCO */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div
                    data-block-handle="true"
                    onMouseDown={() => setCanDragBlockId(block.id)}
                    onMouseUp={() => setCanDragBlockId(null)}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground p-0.5 rounded"
                    title="Arraste pela alça para reordenar o bloco"
                  >
                    <GripVertical className="h-3.5 w-3.5 pointer-events-none" />
                  </div>

                  {/* Ícone específico do canal ou mídia geral */}
                  {isMediaBlock ? (
                    mediaFilter === "instagram" ? (
                      <Instagram className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
                    ) : mediaFilter === "tiktok" ? (
                      <Music className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    ) : mediaFilter === "youtube" ? (
                      <Youtube className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5 text-primary" />
                    )
                  ) : isWebinarBlock ? (
                    <Video className="h-3.5 w-3.5 text-primary" />
                  ) : null}

                  {inlineEditingBlockId === block.id ? (
                    <Input
                      value={inlineBlockTitle}
                      onChange={(e) => handleInlineBlockTitleChange(block.id, e.target.value)}
                      onBlur={() => handleCommitInlineBlockTitle(block.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitInlineBlockTitle(block.id);
                        if (e.key === "Escape") setInlineEditingBlockId(null);
                      }}
                      autoFocus
                      className="h-6 text-xs font-black uppercase tracking-wider bg-background border-primary text-foreground w-64"
                    />
                  ) : (
                    <h3
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setInlineEditingBlockId(block.id);
                        setInlineBlockTitle(block.title);
                      }}
                      className="text-xs font-black uppercase tracking-wider text-foreground cursor-pointer hover:text-primary transition-colors"
                      title="Dois cliques para renomear"
                    >
                      {isMediaBlock ? (block.title.includes("INSTAGRAM") || block.title.includes("TIKTOK") || block.title.includes("YOUTUBE") ? "DISTRIBUIÇÃO DE MÍDIA" : block.title) : block.title}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* SELETOR DE EDIÇÃO DO WEBINÁRIO (AJ-023) */}
                  {isWebinarBlock && (
                    <WebinarEditionSelector onOpenNewEdition={() => setIsNewWebinarEditionOpen(true)} />
                  )}

                  {/* FILTRO DE MÍDIA INTEGRADO NO CABEÇALHO DO BLOCO */}
                  {isMediaBlock && (
                    <div className="flex items-center p-0.5 rounded-xl bg-muted/80 border border-border text-[11px] gap-0.5">
                      <button
                        type="button"
                        onClick={() => setMediaFilter("all")}
                        className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          mediaFilter === "all"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Globe className="h-3 w-3 text-primary" />
                        <span>Todas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaFilter("instagram")}
                        className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          mediaFilter === "instagram"
                            ? "bg-background text-pink-600 dark:text-pink-400 shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Instagram className="h-3 w-3" />
                        <span>Instagram</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaFilter("tiktok")}
                        className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          mediaFilter === "tiktok"
                            ? "bg-background text-cyan-600 dark:text-cyan-400 shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Music className="h-3 w-3" />
                        <span>TikTok</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaFilter("youtube")}
                        className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          mediaFilter === "youtube"
                            ? "bg-background text-red-600 dark:text-red-400 shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Youtube className="h-3 w-3" />
                        <span>YouTube</span>
                      </button>
                    </div>
                  )}

                  {/* Se for bloco de distribuição: Conexão via API individual por rede & Filtro de período */}
                  {isMediaBlock && (
                    <>
                      {/* Botão de Conexão de API */}
                      {mediaFilter !== "all" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenApiModal(mediaFilter)}
                          className={`h-6 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                            workspace.mediaApiConfigs?.[mediaFilter]?.connected
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-muted/80 text-muted-foreground border-border hover:text-foreground"
                          }`}
                          title={`Configurar conexão de API de ${mediaFilter.toUpperCase()}`}
                        >
                          <Radio className={`h-2.5 w-2.5 ${workspace.mediaApiConfigs?.[mediaFilter]?.connected ? "text-emerald-500 animate-pulse" : ""}`} />
                          <span>
                            {workspace.mediaApiConfigs?.[mediaFilter]?.connected
                              ? `API ${mediaFilter === "instagram" ? "Meta" : mediaFilter.toUpperCase()} Conectada`
                              : `Conectar API ${mediaFilter === "instagram" ? "Meta" : mediaFilter.toUpperCase()}`}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenApiModal("instagram")}
                          className="h-6 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 border bg-muted/80 hover:bg-muted text-muted-foreground border-border hover:text-foreground transition-all"
                          title="Gerenciar conexão das APIs de todas as redes"
                        >
                          <Radio className="h-2.5 w-2.5 text-primary" />
                          <span>Conectar APIs</span>
                        </button>
                      )}

                      {/* Seletor de período */}
                      <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border text-[10px]">
                        {(["today", "7d", "30d"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              setDistPeriods((prev) => ({
                                ...prev,
                                [blockChannel]: p,
                                [mediaFilter]: p,
                                instagram: p,
                                tiktok: p,
                                youtube: p,
                              }))
                            }
                            className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                              currentDistPeriod === p
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
                          </button>
                        ))}
                      </div>
                    </>
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

                      {isMediaBlock && (
                        <DropdownMenuItem onClick={() => handleOpenApiModal(blockChannel)}>
                          <Key className="h-3.5 w-3.5 mr-2 text-primary" />
                          Configurar API ({blockChannel})
                        </DropdownMenuItem>
                      )}

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
                <div className="w-full">
                  <ConnectedProgressiveFunnel compact={true} />
                </div>
              ) : isWebinarBlock ? (
                <div className="w-full">
                  <WebinarBlock
                    block={block}
                    cards={finalBlockCards}
                    isNewEditionModalOpen={isNewWebinarEditionOpen}
                    onCloseNewEditionModal={() => setIsNewWebinarEditionOpen(false)}
                    onOpenNewEditionModal={() => setIsNewWebinarEditionOpen(true)}
                  />
                </div>
              ) : (
                <div
                  className={`grid gap-2.5 ${
                    block.id === "infra"
                      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                      : isMediaBlock
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                      : "grid-cols-1 sm:grid-cols-3"
                  }`}
                >
                  {finalBlockCards.map((card) => {
                    const isDraggingCard = draggedCardId === card.id;
                    const isDragOverCard = dragOverCardId === card.id;

                    return (
                      <div
                        key={card.id}
                        draggable={canDragCardId === card.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", card.id);
                          e.dataTransfer.effectAllowed = "move";
                          handleCardDragStart(card.id);
                        }}
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
                        onDragEnd={() => {
                          setDraggedCardId(null);
                          setDragOverCardId(null);
                          setCanDragCardId(null);
                        }}
                        className={`rounded-xl border p-2.5 bg-card flex flex-col justify-between transition-all duration-150 relative group ${
                          isDraggingCard ? "border-primary/50 ring-1 ring-primary/20" : ""
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
                              data-card-handle="true"
                              onMouseDown={() => setCanDragCardId(card.id)}
                              onMouseUp={() => setCanDragCardId(null)}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground p-0.5 rounded"
                              title="Arraste pela alça para mover o card"
                            >
                              <GripVertical className="h-3 w-3 pointer-events-none" />
                            </span>

                            {inlineEditingCardId === card.id ? (
                              <Input
                                value={inlineCardTitle}
                                onChange={(e) => handleInlineCardTitleChange(card.id, e.target.value)}
                                onBlur={() => handleCommitInlineCardTitle(card.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCommitInlineCardTitle(card.id);
                                  if (e.key === "Escape") setInlineEditingCardId(null);
                                }}
                                autoFocus
                                className="h-5 text-[11px] font-bold uppercase tracking-tight bg-background border-primary text-foreground w-full"
                              />
                            ) : (
                              <span
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setInlineEditingCardId(card.id);
                                  setInlineCardTitle(card.title);
                                }}
                                className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight truncate cursor-pointer hover:text-primary transition-colors"
                                title="Dois cliques para renomear"
                              >
                                {card.title}
                              </span>
                            )}
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
                        {renderCardContent(card, block.id)}
                      </div>
                    );
                  })}
                </div>
              )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: MARCAR HOOK - CORPO - CTA - FORMATO & UNIDADES */}
      <Dialog
        open={!!unitMarkerModal?.open}
        onOpenChange={(open) => !open && setUnitMarkerModal(null)}
      >
        <DialogContent className="max-w-md p-5 rounded-2xl bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-primary" />
                <span>Marcar Conteúdo & Unidade</span>
              </div>
              <Badge variant="outline" className="font-bold text-[10px] uppercase">
                {unitMarkerModal?.channel}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs max-h-[72vh] overflow-y-auto pr-1">
            {/* Formato: Campo em aberto para preencher livremente */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-foreground">Formato da Publicação</label>
                <span className="text-[10px] text-muted-foreground">Em aberto</span>
              </div>
              <Input
                value={markerFormatoInput}
                onChange={(e) => setMarkerFormatoInput(e.target.value)}
                placeholder="Ex: Reels, Carrossel, Shorts, Vídeo longo, Stories, Live, etc."
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                autoFocus
              />
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className="text-[9px] text-muted-foreground uppercase font-bold">Sugestões:</span>
                {["Reels", "Carrossel", "Shorts", "Vídeo", "Stories", "Post Estático"].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setMarkerFormatoInput(sug)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Hook */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-foreground">Hook (Gancho)</label>
                <span className="text-[10px] text-muted-foreground">Primeiros 3 segundos / Headline</span>
              </div>
              <Input
                value={markerHookInput}
                onChange={(e) => setMarkerHookInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmUnitMarker();
                  }
                }}
                placeholder="Ex: 3 erros que você comete todo dia no WhatsApp..."
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
              />
            </div>

            {/* Corpo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-foreground">Corpo (Conteúdo / Roteiro)</label>
                <span className="text-[10px] text-muted-foreground">Desenvolvimento</span>
              </div>
              <textarea
                value={markerCorpoInput}
                onChange={(e) => setMarkerCorpoInput(e.target.value)}
                rows={2}
                placeholder="Ex: Explicar o gargalo no funil de vendas e como o método 7D qualifica o lead antes da ligação..."
                className="w-full text-xs bg-background border border-input rounded-xl p-2 text-foreground focus:ring-1 focus:ring-primary outline-hidden resize-none"
              />
            </div>

            {/* CTA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-foreground">CTA (Chamada para Ação)</label>
                <span className="text-[10px] text-muted-foreground">Chamada final</span>
              </div>
              <Input
                value={markerCtaInput}
                onChange={(e) => setMarkerCtaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmUnitMarker();
                  }
                }}
                placeholder="Ex: Digite QUALIFY nos comentários para receber o script completo"
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
              />
            </div>

            {/* Quantidade (apenas se for Views ou Stories). Para posts e publicações, 'quantidade seguidor' é REMOVIDA conforme solicitado */}
            {unitMarkerModal?.metric === "views" || unitMarkerModal?.metric === "stories" ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    {unitMarkerModal?.metric === "stories" ? "Visualizações / Quantidade" : "Quantidade de Visualizações"}
                  </label>
                  <Input
                    type="number"
                    value={markerAmountInput}
                    onChange={(e) => setMarkerAmountInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmUnitMarker();
                      }
                    }}
                    placeholder="Ex: 1000"
                    className="h-8 text-xs bg-background border-input text-foreground rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Data da Marcação
                  </label>
                  <Input
                    type="date"
                    value={markerDateInput}
                    onChange={(e) => setMarkerDateInput(e.target.value)}
                    className="h-8 text-xs bg-background border-input text-foreground rounded-xl font-mono"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  Data da Publicação
                </label>
                <Input
                  type="date"
                  value={markerDateInput}
                  onChange={(e) => setMarkerDateInput(e.target.value)}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl font-mono"
                />
              </div>
            )}

            {/* Nota / Campanha */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                Nota / Campanha (Opcional)
              </label>
              <Input
                value={markerNoteInput}
                onChange={(e) => setMarkerNoteInput(e.target.value)}
                placeholder="Ex: Reels viral de lançamento"
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
              />
            </div>

            {/* Histórico das marcações registradas */}
            {unitMarkerModal && (
              <div className="pt-2 border-t border-border/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Marcações Registradas ({workspace.mediaDistribution?.[unitMarkerModal.channel]?.unitMarkers?.length || 0})</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {(!workspace.mediaDistribution?.[unitMarkerModal.channel]?.unitMarkers ||
                    workspace.mediaDistribution[unitMarkerModal.channel]?.unitMarkers!.length === 0) ? (
                    <div className="text-[11px] text-muted-foreground italic py-1">
                      Nenhuma marcação gravada ainda.
                    </div>
                  ) : (
                    workspace.mediaDistribution[unitMarkerModal.channel]!.unitMarkers!.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded-xl bg-muted/40 border border-border/60 flex items-start justify-between gap-2 text-[11px]"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-primary">
                              {m.amount > 0 ? `+${m.amount}` : m.amount} {m.metric}
                            </span>
                            {m.formato && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold uppercase">
                                {m.formato}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {m.date}
                            </span>
                          </div>
                          {m.hook && (
                            <div className="text-foreground font-medium truncate">
                              <strong>Hook:</strong> {m.hook}
                            </div>
                          )}
                          {m.cta && (
                            <div className="text-muted-foreground truncate">
                              <strong>CTA:</strong> {m.cta}
                            </div>
                          )}
                          {m.corpo && (
                            <div className="text-muted-foreground text-[10px] line-clamp-1">
                              <strong>Corpo:</strong> {m.corpo}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteUnitMarker(unitMarkerModal.channel, m.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors shrink-0"
                          title="Excluir marcação"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnitMarkerModal(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmUnitMarker}
              className="text-xs bg-primary text-primary-foreground rounded-xl font-bold gap-1"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Confirmar Registro</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CONFIGURAÇÃO DE INTEGRAÇÃO DE API (FACEBOOK / INSTAGRAM / TIKTOK / YOUTUBE) */}
      <Dialog
        open={!!apiModalChannel}
        onOpenChange={(open) => !open && setApiModalChannel(null)}
      >
        <DialogContent className="max-w-md p-6 rounded-3xl bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <span>Integração de API — {apiModalChannel?.toUpperCase()}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            {/* Seletor de Rede Social na API */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => handleSwitchApiModalChannel("instagram")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  apiModalChannel === "instagram"
                    ? "bg-background text-pink-600 dark:text-pink-400 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Instagram className="h-3.5 w-3.5" />
                <span>Instagram</span>
                {workspace.mediaApiConfigs?.instagram?.connected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchApiModalChannel("tiktok")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  apiModalChannel === "tiktok"
                    ? "bg-background text-cyan-600 dark:text-cyan-400 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Music className="h-3.5 w-3.5" />
                <span>TikTok</span>
                {workspace.mediaApiConfigs?.tiktok?.connected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchApiModalChannel("youtube")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  apiModalChannel === "youtube"
                    ? "bg-background text-red-600 dark:text-red-400 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Youtube className="h-3.5 w-3.5" />
                <span>YouTube</span>
                {workspace.mediaApiConfigs?.youtube?.connected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" />
                )}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Conecte sua conta via API do Facebook / Instagram Graph API (Meta), TikTok for Developers ou YouTube Data API para puxar métricas de seguidores, alcance e publicações de forma integrada.
            </p>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                ID da Página ou Perfil (@handle)
              </label>
              <Input
                value={apiPageIdInput}
                onChange={(e) => setApiPageIdInput(e.target.value)}
                placeholder="Ex: 1029384756 ou @qualify.app"
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                Token de Acesso / API Key
              </label>
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Cole o token de acesso da API aqui"
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl font-mono"
              />
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground block">Status da Conexão</span>
                <span className="text-[10px] text-muted-foreground">
                  {apiModalChannel && workspace.mediaApiConfigs?.[apiModalChannel]?.lastSyncedAt
                    ? `Última sincronização: ${workspace.mediaApiConfigs[apiModalChannel]!.lastSyncedAt}`
                    : "Nenhuma sincronização recente registrada"}
                </span>
              </div>
              <Button
                size="sm"
                variant={apiConnectedInput ? "default" : "outline"}
                onClick={() => setApiConnectedInput(!apiConnectedInput)}
                className="h-7 text-xs rounded-xl"
              >
                {apiConnectedInput ? "Conectado" : "Desconectado"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              size="sm"
              variant="outline"
              disabled={isSyncingApi}
              onClick={() => apiModalChannel && handleSyncApi(apiModalChannel)}
              className="text-xs rounded-xl gap-1 text-primary border-primary/40 hover:bg-primary/10"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncingApi ? "animate-spin" : ""}`} />
              <span>{isSyncingApi ? "Sincronizando..." : "Puxar Dados via API"}</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setApiModalChannel(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveApiConfig}
                className="text-xs bg-primary text-primary-foreground rounded-xl font-bold"
              >
                Salvar Configuração
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
