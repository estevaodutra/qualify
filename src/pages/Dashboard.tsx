import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, MetricCard, EmptyState } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Send,
  CheckCircle,
  XCircle,
  Phone,
  Megaphone,
  TrendingUp,
  Activity,
  Clock,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
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
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Visão geral em tempo real do seu sistema de comunicação"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gap-2" onClick={handleNewCampaign}>
              <Megaphone className="h-4 w-4" />
              Nova Campanha
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Envios"
          value={totalDispatches.toLocaleString()}
          subtitle="Todas as instâncias"
          icon={Send}
        />
        <MetricCard
          title="Instâncias Ativas"
          value={activeInstances.toString()}
          subtitle={`de ${instances.length} total`}
          icon={CheckCircle}
        />
        <MetricCard
          title="Campanhas Ativas"
          value={activeCampaigns.toString()}
          subtitle={`de ${campaigns.length} total`}
          icon={Megaphone}
        />
        <MetricCard
          title="Números Conectados"
          value={activeInstances.toString()}
          subtitle="Prontos para envio"
          icon={Phone}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Provider Health */}
        <Card className="lg:col-span-2 shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Saúde dos Provedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {providerHealth.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={providerHealth} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}%`, "Health"]}
                    />
                    <Bar
                      dataKey="health"
                      fill="hsl(var(--success))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Sem dados de provedores"
                description="Conecte instâncias para ver a saúde dos provedores"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-elevation-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Atividade Recente
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleViewAll}>
              Ver Tudo
            </Button>
          </CardHeader>
          <CardContent>
            {recentAlerts.length > 0 ? (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate("/alerts")}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        alert.severity === "success"
                          ? "bg-success/15 text-success"
                          : alert.severity === "warning"
                          ? "bg-warning/15 text-warning"
                          : alert.severity === "error"
                          ? "bg-error/15 text-error"
                          : "bg-info/15 text-info"
                      }`}
                    >
                      {alert.severity === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : alert.severity === "warning" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{alert.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{alert.timestamp}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="Sem atividade recente"
                description="Os alertas aparecerão aqui"
                className="py-8"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
