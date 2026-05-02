import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAlerts, type Alert } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";

const severityConfig = {
  info: {
    icon: Info,
    bgClass: "bg-info/10",
    iconClass: "text-info",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-warning/10",
    iconClass: "text-warning",
  },
  error: {
    icon: AlertCircle,
    bgClass: "bg-error/10",
    iconClass: "text-error",
  },
  success: {
    icon: CheckCircle,
    bgClass: "bg-success/10",
    iconClass: "text-success",
  },
};

export default function Alerts() {
  const { toast } = useToast();
  const { alerts, isLoading, unreadCount, markAsRead, markAllAsRead } = useAlerts();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesRead =
      readFilter === "all" ||
      (readFilter === "unread" && !alert.read) ||
      (readFilter === "read" && alert.read);
    return matchesSeverity && matchesRead;
  });

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleAlertClick = async (alert: Alert) => {
    if (!alert.read) {
      await markAsRead(alert.id);
      toast({
        title: "Alerta marcado como lido",
        description: alert.title,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader title="Alertas" description="Notificações do sistema e alertas críticos" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Alertas"
        description="Notificações do sistema e alertas críticos"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Marcar Todos como Lidos
          </Button>
        }
      />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="destructive" className="rounded-full px-2 py-0.5">
            {unreadCount}
          </Badge>
          <span className="text-muted-foreground">alertas não lidos</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unread">Não Lidos</SelectItem>
            <SelectItem value="read">Lidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <Card
                key={alert.id}
                className={`shadow-elevation-sm transition-all hover:shadow-elevation-md cursor-pointer ${
                  !alert.read ? "border-l-2 border-l-primary" : ""
                }`}
                onClick={() => handleAlertClick(alert)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`rounded-full p-2 ${config.bgClass}`}>
                    <Icon className={`h-4 w-4 ${config.iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className={`font-medium ${!alert.read ? "" : "text-muted-foreground"}`}>
                          {alert.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                        {alert.entity && (
                          <Badge variant="secondary" className="mt-2 text-xs font-normal">
                            {alert.entity}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {alert.timestamp}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="Nenhum alerta"
          description="Você está em dia! Nenhum alerta corresponde aos filtros atuais."
        />
      )}
    </div>
  );
}
