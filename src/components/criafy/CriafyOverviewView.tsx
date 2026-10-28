import React, { useEffect, useState, useMemo } from "react";
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
import { useSprintOSStore } from "@/features/sprint-os/state/sprintOsStore";

interface CriafyOverviewViewProps {
  accounts: CriafyInstagramAccount[];
  onNavigateTab: (tabId: string, subId?: string) => void;
  onOpenAddAccount?: () => void;
  onOpenScheduleModal?: () => void;
}

export const CriafyOverviewView: React.FC<CriafyOverviewViewProps> = ({
  accounts,
  onNavigateTab,
  onOpenAddAccount,
  onOpenScheduleModal,
}) => {
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
              onClick={() => onNavigateTab("demandas")}
              className="h-9 px-3.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs gap-1.5 cursor-pointer"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Ver Minhas Demandas</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateTab("planner")}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold border-border hover:bg-muted gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Abrir Planner</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateTab("calendario")}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold border-border hover:bg-muted gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Ver Calendário</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de 4 Indicadores Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bloco 1: Hoje */}
        <Card className="rounded-2xl border border-border/70 shadow-2xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Hoje</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {pendingDemands.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pendingDemands.length === 1
                  ? "Demanda pendente de execução"
                  : "Demandas pendentes de execução"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("demandas")}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>Resolver demandas</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>

        {/* Bloco 2: Esta semana */}
        <Card className="rounded-2xl border border-border/70 shadow-2xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">No Planner</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {plannerItems.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Conteúdos mapeados na produção
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("planner")}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>Ver plano editorial</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>

        {/* Bloco 3: Aguardando Você */}
        <Card className="rounded-2xl border border-border/70 shadow-2xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Aguardando Você</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Mic className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {waitingUserDemands.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gravações, Stories Lite e aprovações
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("demandas")}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>Gravar ou aprovar</span>
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
        {/* Coluna Esquerda (2 cols): Demandas que exigem atenção */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Demandas Prioritárias</h3>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {pendingDemands.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab("demandas")}
              className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl h-8"
            >
              Ver todas <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          {pendingDemands.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 space-y-3">
              <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Tudo em dia por aqui!
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Nenhuma demanda pendente no momento. Utilize o Estrategista IA ou o Planner para gerar novas pautas e tarefas.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateTab("estrategista")}
                className="text-xs font-bold rounded-xl h-8 gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Consultar Estrategista IA</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingDemands.slice(0, 5).map((demand) => (
                <div
                  key={demand.id}
                  onClick={() => onNavigateTab("demandas")}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-muted text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      {demand.type === "gravar_video" && <Video className="w-4 h-4" />}
                      {demand.type === "gravar_audio" && <Mic className="w-4 h-4" />}
                      {demand.type === "stories_lite" && <Flame className="w-4 h-4 text-amber-500" />}
                      {demand.type !== "gravar_video" &&
                        demand.type !== "gravar_audio" &&
                        demand.type !== "stories_lite" && <ListTodo className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {demand.title}
                        </span>
                        {demand.type === "stories_lite" && (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] px-1.5 py-0">
                            Stories Lite
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {demand.description || "Demanda sem descrição adicional"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-[9px] font-bold uppercase tracking-wider"
                    >
                      {demand.priority}
                    </Badge>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
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
