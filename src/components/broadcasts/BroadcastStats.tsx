import { useMemo } from "react";
import { BroadcastCampaign } from "@/types/broadcast.types";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Play, CheckCircle2, AlertCircle, Clock, ShieldCheck } from "lucide-react";

interface BroadcastStatsProps {
  campaigns: BroadcastCampaign[];
}

export function BroadcastStats({ campaigns }: BroadcastStatsProps) {
  const stats = useMemo(() => {
    let totalLeads = 0;
    let sentCount = 0;
    let failedCount = 0;
    let activeCampaigns = 0;
    let scheduledCampaigns = 0;
    let completedCampaigns = 0;

    for (const c of campaigns) {
      totalLeads += c.total_leads || 0;
      sentCount += c.sent_count || 0;
      failedCount += c.failed_count || 0;

      if (c.status === "running") activeCampaigns++;
      else if (c.status === "scheduled") scheduledCampaigns++;
      else if (c.status === "completed") completedCampaigns++;
    }

    const deliveryRate = totalLeads > 0 ? Math.round((sentCount / totalLeads) * 100) : 0;

    return {
      totalLeads,
      sentCount,
      failedCount,
      activeCampaigns,
      scheduledCampaigns,
      completedCampaigns,
      deliveryRate,
      totalCampaigns: campaigns.length,
    };
  }, [campaigns]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Campanhas Ativas / Agendadas */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-border transition-all">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Campanhas em Execução
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Play className="w-4 h-4 fill-blue-500/20" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{stats.activeCampaigns}</span>
            <span className="text-xs text-muted-foreground">
              ({stats.scheduledCampaigns} agendadas)
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.totalCampaigns} campanhas no total
          </p>
        </CardContent>
      </Card>

      {/* 2. Disparos Realizados */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-border transition-all">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Disparos Concluídos
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{stats.sentCount}</span>
            <span className="text-xs text-muted-foreground">de {stats.totalLeads} leads</span>
          </div>
          <div className="mt-2 w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.deliveryRate)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Proteção Anti-Ban Ativa */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-border transition-all">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Controle de Cadência
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-500">Anti-Ban</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Lotes diários e intervalos de proteção
          </p>
        </CardContent>
      </Card>

      {/* 4. Taxa de Sucesso */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-border transition-all">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Taxa de Sucesso
            </span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {stats.sentCount + stats.failedCount > 0
                ? `${Math.round((stats.sentCount / (stats.sentCount + stats.failedCount)) * 100)}%`
                : "100%"}
            </span>
            {stats.failedCount > 0 && (
              <span className="text-xs text-destructive flex items-center gap-0.5">
                <AlertCircle className="w-3 h-3 inline" /> {stats.failedCount} falhas
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.completedCampaigns} campanhas finalizadas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
