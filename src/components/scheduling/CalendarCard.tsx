import { Phone, Video, MapPin, Copy, Settings, Pencil, Trash2, Calendar as CalIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { SchedulingCalendar } from "@/hooks/useCalendars";

interface Props {
  calendar: SchedulingCalendar;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

const MODALITY_ICONS = { call: Phone, video: Video, in_person: MapPin };
const MODALITY_LABELS = { call: "Ligação", video: "Videochamada", in_person: "Presencial" };
const DAY_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

export function CalendarCard({ calendar, onEdit, onToggleStatus, onDelete }: Props) {
  const { toast } = useToast();
  const Icon = MODALITY_ICONS[calendar.modality];
  const days = (calendar.advanced?.days as Record<number, { enabled: boolean }>) ?? {};
  const publicLink = `${window.location.origin}/agendar/${calendar.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast({ title: "Link copiado!" });
  };

  return (
    <Card className="p-5 space-y-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${calendar.color}20`, color: calendar.color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{calendar.name}</h3>
            <p className="text-xs text-muted-foreground">{MODALITY_LABELS[calendar.modality]} · {calendar.durationMinutes} min</p>
          </div>
        </div>
        <Badge variant={calendar.status === "active" ? "default" : "secondary"}>
          {calendar.status === "active" ? "Ativo" : "Pausado"}
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        {DAY_SHORT.map((d, i) => (
          <div
            key={i}
            className={`h-6 w-6 rounded text-[10px] font-medium flex items-center justify-center ${
              days[i]?.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1.5">
        <CalIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs truncate flex-1 font-mono">{publicLink}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copyLink}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">0 agendamentos este mês</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggleStatus} title={calendar.status === "active" ? "Pausar" : "Ativar"}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
