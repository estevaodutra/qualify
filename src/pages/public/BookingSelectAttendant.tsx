import { useNavigate, useParams } from "react-router-dom";
import { usePublicCalendar } from "@/hooks/usePublicBooking";
import BookingLayout from "./BookingLayout";
import { Button } from "@/components/ui/button";
import { saveBookingState } from "@/lib/booking-slots";

export default function BookingSelectAttendant() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: calendar } = usePublicCalendar(slug);

  if (!calendar) return <div className="p-10 text-center">Carregando…</div>;

  const pick = (id: string | null) => {
    saveBookingState(slug!, { attendantId: id });
    navigate(id ? `/agendar/${slug}/${id}` : `/agendar/${slug}/qualquer`);
  };

  return (
    <BookingLayout calendar={calendar}>
      <h1 className="text-2xl font-bold mb-1">{calendar.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">Escolha com quem deseja falar</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {calendar.attendants.map((a) => (
          <button key={a.id} onClick={() => pick(a.id)} className="flex items-center gap-3 p-3 border rounded hover:bg-muted text-left">
            {a.photo_url ? <img src={a.photo_url} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-muted" />}
            <div>
              <div className="font-medium">{a.name}</div>
              {a.bio && <div className="text-xs text-muted-foreground line-clamp-2">{a.bio}</div>}
            </div>
          </button>
        ))}
      </div>
      <Button variant="ghost" className="mt-4" onClick={() => pick(null)}>Qualquer atendente disponível</Button>
    </BookingLayout>
  );
}
