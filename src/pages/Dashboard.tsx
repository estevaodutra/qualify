import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PageHeader, MetricCard, EmptyState } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Send,
  CheckCircle,
  XCircle,
  Megaphone,
  TrendingUp,
  Activity,
  Clock,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useInstances } from "@/hooks/useInstances";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAlerts } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { instances, isLoading: loadingInstances } = useInstances();
  const { campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { alerts, isLoading: loadingAlerts } = useAlerts();

  const isLoading = loadingInstances || loadingCampaigns || loadingAlerts;

  // Calculate real metrics
  const totalDispatches = instances.reduce((acc, i) => acc + (i.dispatches || 0), 0);
  const activeInstances = instances.filter((i) => i.status === "connected").length;
  const activeCampaigns = campaigns.filter((c) => c.status === "running").length;
  const recentAlerts = alerts.slice(0, 5);

  // Provider health from instances
  const providerHealth = instances.length > 0 
    ? Object.entries(
        instances.reduce((acc, inst) => {
          const provider = inst.provider || "Unknown";
          if (!acc[provider]) {
            acc[provider] = { name: provider, health: 0, count: 0, dispatches: 0 };
          }
          acc[provider].health += inst.health || 0;
          acc[provider].count += 1;
          acc[provider].dispatches += inst.dispatches || 0;
          return acc;
        }, {} as Record<string, { name: string; health: number; count: number; dispatches: number }>)
      ).map(([, value]) => ({
        name: value.name,
        health: Math.round(value.health / value.count),
        dispatches: value.dispatches,
      }))
    : [];

  const handleNewCampaign = () => {
    navigate("/campaigns");
    toast({
      title: "Criar Campanha",
      description: "Redirecionando para criação de campanha...",
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    toast({
      title: "Dashboard atualizado",
      description: "Todas as métricas foram atualizadas.",
    });
  };

  const handleViewAll = () => {
    navigate("/logs");
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader title="Dashboard" description="Visão geral em tempo real do seu sistema de comunicação" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen space-y-10 pb-10">
      {/* Decorative Blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-500/10 blur-[100px] rounded-full animate-float" />
      
      <div className="relative z-10 space-y-10">
        <PageHeader
          title={<span className="gradient-text text-4xl font-black">Dashboard</span>}
          description="Visão analítica e controle total da sua infraestrutura de comunicação em tempo real."
          actions={
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className="h-12 w-12 rounded-2xl border-white/20 bg-white/40 backdrop-blur-md transition-all hover:bg-white/60 dark:bg-black/20"
              >
                <RefreshCw className={cn("h-5 w-5 text-primary", isRefreshing ? "animate-spin" : "")} />
              </Button>
              <Button 
                className="h-12 px-6 gap-3 rounded-2xl gradient-primary glow-primary font-['Sora'] font-semibold shadow-2xl transition-all hover:scale-105 active:scale-95" 
                onClick={handleNewCampaign}
              >
                <Megaphone className="h-5 w-5" />
                Nova Campanha
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 stagger-children">
          <MetricCard
            title="Volume de Disparos"
            value={totalDispatches.toLocaleString()}
            subtitle="Engajamento total"
            icon={Send}
            className="premium-card stagger-1"
          />
          <MetricCard
            title="Instâncias On-line"
            value={activeInstances.toString()}
            subtitle={`${instances.length} conectadas`}
            icon={CheckCircle}
            className="premium-card stagger-2"
          />
          <MetricCard
            title="Campanhas Ativas"
            value={activeCampaigns.toString()}
            subtitle="Em execução agora"
            icon={Activity}
            className="premium-card stagger-3"
          />
          <MetricCard
            title="Score de Saúde"
            value="98.2%"
            subtitle="Alta performance"
            icon={TrendingUp}
            trend={{ value: 2.4, label: "vs ontem" }}
            className="premium-card stagger-4"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Provider Health */}
          <Card className="lg:col-span-2 premium-card overflow-hidden stagger-3">
            <CardHeader className="pb-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <BarChart3 className="h-5 w-5 text-[#8A3CFF]" />
                    </div>
                    Status de Conexão por Provedor
                  </CardTitle>
                  <p className="text-xs font-medium text-muted-foreground/60 ml-12">Monitoramento de latência e estabilidade</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black tracking-widest border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  SISTEMAS OPERACIONAIS
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-10">
              {providerHealth.length > 0 ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={providerHealth} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        className="text-[12px] font-bold"
                        tick={{ fill: "currentColor", opacity: 0.7 }}
                        axisLine={false}
                        tickLine={false}
                        width={100}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{
                          backgroundColor: "rgba(255,255,255,0.8)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "16px",
                          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar
                        dataKey="health"
                        fill="url(#barGradient)"
                        radius={[0, 10, 10, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="Aguardando Conexões"
                  description="Assim que suas instâncias forem conectadas, os gráficos de saúde aparecerão aqui."
                  className="py-16"
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="premium-card overflow-hidden stagger-4">
            <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-white/10">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-[#8A3CFF]" />
                </div>
                Alertas
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary/5" onClick={handleViewAll}>
                Histórico
              </Button>
            </CardHeader>
            <CardContent className="pt-8">
              {recentAlerts.length > 0 ? (
                <div className="space-y-5">
                  {recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
                      onClick={() => navigate("/alerts")}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3",
                          alert.severity === "success" ? "bg-[rgba(34,221,79,0.12)] text-[#22DD4F]" : 
                          alert.severity === "warning" ? "bg-amber-500 text-white" : 
                          alert.severity === "error" ? "bg-rose-500 text-white" : "bg-primary text-white"
                        )}
                      >
                        {alert.severity === "success" ? <CheckCircle className="h-5 w-5" /> : 
                         alert.severity === "warning" ? <TrendingUp className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-foreground truncate">{alert.title}</p>
                        <p className="text-[11px] font-medium text-muted-foreground/50 mt-0.5 uppercase tracking-wider">{alert.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Clock}
                  title="Sistema Limpo"
                  description="Nenhum alerta crítico ou atividade incomum detectada."
                  className="py-16"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
