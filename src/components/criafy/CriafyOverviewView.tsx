import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  ListTodo,
  Mic,
  Plus,
  Rocket,
  Sparkles,
  TrendingUp,
  Video,
  AlertCircle,
  ArrowRight,
  Eye,
  Instagram,
  FileText,
  Kanban,
  Film,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyInstagramAccount,
  CriafyPublication,
  CriafyDemand,
  CriafyPlannerItem,
} from "@/types/criafy";
import { CriafySeedContentCard } from "./CriafySeedContentCard";
import { useSprintOSStore } from "@/features/sprint-os/state/sprintOsStore";

interface CriafyOverviewViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId?: string;
  onSelectAccountFilter?: (accId: string) => void;
  onNavigateTab: (tabId: string, subId?: string) => void;
  onOpenAddAccount?: () => void;
  onOpenScheduleModal?: () => void;
}

export const CriafyOverviewView: React.FC<CriafyOverviewViewProps> = ({
  accounts,
  selectedAccountId = "all",
  onSelectAccountFilter,
  onNavigateTab,
  onOpenAddAccount,
  onOpenScheduleModal,
}) => {
  const navigate = useNavigate();
  const { activeCompanyId, activeCompany } = useCompany();
  const { workspace } = useSprintOSStore();

  const [publications, setPublications] = useState<CriafyPublication[]>([]);
  const [demands, setDemands] = useState<CriafyDemand[]>([]);
  const [plannerItems, setPlannerItems] = useState<CriafyPlannerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCompanyId) return;
    loadDashboardData();
  }, [activeCompanyId]);

  const loadDashboardData = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const pubs = typeof criafyService.getPublications === "function" ? await criafyService.getPublications(activeCompanyId) : [];
      const dems = typeof criafyService.getDemands === "function" ? await criafyService.getDemands(activeCompanyId) : [];
      const plans = typeof criafyService.getPlannerItems === "function" ? await criafyService.getPlannerItems(activeCompanyId) : [];
      setPublications(pubs);
      setDemands(dems);
      setPlannerItems(plans);
    } catch (err) {
      console.error("[CriafyOverview] Erro ao carregar cockpit:", err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const todayStr = new Date().toISOString().slice(0, 10);

  const pendingDemands = useMemo(() => {
    return demands.filter((d) => d.status === "pending" || d.status === "in_progress");
  }, [demands]);

  const waitingUserDemands = useMemo(() => {
    return demands.filter(
      (d) =>
        (d.status === "pending" || d.status === "in_progress") &&
        (d.type === "gravar_video" ||
          d.type === "gravar_audio" ||
          d.type === "aprovar_conteudo" ||
          d.type === "stories_lite")
    );
  }, [demands]);

  const scheduledPublications = useMemo(() => {
    return publications.filter((p) => p.status === "SCHEDULED" && p.scheduled_at);
  }, [publications]);

  const nextPublication = useMemo(() => {
    if (scheduledPublications.length === 0) return null;
    const sorted = [...scheduledPublications].sort(
      (a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()
    );
    return sorted[0];
  }, [scheduledPublications]);

  const brandManualProgress = useMemo(() => {
    const fields = workspace?.brandManual?.fields || [];
    const activeFields = fields.filter((f) => !f.archived && !f.removed);
    const count = activeFields.filter((f) => (f.response || "").trim().length > 15).length;
    return {
      answered: count,
      total: activeFields.length,
      pct: activeFields.length > 0 ? Math.round((count / activeFields.length) * 100) : 0,
    };
  }, [workspace?.brandManual?.fields]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 0. MARCO ZERO: CONTEÚDO SEMENTE */}
      {activeCompanyId && (
        <CriafySeedContentCard
          companyId={activeCompanyId}
          selectedAccountId={selectedAccountId}
          accounts={accounts}
          onNavigateTab={onNavigateTab}
          onOpenAddAccount={onOpenAddAccount}
          onRefreshData={loadDashboardData}
        />
      )}
      {/* Banner de Boas-vindas e Status Operacional */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/80 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider"
              >
                Cockpit Operacional
              </Badge>
              {activeCompany && (
                <span className="text-xs text-muted-foreground font-medium">
                  {activeCompany.name}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Como está a sua operação hoje?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Acompanhe demandas em aberto, plano editorial da semana, próximas publicações e a
              inteligência da marca em um só lugar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
            <Button
              size="sm"
              onClick={() => onNavigateTab("calendario")}
              className="h-9 px-3.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Ver Calendário</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateTab("conteudos")}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold border-border hover:bg-muted gap-1.5 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-primary" />
              <span>Biblioteca de Mídias</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/sprint")}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 gap-1.5 cursor-pointer"
              title="Acessar o quadro Kanban de Demandas e Gravações no Sprint"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Abrir Sprint (Demandas)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de 4 Indicadores Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bloco 1: Publicações Agendadas */}
        <Card className="rounded-2xl border border-border/70 shadow-2xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Agendadas</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {scheduledPublications.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {scheduledPublications.length === 1
                  ? "Publicação pronta na agenda"
                  : "Publicações prontas na agenda"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("calendario")}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>Ver cronograma</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>

        {/* Bloco 2: Estoque de Conteúdos */}
        <Card className="rounded-2xl border border-border/70 shadow-2xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Mídias em Estoque</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Film className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {publications.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Criativos e peças registradas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("conteudos")}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>Explorar biblioteca</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>

        {/* Bloco 3: Gestão no Sprint */}
        <Card className="rounded-2xl border border-border/70 shadow-2xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Sprint OS</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Kanban className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-base font-black text-foreground truncate">
                Quadro de Demandas
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gravações, áudios e tarefas
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/sprint")}
              className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>Acessar quadro</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>

        {/* Bloco 4: Próxima Publicação */}
        <Card className="rounded-2xl border border-border/70 shadow-2xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Próximo Post</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Rocket className="w-4 h-4" />
              </div>
            </div>
            <div>
              {nextPublication ? (
                <>
                  <div className="text-base font-black text-foreground truncate">
                    {new Date(nextPublication.scheduled_at!).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    ·{" "}
                    {new Date(nextPublication.scheduled_at!).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {nextPublication.publication_type} no Instagram
                  </p>
                </>
              ) : (
                <>
                  <div className="text-base font-bold text-muted-foreground">
                    Nenhum agendado
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Fila vazia no momento
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("calendario")}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>Ver cronograma</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Seção Central Dividida: Demandas Prioritárias + Próximos Passos Estratégicos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda (2 cols): Próximas Publicações & Integração Sprint */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Próximas Publicações</h3>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {scheduledPublications.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab("calendario")}
              className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl h-8"
            >
              Ver calendário <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          {scheduledPublications.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 space-y-3">
              <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Nenhuma publicação agendada no momento
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Agende novas postagens no Calendário ou gere ideias e pautas com o Estrategista IA.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateTab("calendario")}
                  className="text-xs font-bold rounded-xl h-8 gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Abrir Calendário</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateTab("estrategista")}
                  className="text-xs font-bold rounded-xl h-8 gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Estrategista IA</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledPublications.slice(0, 5).map((pub) => (
                <div
                  key={pub.id}
                  onClick={() => onNavigateTab("calendario")}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-muted text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      {pub.publication_type === "REELS" ? (
                        <Film className="w-4 h-4" />
                      ) : pub.publication_type === "CAROUSEL" ? (
                        <Layers className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {pub.title || "Publicação do Instagram"}
                        </span>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">
                          {pub.publication_type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {pub.scheduled_at
                          ? `Agendado para ${new Date(pub.scheduled_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })} às ${new Date(pub.scheduled_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "Na fila de publicação"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Banner de Integração com o Sprint */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0 shadow-xs">
                <Kanban className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-foreground">
                  Demandas e Execuções no Sprint
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Suas tarefas de gravação, áudios e aprovações estão organizadas no quadro Kanban.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/sprint")}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl h-8 shrink-0 gap-1.5"
            >
              <span>Abrir Sprint</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Coluna Direita (1 col): Inteligência e Contas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Manual & Estratégia</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab("manual-marca")}
              className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl h-8"
            >
              Abrir <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <Card className="rounded-2xl border border-border/70 bg-card p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Manual da Marca 7D</span>
                <span className="font-bold text-primary">
                  {brandManualProgress.pct}%
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
                  style={{ width: `${brandManualProgress.pct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {brandManualProgress.answered} de {brandManualProgress.total} perguntas respondidas
              </p>
            </div>

            <div className="pt-3 border-t border-border/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Contas Instagram ({accounts.length})
              </span>
              {accounts.length === 0 ? (
                <div className="p-3 text-center bg-muted/40 rounded-xl text-[11px] text-muted-foreground space-y-2">
                  <p>Nenhuma conta conectada</p>
                  <Button
                    size="sm"
                    onClick={onOpenAddAccount}
                    className="h-7 text-xs rounded-lg gap-1"
                  >
                    <Plus className="w-3 h-3" /> Conectar
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {accounts.slice(0, 3).map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-muted/50 border border-border/50 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={acc.profile_picture_url || undefined} />
                          <AvatarFallback className="text-[9px]">
                            {acc.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold truncate">@{acc.username}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] text-emerald-600">
                        Ativa
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("estrategista")}
              className="w-full text-xs font-bold rounded-xl h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gerar Ideias com Estrategista IA</span>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
