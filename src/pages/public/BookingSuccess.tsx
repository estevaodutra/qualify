import { useParams, Link } from "react-router-dom";
import { usePublicCalendar } from "@/hooks/usePublicBooking";
import BookingLayout from "./BookingLayout";
import { loadBookingState } from "@/lib/booking-slots";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingSuccess() {
  const { slug } = useParams();
  const { data: calendar } = usePublicCalendar(slug);
  const state = loadBookingState(slug || "");
  const when = state.scheduled_start ? new Date(state.scheduled_start) : null;

  return (
    <BookingLayout calendar={calendar}>
      <div className="text-center py-6">
        <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">{(calendar?.texts as any)?.success_title || "Agendamento confirmado!"}</h1>
        <p className="text-muted-foreground mb-6">{(calendar?.texts as any)?.success_message || "Você receberá uma confirmação em breve."}</p>
        {when && (
          <div className="bg-muted rounded p-4 mb-6 text-left max-w-sm mx-auto">
            <div className="font-medium">{calendar?.name}</div>
            <div className="text-sm">{when.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</div>
            <div className="text-sm">{when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {calendar?.duration_minutes} min</div>
          </div>
        )}
        {state.token && (
          <Button asChild variant="outline"><Link to={`/agendamento/${state.token}/gerenciar`}>Gerenciar Agendamento</Link></Button>
        )}
      </div>
    </BookingLayout>
  );
}
