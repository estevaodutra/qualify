import { useState } from "react";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { addMinutes, addHours, addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InlineRescheduleProps {
  callId: string;
  onRescheduled?: () => void;
}

export function InlineReschedule({ callId, onRescheduled }: InlineRescheduleProps) {
  const [open, setOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rescheduleTime, setRescheduleTime] = useState(format(addMinutes(new Date(), 30), "HH:mm"));
  const [isRescheduling, setIsRescheduling] = useState(false);

  const applyShortcut = (date: Date) => {
    setRescheduleDate(format(date, "yyyy-MM-dd"));
    setRescheduleTime(format(date, "HH:mm"));
  };

  const handleConfirm = async () => {
    setIsRescheduling(true);
    try {
      const scheduledFor = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      if (scheduledFor <= new Date()) {
        toast.error("A data deve ser no futuro");
        setIsRescheduling(false);
        return;
      }

      const { error } = await (supabase as any)
        .from("call_logs")
        .update({
          scheduled_for: scheduledFor.toISOString(),
          call_status: "scheduled",
          ended_at: new Date().toISOString(),
        })
        .eq("id", callId);

      if (error) throw error;

      // Release operator
      await (supabase as any).rpc("release_operator", { p_call_id: callId, p_force: true });

      toast.success(`Reagendado para ${format(scheduledFor, "dd/MM HH:mm")}`);
      setOpen(false);
      onRescheduled?.();
    } catch (e) {
      console.error("Reschedule error:", e);
      toast.error("Erro ao reagendar");
    } finally {
      setIsRescheduling(false);
    }
  };

  const now = new Date();

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">⚡ AÇÕES RÁPIDAS</p>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full rounded-lg border bg-muted/20 p-2.5 flex items-center justify-between text-left hover:bg-muted/40 transition-colors">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Reagendar
              </p>
              <p className="text-xs text-muted-foreground">A pessoa não pode falar agora</p>
            </div>
            <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3 rounded-lg border bg-muted/10 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Data</label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Horário
              </label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyShortcut(addMinutes(now, 10))}>
              +10 min
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyShortcut(addMinutes(now, 30))}>
              +30 min
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyShortcut(addHours(now, 1))}>
              +1 hora
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              const tomorrow = addDays(now, 1);
              tomorrow.setHours(9, 0, 0, 0);
              applyShortcut(tomorrow);
            }}>
              Amanhã
            </Button>
          </div>

          <Button
            size="sm"
            className="w-full"
            onClick={handleConfirm}
            disabled={isRescheduling}
          >
            {isRescheduling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
            )}
            Confirmar Reagendamento
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
