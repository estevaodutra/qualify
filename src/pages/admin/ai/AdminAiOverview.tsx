import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Layers,
  Sparkles,
  PlayCircle,
  Activity,
  Cpu,
  AlertTriangle,
  Zap,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIExecutionService } from "@/services/ai/aiExecutionService";

export default function AdminAiOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin_ai_stats"],
    queryFn: () => AIExecutionService.getStats(),
    refetchInterval: 30_000,
  });

  const { data: recentExecutionsData, isLoading: execLoading } = useQuery({
    queryKey: ["admin_ai_recent_executions"],
    queryFn: () => AIExecutionService.getExecutions({ limit: 5 }),
    refetchInterval: 30_000,
  });

  const { data: config } = useQuery({
    queryKey: ["admin_ai_config"],
    queryFn: () => AIExecutionService.getOpenAiConfig(),
  });

  const recentExecutions = recentExecutionsData?.executions || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Central de IA — Qualify & Criafy</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
              OpenAI Nativa
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão global de OpenAI Skills, versionamento imutável, perfis de modelos e rastreabilidade multitenant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/ia/playground">
              <PlayCircle className="h-4 w-4 mr-2 text-primary" />
              Abrir Playground
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/ia/skills">
              <Layers className="h-4 w-4 mr-2" />
              Gerenciar Skills
            </Link>
          </Button>
        </div>
      </div>

      {/* Banner de Status da Plataforma */}
      <div className="rounded-xl border bg-gradient-to-r from-emerald-500/5 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              Credencial Única da Criafy
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              {config?.configured
                ? `Conectada (${config.maskedKey}) • Modelo Padrão: ${config.defaultModel}`
                : "Nenhuma credencial configurada. Adicione sua API Key em Configurações."}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/ia/configuracoes" className="text-xs">
            Ver Configurações <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Grid de Métricas Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Skills Ativas</CardTitle>
            <Layers className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {statsLoading ? "..." : stats?.activeSkills ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {statsLoading ? "" : `${stats?.draftSkills ?? 0} em rascunho`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Execuções Hoje</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {statsLoading ? "..." : stats?.executionsToday ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {statsLoading ? "" : `${stats?.executions7Days ?? 0} nos últimos 7 dias`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tokens Consumidos</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {statsLoading ? "..." : (stats?.tokensConsumed ?? 0).toLocaleString("pt-BR")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Últimos 7 dias (entrada + saída)</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Custo Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {statsLoading
                ? "..."
                : `$${(stats?.estimatedCost ?? 0).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Top modelo: <span className="font-medium text-foreground">{stats?.topModel || "gpt-4o-mini"}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Central: Arquitetura e Execuções Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card de Arquitetura Conceitual */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Princípio de Orquestração
            </CardTitle>
            <CardDescription className="text-xs">
              Separação arquitetural estrita do motor Criafy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>SKILL GLOBAL</span>
                <Badge variant="secondary" className="text-[10px]">Plataforma</Badge>
              </div>
              <p className="text-muted-foreground text-[11px]">Como executar uma tarefa (instruções, referências, assets).</p>
            </div>

            <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>CONTEXTO DA EMPRESA</span>
                <Badge variant="outline" className="text-[10px]">Dinâmico</Badge>
              </div>
              <p className="text-muted-foreground text-[11px]">Manual da Marca, tese única e regras institucionais.</p>
            </div>

            <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>CONTEXTO DA CONTA</span>
                <Badge variant="outline" className="text-[10px]">Dinâmico</Badge>
              </div>
              <p className="text-muted-foreground text-[11px]">Tom de voz, público-alvo, termos permitidos e proibidos.</p>
            </div>

            <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>TAREFA & BRIEFING ATUAL</span>
                <Badge variant="outline" className="text-[10px]">Runtime</Badge>
              </div>
              <p className="text-muted-foreground text-[11px]">O que o usuário quer gerar agora (tema, ângulo, CTA).</p>
            </div>
          </CardContent>
        </Card>

        {/* Execuções Recentes */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Últimas Execuções da Plataforma
              </CardTitle>
              <CardDescription className="text-xs">
                Auditoria e rastreamento em tempo real
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/ia/execucoes" className="text-xs">
                Ver Todas <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {execLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Carregando execuções...</div>
            ) : recentExecutions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma geração registrada ainda. Faça um teste no Playground!
              </div>
            ) : (
              <div className="divide-y text-xs">
                {recentExecutions.map((e) => (
                  <div key={e.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{e.skill_slug}</span>
                        <Badge variant="outline" className="text-[10px] py-0">v{e.skill_version}</Badge>
                        <Badge
                          variant={e.status === "success" ? "outline" : "destructive"}
                          className={`text-[10px] py-0 ${e.status === "success" ? "text-emerald-600 border-emerald-300" : ""}`}
                        >
                          {e.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {e.input_summary?.theme || e.action}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium text-foreground">{e.tokens_input + e.tokens_output} tokens</div>
                      <div className="text-[11px] text-muted-foreground">
                        {e.latency_ms}ms • ${Number(e.estimated_cost).toFixed(4)}
                      </div>
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
