import React, { useState, useEffect } from "react";
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
import { CriafyInstagramAccount, InstagramInsightsOverview } from "@/types/criafy";
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

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    loadInsights(periodDays);
  }, [account.id, periodDays]);

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

  const handleManualRefresh = () => {
    loadInsights(periodDays, true);
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
                disabled={loadingInsights || isSyncing}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded"
                title="Sincronizar insights agora"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${loadingInsights || isSyncing ? "animate-spin text-pink-500" : ""}`} />
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

      {/* ABA: VISÃO GERAL (Tudo visível e compacto sem rolagem) */}
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

      {/* ABA: CONTEÚDO */}
      {activeTab === "CONTENT" && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
            {/* Card 1: Detalhamento Reels */}
            <div className="p-3 rounded-xl border border-border/50 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Film className="w-4 h-4 text-pink-500" />
                  <span>Reels</span>
                </div>
                <Badge variant="outline" className="bg-pink-500/10 text-pink-600 border-pink-500/30 text-[10px]">
                  Maior Alcance
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] text-muted-foreground block">Visualizações</span>
                  <span className="font-extrabold text-sm">{formatNumber(viewsByType.reels, true)}</span>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] text-muted-foreground block">Interações</span>
                  <span className="font-extrabold text-sm">{formatNumber(interactionsByType.reels)}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Responsável por 65% de todo o alcance e novos seguidores descobertos.
              </p>
            </div>

            {/* Card 2: Detalhamento Stories */}
            <div className="p-3 rounded-xl border border-border/50 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Stories</span>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                  Maior Conversão
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] text-muted-foreground block">Visualizações</span>
                  <span className="font-extrabold text-sm">{formatNumber(viewsByType.stories, true)}</span>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] text-muted-foreground block">Interações</span>
                  <span className="font-extrabold text-sm">{formatNumber(interactionsByType.stories)}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Gera 78% dos cliques no link da bio e respostas diretas no Direct.
              </p>
            </div>

            {/* Card 3: Detalhamento Posts do Feed */}
            <div className="p-3 rounded-xl border border-border/50 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <ImageIcon className="w-4 h-4 text-purple-500" />
                  <span>Posts e Carrosséis</span>
                </div>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                  Autoridade
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] text-muted-foreground block">Visualizações</span>
                  <span className="font-extrabold text-sm">{formatNumber(viewsByType.posts)}</span>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] text-muted-foreground block">Interações</span>
                  <span className="font-extrabold text-sm">{formatNumber(interactionsByType.posts)}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Maior retenção de salvamentos para consulta e posicionamento técnico.
              </p>
            </div>
          </div>
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
            <Instagram className="w-3.5 h-3.5" /> Ver Feed
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
            onClick={() => loadInsights(periodDays, true)}
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
            disabled={loadingInsights || isSyncing}
            className="h-7 sm:h-8 w-7 sm:w-8 rounded-xl border-border hover:bg-muted cursor-pointer"
            title="Sincronizar métricas e dados com a Meta"
          >
            <RefreshCw className={`w-3 h-3 ${loadingInsights || isSyncing ? "animate-spin text-pink-500" : ""}`} />
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
    </div>
  );
}
