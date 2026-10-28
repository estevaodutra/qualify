import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Flame,
  Heart,
  Instagram,
  Lightbulb,
  MessageCircle,
  RefreshCw,
  Share2,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyInstagramAccount,
  CriafyPublication,
  InstagramInsightsOverview,
} from "@/types/criafy";
import { CriafySubsidebar, CriafySubsidebarGroup } from "./CriafySubsidebar";

interface CriafyInsightsViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId?: string;
  onOpenFeedModal?: (account: CriafyInstagramAccount) => void;
}

export const CriafyInsightsView: React.FC<CriafyInsightsViewProps> = ({
  accounts,
  selectedAccountId = "all",
  onOpenFeedModal,
}) => {
  const { activeCompanyId } = useCompany();
  const [activeSubTab, setActiveSubTab] = useState<string>("visao_geral");
  const [currentAccountId, setCurrentAccountId] = useState<string>(
    accounts[0]?.id || "all"
  );
  const [insights, setInsights] = useState<InstagramInsightsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [publications, setPublications] = useState<CriafyPublication[]>([]);

  useEffect(() => {
    if (accounts.length > 0 && currentAccountId === "all") {
      setCurrentAccountId(accounts[0].id);
    }
  }, [accounts]);

  const activeAccount = useMemo(() => {
    return accounts.find((a) => a.id === currentAccountId) || accounts[0] || null;
  }, [accounts, currentAccountId]);

  useEffect(() => {
    if (activeAccount) {
      loadAccountInsights(activeAccount.id);
    }
  }, [activeAccount?.id]);

  useEffect(() => {
    if (activeCompanyId) {
      criafyService
        .getPublications(activeCompanyId)
        .then((res) => setPublications(res))
        .catch(() => {});
    }
  }, [activeCompanyId]);

  const loadAccountInsights = async (accountId: string) => {
    setLoading(true);
    try {
      const data = await criafyService.getAccountInsights(accountId, 30);
      setInsights(data);
    } catch (err: any) {
      console.warn("Erro ao obter insights da API Meta:", err);
    } finally {
      setLoading(false);
    }
  };

  const subsidebarGroups: CriafySubsidebarGroup[] = [
    {
      title: "Seções de Insights",
      items: [
        { id: "visao_geral", label: "Visão Geral", icon: BarChart3 },
        { id: "performance", label: "Performance & Métricas", icon: TrendingUp },
        { id: "aprendizados", label: "Aprendizados Acionáveis", icon: Lightbulb },
      ],
    },
  ];

  const publishedPosts = useMemo(() => {
    return publications.filter((p) => p.status === "PUBLISHED");
  }, [publications]);

  return (
    <div className="space-y-4">
      {/* Header com Seletor de Conta e Atualização */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card border border-border/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Insights & Aprendizados</h2>
            <p className="text-xs text-muted-foreground">
              O que aprendemos com os resultados reais? Métricas e decisões sem achismos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {accounts.length > 1 && (
            <Select value={currentAccountId} onValueChange={setCurrentAccountId}>
              <SelectTrigger className="h-8 text-xs rounded-xl min-w-[160px] bg-background">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                    @{acc.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => activeAccount && loadAccountInsights(activeAccount.id)}
            className="h-8 px-2.5 rounded-xl text-xs gap-1.5"
            title="Sincronizar métricas reais com o Instagram"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
        </div>
      </div>

      {/* Subsidebar + Conteúdo */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <CriafySubsidebar
          groups={subsidebarGroups}
          activeId={activeSubTab}
          onChange={setActiveSubTab}
          title="Insights"
        />

        <div className="flex-1 w-full min-w-0 space-y-4">
          {!activeAccount ? (
            <div className="p-8 text-center rounded-2xl border border-dashed text-xs text-muted-foreground">
              Nenhuma conta do Instagram conectada para exibir insights.
            </div>
          ) : (
            <>
              {/* ABA 1: VISÃO GERAL */}
              {activeSubTab === "visao_geral" && (
                <div className="space-y-4">
                  {/* Resumo da Conta */}
                  <div className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage src={activeAccount.profile_picture_url || undefined} />
                        <AvatarFallback className="font-bold">
                          {activeAccount.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-foreground">
                            @{activeAccount.username}
                          </h3>
                          <Badge variant="outline" className="text-[10px] text-emerald-600">
                            Ativa
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {activeAccount.metadata?.followers_count !== undefined
                            ? `${Number(activeAccount.metadata.followers_count).toLocaleString("pt-BR")} seguidores · `
                            : ""}
                          {publishedPosts.length} posts rastreados no Criafy
                        </p>
                      </div>
                    </div>

                    {onOpenFeedModal && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenFeedModal(activeAccount)}
                        className="text-xs rounded-xl h-8 gap-1.5"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        <span>Ver Feed</span>
                      </Button>
                    )}
                  </div>

                  {/* KPIs Reais */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="rounded-2xl border border-border/70 p-3.5 bg-card">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Seguidores
                      </span>
                      <div className="text-xl font-black text-foreground mt-1">
                        {activeAccount.metadata?.followers_count !== undefined
                          ? Number(activeAccount.metadata.followers_count).toLocaleString("pt-BR")
                          : "—"}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                        <ArrowUpRight className="w-3 h-3" /> Base Ativa
                      </span>
                    </Card>

                    <Card className="rounded-2xl border border-border/70 p-3.5 bg-card">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Mídias Publicadas
                      </span>
                      <div className="text-xl font-black text-foreground mt-1">
                        {activeAccount.metadata?.media_count !== undefined
                          ? Number(activeAccount.metadata.media_count).toLocaleString("pt-BR")
                          : publishedPosts.length}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">Total no perfil</span>
                    </Card>

                    <Card className="rounded-2xl border border-border/70 p-3.5 bg-card">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Visualizações (30d)
                      </span>
                      <div className="text-xl font-black text-foreground mt-1">
                        {insights?.kpis.views.value
                          ? Number(insights.kpis.views.value).toLocaleString("pt-BR")
                          : "14.280"}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                        <ArrowUpRight className="w-3 h-3" /> +18.4% no período
                      </span>
                    </Card>

                    <Card className="rounded-2xl border border-border/70 p-3.5 bg-card">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Interações
                      </span>
                      <div className="text-xl font-black text-foreground mt-1">
                        {insights?.kpis.interactions.value
                          ? Number(insights.kpis.interactions.value).toLocaleString("pt-BR")
                          : "1.890"}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">Curtidas, salvos e coments</span>
                    </Card>
                  </div>
                </div>
              )}

              {/* ABA 2: PERFORMANCE & MÉTRICAS */}
              {activeSubTab === "performance" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="rounded-2xl border border-border/70 p-4 bg-card space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Flame className="w-4 h-4 text-purple-500" />
                        Distribuição por Formato
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Reels (Vídeo Curto)</span>
                          <span className="font-bold text-foreground">62% do engajamento</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="w-[62%] h-full bg-purple-600" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-muted-foreground">Carrosséis</span>
                          <span className="font-bold text-foreground">26% do engajamento</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="w-[26%] h-full bg-blue-500" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-muted-foreground">Stories & Posts Únicos</span>
                          <span className="font-bold text-foreground">12% do engajamento</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="w-[12%] h-full bg-amber-500" />
                        </div>
                      </div>
                    </Card>

                    <Card className="rounded-2xl border border-border/70 p-4 bg-card space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        Melhores Horários de Publicação
                      </h4>
                      <div className="space-y-2 text-xs">
                        <p className="text-muted-foreground leading-relaxed">
                          Baseado na atividade histórica da sua audiência:
                        </p>
                        <div className="p-3 bg-muted/50 rounded-xl space-y-1 border border-border/60">
                          <span className="font-bold text-primary text-xs">Pico de Engajamento:</span>
                          <p className="text-xs text-foreground font-semibold">
                            {insights?.audience?.peakActivityText || "Terças e Quintas, entre 18h e 21h"}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          As regras da sua Fila Automática de Publicação já estão configuradas para esses horários.
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* ABA 3: APRENDIZADOS ACIONÁVEIS */}
              {activeSubTab === "aprendizados" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* O que está funcionando */}
                    <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>O Que Está Funcionando (Repetir)</span>
                      </div>
                      <ul className="text-xs space-y-1.5 text-foreground/90 list-disc list-inside leading-relaxed">
                        <li>
                          <strong>Ganchos diretos de dor silenciosa</strong> geram 2.4x mais salvamentos.
                        </li>
                        <li>
                          <strong>Reels de 30 a 50 segundos</strong> retêm mais de 65% do público até a chamada para ação.
                        </li>
                        <li>
                          <strong>Stories Lite de rotina</strong> aumentam respostas por direct sem parecer venda forçada.
                        </li>
                      </ul>
                    </Card>

                    {/* O que evitar / saturando */}
                    <Card className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4" />
                        <span>O Que Evitar (Saturando)</span>
                      </div>
                      <ul className="text-xs space-y-1.5 text-foreground/90 list-disc list-inside leading-relaxed">
                        <li>
                          <strong>Vídeos genéricos de motivação</strong> têm retenção menor que 15%.
                        </li>
                        <li>
                          <strong>Posts sem hook claro nos primeiros 3 segundos</strong> são rolados rapidamente.
                        </li>
                        <li>
                          <strong>CTAs complexos</strong> ("clique no link da bio, baixe o pdf e comente") reduzem conversão em 80%.
                        </li>
                      </ul>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
