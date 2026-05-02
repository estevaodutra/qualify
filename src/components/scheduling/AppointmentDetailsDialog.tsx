import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAppointments, useAppointmentEvents, Appointment } from "@/hooks/useAppointments";

export default function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { updateStatus, updateNotes } = useAppointments();
  const { data: events = [] } = useAppointmentEvents(appointment?.id ?? null);
  const [notes, setNotes] = useState("");

  useEffect(() => { setNotes(appointment?.internalNotes || ""); }, [appointment?.id]);

  if (!appointment) return null;
  const start = new Date(appointment.scheduledStart);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Agendamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <h3 className="font-semibold mb-1">Agendamento</h3>
            <div className="text-sm space-y-1">
              <div>{appointment.calendar?.name}</div>
              <div>{start.toLocaleString("pt-BR")}</div>
              <Badge>{appointment.status}</Badge>
              {appointment.attendant && <div className="text-muted-foreground">com {appointment.attendant.name}</div>}
              {appointment.meetingUrl && <a className="text-primary underline" href={appointment.meetingUrl} target="_blank" rel="noreferrer">Abrir reunião</a>}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Lead</h3>
            <div className="text-sm space-y-1">
              <div>{appointment.leadName}</div>
              <a className="text-primary" href={`tel:${appointment.leadPhone}`}>{appointment.leadPhone}</a>
              {appointment.leadEmail && <div>{appointment.leadEmail}</div>}
            </div>
          </section>

          {Object.keys(appointment.answers || {}).length > 0 && (
            <section>
              <h3 className="font-semibold mb-1">Qualificação</h3>
              <div className="text-sm space-y-1">
                {Object.entries(appointment.answers).map(([k, v]) => (
                  <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="font-semibold mb-1">Histórico</h3>
            <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {events.map((e: any) => (
                <div key={e.id} className="text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("pt-BR")} — {e.event_type}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Notas internas</h3>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button size="sm" className="mt-2" onClick={() => updateNotes.mutate({ id: appointment.id, notes })}>Salvar nota</Button>
          </section>

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {appointment.status === "confirmed" && (
              <>
                <Button size="sm" onClick={() => updateStatus.mutate({ id: appointment.id, status: "completed" })}>Marcar concluído</Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: appointment.id, status: "no_show" })}>No-show</Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: appointment.id, status: "cancelled" })}>Cancelar</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
