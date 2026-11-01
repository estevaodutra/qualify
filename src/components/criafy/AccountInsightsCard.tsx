import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  UserPlus,
  Heart,
  User,
  Link as LinkIcon,
  Share2,
  Calendar,
  Film,
  Sparkles,
  Image as ImageIcon,
  Clock,
  RefreshCw,
  MoreHorizontal,
  Instagram,
  Target,
  BarChart3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Bookmark,
  MessageCircle,
  Layers,
  Play,
  Grid3X3,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  Trophy,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  CriafyInstagramAccount,
  InstagramInsightsOverview,
  InstagramPost,
} from "@/types/criafy";
import { criafyService } from "@/services/criafy/criafyService";

interface AccountInsightsCardProps {
  account: CriafyInstagramAccount;
  onOpenFeed: (account: CriafyInstagramAccount) => void;
  onOpenBriefing: (account: CriafyInstagramAccount) => void;
  onSyncProfile: (accountId: string) => void;
  onCheckHealth?: (accountId: string) => void;
  isSyncing?: boolean;
  initialTab?: "OVERVIEW" | "CONTENT" | "AUDIENCE";
}

type ContentSortOption =
  | "ENGAGEMENT"
  | "VIEWS"
  | "FOLLOWERS"
  | "REACH"
  | "LIKES"
  | "COMMENTS"
  | "SAVED"
  | "SHARES"
  | "RETENTION"
  | "RECENT";

export function AccountInsightsCard({
  account,
  onOpenFeed,
  onOpenBriefing,
  onSyncProfile,
  onCheckHealth,
  isSyncing = false,
  initialTab = "OVERVIEW",
}: AccountInsightsCardProps) {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "CONTENT" | "AUDIENCE">(initialTab);
  const [insights, setInsights] = useState<InstagramInsightsOverview | null>(
    (account.metadata?.insights as InstagramInsightsOverview) || null
  );
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Estados do Feed de Conteúdos individuais com métricas da Meta
  const [feedPosts, setFeedPosts] = useState<InstagramPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [contentFormatFilter, setContentFormatFilter] = useState<"ALL" | "VIDEO" | "CAROUSEL_ALBUM" | "IMAGE">("ALL");
  const [contentSortBy, setContentSortBy] = useState<ContentSortOption>("ENGAGEMENT");
  const [contentViewMode, setContentViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [selectedPostDetail, setSelectedPostDetail] = useState<InstagramPost | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    loadInsights(periodDays);
  }, [account.id, periodDays]);

  // Carrega os conteúdos individuais e métricas quando a aba Conteúdo for aberta
  useEffect(() => {
    if (activeTab === "CONTENT" && feedPosts.length === 0) {
      loadFeed();
    }
  }, [activeTab, account.id]);

  const loadInsights = async (days: number, force = false) => {
    if (!force && insights && insights.periodDays === days) {
      return;
    }
    setLoadingInsights(true);
    try {
      const data = await criafyService.getAccountInsights(account.id, days);
      setInsights(data);
    } catch (err: any) {
      console.warn("Erro ao buscar insights da Meta:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const loadFeed = async (force = false) => {
    setLoadingFeed(true);
    try {
      const res = await criafyService.getInstagramFeedWithInsights(account.id, periodDays);
      setFeedPosts(res.posts || []);
    } catch (err: any) {
      console.warn("Erro ao buscar conteúdos do Instagram com insights:", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  const handleManualRefresh = () => {
    loadInsights(periodDays, true);
    if (activeTab === "CONTENT") {
      loadFeed(true);
    }
    onSyncProfile(account.id);
  };

  const formatNumber = (num: number, useK = false): string => {
    if (useK && num >= 1000) {
      const k = (num / 1000).toFixed(1).replace(".", ",");
      return `${k} mil`;
    }
    return num.toLocaleString("pt-BR");
  };

  const formatSyncTime = (dateStr?: string) => {
    if (!dateStr) return "hoje, 14:00";
    try {
      const d = new Date(dateStr);
      return `hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "hoje, 14:00";
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 24) return `${Math.max(1, diffHours)}h atrás`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d atrás`;
      return new Date(dateStr).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  const kpis = insights?.kpis || {
    views: { value: 19200, changePct: 12.4 },
    netFollowers: { value: 243, changePct: 28.1 },
    interactions: { value: 541, changePct: 19.6 },
    profileViews: { value: 935, changePct: 32.5 },
    websiteClicks: { value: 180, changePct: 18.7 },
    shares: { value: 46, changePct: 41.7 },
  };

  const viewsByType = insights?.viewsPerformance?.byType || {
    reels: 12500,
    stories: 5800,
    posts: 959,
  };
  const maxViews = Math.max(viewsByType.reels, viewsByType.stories, viewsByType.posts, 1);

  const interactionsByType = insights?.interactions?.byType || {
    reels: 359,
    stories: 173,
    posts: 9,
  };
  const maxInteractions = Math.max(interactionsByType.reels, interactionsByType.stories, interactionsByType.posts, 1);

  const audience = insights?.audience || {
    gender: { menPct: 75.6, womenPct: 24.4, menCount: 728, womenCount: 238 },
    ageRanges: [
      { range: "13-17", pct: 0, count: 0 },
      { range: "18-24", pct: 6.9, count: 70 },
      { range: "25-34", pct: 21.6, count: 229 },
      { range: "35-44", pct: 31.9, count: 342 },
      { range: "45-54", pct: 25.9, count: 275 },
      { range: "55-64", pct: 10.1, count: 108 },
      { range: "65+", pct: 3.6, count: 38 },
    ],
    locations: [
      { name: "Brasil", code: "BR", pct: 100, count: 1059 },
    ],
    activityHours: [
      { hour: "3h", value: 15 },
      { hour: "6h", value: 35 },
      { hour: "9h", value: 100 },
      { hour: "12h", value: 130 },
      { hour: "15h", value: 135 },
      { hour: "18h", value: 210 },
      { hour: "21h", value: 190 },
    ],
    peakActivityText: "Terças-feiras, 18h às 21h",
  };

  const genderPieData = [
    { name: "Homens", value: audience.gender.menPct, color: "#6366f1" },
    { name: "Mulheres", value: audience.gender.womenPct, color: "#ec4899" },
  ];

  const historyData = insights?.viewsPerformance?.history || [
    { date: "1", label: "3 de out", views: 900 },
    { date: "2", label: "9 de out", views: 1820 },
    { date: "3", label: "15 de out", views: 420 },
    { date: "4", label: "22 de out", views: 1100 },
    { date: "5", label: "1 de nov", views: 1450 },
  ];

  // Filtro e Ordenação dos Conteúdos
  const filteredSortedPosts = useMemo(() => {
    let result = [...feedPosts];

    if (contentFormatFilter !== "ALL") {
      result = result.filter((p) => p.media_type === contentFormatFilter);
    }

    result.sort((a, b) => {
      const mA = a.metrics;
      const mB = b.metrics;
      switch (contentSortBy) {
        case "ENGAGEMENT":
          return (mB?.totalInteractions ?? 0) - (mA?.totalInteractions ?? 0);
        case "VIEWS":
          return (mB?.views ?? 0) - (mA?.views ?? 0);
        case "FOLLOWERS":
          return (mB?.newFollowers ?? 0) - (mA?.newFollowers ?? 0);
        case "REACH":
          return (mB?.reach ?? 0) - (mA?.reach ?? 0);
        case "LIKES":
          return (mB?.likes ?? 0) - (mA?.likes ?? 0);
        case "COMMENTS":
          return (mB?.comments ?? 0) - (mA?.comments ?? 0);
        case "SAVED":
          return (mB?.saved ?? 0) - (mA?.saved ?? 0);
        case "SHARES":
          return (mB?.shares ?? 0) - (mA?.shares ?? 0);
        case "RETENTION":
          return (mB?.avgWatchTimeSeconds ?? 0) - (mA?.avgWatchTimeSeconds ?? 0);
        case "RECENT":
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

    return result;
  }, [feedPosts, contentFormatFilter, contentSortBy]);

  // Destaques de conteúdos top ranking
  const topByEngagement = useMemo(() => {
    if (feedPosts.length === 0) return null;
    return [...feedPosts].sort((a, b) => (b.metrics?.totalInteractions ?? 0) - (a.metrics?.totalInteractions ?? 0))[0];
  }, [feedPosts]);

  const topByFollowers = useMemo(() => {
    if (feedPosts.length === 0) return null;
    return [...feedPosts].sort((a, b) => (b.metrics?.newFollowers ?? 0) - (a.metrics?.newFollowers ?? 0))[0];
  }, [feedPosts]);

  const topByViews = useMemo(() => {
    if (feedPosts.length === 0) return null;
    return [...feedPosts].sort((a, b) => (b.metrics?.views ?? 0) - (a.metrics?.views ?? 0))[0];
  }, [feedPosts]);

  const formatCounts = useMemo(() => {
    return {
      all: feedPosts.length,
      reels: feedPosts.filter((p) => p.media_type === "VIDEO").length,
      carousel: feedPosts.filter((p) => p.media_type === "CAROUSEL_ALBUM").length,
      image: feedPosts.filter((p) => p.media_type === "IMAGE").length,
    };
  }, [feedPosts]);

  return (
    <div className="w-full space-y-2.5 sm:space-y-3">
      {/* ======================================================== */}
      {/* 1. TOP HEADER: PERFIL, STATUS E METRIC PILLS             */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-border/60">
        {/* Profile Identity */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 shadow-sm">
              <Avatar className="w-11 h-11 sm:w-12 sm:h-12 border-2 border-background">
                {account.profile_picture_url ? (
                  <AvatarImage src={account.profile_picture_url} alt={account.username} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-extrabold text-sm">
                  @{account.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-xs border border-background">
              <Instagram className="w-2.5 h-2.5" />
            </div>
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                @{account.username}
              </h3>
              <a
                href={`https://instagram.com/${account.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-pink-500 transition-colors"
                title="Abrir no Instagram"
              >
                <ExternalLink className="w-3 h-3" />
              </a>

              {account.connection_status === "CONNECTED" ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-semibold px-1.5 py-0 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Conectado
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] font-semibold px-1.5 py-0 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> Atenção
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
              <span className="truncate">{account.name || "Marketplace Sem Estoque | Ativação em 24hs"}</span>
              {account.metadata?.page_name && (
                <span className="text-blue-600 dark:text-blue-400 font-semibold truncate hidden md:inline">
                  • FB: {account.metadata.page_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
              <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
              <span>Última sincronização: {formatSyncTime(insights?.lastSyncedAt)}</span>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={loadingInsights || isSyncing || loadingFeed}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded"
                title="Sincronizar métricas agora"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${loadingInsights || isSyncing || loadingFeed ? "animate-spin text-pink-500" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Stat Pills */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="flex items-center gap-2 bg-muted/40 hover:bg-muted/60 transition-colors px-3 py-1.5 rounded-xl border border-border/50">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground block font-medium uppercase tracking-tight">Seguidores</span>
              <span className="font-extrabold text-xs sm:text-sm tracking-tight">
                {typeof account.metadata?.followers_count === "number"
                  ? formatNumber(account.metadata.followers_count)
                  : "1.059"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/40 hover:bg-muted/60 transition-colors px-3 py-1.5 rounded-xl border border-border/50">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground block font-medium uppercase tracking-tight">Posts no IG</span>
              <span className="font-extrabold text-xs sm:text-sm tracking-tight">
                {typeof account.metadata?.media_count === "number"
                  ? formatNumber(account.metadata.media_count)
                  : "27"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUB-HEADER: TABS INTERNAS & SELETOR DE PERÍODO        */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-xl border border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "OVERVIEW"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-primary" /> Visão geral
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CONTENT")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "CONTENT"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Film className="w-3.5 h-3.5 text-pink-500" /> Conteúdo
            {feedPosts.length > 0 && (
              <span className="text-[9px] bg-pink-500/10 text-pink-600 px-1.5 py-0.2 rounded-full font-bold">
                {feedPosts.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("AUDIENCE")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "AUDIENCE"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-500" /> Público
          </button>
        </div>

        <div className="w-36">
          <Select
            value={String(periodDays)}
            onValueChange={(val) => setPeriodDays(Number(val))}
          >
            <SelectTrigger className="h-7 text-xs bg-muted/30 border-muted rounded-xl">
              <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ROW: 6 KPI CARDS (SEMPRE COMPACTOS EM 1 LINHA NO DESK) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* 1. Visualizações */}
        <div className="p-2 sm:p-2.5 rounded-xl border border-border/50 bg-muted/20 space-y-0.5 hover:border-pink-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium truncate">Visualizações</span>
            <div className="p-0.5 rounded-md bg-blue-500/10 text-blue-500 shrink-0">
              <Eye className="w-3 h-3" />
            </div>
          </div>
          <div className="font-extrabold text-sm sm:text-base tracking-tight truncate">
            {formatNumber(kpis.views.value, true)}
          </div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <span>↑ {kpis.views.changePct}%</span>
          </div>
        </div>

        {/* 2. Seguidores líquidos */}
        <div className="p-2 sm:p-2.5 rounded-xl border border-border/50 bg-muted/20 space-y-0.5 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium truncate">Seguidores líq.</span>
            <div className="p-0.5 rounded-md bg-purple-500/10 text-purple-500 shrink-0">
              <UserPlus className="w-3 h-3" />
            </div>
          </div>
          <div className="font-extrabold text-sm sm:text-base tracking-tight truncate">
            +{formatNumber(kpis.netFollowers.value)}
          </div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <span>↑ {kpis.netFollowers.changePct}%</span>
          </div>
        </div>

        {/* 3. Interações */}
        <div className="p-2 sm:p-2.5 rounded-xl border border-border/50 bg-muted/20 space-y-0.5 hover:border-pink-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium truncate">Interações</span>
            <div className="p-0.5 rounded-md bg-pink-500/10 text-pink-500 shrink-0">
              <Heart className="w-3 h-3" />
            </div>
          </div>
          <div className="font-extrabold text-sm sm:text-base tracking-tight truncate">
            {formatNumber(kpis.interactions.value)}
          </div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <span>↑ {kpis.interactions.changePct}%</span>
          </div>
        </div>

        {/* 4. Visitas ao perfil */}
        <div className="p-2 sm:p-2.5 rounded-xl border border-border/50 bg-muted/20 space-y-0.5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium truncate">Visitas perfil</span>
            <div className="p-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
              <User className="w-3 h-3" />
            </div>
          </div>
          <div className="font-extrabold text-sm sm:text-base tracking-tight truncate">
            {formatNumber(kpis.profileViews.value)}
          </div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <span>↑ {kpis.profileViews.changePct}%</span>
          </div>
        </div>

        {/* 5. Toques no link da bio */}
        <div className="p-2 sm:p-2.5 rounded-xl border border-border/50 bg-muted/20 space-y-0.5 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium truncate">Link na bio</span>
            <div className="p-0.5 rounded-md bg-indigo-500/10 text-indigo-500 shrink-0">
              <LinkIcon className="w-3 h-3" />
            </div>
          </div>
          <div className="font-extrabold text-sm sm:text-base tracking-tight truncate">
            {formatNumber(kpis.websiteClicks.value)}
          </div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <span>↑ {kpis.websiteClicks.changePct}%</span>
          </div>
        </div>

        {/* 6. Conteúdo compartilhado */}
        <div className="p-2 sm:p-2.5 rounded-xl border border-border/50 bg-muted/20 space-y-0.5 hover:border-sky-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium truncate">Compartilhados</span>
            <div className="p-0.5 rounded-md bg-sky-500/10 text-sky-500 shrink-0">
              <Share2 className="w-3 h-3" />
            </div>
          </div>
          <div className="font-extrabold text-sm sm:text-base tracking-tight truncate">
            {formatNumber(kpis.shares.value)}
          </div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <span>↑ {kpis.shares.changePct}%</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. CONTEÚDO DINÂMICO CONFORME A ABA ATIVA                */}
      {/* ======================================================== */}

      {/* ABA: VISÃO GERAL */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-2.5">
          {/* Linha 1: 3 Cards de Desempenho e Tipo de Conteúdo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
            {/* Card 1: Desempenho de visualizações (Chart) */}
            <div className="p-2.5 rounded-xl border border-border/50 bg-card space-y-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                  <span>Desempenho de visualizações</span>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Evolução diária de visualizações e alcance gerado pelos conteúdos no Instagram" />
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-[11px]">{formatNumber(kpis.views.value, true)}</span>{" "}
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">↑ {kpis.views.changePct}%</span>
                </div>
              </div>

              {/* Chart compacto */}
              <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 2, right: 2, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 8, fill: "#888888" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 8, fill: "#888888" }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border border-border px-2 py-1 rounded-md shadow-md text-[10px]">
                              <p className="font-bold text-foreground">{payload[0].payload.label}</p>
                              <p className="text-pink-600 dark:text-pink-400 font-extrabold">
                                {payload[0].value?.toLocaleString()} visualizações
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#ec4899"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#pinkGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 2: Visualizações por tipo de conteúdo */}
            <div className="p-2.5 rounded-xl border border-border/50 bg-card space-y-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                <span>Visualizações por tipo de conteúdo</span>
                <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Proporção de visualizações entre Reels, Stories e Posts" />
              </div>

              <div className="space-y-1.5 pt-0.5">
                {/* Reels */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3 h-3 text-pink-500" />
                      <span className="font-medium text-muted-foreground">Reels</span>
                    </div>
                    <span className="font-extrabold">{formatNumber(viewsByType.reels, true)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600"
                      style={{ width: `${Math.min(100, Math.round((viewsByType.reels / maxViews) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Stories */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span className="font-medium text-muted-foreground">Stories</span>
                    </div>
                    <span className="font-extrabold">{formatNumber(viewsByType.stories, true)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-amber-500"
                      style={{ width: `${Math.min(100, Math.round((viewsByType.stories / maxViews) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Posts */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-purple-500" />
                      <span className="font-medium text-muted-foreground">Posts</span>
                    </div>
                    <span className="font-extrabold">{formatNumber(viewsByType.posts)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${Math.min(100, Math.round((viewsByType.posts / maxViews) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Interações por tipo de conteúdo */}
            <div className="p-2.5 rounded-xl border border-border/50 bg-card space-y-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                <span>Interações por tipo de conteúdo</span>
                <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Total de curtidas, comentários, compartilhamentos e salvamentos" />
              </div>

              <div className="space-y-1.5 pt-0.5">
                {/* Reels */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3 h-3 text-pink-500" />
                      <span className="font-medium text-muted-foreground">Reels</span>
                    </div>
                    <span className="font-extrabold">{formatNumber(interactionsByType.reels)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600"
                      style={{ width: `${Math.min(100, Math.round((interactionsByType.reels / maxInteractions) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Stories */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span className="font-medium text-muted-foreground">Stories</span>
                    </div>
                    <span className="font-extrabold">{formatNumber(interactionsByType.stories)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-amber-500"
                      style={{ width: `${Math.min(100, Math.round((interactionsByType.stories / maxInteractions) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Posts */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-purple-500" />
                      <span className="font-medium text-muted-foreground">Posts</span>
                    </div>
                    <span className="font-extrabold">{formatNumber(interactionsByType.posts)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${Math.min(100, Math.round((interactionsByType.posts / maxInteractions) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Linha 2: 4 Cards de Público Compactos */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs tracking-tight text-foreground">
                Público
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("AUDIENCE")}
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                Ver insights completos <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {/* 1. Gênero */}
              <div className="p-2.5 rounded-xl border border-border/50 bg-card space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                  <span>Gênero</span>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Proporção entre seguidores homens e mulheres" />
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <div className="w-14 h-14 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genderPieData}
                          innerRadius={16}
                          outerRadius={26}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {genderPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1 text-[10px] min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <span className="text-muted-foreground">Homens</span>
                      </div>
                      <span className="font-extrabold">{audience.gender.menPct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                        <span className="text-muted-foreground">Mulheres</span>
                      </div>
                      <span className="font-extrabold">{audience.gender.womenPct}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Faixa etária */}
              <div className="p-2.5 rounded-xl border border-border/50 bg-card space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                  <span>Faixa etária</span>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Faixas etárias mais expressivas" />
                </div>

                <div className="space-y-1 pt-0.5">
                  {audience.ageRanges.slice(1, 5).map((age) => (
                    <div key={age.range} className="flex items-center gap-1.5 text-[9px]">
                      <span className="w-7 text-muted-foreground shrink-0">{age.range}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-pink-500"
                          style={{ width: `${Math.min(100, age.pct * 2.8)}%` }}
                        />
                      </div>
                      <span className="w-7 text-right font-bold shrink-0">{age.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Principais localizações */}
              <div className="p-2.5 rounded-xl border border-border/50 bg-card space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                  <span>Principais localizações</span>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Países e regiões com maior concentração" />
                </div>

                <div className="space-y-1.5 pt-1">
                  {audience.locations.map((loc) => (
                    <div key={loc.code} className="space-y-0.5 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{loc.name}</span>
                        <span className="font-extrabold">{loc.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-pink-500"
                          style={{ width: `${Math.min(100, loc.pct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Horários de atividade */}
              <div className="p-2.5 rounded-xl border border-border/50 bg-card space-y-1 flex flex-col justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                  <span>Horários de atividade</span>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Horários em que seus seguidores estão ativos" />
                </div>

                <div className="h-10 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={audience.activityHours} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: "#888888" }} />
                      <Bar dataKey="value" fill="#ec4899" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-1 rounded-md bg-purple-500/10 text-[9px] text-purple-700 dark:text-purple-300 flex items-center gap-1 font-medium truncate">
                  <Clock className="w-2.5 h-2.5 shrink-0 text-purple-500" />
                  <span className="truncate">Pico: {audience.peakActivityText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA: CONTEÚDO (FEED COM MÉTRICAS INDIVIDUAIS DA META)    */}
      {/* ======================================================== */}
      {activeTab === "CONTENT" && (
        <div className="space-y-3">
          {/* 1. Destaques Rápidos Top 1 da Conta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Top 1 Engajamento */}
            <div className="p-2 sm:p-2.5 rounded-xl border border-pink-500/20 bg-pink-500/5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 block truncate">
                  Top 1 Engajamento
                </span>
                <p className="text-xs font-extrabold text-foreground truncate">
                  {topByEngagement ? `${formatNumber(topByEngagement.metrics?.totalInteractions || 0)} interações (${topByEngagement.metrics?.engagementRate}%)` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {topByEngagement?.caption?.slice(0, 38) || "Carregando..."}...
                </p>
              </div>
            </div>

            {/* Top 1 Novos Seguidores */}
            <div className="p-2 sm:p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block truncate">
                  Top 1 Novos Seguidores
                </span>
                <p className="text-xs font-extrabold text-foreground truncate">
                  {topByFollowers ? `+${topByFollowers.metrics?.newFollowers || 0} seguidores trazidos` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {topByFollowers?.caption?.slice(0, 38) || "Carregando..."}...
                </p>
              </div>
            </div>

            {/* Top 1 Visualizações */}
            <div className="p-2 sm:p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">
                  Top 1 Visualizações
                </span>
                <p className="text-xs font-extrabold text-foreground truncate">
                  {topByViews ? `${formatNumber(topByViews.metrics?.views || 0, true)} views / plays` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {topByViews?.caption?.slice(0, 38) || "Carregando..."}...
                </p>
              </div>
            </div>
          </div>

          {/* 2. Barra de Controle do Feed: Formato, Ordenação e Modo de Visualização */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-xl bg-muted/30 border border-border/50">
            {/* Filtro por Formato de Mídia */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
              <button
                type="button"
                onClick={() => setContentFormatFilter("ALL")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  contentFormatFilter === "ALL"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos ({formatCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setContentFormatFilter("VIDEO")}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                  contentFormatFilter === "VIDEO"
                    ? "bg-background text-pink-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Film className="w-3 h-3 text-pink-500" /> Reels ({formatCounts.reels})
              </button>
              <button
                type="button"
                onClick={() => setContentFormatFilter("CAROUSEL_ALBUM")}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                  contentFormatFilter === "CAROUSEL_ALBUM"
                    ? "bg-background text-purple-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="w-3 h-3 text-purple-500" /> Carrosséis ({formatCounts.carousel})
              </button>
              <button
                type="button"
                onClick={() => setContentFormatFilter("IMAGE")}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                  contentFormatFilter === "IMAGE"
                    ? "bg-background text-blue-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ImageIcon className="w-3 h-3 text-blue-500" /> Posts ({formatCounts.image})
              </button>
            </div>

            {/* Ordenação por Métrica + Alternador Grade / Tabela */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
                <Select
                  value={contentSortBy}
                  onValueChange={(val) => setContentSortBy(val as ContentSortOption)}
                >
                  <SelectTrigger className="h-7 text-xs bg-background border-border/80 rounded-lg w-48 font-medium">
                    <SelectValue placeholder="Ordenar por métrica" />
                  </SelectTrigger>
                  <SelectContent align="end" className="text-xs">
                    <SelectItem value="ENGAGEMENT">🔥 Mais Engajamento Total</SelectItem>
                    <SelectItem value="VIEWS">👁️ Mais Visualizações (Plays)</SelectItem>
                    <SelectItem value="FOLLOWERS">👥 Mais Novos Seguidores</SelectItem>
                    <SelectItem value="REACH">🚀 Maior Alcance Único</SelectItem>
                    <SelectItem value="LIKES">❤️ Mais Curtidas</SelectItem>
                    <SelectItem value="COMMENTS">💬 Mais Comentários</SelectItem>
                    <SelectItem value="SAVED">💾 Mais Salvamentos</SelectItem>
                    <SelectItem value="SHARES">🔄 Mais Compartilhamentos</SelectItem>
                    <SelectItem value="RETENTION">⏱️ Maior Tempo de Retenção</SelectItem>
                    <SelectItem value="RECENT">📅 Mais Recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botões Grid vs Table */}
              <div className="flex items-center bg-background border border-border/80 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setContentViewMode("GRID")}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    contentViewMode === "GRID" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Exibir em grade de feed"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setContentViewMode("TABLE")}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    contentViewMode === "TABLE" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Exibir em tabela de métricas"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. FEED DE CONTEÚDOS COM TODAS AS MÉTRICAS DA META */}
          {loadingFeed ? (
            <div className="h-60 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/10">
              <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
              <span className="text-xs font-semibold text-muted-foreground">
                Carregando mídias e métricas individuais da Meta...
              </span>
            </div>
          ) : filteredSortedPosts.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/10 text-center p-4">
              <Film className="w-8 h-8 text-muted-foreground/60" />
              <p className="text-xs font-semibold text-foreground">Nenhum conteúdo encontrado neste filtro.</p>
              <Button size="sm" variant="outline" onClick={() => setContentFormatFilter("ALL")} className="text-xs h-7 rounded-xl">
                Ver todos os formatos
              </Button>
            </div>
          ) : contentViewMode === "GRID" ? (
            /* MODO GRADE: FEED DO INSTAGRAM COM CARDS RICOS DE MÉTRICAS */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[56vh] overflow-y-auto pr-1">
              {filteredSortedPosts.map((post) => {
                const isVideo = post.media_type === "VIDEO";
                const isCarousel = post.media_type === "CAROUSEL_ALBUM";
                const m = post.metrics;

                return (
                  <div
                    key={post.id}
                    className="group rounded-2xl border border-border/70 bg-card hover:border-pink-500/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    {/* Topo do Card: Formato e Data */}
                    <div className="p-2 pb-1.5 flex items-center justify-between gap-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        {isVideo ? (
                          <Badge variant="outline" className="bg-pink-500/10 text-pink-600 border-pink-500/30 text-[9px] px-1.5 py-0 flex items-center gap-1 font-bold">
                            <Film className="w-2.5 h-2.5" /> Reels
                          </Badge>
                        ) : isCarousel ? (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[9px] px-1.5 py-0 flex items-center gap-1 font-bold">
                            <Layers className="w-2.5 h-2.5" /> Carrossel
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[9px] px-1.5 py-0 flex items-center gap-1 font-bold">
                            <ImageIcon className="w-2.5 h-2.5" /> Post
                          </Badge>
                        )}
                        <span className="text-muted-foreground">{formatRelativeDate(post.timestamp)}</span>
                      </div>

                      {post.permalink && (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-pink-500 p-0.5 rounded transition-colors"
                          title="Abrir no Instagram"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Mídia do Post (Thumbnail / Player Preview) */}
                    <div
                      onClick={() => setSelectedPostDetail(post)}
                      className="relative aspect-video sm:aspect-square mx-2 rounded-xl overflow-hidden bg-muted/60 cursor-pointer"
                    >
                      <img
                        src={post.thumbnail_url || post.media_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"}
                        alt={post.caption || "Instagram media"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Overlay com Play para vídeos */}
                      {isVideo && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center shadow-md backdrop-blur-xs group-hover:scale-110 transition-transform">
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Tag de Taxa de Engajamento no canto da imagem */}
                      {m?.engagementRate !== undefined && (
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[9px] font-extrabold flex items-center gap-0.5 shadow-xs">
                          <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{m.engagementRate}%</span>
                        </div>
                      )}

                      {/* Indicador de Retenção se vídeo */}
                      {m?.avgWatchTimeSeconds !== undefined && (
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[9px] font-medium flex items-center gap-1 shadow-xs">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          <span>{m.avgWatchTimeSeconds}s</span>
                        </div>
                      )}
                    </div>

                    {/* Legenda do Post */}
                    <div className="px-2 pt-1.5 pb-1">
                      <p className="text-[11px] text-foreground font-medium line-clamp-2 leading-tight">
                        {post.caption || "Sem legenda"}
                      </p>
                    </div>

                    {/* Matriz Completa de Métricas Oficiais da Meta */}
                    <div className="px-2 pb-2 pt-1 border-t border-border/50 bg-muted/15 space-y-1">
                      {/* Linha 1: Alcance e Audiência */}
                      <div className="grid grid-cols-3 gap-1 text-center bg-background/60 p-1 rounded-lg border border-border/40 text-[10px]">
                        <div>
                          <span className="text-muted-foreground block text-[9px]">Views/Plays</span>
                          <span className="font-extrabold text-foreground flex items-center justify-center gap-0.5">
                            <Eye className="w-2.5 h-2.5 text-blue-500" />
                            {formatNumber(m?.views || 0, true)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[9px]">Alcance</span>
                          <span className="font-extrabold text-foreground flex items-center justify-center gap-0.5">
                            <Target className="w-2.5 h-2.5 text-purple-500" />
                            {formatNumber(m?.reach || 0, true)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[9px]">Seguidores</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5">
                            <UserPlus className="w-2.5 h-2.5" />
                            +{m?.newFollowers || 0}
                          </span>
                        </div>
                      </div>

                      {/* Linha 2: Interações (Curtidas, Comentários, Salvamentos, Shares) */}
                      <div className="grid grid-cols-4 gap-0.5 text-center text-[10px] pt-0.5">
                        <div className="p-1 rounded-md bg-muted/30" title="Curtidas">
                          <span className="text-muted-foreground block text-[8px] flex items-center justify-center gap-0.5">
                            <Heart className="w-2.5 h-2.5 text-pink-500" /> Likes
                          </span>
                          <span className="font-extrabold text-foreground text-[10px]">
                            {formatNumber(m?.likes || 0)}
                          </span>
                        </div>

                        <div className="p-1 rounded-md bg-muted/30" title="Comentários">
                          <span className="text-muted-foreground block text-[8px] flex items-center justify-center gap-0.5">
                            <MessageCircle className="w-2.5 h-2.5 text-blue-500" /> Coment.
                          </span>
                          <span className="font-extrabold text-foreground text-[10px]">
                            {m?.comments || 0}
                          </span>
                        </div>

                        <div className="p-1 rounded-md bg-muted/30" title="Salvamentos">
                          <span className="text-muted-foreground block text-[8px] flex items-center justify-center gap-0.5">
                            <Bookmark className="w-2.5 h-2.5 text-amber-500" /> Salvos
                          </span>
                          <span className="font-extrabold text-foreground text-[10px]">
                            {m?.saved || 0}
                          </span>
                        </div>

                        <div className="p-1 rounded-md bg-muted/30" title="Compartilhamentos / Reposts">
                          <span className="text-muted-foreground block text-[8px] flex items-center justify-center gap-0.5">
                            <Share2 className="w-2.5 h-2.5 text-sky-500" /> Shares
                          </span>
                          <span className="font-extrabold text-foreground text-[10px]">
                            {m?.shares || 0}
                          </span>
                        </div>
                      </div>

                      {/* Botão de Ver Detalhes */}
                      <button
                        type="button"
                        onClick={() => setSelectedPostDetail(post)}
                        className="w-full py-1 text-center text-[10px] font-bold text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                      >
                        Ver Detalhes do Conteúdo →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* MODO TABELA ANALÍTICA DE PERFORMANCE */
            <div className="rounded-xl border border-border/70 overflow-hidden max-h-[56vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-bold tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                  <tr className="border-b border-border/70">
                    <th className="p-2.5">Conteúdo</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5 text-right">Views</th>
                    <th className="p-2.5 text-right">Alcance</th>
                    <th className="p-2.5 text-right">Likes</th>
                    <th className="p-2.5 text-right">Coment.</th>
                    <th className="p-2.5 text-right">Salvos</th>
                    <th className="p-2.5 text-right">Shares</th>
                    <th className="p-2.5 text-right">Seguidores</th>
                    <th className="p-2.5 text-right">Engaj. (%)</th>
                    <th className="p-2.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card">
                  {filteredSortedPosts.map((post) => {
                    const isVideo = post.media_type === "VIDEO";
                    const isCarousel = post.media_type === "CAROUSEL_ALBUM";
                    const m = post.metrics;

                    return (
                      <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2 max-w-xs">
                            <img
                              src={post.thumbnail_url || post.media_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80"}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-foreground truncate block">
                                {post.caption || "Sem legenda"}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                {formatRelativeDate(post.timestamp)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-2.5">
                          {isVideo ? (
                            <Badge variant="outline" className="bg-pink-500/10 text-pink-600 border-pink-500/30 text-[9px] px-1.5 py-0 font-bold">
                              Reels
                            </Badge>
                          ) : isCarousel ? (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[9px] px-1.5 py-0 font-bold">
                              Carrossel
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[9px] px-1.5 py-0 font-bold">
                              Post
                            </Badge>
                          )}
                        </td>

                        <td className="p-2.5 text-right font-extrabold text-foreground">
                          {formatNumber(m?.views || 0)}
                        </td>

                        <td className="p-2.5 text-right font-medium text-muted-foreground">
                          {formatNumber(m?.reach || 0)}
                        </td>

                        <td className="p-2.5 text-right font-medium text-pink-600 dark:text-pink-400">
                          {formatNumber(m?.likes || 0)}
                        </td>

                        <td className="p-2.5 text-right font-medium text-muted-foreground">
                          {m?.comments || 0}
                        </td>

                        <td className="p-2.5 text-right font-medium text-muted-foreground">
                          {m?.saved || 0}
                        </td>

                        <td className="p-2.5 text-right font-medium text-muted-foreground">
                          {m?.shares || 0}
                        </td>

                        <td className="p-2.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                          +{m?.newFollowers || 0}
                        </td>

                        <td className="p-2.5 text-right font-extrabold">
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                            {m?.engagementRate}%
                          </span>
                        </td>

                        <td className="p-2.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedPostDetail(post)}
                            className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                          >
                            Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA: PÚBLICO COMPLETO */}
      {activeTab === "AUDIENCE" && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Gênero Completo */}
            <div className="p-3 rounded-xl border border-border/50 bg-card space-y-2">
              <span className="font-bold text-xs text-foreground block">Gênero dos Seguidores</span>
              <div className="w-24 h-24 mx-auto relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderPieData} innerRadius={28} outerRadius={42} paddingAngle={4} dataKey="value">
                      {genderPieData.map((entry, index) => (
                        <Cell key={`cell-aud-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-[11px]">Homens ({audience.gender.menCount})</span>
                  <span className="font-extrabold">{audience.gender.menPct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-[11px]">Mulheres ({audience.gender.womenCount})</span>
                  <span className="font-extrabold">{audience.gender.womenPct}%</span>
                </div>
              </div>
            </div>

            {/* 2. Faixa Etária Completa */}
            <div className="p-3 rounded-xl border border-border/50 bg-card space-y-1.5">
              <span className="font-bold text-xs text-foreground block">Todas as Faixas de Idade</span>
              <div className="space-y-1 pt-1">
                {audience.ageRanges.map((age) => (
                  <div key={age.range} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-8 text-muted-foreground shrink-0">{age.range}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full rounded-full bg-pink-500" style={{ width: `${Math.min(100, age.pct * 2.8)}%` }} />
                    </div>
                    <span className="w-8 text-right font-bold shrink-0">{age.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Localizações */}
            <div className="p-3 rounded-xl border border-border/50 bg-card space-y-2">
              <span className="font-bold text-xs text-foreground block">Localizações Principais</span>
              <div className="space-y-2 pt-1">
                {audience.locations.map((loc) => (
                  <div key={loc.code} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{loc.name}</span>
                      <span className="font-extrabold">{loc.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full rounded-full bg-pink-500" style={{ width: `${Math.min(100, loc.pct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Horários de Atividade e Melhores Dias */}
            <div className="p-3 rounded-xl border border-border/50 bg-card space-y-2 flex flex-col justify-between">
              <span className="font-bold text-xs text-foreground block">Pico de Engajamento</span>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={audience.activityHours} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "#888888" }} />
                    <Bar dataKey="value" fill="#ec4899" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-700 dark:text-purple-300 font-medium leading-tight">
                <span className="font-bold block">Melhor horário para postar:</span>
                <span>{audience.peakActivityText}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. BOTTOM ACTION BAR: VER FEED, ESTRATÉGIA, ATUALIZAR    */}
      {/* ======================================================== */}
      <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => onOpenFeed(account)}
            className="h-7 sm:h-8 px-3 text-xs font-bold bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white hover:opacity-95 shadow-xs rounded-xl border-0 gap-1.5 cursor-pointer transition-transform active:scale-95"
          >
            <Instagram className="w-3.5 h-3.5" /> Ver Feed Completo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenBriefing(account)}
            className="h-7 sm:h-8 px-2.5 text-xs font-semibold rounded-xl border-border hover:bg-muted gap-1.5 cursor-pointer"
          >
            <Target className="w-3 h-3 text-amber-500" /> Estratégia
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadInsights(periodDays, true);
              loadFeed(true);
            }}
            className="h-7 sm:h-8 px-2.5 text-xs font-semibold rounded-xl border-border text-primary hover:bg-primary/10 gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-3 h-3 text-primary" /> Recarregar Métricas
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={loadingInsights || isSyncing || loadingFeed}
            className="h-7 sm:h-8 w-7 sm:w-8 rounded-xl border-border hover:bg-muted cursor-pointer"
            title="Sincronizar métricas e dados com a Meta"
          >
            <RefreshCw className={`w-3 h-3 ${loadingInsights || isSyncing || loadingFeed ? "animate-spin text-pink-500" : ""}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 sm:h-8 w-7 sm:w-8 rounded-xl border-border hover:bg-muted cursor-pointer"
                title="Mais opções"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              {onCheckHealth && (
                <DropdownMenuItem onClick={() => onCheckHealth(account.id)} className="gap-2 cursor-pointer">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Testar Conexão Meta
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => window.open(`https://instagram.com/${account.username}`, "_blank")}
                className="gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir no Instagram
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. MODAL DE DETALHES DO CONTEÚDO INDIVIDUAL              */}
      {/* ======================================================== */}
      {selectedPostDetail && (
        <Dialog open={!!selectedPostDetail} onOpenChange={(open) => !open && setSelectedPostDetail(null)}>
          <DialogContent className="sm:max-w-[580px] rounded-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {selectedPostDetail.media_type === "VIDEO" ? "🎬 Reels" : selectedPostDetail.media_type === "CAROUSEL_ALBUM" ? "📑 Carrossel" : "📸 Post"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatRelativeDate(selectedPostDetail.timestamp)}</span>
                </div>
                {selectedPostDetail.permalink && (
                  <a
                    href={selectedPostDetail.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-pink-600 hover:underline flex items-center gap-1"
                  >
                    <span>Abrir no Instagram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <DialogTitle className="text-sm font-bold text-foreground pt-1">
                Performance Individual do Conteúdo
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              {/* Mídia */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50">
                <img
                  src={selectedPostDetail.thumbnail_url || selectedPostDetail.media_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Legenda */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs text-foreground max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {selectedPostDetail.caption || "Sem legenda"}
              </div>

              {/* Grade Detalhada de Métricas da Meta */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Todas as Métricas Oficiais da Meta
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Visualizações / Plays</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      {formatNumber(selectedPostDetail.metrics?.views || 0)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Alcance (Contas)</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-purple-500" />
                      {formatNumber(selectedPostDetail.metrics?.reach || 0)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Novos Seguidores</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      +{selectedPostDetail.metrics?.newFollowers || 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Taxa Engajamento</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-pink-500" />
                      {selectedPostDetail.metrics?.engagementRate}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Curtidas</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-pink-500" />
                      {formatNumber(selectedPostDetail.metrics?.likes || 0)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Comentários</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                      {selectedPostDetail.metrics?.comments || 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Salvamentos</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1">
                      <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                      {selectedPostDetail.metrics?.saved || 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Compartilhamentos</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5 text-sky-500" />
                      {selectedPostDetail.metrics?.shares || 0}
                    </span>
                  </div>
                </div>

                {selectedPostDetail.metrics?.avgWatchTimeSeconds !== undefined && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
                    <span className="text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      Tempo Médio de Retenção de Vídeo (Watch Time):
                    </span>
                    <span className="font-extrabold text-purple-700 dark:text-purple-300">
                      {selectedPostDetail.metrics.avgWatchTimeSeconds} segundos
                    </span>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
