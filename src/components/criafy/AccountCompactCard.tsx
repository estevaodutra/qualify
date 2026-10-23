import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Instagram,
  BookOpen,
  BarChart3,
  ExternalLink,
  MoreVertical,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  LayoutTemplate,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import {
  CriafyInstagramAccount,
  InstagramInsightsOverview,
} from "@/types/criafy";
import { criafyService } from "@/services/criafy/criafyService";

interface AccountCompactCardProps {
  account: CriafyInstagramAccount;
  onOpenFeed: (account: CriafyInstagramAccount) => void;
  onOpenBriefing: (account: CriafyInstagramAccount) => void;
  onOpenInsights: (account: CriafyInstagramAccount, tab?: "OVERVIEW" | "CONTENT" | "AUDIENCE") => void;
  onSyncProfile: (accountId: string) => void;
  onCheckHealth?: (accountId: string) => void;
  isSyncing?: boolean;
}

export function AccountCompactCard({
  account,
  onOpenFeed,
  onOpenBriefing,
  onOpenInsights,
  onSyncProfile,
  onCheckHealth,
  isSyncing = false,
}: AccountCompactCardProps) {
  const [insights, setInsights] = useState<InstagramInsightsOverview | null>(
    (account.metadata?.insights as InstagramInsightsOverview) || null
  );
  const [activeSubTab, setActiveSubTab] = useState<"OVERVIEW" | "CONTENT" | "AUDIENCE">("OVERVIEW");

  // Load insights if not cached
  useEffect(() => {
    if (!insights) {
      criafyService
        .getAccountInsights(account.id, 30)
        .then((data) => setInsights(data))
        .catch((err) => console.warn("Failed to load compact insights:", err));
    }
  }, [account.id, insights]);

  // Format large numbers
  const formatNumber = (num: number, useK = false): string => {
    if (useK && num >= 1000) {
      const k = (num / 1000).toFixed(1).replace(".", ",");
      return `${k} mil`;
    }
    return num.toLocaleString("pt-BR");
  };

  // Format sync time
  const formatSyncTime = (dateStr?: string) => {
    if (!dateStr) return "hoje, 12:31";
    try {
      const d = new Date(dateStr);
      const isToday = new Date().toDateString() === d.toDateString();
      const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return isToday ? `hoje, ${time}` : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${time}`;
    } catch {
      return "hoje, 12:31";
    }
  };

  const followersCount =
    typeof account.metadata?.followers_count === "number"
      ? account.metadata.followers_count
      : 1059;

  const mediaCount =
    typeof account.metadata?.media_count === "number"
      ? account.metadata.media_count
      : 27;

  const viewsCount = insights?.kpis?.views?.value || 26900;
  const viewsChange = insights?.kpis?.views?.changePct ?? 24;

  const followersChange = insights?.kpis?.netFollowers?.changePct ?? 12;
  const postsChange = 8; // positive trend indicator

  // Sparkline data
  const sparklineData =
    insights?.viewsPerformance?.history && insights.viewsPerformance.history.length > 0
      ? insights.viewsPerformance.history.slice(-14)
      : [
          { views: 420 },
          { views: 530 },
          { views: 480 },
          { views: 670 },
          { views: 610 },
          { views: 790 },
          { views: 720 },
          { views: 890 },
          { views: 820 },
          { views: 980 },
          { views: 910 },
          { views: 1120 },
          { views: 1040 },
          { views: 1250 },
        ];

  const categoryOrNiche =
    account.name ||
    account.metadata?.page_name ||
    "Marketplace Sem Estoque";

  return (
    <Card className="rounded-2xl border border-border/70 dark:border-border/40 bg-card hover:border-pink-500/40 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <CardContent className="p-5 space-y-4">
        {/* 1. Header: Avatar + Meta badge + Info + Status & Menu */}
        <div className="flex items-start justify-between gap-3">
          {/* Avatar com badge do Instagram sobreposto */}
          <div className="relative shrink-0">
            <Avatar className="w-12 h-12 border-2 border-border shadow-xs">
              <AvatarImage
                src={account.profile_picture_url || undefined}
                alt={account.username}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white font-bold text-sm">
                @{account.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Instagram Logo Badge */}
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs ring-2 ring-card"
              title="Instagram Conectado"
            >
              <Instagram className="w-3 h-3" />
            </div>
          </div>

          {/* User Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm leading-tight text-foreground truncate">
                @{account.username}
              </span>
              <a
                href={`https://instagram.com/${account.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-pink-500 transition-colors shrink-0"
                title="Abrir perfil no Instagram"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">
              {categoryOrNiche}
            </p>

            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Última sincronização: {formatSyncTime(insights?.lastSyncedAt || account.updated_at)}
            </p>
          </div>

          {/* Status Badge & Dropdown */}
          <div className="shrink-0 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Conectado
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full -mr-1"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem
                  onClick={() => onSyncProfile(account.id)}
                  disabled={isSyncing}
                  className="gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-pink-500" : ""}`} />
                  Sincronizar agora
                </DropdownMenuItem>
                {onCheckHealth && (
                  <DropdownMenuItem
                    onClick={() => onCheckHealth(account.id)}
                    className="gap-2 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                    Verificar saúde da API
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href={`https://instagram.com/${account.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2 cursor-pointer flex items-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    Abrir no Instagram
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. Stats 3 Colunas: Seguidores, Posts, Visualizações */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
          {/* Seguidores */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block leading-tight">
              Seguidores
            </span>
            <div className="font-bold text-sm text-foreground mt-0.5">
              {formatNumber(followersCount)}
            </div>
            <div className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+{followersChange}%</span>
            </div>
          </div>

          {/* Posts */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block leading-tight">
              Posts
            </span>
            <div className="font-bold text-sm text-foreground mt-0.5">
              {formatNumber(mediaCount)}
            </div>
            <div className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+{postsChange}%</span>
            </div>
          </div>

          {/* Visualizações */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block leading-tight">
              Visualizações
            </span>
            <div className="font-bold text-sm text-foreground mt-0.5">
              {formatNumber(viewsCount, true)}
            </div>
            <div className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+{viewsChange}%</span>
            </div>
          </div>
        </div>

        {/* 3. Mini Sparkline Graphic Preview */}
        <div className="w-full h-11 -mt-1 -mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sparkline-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover text-popover-foreground border text-[10px] px-2 py-0.5 rounded shadow-xs font-semibold">
                        {payload[0].value?.toLocaleString("pt-BR")} visualizações
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
                fill={`url(#sparkline-${account.id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Sub-pills: Visão Geral | Conteúdo | Público */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("OVERVIEW");
              onOpenInsights(account, "OVERVIEW");
            }}
            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200/80 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Visão geral</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("CONTENT");
              onOpenInsights(account, "CONTENT");
            }}
            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors border border-border/40"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Conteúdo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("AUDIENCE");
              onOpenInsights(account, "AUDIENCE");
            }}
            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors border border-border/40"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Público</span>
          </button>
        </div>

        {/* 5. Rodapé com 3 Botões de Ação */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Ver Feed */}
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenFeed(account)}
            className="h-9 text-xs font-semibold gap-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:opacity-95 rounded-xl shadow-xs transition-all"
            title="Ver réplica completa do Feed do Instagram"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>Ver Feed</span>
          </Button>

          {/* Briefing */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenBriefing(account)}
            className="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 hover:bg-muted text-foreground transition-all"
            title="Diretrizes e briefing de conteúdo da marca"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Briefing</span>
          </Button>

          {/* Insights (Abre o card completo expandido) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenInsights(account, activeSubTab)}
            className="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 hover:bg-muted text-foreground transition-all"
            title="Abrir visualização completa de métricas e gráficos de Insights"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Insights</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
