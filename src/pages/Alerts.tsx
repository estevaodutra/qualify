import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAlerts, type Alert } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";
import { parseNotificationTarget } from "@/services/notificationService";
import { useSprintStore } from "@/features/sprint/state/sprintStore";

const severityConfig = {
  info: {
    icon: Info,
    bgClass: "bg-[#2637C9]/12",
    iconClass: "text-[#7B8FFF]",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-[#FFB432]/12",
    iconClass: "text-[#FFB432]",
  },
  error: {
    icon: AlertCircle,
    bgClass: "bg-[#FF7A7A]/12",
    iconClass: "text-[#FF7A7A]",
  },
  success: {
    icon: CheckCircle,
    bgClass: "bg-[#22DD4F]/12",
    iconClass: "text-[#22DD4F]",
  },
};

export default function Alerts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { alerts, isLoading, unreadCount, markAsRead, markAllAsRead } = useAlerts();
  const { openCardModal } = useSprintStore();
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
    }

    const target = parseNotificationTarget(alert.entity, alert.link);
    if (target.type === "sprint_card" && target.cardId) {
      if (target.boardId) {
        if (window.location.pathname === `/sprint/b/${target.boardId}`) {
          openCardModal(target.cardId);
          return;
        }
        navigate(`/sprint/b/${target.boardId}?cardId=${target.cardId}`);
      } else {
        navigate(`/sprint`);
      }
    } else if (target.url) {
      navigate(target.url);
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
            variant="ghost"
            size="sm"
            className="hover:text-[#8A3CFF]"
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
            const target = parseNotificationTarget(alert.entity, alert.link);
            const isSprintCard = target.type === "sprint_card";

            return (
              <Card
                key={alert.id}
                className={`shadow-elevation-sm transition-all hover:shadow-elevation-md cursor-pointer ${
                  !alert.read ? "border-l-2 border-l-primary" : ""
                }`}
                onClick={() => handleAlertClick(alert)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`rounded-full p-2 shrink-0 ${config.bgClass}`}>
                    <Icon className={`h-4 w-4 ${config.iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className={`font-semibold text-sm ${!alert.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {alert.title}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{alert.description}</p>
                        <div className="flex items-center gap-2 pt-1">
                          {isSprintCard ? (
                            <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[11px] font-semibold">
                              Sprint • Cartão
                            </Badge>
                          ) : (
                            alert.entity && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                {alert.entity}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {alert.timestamp}
                        </span>
                        {isSprintCard && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary hover:text-primary-foreground border-primary/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAlertClick(alert);
                            }}
                          >
                            <span>Acessar card</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
