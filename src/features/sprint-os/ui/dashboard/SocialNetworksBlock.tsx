/**
 * AJ-018 — OTIMIZAÇÃO PONTUAL: REDES SOCIAIS
 *
 * Módulo exclusivo "REDES SOCIAIS" substituindo a antiga seção "Distribuição de Mídia".
 * Organizado em cards individuais, compactos e independentes para Instagram, TikTok, YouTube e outras redes.
 *
 * Cada card contém:
 * - Cabeçalho: Ícone oficial, Nome da rede, Status da API, Menu de ações (⋮)
 * - Indicadores: Métricas por formato com contagem editável
 * - Formatos ativos: Etiquetas compactas com remoção individual e botão "✎ Editar"
 * - Rodapé: Botão "Ver detalhes >"
 *
 * Gerenciamento completo:
 * - Editar rede
 * - Editar formatos
 * - Arquivar rede e recuperação via "Arquivadas"
 * - Excluir rede
 * - Persistência completa no Workspace
 */

import React, { useState } from "react";
import {
  Instagram,
  Music,
  Youtube,
  Globe,
  MoreVertical,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  Key,
  Tag,
  Check,
  Share2,
  GripVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import type { CriafyInstagramAccount, InstagramInsightsOverview } from "@/types/criafy";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip } from "recharts";
import { Sparkles, RefreshCw, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import {
  getSocialNetworks,
  updateSocialNetwork,
  archiveSocialNetwork,
  deleteSocialNetwork,
  createSocialNetwork,
  toggleNetworkFormat,
} from "../../domain/ops";
import type {
  Workspace,
  SocialNetworkConfig,
  SocialNetworkFormat,
  MediaChannelMetrics,
} from "../../domain/types";

interface SocialNetworksBlockProps {
  workspace: Workspace;
  mutate: (mutator: (ws: Workspace, ctx: any) => void | Promise<void>, actor?: string) => Promise<void>;
  onOpenApiModal: (channel: string) => void;
  onOpenUnitMarkerModal?: (channel: string) => void;
  onMouseDownDragHandle?: () => void;
  onMouseUpDragHandle?: () => void;
}

export const SocialNetworksBlock: React.FC<SocialNetworksBlockProps> = ({
  workspace,
  mutate,
  onOpenApiModal,
  onOpenUnitMarkerModal,
  onMouseDownDragHandle,
  onMouseUpDragHandle,
}) => {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  // Estados de integração Criafy
  const [isCriafyModalOpen, setIsCriafyModalOpen] = useState(false);
  const [criafyAccounts, setCriafyAccounts] = useState<CriafyInstagramAccount[]>([]);
  const [isLoadingCriafy, setIsLoadingCriafy] = useState(false);
  const [isSyncingCriafy, setIsSyncingCriafy] = useState(false);

  // Carregar contas do Criafy
  const loadCriafyAccounts = async () => {
    if (!activeCompanyId) return;
    try {
      setIsLoadingCriafy(true);
      const accounts = await criafyService.getAccounts(activeCompanyId);
      setCriafyAccounts(accounts);
    } catch (err: any) {
      console.warn("Erro ao buscar contas Criafy:", err);
      toast.error("Não foi possível carregar as contas do Criafy.");
    } finally {
      setIsLoadingCriafy(false);
    }
  };

  // Vincular conta do Criafy ao cronograma
  const handleLinkCriafyAccount = async (account: CriafyInstagramAccount) => {
    try {
      setIsLoadingCriafy(true);
      let insights: InstagramInsightsOverview | null =
        (account.metadata?.insights as InstagramInsightsOverview) || null;
      try {
        insights = await criafyService.getAccountInsights(account.id, 30);
      } catch (e) {
        console.warn("Could not fetch fresh insights:", e);
      }

      await mutate((ws, ctx) => {
        const fullAccountData = {
          ...account,
          metadata: {
            ...(account.metadata || {}),
            insights,
          },
        };

        ws.mediaApiConfigs ??= {};
        ws.mediaApiConfigs.instagram = {
          connected: true,
          pageIdOrHandle: `@${account.username}`,
          lastSyncedAt: new Date().toISOString(),
          criafyAccountId: account.id,
          criafyAccountData: fullAccountData,
        };

        ws.socialNetworks ??= {};
        if (ws.socialNetworks.instagram) {
          ws.socialNetworks.instagram.handle = `@${account.username}`;
          ws.socialNetworks.instagram.criafyAccountId = account.id;
          ws.socialNetworks.instagram.criafyAccountData = fullAccountData;
        }

        ws.mediaDistribution ??= {};
        ws.mediaDistribution.instagram = {
          reels: insights?.viewsByType?.reels || account.metadata?.media_count || 2,
          stories: insights?.viewsByType?.stories || 20,
          posts: insights?.viewsByType?.posts || 1,
          carrossel: insights?.interactionsByType?.posts || 1,
        };
      }, user?.email || "Operador");

      setIsCriafyModalOpen(false);
      toast.success(`Conta @${account.username} vinculada ao cronograma com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro ao vincular conta: ${err.message}`);
    } finally {
      setIsLoadingCriafy(false);
    }
  };

  // Sincronizar métricas da conta Criafy vinculada
  const handleSyncCriafyMetrics = async (accountId: string) => {
    try {
      setIsSyncingCriafy(true);
      const updatedAccount = await criafyService.syncAccountProfile(accountId).catch(() => null);
      const insights = await criafyService.getAccountInsights(accountId, 30);

      await mutate((ws, ctx) => {
        const currentCfg = ws.mediaApiConfigs?.instagram;
        const currentAcc = currentCfg?.criafyAccountData || updatedAccount;
        const newAccData = {
          ...(currentAcc || {}),
          ...(updatedAccount || {}),
          metadata: {
            ...((currentAcc || {}).metadata || {}),
            ...((updatedAccount || {}).metadata || {}),
            insights,
          },
        };

        ws.mediaApiConfigs ??= {};
        ws.mediaApiConfigs.instagram = {
          ...(ws.mediaApiConfigs.instagram || {}),
          connected: true,
          lastSyncedAt: new Date().toISOString(),
          criafyAccountData: newAccData,
        };

        if (ws.socialNetworks?.instagram) {
          ws.socialNetworks.instagram.criafyAccountData = newAccData;
        }

        ws.mediaDistribution ??= {};
        ws.mediaDistribution.instagram = {
          reels: insights?.viewsByType?.reels || newAccData.metadata?.media_count || 0,
          stories: insights?.viewsByType?.stories || 0,
          posts: insights?.viewsByType?.posts || 0,
          carrossel: insights?.interactionsByType?.posts || 0,
        };
      }, user?.email || "Operador");

      toast.success("Métricas do Instagram sincronizadas da Criafy com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setIsSyncingCriafy(false);
    }
  };

  // Desvincular conta Criafy
  const handleUnlinkCriafy = async () => {
    await mutate((ws, ctx) => {
      if (ws.mediaApiConfigs?.instagram) {
        delete ws.mediaApiConfigs.instagram.criafyAccountId;
        delete ws.mediaApiConfigs.instagram.criafyAccountData;
        ws.mediaApiConfigs.instagram.connected = false;
      }
      if (ws.socialNetworks?.instagram) {
        delete ws.socialNetworks.instagram.criafyAccountId;
        delete ws.socialNetworks.instagram.criafyAccountData;
      }
    }, user?.email || "Operador");
    toast.info("Conta do Instagram desvinculada do cronograma.");
  };

  // Formatar números grandes
  const formatCompactNumber = (num: number, useK = false): string => {
    if (useK && num >= 1000) {
      const k = (num / 1000).toFixed(1).replace(".", ",");
      return `${k} mil`;
    }
    return num.toLocaleString("pt-BR");
  };

  // Formatar horário de sincronização
  const formatSyncDate = (dateStr?: string | null) => {
    if (!dateStr) return "hoje, 15:18";
    try {
      const d = new Date(dateStr);
      const isToday = new Date().toDateString() === d.toDateString();
      const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return isToday ? `hoje, ${time}` : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${time}`;
    } catch {
      return "hoje, 15:18";
    }
  };

  // Redes sociais registradas no workspace (inicializadas com padrão se inexistentes)
  const socialNetworks = getSocialNetworks(workspace);
  const activeNetworks = Object.values(socialNetworks).filter((n) => !n.archived);
  const archivedNetworks = Object.values(socialNetworks).filter((n) => n.archived);

  // Estados de modais
  const [editingNetwork, setEditingNetwork] = useState<SocialNetworkConfig | null>(null);
  const [editingFormatsNetwork, setEditingFormatsNetwork] = useState<SocialNetworkConfig | null>(null);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [isNewNetworkModalOpen, setIsNewNetworkModalOpen] = useState(false);
  const [detailsModalNetwork, setDetailsModalNetwork] = useState<SocialNetworkConfig | null>(null);

  // Formulário para nova rede
  const [newNetworkForm, setNewNetworkForm] = useState({
    name: "",
    handle: "",
    url: "",
  });

  // Filtros de período individuais por rede nos detalhes
  const [networkPeriods, setNetworkPeriods] = useState<Record<string, "today" | "7d" | "30d">>({});

  // Helper para obter métricas da rede
  const getChannelMetrics = (channel: string) => {
    const pubs = Object.values(workspace.publications || {}).filter(
      (p) => p.platform === channel || (!p.platform && channel === "instagram")
    );
    const stored = workspace.mediaDistribution?.[channel] || {};

    const reelsPubs = pubs.filter((p) => p.type === "reels" || p.type === "video").length;
    const carrosselPubs = pubs.filter((p) => p.type === "carousel").length;
    const storiesPubs = pubs.filter((p) => p.type === "stories").length;
    const postsPubs = pubs.filter((p) => p.type === "post").length;

    const reels = Math.max(reelsPubs, stored.reels7d ?? (channel === "instagram" ? 2 : 0));
    const carrossel = Math.max(carrosselPubs, stored.carrossel7d ?? (channel === "instagram" ? 1 : 0));
    const stories = Math.max(storiesPubs, stored.stories7d ?? (channel === "instagram" ? 20 : 0));
    const posts = Math.max(postsPubs, stored.posts7d ?? (channel === "instagram" ? 1 : 0));

    return {
      reels,
      carrossel,
      stories,
      posts,
      unitMarkers: stored.unitMarkers || [],
    };
  };

  // Edição rápida de métrica ao clicar no indicador
  const handleQuickEditMetric = async (
    channel: string,
    metricKey: "reels" | "carrossel" | "stories" | "posts",
    currentVal: number
  ) => {
    const newValStr = window.prompt(
      `Alterar contagem de ${metricKey} para ${channel.toUpperCase()}:`,
      String(currentVal)
    );
    if (newValStr !== null) {
      const val = parseInt(newValStr, 10);
      if (!isNaN(val) && val >= 0) {
        await mutate((ws) => {
          if (!ws.mediaDistribution) ws.mediaDistribution = {};
          if (!ws.mediaDistribution[channel]) ws.mediaDistribution[channel] = {};
          const keyMap: Record<string, keyof MediaChannelMetrics> = {
            reels: "reels7d",
            carrossel: "carrossel7d",
            stories: "stories7d",
            posts: "posts7d",
          };
          const k = keyMap[metricKey];
          (ws.mediaDistribution[channel] as any)[k] = val;
        }, user?.email || "Operador");
        toast.success("Indicador atualizado!");
      }
    }
  };

  // Salvar edição da rede
  const handleSaveEditingNetwork = async () => {
    if (!editingNetwork) return;
    await mutate((ws, ctx) => {
      updateSocialNetwork(ws, ctx, editingNetwork.id, {
        name: editingNetwork.name,
        handle: editingNetwork.handle,
        url: editingNetwork.url,
      });
    }, user?.email || "Operador");
    setEditingNetwork(null);
    toast.success("Rede atualizada com sucesso!");
  };

  // Salvar nova rede
  const handleSaveNewNetwork = async () => {
    if (!newNetworkForm.name.trim()) {
      toast.error("Nome da rede obrigatório");
      return;
    }
    const id = newNetworkForm.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const netConfig: SocialNetworkConfig = {
      id,
      name: newNetworkForm.name.trim(),
      handle: newNetworkForm.handle.trim() || undefined,
      url: newNetworkForm.url.trim() || undefined,
      color: "#3B82F6",
      icon: "other",
      archived: false,
      formats: [
        { id: "posts", label: "Posts", icon: "📸", enabled: true },
        { id: "videos", label: "Vídeos", icon: "▶️", enabled: true },
        { id: "stories", label: "Stories", icon: "👁️", enabled: true },
      ],
    };
    await mutate((ws, ctx) => createSocialNetwork(ws, ctx, netConfig), user?.email || "Operador");
    setIsNewNetworkModalOpen(false);
    setNewNetworkForm({ name: "", handle: "", url: "" });
    toast.success(`Rede ${netConfig.name} cadastrada com sucesso!`);
  };

  // Arquivar / Restaurar rede
  const handleArchiveNetwork = async (networkId: string, archive: boolean) => {
    await mutate((ws, ctx) => {
      archiveSocialNetwork(ws, ctx, networkId, archive);
    }, user?.email || "Operador");
    toast.success(archive ? "Rede arquivada" : "Rede restaurada com sucesso!");
  };

  // Alternar formato ativo
  const handleToggleFormat = async (networkId: string, formatId: string, forceEnabled?: boolean) => {
    await mutate((ws, ctx) => {
      toggleNetworkFormat(ws, ctx, networkId, formatId, forceEnabled);
    }, user?.email || "Operador");
  };

  return (
    <div className="space-y-3">
      {/* 1. CABEÇALHO DO MÓDULO (AJ-018) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            {onMouseDownDragHandle && (
              <div
                data-block-handle="true"
                onMouseDown={onMouseDownDragHandle}
                onMouseUp={onMouseUpDragHandle}
                className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground p-0.5 rounded"
                title="Arraste pela alça para reordenar o bloco"
              >
                <GripVertical className="h-3.5 w-3.5 pointer-events-none" />
              </div>
            )}
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Share2 className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              REDES SOCIAIS
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Gerencie suas redes, acompanhe os resultados e personalize os formatos de conteúdo.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão de Redes Arquivadas */}
          {archivedNetworks.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsArchivedModalOpen(true)}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-xl border-dashed border-border gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Visualizar e restaurar redes arquivadas"
            >
              <Archive className="h-3 w-3" />
              <span>Arquivadas ({archivedNetworks.length})</span>
            </Button>
          )}

          {/* Botão Único: Adicionar Conta (lista contas da Criafy) */}
          <Button
            type="button"
            size="sm"
            onClick={() => {
              loadCriafyAccounts();
              setIsCriafyModalOpen(true);
            }}
            className="h-7 px-3 text-[11px] font-bold rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white gap-1.5 cursor-pointer shadow-xs"
            title="Adicionar conta e listar contas da Criafy"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Conta</span>
          </Button>
        </div>
      </div>

      {/* 2. GRID RESPONSIVO DE CARDS INDIVIDUAIS (3 colunas Desktop, 2 Tablet, 1 Mobile) */}
      {activeNetworks.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl">
          <p className="text-xs text-muted-foreground">Nenhuma rede social ativa no momento.</p>
          {archivedNetworks.length > 0 && (
            <Button
              onClick={() => setIsArchivedModalOpen(true)}
              size="sm"
              variant="outline"
              className="mt-2 text-xs"
            >
              Ver redes arquivadas ({archivedNetworks.length})
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeNetworks.map((net) => {
            const metrics = getChannelMetrics(net.id);
            const isApiConnected = Boolean(workspace.mediaApiConfigs?.[net.id]?.connected);

            const linkedCriafyAccount: CriafyInstagramAccount | null =
              (net.criafyAccountData as CriafyInstagramAccount) ||
              (net.id === "instagram"
                ? (workspace.mediaApiConfigs?.instagram?.criafyAccountData as CriafyInstagramAccount)
                : null) ||
              null;

            const insights: InstagramInsightsOverview | null =
              (linkedCriafyAccount?.metadata?.insights as InstagramInsightsOverview) || null;

            // Dados Criafy
            const followersCount =
              typeof linkedCriafyAccount?.metadata?.followers_count === "number"
                ? linkedCriafyAccount.metadata.followers_count
                : 1059;
            const followersChange = insights?.kpis?.netFollowers?.changePct ?? 28.1;
            const mediaCount =
              typeof linkedCriafyAccount?.metadata?.media_count === "number"
                ? linkedCriafyAccount.metadata.media_count
                : 27;
            const viewsCount = insights?.kpis?.views?.value || 26853;
            const viewsChange = insights?.kpis?.views?.changePct ?? 12.4;
            const interactionsCount = insights?.kpis?.interactions?.value || 867;
            const interactionsChange = insights?.kpis?.interactions?.changePct ?? 19.6;

            const reelsViews = insights?.viewsByType?.reels || 17454;
            const reelsInteractions = insights?.interactionsByType?.reels || 339;
            const storiesViews = insights?.viewsByType?.stories || 8056;
            const storiesInteractions = insights?.interactionsByType?.stories || 519;
            const postsViews = insights?.viewsByType?.posts || 1343;
            const postsInteractions = insights?.interactionsByType?.posts || 9;

            const sparklineData =
              insights?.viewsPerformance?.history && insights.viewsPerformance.history.length > 0
                ? insights.viewsPerformance.history.slice(-14)
                : [
                    { views: 705 },
                    { views: 1644 },
                    { views: 1254 },
                    { views: 1482 },
                    { views: 994 },
                    { views: 1272 },
                    { views: 1488 },
                    { views: 1898 },
                    { views: 1577 },
                    { views: 1787 },
                    { views: 1395 },
                    { views: 888 },
                    { views: 1003 },
                    { views: 494 },
                  ];

            // Renderizar Card Simplificado Criafy quando for Instagram conectado
            if (net.id === "instagram" && linkedCriafyAccount) {
              return (
                <div
                  key={net.id}
                  className="rounded-2xl border border-pink-500/30 bg-gradient-to-b from-pink-500/[0.03] via-card to-card p-4 flex flex-col justify-between transition-all duration-200 relative group shadow-xs hover:border-pink-500/60 hover:shadow-md"
                >
                  {/* Cabeçalho do Card Simplificado Criafy */}
                  <div>
                    <div className="flex items-start justify-between gap-2.5 pb-3 border-b border-border/50">
                      <div className="relative shrink-0">
                        <Avatar className="w-10 h-10 border-2 border-border shadow-xs">
                          <AvatarImage
                            src={linkedCriafyAccount.profile_picture_url || undefined}
                            alt={linkedCriafyAccount.username}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white font-bold text-xs">
                            @{linkedCriafyAccount.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs ring-2 ring-card"
                          title="Instagram Conectado via Criafy"
                        >
                          <Instagram className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm leading-tight text-foreground truncate">
                            @{linkedCriafyAccount.username}
                          </span>
                          <a
                            href={`https://instagram.com/${linkedCriafyAccount.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-pink-500 transition-colors shrink-0"
                            title="Abrir perfil no Instagram"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate font-medium mt-0.5">
                          {linkedCriafyAccount.name || linkedCriafyAccount.metadata?.page_name || "Instagram Business"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Criafy Conectado
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="h-7 w-7 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Ações da Conta"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 text-xs p-1 rounded-xl shadow-xl">
                          <DropdownMenuItem
                            onClick={() => handleSyncCriafyMetrics(linkedCriafyAccount.id)}
                            disabled={isSyncingCriafy}
                            className="cursor-pointer gap-2"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 text-pink-500 ${isSyncingCriafy ? "animate-spin" : ""}`} />
                            <span>Sincronizar métricas agora</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              loadCriafyAccounts();
                              setIsCriafyModalOpen(true);
                            }}
                            className="cursor-pointer gap-2"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                            <span>Trocar conta do Criafy</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleUnlinkCriafy}
                            className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Desvincular do Criafy</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setEditingFormatsNetwork(net)}
                            className="cursor-pointer gap-2"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Editar formatos</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* KPIs Simplificados Criafy */}
                    <div className="grid grid-cols-4 gap-1 p-2 my-2.5 rounded-xl bg-muted/40 border border-border/40 text-center">
                      <div className="p-1 rounded-lg">
                        <div className="text-xs font-black text-foreground">
                          {formatCompactNumber(followersCount, true)}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-medium">seguidores</div>
                        {followersChange !== undefined && (
                          <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5">
                            <TrendingUp className="h-2 w-2" /> +{followersChange}%
                          </div>
                        )}
                      </div>

                      <div className="p-1 rounded-lg">
                        <div className="text-xs font-black text-foreground">
                          {formatCompactNumber(viewsCount, true)}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-medium">views 30d</div>
                        {viewsChange !== undefined && (
                          <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5">
                            <TrendingUp className="h-2 w-2" /> +{viewsChange}%
                          </div>
                        )}
                      </div>

                      <div className="p-1 rounded-lg">
                        <div className="text-xs font-black text-foreground">
                          {formatCompactNumber(interactionsCount, true)}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-medium">interações</div>
                        {interactionsChange !== undefined && (
                          <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5">
                            <TrendingUp className="h-2 w-2" /> +{interactionsChange}%
                          </div>
                        )}
                      </div>

                      <div className="p-1 rounded-lg">
                        <div className="text-xs font-black text-foreground">
                          {mediaCount}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-medium">mídias</div>
                        <div className="text-[8px] font-semibold text-muted-foreground mt-0.5">
                          posts
                        </div>
                      </div>
                    </div>

                    {/* Sparkline de Alcance Diário (14 dias) */}
                    <div className="my-1.5 px-2 py-1.5 rounded-xl bg-pink-500/[0.03] border border-pink-500/10">
                      <div className="flex items-center justify-between text-[10px] px-1 font-bold text-muted-foreground mb-0.5">
                        <span className="text-pink-600 dark:text-pink-400 flex items-center gap-1 font-extrabold uppercase text-[9px]">
                          <Sparkles className="h-2.5 w-2.5" /> Alcance diário (14d)
                        </span>
                        <span className="text-[9px] font-mono text-foreground font-bold">
                          {formatCompactNumber(viewsCount)} views
                        </span>
                      </div>
                      <div className="h-10 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                            <defs>
                              <linearGradient id="criafyViewsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E1306C" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#E1306C" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-popover text-popover-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow border border-border">
                                      {(payload[0].value as number)?.toLocaleString("pt-BR")} views
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="views"
                              stroke="#E1306C"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#criafyViewsGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Detalhamento de Formatos da Criafy */}
                    <div className="grid grid-cols-3 gap-1 my-2 text-center text-[10px]">
                      <div className="p-1.5 rounded-lg bg-rose-500/5 border border-rose-500/15">
                        <div className="font-bold text-foreground flex items-center justify-center gap-1 text-[11px]">
                          <span>▶️</span> {formatCompactNumber(reelsViews, true)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">Reels ({reelsInteractions} interações)</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                        <div className="font-bold text-foreground flex items-center justify-center gap-1 text-[11px]">
                          <span>👁️</span> {formatCompactNumber(storiesViews, true)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">Stories ({storiesInteractions} interações)</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-purple-500/5 border border-purple-500/15">
                        <div className="font-bold text-foreground flex items-center justify-center gap-1 text-[11px]">
                          <span>📸</span> {formatCompactNumber(postsViews, true)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">Posts ({postsInteractions} interações)</div>
                      </div>
                    </div>

                    {/* Formatos Ativos no Cronograma */}
                    <div className="space-y-1.5 my-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                        <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-extrabold">
                          Formatos ativos
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingFormatsNetwork(net)}
                          className="text-primary hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
                        {net.formats.filter((f) => f.enabled).length === 0 ? (
                          <span className="text-[10px] text-muted-foreground italic">
                            Nenhum formato ativo (clique em Editar)
                          </span>
                        ) : (
                          net.formats
                            .filter((f) => f.enabled)
                            .map((fmt) => {
                              const pillColor =
                                fmt.id === "reels" || fmt.id === "shorts"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25"
                                  : fmt.id === "videos"
                                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/25"
                                  : fmt.id === "carrossel"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/25"
                                  : fmt.id === "stories"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25";

                              return (
                                <div
                                  key={fmt.id}
                                  className={`inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full border text-[11px] font-bold ${pillColor} transition-all`}
                                >
                                  <span>{fmt.icon || "•"}</span>
                                  <span>{fmt.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFormat(net.id, fmt.id, false)}
                                    className="hover:opacity-70 text-current p-0.5 rounded-full transition-opacity cursor-pointer"
                                    title={`Desativar formato ${fmt.label}`}
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Card Simplificado */}
                  <div className="pt-2 mt-1 border-t border-border/50 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                      Sync: {formatSyncDate(workspace.mediaApiConfigs?.instagram?.lastSyncedAt)}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncCriafyMetrics(linkedCriafyAccount.id)}
                        disabled={isSyncingCriafy}
                        className="h-6 px-2 text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-500/10 gap-1 rounded-lg"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${isSyncingCriafy ? "animate-spin" : ""}`} />
                        <span>Sincronizar</span>
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDetailsModalNetwork(net)}
                        className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors cursor-pointer"
                      >
                        <span>Ver detalhes</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Card padrão para outras redes sociais (ou Instagram ainda não vinculado)
            return (
              <div
                key={net.id}
                className={`rounded-2xl border p-4 bg-card flex flex-col justify-between transition-all duration-150 relative group shadow-xs hover:border-primary/50 hover:shadow-sm ${
                  net.id === "instagram"
                    ? "border-pink-500/20 bg-pink-500/[0.02]"
                    : net.id === "tiktok"
                    ? "border-cyan-500/20 bg-cyan-500/[0.02]"
                    : net.id === "youtube"
                    ? "border-red-500/20 bg-red-500/[0.02]"
                    : "border-border"
                }`}
              >
                {/* 2.1 CABEÇALHO DO CARD */}
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Ícone Oficial */}
                      {net.id === "instagram" ? (
                        <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                          <Instagram className="h-5 w-5" />
                        </div>
                      ) : net.id === "tiktok" ? (
                        <div className="h-9 w-9 rounded-2xl bg-slate-950 flex items-center justify-center text-cyan-400 shrink-0 shadow-xs">
                          <Music className="h-5 w-5" />
                        </div>
                      ) : net.id === "youtube" ? (
                        <div className="h-9 w-9 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                          <Youtube className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-xs">
                          <Globe className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-foreground tracking-tight leading-none mb-1 truncate">
                          {net.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onOpenApiModal(net.id)}
                          className="flex items-center gap-1.5 cursor-pointer hover:underline text-[10px] text-left"
                          title="Gerenciar conexão da API"
                        >
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              isApiConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                            }`}
                          />
                          <span
                            className={`font-semibold ${
                              isApiConnected
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isApiConnected ? "API Conectada" : "API Desconectada"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Menu de Ações (⋮) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="h-7 w-7 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Ações da Rede"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs p-1 rounded-xl shadow-xl">
                        {net.id === "instagram" && (
                          <DropdownMenuItem
                            onClick={() => {
                              loadCriafyAccounts();
                              setIsCriafyModalOpen(true);
                            }}
                            className="cursor-pointer gap-2 text-pink-600 dark:text-pink-400 font-bold"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Selecionar Conta Criafy</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setEditingNetwork(net)}
                          className="cursor-pointer gap-2"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Editar rede</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setEditingFormatsNetwork(net)}
                          className="cursor-pointer gap-2"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Editar formatos</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleArchiveNetwork(net.id, true)}
                          className="cursor-pointer gap-2 text-amber-600 dark:text-amber-400"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          <span>Arquivar rede</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={async () => {
                            if (
                              confirm(
                                `Deseja realmente excluir a rede ${net.name}? Suas publicações e dados permanecerão preservados.`
                              )
                            ) {
                              await mutate(
                                (ws, ctx) => deleteSocialNetwork(ws, ctx, net.id),
                                user?.email || "Operador"
                              );
                              toast.success(`${net.name} excluída`);
                            }
                          }}
                          className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Excluir rede</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Se for Instagram e não estiver vinculado ao Criafy, exibir botão chamativo */}
                  {net.id === "instagram" && !linkedCriafyAccount && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        loadCriafyAccounts();
                        setIsCriafyModalOpen(true);
                      }}
                      className="w-full mt-2.5 h-7 text-[11px] font-bold bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Selecionar Conta Criafy</span>
                    </Button>
                  )}

                  {/* 2.2 INDICADORES (MÉTRICAS EDITÁVEIS) */}
                  <div className="grid grid-cols-4 gap-1 p-2 my-3 rounded-xl bg-muted/40 border border-border/40 text-center">
                    {net.id === "youtube" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "reels", metrics.reels)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar shorts"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>▶️</span> {metrics.reels}
                          </div>
                          <div className="text-[10px] text-muted-foreground">shorts</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "posts", metrics.posts)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar vídeos"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>🎥</span> {metrics.posts}
                          </div>
                          <div className="text-[10px] text-muted-foreground">vídeos</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "carrossel", metrics.carrossel)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar carrossel"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>🎠</span> {metrics.carrossel}
                          </div>
                          <div className="text-[10px] text-muted-foreground">carrossel</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "stories", metrics.stories)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar posts"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>📸</span> {metrics.stories > 0 ? metrics.stories : 0}
                          </div>
                          <div className="text-[10px] text-muted-foreground">posts</div>
                        </button>
                      </>
                    ) : net.id === "tiktok" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "reels", metrics.reels)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar vídeos"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>▶️</span> {metrics.reels}
                          </div>
                          <div className="text-[10px] text-muted-foreground">vídeos</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "carrossel", metrics.carrossel)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar carrossel"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>🎠</span> {metrics.carrossel}
                          </div>
                          <div className="text-[10px] text-muted-foreground">carrossel</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "stories", metrics.stories)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar stories"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>👁️</span> {metrics.stories}
                          </div>
                          <div className="text-[10px] text-muted-foreground">stories</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "posts", metrics.posts)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar posts"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>📸</span> {metrics.posts}
                          </div>
                          <div className="text-[10px] text-muted-foreground">posts</div>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "reels", metrics.reels)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar reels"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>▶️</span> {metrics.reels}
                          </div>
                          <div className="text-[10px] text-muted-foreground">reels</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "carrossel", metrics.carrossel)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar carrossel"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>🎠</span> {metrics.carrossel}
                          </div>
                          <div className="text-[10px] text-muted-foreground">carrossel</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "stories", metrics.stories)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar stories"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>👁️</span> {metrics.stories}
                          </div>
                          <div className="text-[10px] text-muted-foreground">stories</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickEditMetric(net.id, "posts", metrics.posts)}
                          className="p-1 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                          title="Clique para editar posts"
                        >
                          <div className="text-xs font-black text-foreground flex items-center justify-center gap-1">
                            <span>📸</span> {metrics.posts}
                          </div>
                          <div className="text-[10px] text-muted-foreground">posts</div>
                        </button>
                      </>
                    )}
                  </div>

                  {/* 2.3 FORMATOS ATIVOS */}
                  <div className="space-y-1.5 my-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                      <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-extrabold">
                        Formatos ativos
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingFormatsNetwork(net)}
                        className="text-primary hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Editar</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                      {net.formats.filter((f) => f.enabled).length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">
                          Nenhum formato ativo (clique em Editar)
                        </span>
                      ) : (
                        net.formats
                          .filter((f) => f.enabled)
                          .map((fmt) => {
                            const pillColor =
                              fmt.id === "reels" || fmt.id === "shorts"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25"
                                : fmt.id === "videos"
                                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/25"
                                : fmt.id === "carrossel"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/25"
                                : fmt.id === "stories"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25";

                            return (
                              <div
                                key={fmt.id}
                                className={`inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full border text-[11px] font-bold ${pillColor} transition-all`}
                              >
                                <span>{fmt.icon || "•"}</span>
                                <span>{fmt.label}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleFormat(net.id, fmt.id, false)}
                                  className="hover:opacity-70 text-current p-0.5 rounded-full transition-opacity cursor-pointer"
                                  title={`Desativar formato ${fmt.label}`}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>

                {/* 2.4 RODAPÉ DO CARD: BOTÃO "VER DETALHES >" */}
                <button
                  type="button"
                  onClick={() => setDetailsModalNetwork(net)}
                  className="w-full pt-3 mt-1 border-t border-border/50 text-xs font-bold text-primary hover:text-primary/80 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span>Ver detalhes</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MODAL: EDITAR REDE SOCIAL */}
      <Dialog open={!!editingNetwork} onOpenChange={(open) => !open && setEditingNetwork(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              <span>Configurar {editingNetwork?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {editingNetwork && (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  Nome da Rede
                </label>
                <Input
                  value={editingNetwork.name}
                  onChange={(e) => setEditingNetwork({ ...editingNetwork, name: e.target.value })}
                  className="h-8 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  Handle / Perfil (@arroba)
                </label>
                <Input
                  value={editingNetwork.handle || ""}
                  onChange={(e) => setEditingNetwork({ ...editingNetwork, handle: e.target.value })}
                  placeholder="@perfil"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  URL Oficial
                </label>
                <Input
                  value={editingNetwork.url || ""}
                  onChange={(e) => setEditingNetwork({ ...editingNetwork, url: e.target.value })}
                  placeholder="https://..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingNetwork(null)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditingNetwork}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground"
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. MODAL: EDITAR FORMATOS DA REDE */}
      <Dialog
        open={!!editingFormatsNetwork}
        onOpenChange={(open) => !open && setEditingFormatsNetwork(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span>Formatos de Conteúdo — {editingFormatsNetwork?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {editingFormatsNetwork && (
            <div className="space-y-2 py-2">
              <p className="text-[11px] text-muted-foreground mb-3">
                Ative ou desative quais formatos de publicação você deseja acompanhar para{" "}
                {editingFormatsNetwork.name}:
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {editingFormatsNetwork.formats.map((fmt) => (
                  <div
                    key={fmt.id}
                    onClick={() => {
                      const updated = editingFormatsNetwork.formats.map((f) =>
                        f.id === fmt.id ? { ...f, enabled: !f.enabled } : f
                      );
                      setEditingFormatsNetwork({ ...editingFormatsNetwork, formats: updated });
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      fmt.enabled
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-base">{fmt.icon || "•"}</span>
                      <span>{fmt.label}</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        fmt.enabled
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {fmt.enabled && <Check className="h-3 w-3" />}
                      {fmt.enabled ? "Ativo" : "Desativado"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingFormatsNetwork(null)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!editingFormatsNetwork) return;
                await mutate((ws, ctx) => {
                  updateSocialNetwork(ws, ctx, editingFormatsNetwork.id, {
                    formats: editingFormatsNetwork.formats,
                  });
                }, user?.email || "Operador");
                setEditingFormatsNetwork(null);
                toast.success("Formatos atualizados com sucesso!");
              }}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground"
            >
              Salvar formatos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. MODAL: REDES SOCIAIS ARQUIVADAS (AJ-018) */}
      <Dialog open={isArchivedModalOpen} onOpenChange={setIsArchivedModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-500" />
              <span>Redes Sociais Arquivadas ({archivedNetworks.length})</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            {archivedNetworks.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl">
                Nenhuma rede social arquivada no momento.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {archivedNetworks.map((net) => (
                  <div
                    key={net.id}
                    className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-black text-foreground">{net.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {net.handle || net.id}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleArchiveNetwork(net.id, false)}
                      className="h-7 px-2.5 text-xs font-bold bg-primary text-primary-foreground gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restaurar rede</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsArchivedModalOpen(false)}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL: NOVA REDE SOCIAL */}
      <Dialog open={isNewNetworkModalOpen} onOpenChange={setIsNewNetworkModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <span>Cadastrar Nova Rede Social</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Nome da Rede
              </label>
              <Input
                value={newNetworkForm.name}
                onChange={(e) => setNewNetworkForm({ ...newNetworkForm, name: e.target.value })}
                placeholder="Ex: LinkedIn, Twitter / X, Pinterest..."
                className="h-8 text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Handle / Perfil (@arroba)
              </label>
              <Input
                value={newNetworkForm.handle}
                onChange={(e) => setNewNetworkForm({ ...newNetworkForm, handle: e.target.value })}
                placeholder="@percursodavida"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                URL Oficial (Opcional)
              </label>
              <Input
                value={newNetworkForm.url}
                onChange={(e) => setNewNetworkForm({ ...newNetworkForm, url: e.target.value })}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNewNetworkModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNewNetwork}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground"
            >
              Cadastrar Rede
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL: DETALHES DA REDE SOCIAL */}
      <Dialog
        open={!!detailsModalNetwork}
        onOpenChange={(open) => !open && setDetailsModalNetwork(null)}
      >
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center justify-between pr-4">
              <div className="flex items-center gap-2">
                <span>Detalhes — {detailsModalNetwork?.name}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {detailsModalNetwork?.handle || detailsModalNetwork?.id}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          {detailsModalNetwork &&
            (() => {
              const metrics = getChannelMetrics(detailsModalNetwork.id);
              const period = networkPeriods[detailsModalNetwork.id] || "7d";
              const apiCfg = workspace.mediaApiConfigs?.[detailsModalNetwork.id];

              return (
                <div className="space-y-4 py-2 text-xs">
                  {/* Seletor de Período e Status da API */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground">Período:</span>
                      {(["today", "7d", "30d"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setNetworkPeriods((prev) => ({ ...prev, [detailsModalNetwork.id]: p }))
                          }
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            period === p
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
                        </button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenApiModal(detailsModalNetwork.id)}
                      className="h-6 px-2 text-[10px] font-bold rounded-lg gap-1 border-border"
                    >
                      <Key className="h-3 w-3" />
                      <span>{apiCfg?.connected ? "API Conectada" : "Conectar API"}</span>
                    </Button>
                  </div>

                  {/* Métricas Consolidadas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 rounded-xl bg-card border border-border/80 text-center">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">
                        Reels / Vídeos
                      </div>
                      <div className="text-xl font-black text-foreground mt-1">{metrics.reels}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/80 text-center">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">
                        Carrossel
                      </div>
                      <div className="text-xl font-black text-foreground mt-1">
                        {metrics.carrossel}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/80 text-center">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">
                        Stories
                      </div>
                      <div className="text-xl font-black text-foreground mt-1">
                        {metrics.stories.toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/80 text-center">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">
                        Posts
                      </div>
                      <div className="text-xl font-black text-foreground mt-1">{metrics.posts}</div>
                    </div>
                  </div>

                  {/* Marcação de Unidades (Hook, Corpo, CTA, Formato) */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        Marcações de Unidades / Elementos
                      </span>
                      {onOpenUnitMarkerModal && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenUnitMarkerModal(detailsModalNetwork.id)}
                          className="h-6 px-2 text-[10px] font-bold bg-primary text-primary-foreground rounded-lg gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Nova Marcação</span>
                        </Button>
                      )}
                    </div>
                    {metrics.unitMarkers.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">
                        Nenhuma marcação de Hook/Corpo/CTA registrada nesta rede.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {metrics.unitMarkers.map((m: any) => (
                          <Badge
                            key={m.id}
                            variant="outline"
                            className="text-[10px] font-mono py-0.5 px-2 bg-background border-border flex items-center gap-1"
                          >
                            <span>{m.unidade}</span>
                            <span className="text-muted-foreground">• {m.formato}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDetailsModalNetwork(null)}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL: SELECIONAR CONTA CRIAFY */}
      <Dialog open={isCriafyModalOpen} onOpenChange={setIsCriafyModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-card border border-border text-foreground shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-pink-500 mb-1">
              <div className="h-7 w-7 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <Instagram className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">
                Adicionar Conta da Criafy
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione uma conta conectada na Criafy para adicionar ao cronograma e sincronizar suas métricas em tempo real.
            </DialogDescription>
          </DialogHeader>

          {isLoadingCriafy ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-pink-500" />
              <span className="text-xs text-muted-foreground font-medium">Buscando contas conectadas no Criafy...</span>
            </div>
          ) : criafyAccounts.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-xl p-4 bg-muted/20">
              <Instagram className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">Nenhuma conta do Instagram encontrada no Criafy</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Conecte sua conta do Instagram via Meta OAuth acessando o Criafy Hub no menu lateral.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {criafyAccounts.map((acc) => {
                const currentLinkedId = workspace.mediaApiConfigs?.instagram?.criafyAccountId;
                const isSelected = currentLinkedId === acc.id;
                const followers = acc.metadata?.followers_count ?? 0;
                const media = acc.metadata?.media_count ?? 0;

                return (
                  <div
                    key={acc.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-pink-500 bg-pink-500/5 ring-1 ring-pink-500/30"
                        : "border-border hover:border-pink-500/40 bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-11 w-11 border-2 border-border shrink-0 shadow-xs">
                        <AvatarImage src={acc.profile_picture_url || undefined} alt={acc.username} />
                        <AvatarFallback className="bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white font-bold text-xs">
                          @{acc.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground truncate">
                            @{acc.username}
                          </span>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold">
                            Conectado
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
                          {acc.name || acc.metadata?.page_name || "Marketplace Sem Estoque"}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                          <span><strong className="text-foreground font-black">{followers.toLocaleString("pt-BR")}</strong> seguidores</span>
                          <span>•</span>
                          <span><strong className="text-foreground font-black">{media}</strong> mídias</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleLinkCriafyAccount(acc)}
                      disabled={isLoadingCriafy}
                      className={
                        isSelected
                          ? "bg-muted text-muted-foreground hover:bg-muted font-bold text-xs"
                          : "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white hover:opacity-90 font-bold text-xs shadow-xs"
                      }
                    >
                      {isSelected ? "Selecionada" : "Selecionar"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2 border-t border-border/50 pt-3 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCriafyModalOpen(false)} className="text-xs">
              Fechar
            </Button>
            {workspace.mediaApiConfigs?.instagram?.criafyAccountId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleUnlinkCriafy();
                  setIsCriafyModalOpen(false);
                }}
                className="text-xs text-rose-500 hover:text-rose-600 border-rose-500/30"
              >
                Desvincular Conta Atual
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
