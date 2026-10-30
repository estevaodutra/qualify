import { useSuperAdminCockpit } from "@/hooks/useSuperAdminCockpit";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Radio,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  Workflow,
  ShieldCheck,
  ListOrdered,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

const fmtNum = (n: number) => n.toLocaleString("pt-BR");
const fmtUsd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function AdminDashboard() {
  const { data, isLoading, refetch, isRefetching } = useSuperAdminCockpit();
  const navigate = useNavigate();

  if (isLoading || !data) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const { kpis, alerts, recentCompanies, recentExecutions } = data;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Centro de Controle Operacional
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
              Live Monitor
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada em tempo real de plataformas, instâncias, inteligência artificial e diagnósticos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" asChild className="h-8 text-xs">
            <Link to="/admin/empresas">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Ver Empresas
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid de KPIs Reais */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Métricas Operacionais da Plataforma
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Empresas ativas */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Empresas Ativas</span>
              <Building2 className="h-3.5 w-3.5 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{fmtNum(kpis.activeCompanies)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Contas operando</p>
            </CardContent>
          </Card>

          {/* Usuários ativos */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Usuários Ativos</span>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{fmtNum(kpis.activeUsers)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total de perfis</p>
            </CardContent>
          </Card>

          {/* Novas empresas 30d */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Novas Empresas (30d)</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold text-emerald-600">+{fmtNum(kpis.newCompanies30d)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Últimos 30 dias</p>
            </CardContent>
          </Card>

          {/* Usuários ativos 24h */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Novos Usuários (24h)</span>
              <Users className="h-3.5 w-3.5 text-indigo-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">+{fmtNum(kpis.newUsers24h)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cadastrados hoje</p>
            </CardContent>
          </Card>

          {/* Uso IA Hoje */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Tokens IA (Hoje)</span>
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{fmtNum(kpis.aiUsageTodayTokens)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Consumo diário</p>
            </CardContent>
          </Card>

          {/* Custo IA Hoje */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Custo IA (Hoje)</span>
              <DollarSign className="h-3.5 w-3.5 text-amber-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold text-amber-600">{fmtUsd(kpis.aiCostTodayUsd)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">OpenAI APIs</p>
            </CardContent>
          </Card>

          {/* Uso IA 30d */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Tokens IA (30d)</span>
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{fmtNum(kpis.aiUsage30dTokens)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Acumulado mensal</p>
            </CardContent>
          </Card>

          {/* Custo IA 30d */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Custo IA (30d)</span>
              <DollarSign className="h-3.5 w-3.5 text-amber-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{fmtUsd(kpis.aiCost30dUsd)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Fatura estimada</p>
            </CardContent>
          </Card>

          {/* Execuções com erro */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Execuções c/ Erro</span>
              <Activity className="h-3.5 w-3.5 text-rose-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className={`text-xl font-bold ${kpis.failedAiExecutions > 0 ? "text-rose-600" : ""}`}>
                {fmtNum(kpis.failedAiExecutions)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Últimos 7 dias</p>
            </CardContent>
          </Card>

          {/* Jobs em fila */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Jobs em Fila</span>
              <ListOrdered className="h-3.5 w-3.5 text-indigo-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{fmtNum(kpis.queuedJobs)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Aguardando disparo</p>
            </CardContent>
          </Card>

          {/* Integrações com erro */}
          <Card className="hover:border-primary/40 transition-colors shadow-sm col-span-2 sm:col-span-1">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs text-muted-foreground font-medium">Integrações c/ Erro</span>
              <Radio className="h-3.5 w-3.5 text-destructive" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className={`text-xl font-bold ${kpis.integrationsWithError > 0 ? "text-destructive" : ""}`}>
                {fmtNum(kpis.integrationsWithError)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">WhatsApp &amp; Meta</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ÁREA DE ALERTAS OPERACIONAIS REAIS */}
      <Card className="border-border/60">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas Operacionais Ativos
            </CardTitle>
            <CardDescription className="text-xs">
              Diagnósticos reais de limites, instâncias desconectadas, tokens e falhas no ecossistema.
            </CardDescription>
          </div>
          <Badge variant={alerts.length > 0 ? "destructive" : "outline"} className="text-xs">
            {alerts.length} {alerts.length === 1 ? "alerta pendente" : "alertas pendentes"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium text-foreground">Nenhum incidente ativo detectado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Todas as instâncias, webhooks, credenciais e saldos estão dentro dos parâmetros operacionais.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                        alert.type === "critical"
                          ? "bg-destructive animate-pulse"
                          : alert.type === "warning"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{alert.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-7 text-xs self-start sm:self-center shrink-0">
                    <Link to={alert.actionUrl}>
                      {alert.actionLabel}
                      <ArrowRight className="h-3 w-3 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de Seções Operacionais: Empresas Recentes & Execuções de IA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Empresas Recentes */}
        <Card className="border-border/60">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500" />
                Empresas Recentes
              </CardTitle>
              <CardDescription className="text-xs">Últimos tenants registrados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link to="/admin/empresas">Ver todas →</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentCompanies.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Nenhuma empresa cadastrada.</p>
            ) : (
              <div className="divide-y text-xs">
                {recentCompanies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/admin/empresas/${c.id}`)}
                    className="p-3 flex items-center justify-between hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.owner_email || "Sem email"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={c.is_active ? "outline" : "secondary"} className="text-[10px]">
                        {c.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execuções Recentes de IA */}
        <Card className="border-border/60">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Execuções Recentes de IA
              </CardTitle>
              <CardDescription className="text-xs">Rastreabilidade de chamadas da OpenAI</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link to="/admin/ia/execucoes">Ver histórico →</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentExecutions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                Nenhuma execução registrada ainda. Teste no{" "}
                <Link to="/admin/ia/playground" className="text-primary underline">
                  Playground de IA
                </Link>
                .
              </div>
            ) : (
              <div className="divide-y text-xs">
                {recentExecutions.map((ex: any) => (
                  <div
                    key={ex.id}
                    onClick={() => navigate(`/admin/ia/execucoes?id=${ex.id}`)}
                    className="p-3 flex items-center justify-between hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{ex.skill_name || ex.action}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{ex.model || "openai"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ex.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : ex.status === "FAILED"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {ex.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {ex.total_tokens ? `${fmtNum(ex.total_tokens)} tok` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
