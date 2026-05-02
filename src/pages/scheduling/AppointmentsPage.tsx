import { useMemo, useState } from "react";
import { useAppointments } from "@/hooks/useAppointments";
import { useCalendars } from "@/hooks/useCalendars";
import { useAttendants } from "@/hooks/useAttendants";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLabelForDate } from "@/lib/booking-slots";
import AppointmentDetailsDialog from "@/components/scheduling/AppointmentDetailsDialog";

export default function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [calendarId, setCalendarId] = useState<string>("all");
  const [attendantId, setAttendantId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [range, setRange] = useState<"all" | "today" | "week">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { calendars } = useCalendars();
  const { attendants } = useAttendants(true);
  const { appointments, isLoading } = useAppointments({
    search, 
    calendarId: calendarId === "all" ? undefined : calendarId,
    attendantId: attendantId === "all" ? undefined : attendantId,
    status: status === "all" ? undefined : status,
    range,
  });

  const groups = useMemo(() => {
    const m = new Map<string, typeof appointments>();
    for (const a of appointments) {
      const key = a.scheduledStart.slice(0, 10);
      if (!m.has(key)) m.set(key, [] as any);
      (m.get(key) as any).push(a);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  const selected = appointments.find((a) => a.id === selectedId) || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agendamentos</h1>
        <div className="flex gap-2">
          <Button variant={range === "today" ? "default" : "outline"} size="sm" onClick={() => setRange(range === "today" ? "all" : "today")}>Hoje</Button>
          <Button variant={range === "week" ? "default" : "outline"} size="sm" onClick={() => setRange(range === "week" ? "all" : "week")}>Esta semana</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input placeholder="Buscar nome/telefone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={calendarId} onValueChange={setCalendarId}>
          <SelectTrigger><SelectValue placeholder="Calendário" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos calendários</SelectItem>
            {calendars.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={attendantId} onValueChange={setAttendantId}>
          <SelectTrigger><SelectValue placeholder="Atendente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos atendentes</SelectItem>
            {attendants.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="no_show">No-show</SelectItem>
            <SelectItem value="rescheduled">Reagendado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, items]) => (
            <div key={date}>
              <div className="text-xs font-semibold text-muted-foreground mb-2">{getLabelForDate(date)}</div>
              <div className="bg-card border rounded-lg divide-y">
                {items.map((a) => (
                  <button key={a.id} onClick={() => setSelectedId(a.id)} className="w-full flex items-center gap-4 p-3 hover:bg-muted text-left">
                    <div className="text-sm font-mono w-14">{new Date(a.scheduledStart).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{a.leadName}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.leadPhone}</div>
                    </div>
                    {a.calendar && <Badge variant="outline" style={{ borderColor: a.calendar.color, color: a.calendar.color }}>{a.calendar.name}</Badge>}
                    <div className="text-xs text-muted-foreground w-32 truncate">{a.attendant?.name || "—"}</div>
                    <Badge variant={a.status === "confirmed" ? "default" : a.status === "cancelled" ? "destructive" : "secondary"}>{a.status}</Badge>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AppointmentDetailsDialog appointment={selected} open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)} />
    </div>
  );
}
