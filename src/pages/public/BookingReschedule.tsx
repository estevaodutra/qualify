import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppointmentByToken, usePublicAvailability, useRescheduleByToken } from "@/hooks/usePublicBooking";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function BookingReschedule() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { data: appt } = useAppointmentByToken(token);
  const reschedule = useRescheduleByToken();

  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const { data: availability = [] } = usePublicAvailability(appt?.calendar?.id, appt?.attendant?.id || null, from, to);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const slots = useMemo(() => availability.find((d) => d.date === selectedDate)?.slots || [], [availability, selectedDate]);
  useEffect(() => { if (!selectedDate && availability.length > 0) setSelectedDate(availability[0].date); }, [availability, selectedDate]);

  const pick = async (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(selectedDate + "T00:00:00"); d.setHours(h, m, 0, 0);
    try {
      await reschedule.mutateAsync({ token: token!, newStart: d.toISOString() });
      toast({ title: "Agendamento reagendado" });
      navigate(`/agendamento/${token}/gerenciar`);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (!appt) return <div className="p-10 text-center">Carregando…</div>;

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-3xl mx-auto bg-card rounded-xl border p-6">
        <h1 className="text-2xl font-bold mb-4">Reagendar</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Selecione um dia</h3>
            <div className="grid grid-cols-3 gap-2">
              {availability.map((d) => (
                <button key={d.date} onClick={() => setSelectedDate(d.date)}
                  className={`px-3 py-2 rounded border text-sm ${selectedDate === d.date ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
                  {new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Horários</h3>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => <Button key={s} variant="outline" onClick={() => pick(s)}>{s}</Button>)}
              {selectedDate && slots.length === 0 && <p className="col-span-3 text-sm text-muted-foreground">Sem horários.</p>}
            </div>
          </div>
        </div>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    </div>
  );
}
