import { useParams, Link, useNavigate } from "react-router-dom";
import { useAppointmentByToken } from "@/hooks/usePublicBooking";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";

export default function BookingManage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { data: appt, isLoading } = useAppointmentByToken(token);

  if (isLoading) return <div className="p-10 text-center">Carregando…</div>;
  if (!appt) return <div className="p-10 text-center">Agendamento não encontrado</div>;

  const when = new Date(appt.scheduled_start);

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-xl mx-auto bg-card rounded-xl border p-6">
        <h1 className="text-2xl font-bold mb-4">Gerenciar Agendamento</h1>
        <div className="bg-muted rounded p-4 mb-6">
          <div className="font-medium">{appt.calendar?.name}</div>
          <div className="text-sm">{when.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</div>
          <div className="text-sm">{when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
          {appt.attendant && <div className="text-sm text-muted-foreground mt-1">com {appt.attendant.name}</div>}
          <div className="mt-2 text-xs uppercase font-semibold">{appt.status}</div>
        </div>
        {appt.status === "confirmed" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate(`/agendamento/${token}/reagendar`)}>
              <Calendar className="w-4 h-4 mr-2" /> Reagendar
            </Button>
            <Button variant="destructive" onClick={() => navigate(`/agendamento/${token}/cancelar`)}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
