import { useEffect, useState } from "react";
import { Phone, PhoneMissed, Calendar, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

interface PreviousCall {
  id: string;
  call_status: string;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  attempt_number: number | null;
  max_attempts: number | null;
  scheduled_for: string | null;
  notes: string | null;
  observations: string | null;
  lead_name: string;
  lead_phone: string;
  campaign_name: string;
  action_name: string | null;
}

interface PreviousCallsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
}

const statusDisplay: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, label: "Atendida", color: "text-emerald-500" },
  no_answer: { icon: <PhoneMissed className="h-3.5 w-3.5" />, label: "Não atendeu", color: "text-amber-500" },
  scheduled: { icon: <Calendar className="h-3.5 w-3.5" />, label: "Reagendada", color: "text-blue-500" },
  failed: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Falha", color: "text-destructive" },
  busy: { icon: <Phone className="h-3.5 w-3.5" />, label: "Ocupado", color: "text-amber-500" },
  voicemail: { icon: <Phone className="h-3.5 w-3.5" />, label: "Correio de voz", color: "text-muted-foreground" },
  cancelled: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Cancelada", color: "text-muted-foreground" },
  timeout: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Timeout", color: "text-destructive" },
};

const formatDuration = (s: number | null) => {
  if (!s) return "--:--";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

export function PreviousCallsSheet({ open, onOpenChange, operatorId }: PreviousCallsSheetProps) {
  const [calls, setCalls] = useState<PreviousCall[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchPrevious = async () => {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await (supabase as any)
        .from("call_logs")
        .select(`
          id, call_status, duration_seconds, started_at, ended_at,
          attempt_number, max_attempts, scheduled_for, notes, observations,
          call_leads!call_logs_lead_id_fkey(name, phone),
          call_campaigns!call_logs_campaign_id_fkey(name),
          call_script_actions!call_logs_action_id_fkey(name)
        `)
        .eq("operator_id", operatorId)
        .gte("created_at", today.toISOString())
        .in("call_status", ["completed", "no_answer", "busy", "voicemail", "failed", "cancelled", "timeout", "scheduled"])
        .order("ended_at", { ascending: false, nullsFirst: false })
        .limit(20);

      if (!error && data) {
        setCalls(data.map((d: any) => ({
          id: d.id,
          call_status: d.call_status,
          duration_seconds: d.duration_seconds,
          started_at: d.started_at,
          ended_at: d.ended_at,
          attempt_number: d.attempt_number,
          max_attempts: d.max_attempts,
          scheduled_for: d.scheduled_for,
          notes: d.notes,
          observations: d.observations,
          lead_name: d.call_leads?.name || "Desconhecido",
          lead_phone: d.call_leads?.phone || "",
          campaign_name: d.call_campaigns?.name || "",
          action_name: d.call_script_actions?.name || null,
        })));
      }
      setLoading(false);
    };

    fetchPrevious();
  }, [open, operatorId]);

  const answered = calls.filter(c => c.call_status === "completed").length;
  const noAnswer = calls.filter(c => ["no_answer", "busy", "voicemail"].includes(c.call_status)).length;
  const rescheduled = calls.filter(c => c.call_status === "scheduled").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[420px] flex flex-col">
        <SheetHeader>
          <SheetTitle>📋 Ligações Anteriores</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : calls.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma ligação realizada hoje.</p>
          ) : (
            calls.map((call) => {
              const st = statusDisplay[call.call_status] || statusDisplay.failed;
              const time = call.ended_at
                ? new Date(call.ended_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : call.started_at
                  ? new Date(call.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  : "--:--";

              return (
                <div key={call.id} className="rounded-lg border bg-card p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">👤 {call.lead_name}</p>
                      <p className="text-xs text-muted-foreground">📞 {call.lead_phone}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">📁 {call.campaign_name}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`flex items-center gap-1 font-medium ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                    {call.call_status === "completed" && (
                      <span className="text-muted-foreground">• {formatDuration(call.duration_seconds)}</span>
                    )}
                    {call.call_status === "no_answer" && call.attempt_number && (
                      <span className="text-muted-foreground">• Tentativa {call.attempt_number}/{call.max_attempts || 3}</span>
                    )}
                    {call.call_status === "scheduled" && call.scheduled_for && (
                      <span className="text-muted-foreground">
                        • Para: {new Date(call.scheduled_for).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  {call.action_name && (
                    <Badge variant="secondary" className="text-xs">🎯 {call.action_name}</Badge>
                  )}
                  {call.observations && (
                    <p className="text-xs text-muted-foreground italic">📝 {call.observations}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {calls.length > 0 && (
          <div className="border-t pt-3 pb-1">
            <p className="text-xs text-muted-foreground text-center">
              📊 {calls.length} ligações │ {answered} atendidas │ {noAnswer} não atendeu │ {rescheduled} reag.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
