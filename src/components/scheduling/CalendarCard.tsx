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
    <Card className="group relative overflow-hidden border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl transition-all duration-300 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${calendar.color}15`, color: calendar.color, border: `1px solid ${calendar.color}30` }}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-base font-bold text-foreground truncate tracking-tight">{calendar.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{MODALITY_LABELS[calendar.modality]}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{calendar.durationMinutes} min</span>
              </div>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border-none",
              calendar.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
            )}
          >
            {calendar.status === "active" ? "Ativo" : "Pausado"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {DAY_SHORT.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "h-7 w-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all",
                  days[i]?.enabled 
                    ? "bg-primary text-white shadow-sm glow-primary" 
                    : "bg-muted/30 text-muted-foreground/40"
                )}
              >
                {d}
              </div>
            ))}
          </div>
        </div>

        <div className="relative group/link">
          <div className="flex items-center gap-3 rounded-xl bg-muted/20 border border-border/10 px-3 py-2.5 transition-colors group-hover/link:bg-muted/30">
            <CalIcon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <span className="text-xs truncate flex-1 font-mono font-medium text-muted-foreground/70">{publicLink}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-background" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/10">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Performance</span>
            <span className="text-xs font-bold text-foreground">0 agendamentos /mês</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all" onClick={onEdit} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/5 transition-all" onClick={onToggleStatus} title={calendar.status === "active" ? "Pausar" : "Ativar"}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-all" onClick={onDelete} title="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
