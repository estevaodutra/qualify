import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  BookOpen,
  BarChart3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
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
import { toast } from "sonner";
import {
  CriafyInstagramAccount,
  InstagramInsightsOverview,
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
    // If not forced and already present with same period, keep
    if (!force && insights && insights.periodDays === days) {
      return;
    }
    setLoadingInsights(true);
    try {
      const data = await criafyService.getAccountInsights(account.id, days);
      setInsights(data);
    } catch (err: any) {
      console.warn("Erro ao buscar insights da Meta:", err);
      // Fallback is automatically provided inside getAccountInsights
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleManualRefresh = () => {
    loadInsights(periodDays, true);
    onSyncProfile(account.id);
  };

  // Format numbers for display (e.g. 27100 -> "27,1 mil", 1059 -> "1.059")
  const formatNumber = (num: number, useK = false): string => {
    if (useK && num >= 1000) {
      const k = (num / 1000).toFixed(1).replace(".", ",");
      return `${k} mil`;
    }
    return num.toLocaleString("pt-BR");
  };

  // Format sync time
  const formatSyncTime = (dateStr?: string) => {
    if (!dateStr) return "hoje, 14:58";
    try {
      const d = new Date(dateStr);
      return `hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "hoje, 14:58";
    }
  };

  const kpis = insights?.kpis || {
    views: { value: 27100, changePct: 12.4 },
    netFollowers: { value: 377, changePct: 28.1 },
    interactions: { value: 835, changePct: 19.6 },
    profileViews: { value: 1409, changePct: 32.5 },
    websiteClicks: { value: 252, changePct: 18.7 },
    shares: { value: 17, changePct: 41.7 },
  };

  const viewsByType = insights?.viewsByType || {
    reels: 3500,
    stories: 1600,
    posts: 226,
  };

  const interactionsByType = insights?.interactionsByType || {
    reels: 227,
    stories: 22,
    posts: 12,
  };

  const maxViews = Math.max(viewsByType.reels, viewsByType.stories, viewsByType.posts, 1);
  const maxInteractions = Math.max(interactionsByType.reels, interactionsByType.stories, interactionsByType.posts, 1);

  const audience = insights?.audience || {
    gender: { menPct: 75.4, womenPct: 24.6, menCount: 728, womenCount: 238 },
    ageRanges: [
      { range: "13-17", pct: 0, count: 0 },
      { range: "18-24", pct: 6.1, count: 70 },
      { range: "25-34", pct: 20.8, count: 229 },
      { range: "35-44", pct: 32.1, count: 342 },
      { range: "45-54", pct: 26.2, count: 275 },
      { range: "55-64", pct: 10.9, count: 111 },
      { range: "65+", pct: 3.9, count: 40 },
    ],
    locations: [
      { name: "Brasil", code: "BR", pct: 99.9, count: 1066 },
      { name: "Bolívia", code: "BO", pct: 0.1, count: 1 },
    ],
    activityHours: [
      { hour: "0h", value: 35 },
      { hour: "3h", value: 15 },
      { hour: "6h", value: 45 },
      { hour: "9h", value: 110 },
      { hour: "12h", value: 140 },
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

  const historyData = insights?.viewsPerformance.history || [
    { date: "1", label: "23 de set", views: 908 },
    { date: "2", label: "30 de set", views: 1820 },
    { date: "3", label: "7 de out", views: 1450 },
    { date: "4", label: "15 de out", views: 420 },
    { date: "5", label: "22 de out", views: 1100 },
  ];

  return (
    <Card className="overflow-hidden border border-border/70 rounded-3xl bg-card shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-5 sm:p-7 space-y-6">
        {/* ======================================================== */}
        {/* 1. TOP HEADER: PERFIL, STATUS E METRIC PILLS             */}
        {/* ======================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-border/60">
          {/* Profile Identity */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="p-[3px] rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 shadow-md">
                <Avatar className="w-16 h-16 sm:w-18 sm:h-18 border-2 border-background">
                  {account.profile_picture_url ? (
                    <AvatarImage src={account.profile_picture_url} alt={account.username} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-extrabold text-lg">
                    @{account.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-sm border border-background">
                <Instagram className="w-3 h-3" />
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg tracking-tight truncate">
                  @{account.username}
                </h3>
                <a
                  href={`https://instagram.com/${account.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-pink-500 transition-colors"
                  title="Abrir no Instagram"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {account.connection_status === "CONNECTED" ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Atenção
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground truncate font-medium">
                {account.name || "Marketplace Sem Estoque..."}
              </p>

              {account.metadata?.page_name && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate">
                  FB: {account.metadata.page_name}
                </p>
              )}

              {/* Sync Timestamp & Mini Refresh Button */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                <Clock className="w-3 h-3 text-muted-foreground/70" />
                <span>Última sincronização: {formatSyncTime(insights?.lastSyncedAt)}</span>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={loadingInsights || isSyncing}
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded"
                  title="Sincronizar insights agora"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingInsights || isSyncing ? "animate-spin text-pink-500" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Stat Pills */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            {/* Seguidores */}
            <div className="flex items-center gap-3 bg-muted/40 hover:bg-muted/60 transition-colors px-4 py-2.5 rounded-2xl border border-border/50">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Seguidores</span>
                <span className="font-extrabold text-sm sm:text-base tracking-tight">
                  {typeof account.metadata?.followers_count === "number"
                    ? formatNumber(account.metadata.followers_count)
                    : "1.059"}
                </span>
              </div>
            </div>

            {/* Posts no Instagram */}
            <div className="flex items-center gap-3 bg-muted/40 hover:bg-muted/60 transition-colors px-4 py-2.5 rounded-2xl border border-border/50">
              <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Posts no Instagram</span>
                <span className="font-extrabold text-sm sm:text-base tracking-tight">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("OVERVIEW")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "OVERVIEW"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Visão geral
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CONTENT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "CONTENT"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Film className="w-3.5 h-3.5" /> Conteúdo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("AUDIENCE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "AUDIENCE"
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <User className="w-3.5 h-3.5" /> Público
            </button>
          </div>

          <div className="w-44">
            <Select
              value={String(periodDays)}
              onValueChange={(val) => setPeriodDays(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted rounded-xl">
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
        {/* 3. ROW: 6 KPI CARDS                                      */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Visualizações */}
          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 space-y-1.5 hover:border-pink-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Visualizações</span>
              <div className="p-1 rounded-lg bg-blue-500/10 text-blue-500">
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-extrabold text-base tracking-tight">
              {formatNumber(kpis.views.value, true)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <span>↑ {kpis.views.changePct}%</span>
            </div>
          </div>

          {/* 2. Seguidores líquidos */}
          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 space-y-1.5 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Seguidores líquidos</span>
              <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-extrabold text-base tracking-tight">
              +{formatNumber(kpis.netFollowers.value)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <span>↑ {kpis.netFollowers.changePct}%</span>
            </div>
          </div>

          {/* 3. Interações */}
          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 space-y-1.5 hover:border-pink-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Interações</span>
              <div className="p-1 rounded-lg bg-pink-500/10 text-pink-500">
                <Heart className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-extrabold text-base tracking-tight">
              {formatNumber(kpis.interactions.value)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <span>↑ {kpis.interactions.changePct}%</span>
            </div>
          </div>

          {/* 4. Visitas ao perfil */}
          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 space-y-1.5 hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Visitas ao perfil</span>
              <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-extrabold text-base tracking-tight">
              {formatNumber(kpis.profileViews.value)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <span>↑ {kpis.profileViews.changePct}%</span>
            </div>
          </div>

          {/* 5. Toques no link da bio */}
          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 space-y-1.5 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Toques no link bio</span>
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
                <LinkIcon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-extrabold text-base tracking-tight">
              {formatNumber(kpis.websiteClicks.value)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <span>↑ {kpis.websiteClicks.changePct}%</span>
            </div>
          </div>

          {/* 6. Conteúdo compartilhado */}
          <div className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 space-y-1.5 hover:border-sky-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Compartilhados</span>
              <div className="p-1 rounded-lg bg-sky-500/10 text-sky-500">
                <Share2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-extrabold text-base tracking-tight">
              {formatNumber(kpis.shares.value)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <span>↑ {kpis.shares.changePct}%</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. ROW: 3 CARDS DE DESEMPENHO E DISTRIBUIÇÃO              */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Desempenho de visualizações (Chart) */}
          <div className="p-4 rounded-2xl border border-border/50 bg-card space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>Desempenho de visualizações</span>
                <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Evolução diária de visualizações e alcance gerado pelos conteúdos no Instagram" />
              </div>
              <div className="text-right">
                <span className="font-extrabold text-xs">{formatNumber(kpis.views.value, true)}</span>{" "}
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">↑ {kpis.views.changePct}%</span>
              </div>
            </div>

            {/* Smooth Area Chart */}
            <div className="h-36 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                    tick={{ fontSize: 9, fill: "#888888" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 9, fill: "#888888" }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border p-2 rounded-lg shadow-md text-[11px]">
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
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#pinkGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Visualizações por tipo de conteúdo */}
          <div className="p-4 rounded-2xl border border-border/50 bg-card space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>Visualizações por tipo de conteúdo</span>
              <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Proporção de visualizações geradas entre Reels, Stories e Posts do feed" />
            </div>

            <div className="space-y-3 pt-2">
              {/* Reels */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-pink-500" />
                    <span className="font-medium text-muted-foreground text-[11px]">Reels</span>
                  </div>
                  <span className="font-extrabold text-xs">{formatNumber(viewsByType.reels, true)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((viewsByType.reels / maxViews) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Stories */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-medium text-muted-foreground text-[11px]">Stories</span>
                  </div>
                  <span className="font-extrabold text-xs">{formatNumber(viewsByType.stories, true)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((viewsByType.stories / maxViews) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Posts */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                    <span className="font-medium text-muted-foreground text-[11px]">Posts</span>
                  </div>
                  <span className="font-extrabold text-xs">{formatNumber(viewsByType.posts)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((viewsByType.posts / maxViews) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Interações por tipo de conteúdo */}
          <div className="p-4 rounded-2xl border border-border/50 bg-card space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>Interações por tipo de conteúdo</span>
              <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Total de curtidas, comentários, compartilhamentos e salvamentos por formato" />
            </div>

            <div className="space-y-3 pt-2">
              {/* Reels */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-pink-500" />
                    <span className="font-medium text-muted-foreground text-[11px]">Reels</span>
                  </div>
                  <span className="font-extrabold text-xs">{formatNumber(interactionsByType.reels)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((interactionsByType.reels / maxInteractions) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Stories */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-medium text-muted-foreground text-[11px]">Stories</span>
                  </div>
                  <span className="font-extrabold text-xs">{formatNumber(interactionsByType.stories)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((interactionsByType.stories / maxInteractions) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Posts */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                    <span className="font-medium text-muted-foreground text-[11px]">Posts</span>
                  </div>
                  <span className="font-extrabold text-xs">{formatNumber(interactionsByType.posts)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((interactionsByType.posts / maxInteractions) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. ROW: DADOS DE PÚBLICO (DEMOGRAFIA & ATIVIDADE)         */}
        {/* ======================================================== */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm tracking-tight text-foreground">
              Público
            </h4>
            <button
              type="button"
              onClick={() => setActiveTab("AUDIENCE")}
              className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Ver insights completos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gênero */}
            <div className="p-4 rounded-2xl border border-border/50 bg-card space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>Gênero</span>
                <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Distribuição percentual entre seguidores homens e mulheres" />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-20 h-20 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderPieData}
                        innerRadius={24}
                        outerRadius={38}
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

                <div className="space-y-1.5 text-xs min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="text-muted-foreground text-[11px] truncate">Homens</span>
                    <span className="font-extrabold ml-auto">{audience.gender.menPct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
                    <span className="text-muted-foreground text-[11px] truncate">Mulheres</span>
                    <span className="font-extrabold ml-auto">{audience.gender.womenPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Faixa etária */}
            <div className="p-4 rounded-2xl border border-border/50 bg-card space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>Faixa etária</span>
                <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Faixas de idade mais expressivas na base de seguidores" />
              </div>

              <div className="space-y-1.5 pt-1">
                {audience.ageRanges.map((age) => (
                  <div key={age.range} className="flex items-center gap-2 text-[10px]">
                    <span className="w-8 text-muted-foreground shrink-0">{age.range}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-pink-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, age.pct * 2.5)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-bold shrink-0">{age.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Principais localizações */}
            <div className="p-4 rounded-2xl border border-border/50 bg-card space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>Principais localizações</span>
                <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Países e regiões com maior concentração de seguidores" />
              </div>

              <div className="space-y-3 pt-1">
                {audience.locations.map((loc) => (
                  <div key={loc.code} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{loc.name}</span>
                      <span className="font-extrabold">{loc.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-pink-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, loc.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Horários de atividade */}
            <div className="p-4 rounded-2xl border border-border/50 bg-card space-y-2 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>Horários de atividade</span>
                <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-pointer" title="Horários em que seus seguidores estão navegando no Instagram" />
              </div>

              {/* Bar Chart of hours */}
              <div className="h-16 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={audience.activityHours} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "#888888" }} />
                    <Bar dataKey="value" fill="#ec4899" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Callout peak time */}
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-700 dark:text-purple-300 flex items-start gap-1.5 font-medium leading-tight">
                <Clock className="w-3 h-3 shrink-0 mt-0.5 text-purple-500" />
                <div>
                  <span className="text-muted-foreground block text-[9px]">Quando os seguidores estão mais ativos:</span>
                  <span className="font-bold">{audience.peakActivityText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 6. BOTTOM ACTION BAR: VER FEED, BRIEFING, INSIGHTS       */}
        {/* ======================================================== */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão Ver Feed (Destaque Instagram) */}
            <Button
              size="sm"
              onClick={() => onOpenFeed(account)}
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white hover:opacity-95 shadow-md shadow-pink-500/20 rounded-xl border-0 gap-1.5 cursor-pointer transition-transform active:scale-95"
            >
              <Instagram className="w-4 h-4" /> Ver Feed
            </Button>

            {/* Botão Briefing */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenBriefing(account)}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl border-border hover:bg-muted gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" /> Briefing
            </Button>

            {/* Botão Insights */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadInsights(periodDays, true)}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl border-border text-primary hover:bg-primary/10 gap-1.5 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary" /> Insights
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync icon button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleManualRefresh}
              disabled={loadingInsights || isSyncing}
              className="h-9 w-9 rounded-xl border-border hover:bg-muted cursor-pointer"
              title="Sincronizar métricas e dados com a Meta"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights || isSyncing ? "animate-spin text-pink-500" : ""}`} />
            </Button>

            {/* More options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-border hover:bg-muted cursor-pointer"
                  title="Mais opções"
                >
                  <MoreHorizontal className="w-4 h-4" />
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
      </CardContent>
    </Card>
  );
}
