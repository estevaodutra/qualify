import { LeadHistoryEvent } from "@/types/crm.types";
import { format } from "date-fns";
import { MessageSquare, PhoneCall, Mail, Calendar, Edit, Plus, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadHistoryTimelineProps {
  events: LeadHistoryEvent[];
}

export function LeadHistoryTimeline({ events }: LeadHistoryTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <h3 className="text-sm font-semibold mb-1">Histórico Vazio</h3>
        <p className="text-xs text-muted-foreground max-w-[250px]">
          Nenhuma interação registrada ainda.
        </p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "message": return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case "call": return <PhoneCall className="w-3.5 h-3.5 text-green-500" />;
      case "email": return <Mail className="w-3.5 h-3.5 text-orange-500" />;
      case "meeting": return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
      case "created": return <Plus className="w-3.5 h-3.5 text-emerald-500" />;
      case "updated": return <Edit className="w-3.5 h-3.5 text-amber-500" />;
      case "task_completed": return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case "note": return <FileText className="w-3.5 h-3.5 text-indigo-500" />;
      default: return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
      {events.map((event, index) => (
        <div key={event.id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted/50 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            {getEventIcon(event.event_type)}
          </div>
          
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/40 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm">{event.title}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
            
            {event.description && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            )}

            {event.actor_id && (
              <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary">OP</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Registrado por Atendente</span>
              </div>
            )}
          </div>

        </div>
      ))}
    </div>
  );
}
