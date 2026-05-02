import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePublicCalendar, usePublicAvailability } from "@/hooks/usePublicBooking";
import BookingLayout from "./BookingLayout";
import { Button } from "@/components/ui/button";
import { loadBookingState, saveBookingState } from "@/lib/booking-slots";
import { Loader2 } from "lucide-react";

export default function BookingSelectSlot() {
  const { slug, attendantId } = useParams();
  const navigate = useNavigate();
  const { data: calendar, isLoading } = usePublicCalendar(slug);

  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  // If lead_choice + multiple attendants + none selected → go to picker
  useEffect(() => {
    if (!calendar) return;
    const state = loadBookingState(slug!);
    const effectiveAttendant = attendantId || state.attendantId || null;
    if (calendar.distribution === "lead_choice" && calendar.attendants.length > 1 && !effectiveAttendant) {
      navigate(`/agendar/${slug}/atendente`, { replace: true });
    }
  }, [calendar, slug, attendantId, navigate]);

  const effectiveAttendant = attendantId || loadBookingState(slug || "").attendantId || null;
  const { data: availability = [] } = usePublicAvailability(calendar?.id, effectiveAttendant, from, to);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const slots = useMemo(() => availability.find((d) => d.date === selectedDate)?.slots || [], [availability, selectedDate]);

  useEffect(() => {
    if (!selectedDate && availability.length > 0) setSelectedDate(availability[0].date);
  }, [availability, selectedDate]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!calendar) return <div className="p-10 text-center">Calendário não encontrado</div>;

  const pickSlot = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(selectedDate + "T00:00:00");
    d.setHours(h, m, 0, 0);
    saveBookingState(slug!, { scheduled_start: d.toISOString(), slot_date: selectedDate, slot_time: hhmm, attendantId: effectiveAttendant });
    if (calendar.questions.length > 0) navigate(`/agendar/${slug}/qualificacao`);
    else navigate(`/agendar/${slug}/dados`);
  };

  return (
    <BookingLayout calendar={calendar}>
      <h1 className="text-2xl font-bold">{calendar.name}</h1>
      <p className="text-sm text-muted-foreground mb-4">{calendar.duration_minutes} min · {calendar.modality === "call" ? "📞 Ligação" : calendar.modality === "video" ? "📹 Videochamada" : "📍 Presencial"}</p>
      {calendar.description && <p className="mb-6 text-sm">{calendar.description}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Selecione um dia</h3>
          <div className="grid grid-cols-3 gap-2">
            {availability.length === 0 && <p className="col-span-3 text-sm text-muted-foreground">Nenhum horário disponível.</p>}
            {availability.map((d) => (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`px-3 py-2 rounded border text-sm ${selectedDate === d.date ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
              >
                {new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Horários</h3>
          <div className="grid grid-cols-3 gap-2">
            {slots.map((s) => (
              <Button key={s} variant="outline" onClick={() => pickSlot(s)}>{s}</Button>
            ))}
            {selectedDate && slots.length === 0 && <p className="col-span-3 text-sm text-muted-foreground">Sem horários neste dia.</p>}
          </div>
        </div>
      </div>
    </BookingLayout>
  );
}
