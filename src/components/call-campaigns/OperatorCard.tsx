import { CallOperator, OperatorStatus } from "@/hooks/useCallOperators";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, User, Phone, Pause, Clock, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperatorCardProps {
  operator: CallOperator;
  campaignIntervalSeconds: number;
  onConfigure: (operator: CallOperator) => void;
  onRemove: (id: string) => void;
}

const statusConfig: Record<OperatorStatus, { label: string; color: string; icon: React.ReactNode }> = {
  available: { label: "Disponível", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: <Wifi className="h-3 w-3" /> },
  on_call: { label: "Em ligação", color: "bg-blue-100 text-blue-800 border-blue-300", icon: <Phone className="h-3 w-3" /> },
  cooldown: { label: "Cooldown", color: "bg-amber-100 text-amber-800 border-amber-300", icon: <Clock className="h-3 w-3" /> },
  paused: { label: "Pausado", color: "bg-orange-100 text-orange-800 border-orange-300", icon: <Pause className="h-3 w-3" /> },
  offline: { label: "Offline", color: "bg-muted text-muted-foreground border-muted", icon: <WifiOff className="h-3 w-3" /> },
};

function getTimeSince(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora mesmo";
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  return `${hours}h atrás`;
}

export function OperatorCard({ operator, campaignIntervalSeconds, onConfigure, onRemove }: OperatorCardProps) {
  const config = statusConfig[operator.status];
  const intervalDisplay = operator.personalIntervalSeconds
    ? `${operator.personalIntervalSeconds}s (personalizado)`
    : `${campaignIntervalSeconds}s (padrão)`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{operator.operatorName}</span>
              {operator.extension && (
                <span className="text-xs text-muted-foreground">Ramal: {operator.extension}</span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={cn("gap-1", config.color)}>
                {config.icon}
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Intervalo: {intervalDisplay}
              </span>
            </div>

            {operator.status === "cooldown" && operator.lastCallEndedAt && (
              <p className="text-xs text-muted-foreground">
                Última ligação: {getTimeSince(operator.lastCallEndedAt)}
              </p>
            )}

            {operator.status === "offline" && operator.lastCallEndedAt && (
              <p className="text-xs text-muted-foreground">
                Último acesso: {getTimeSince(operator.lastCallEndedAt)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onConfigure(operator)} title="Configurar">
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(operator.id)}
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
