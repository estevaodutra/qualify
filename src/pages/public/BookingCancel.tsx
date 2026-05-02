import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppointmentByToken, useCancelByToken } from "@/hooks/usePublicBooking";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const REASONS = ["Conflito de agenda", "Não preciso mais", "Vou reagendar depois", "Outro motivo"];

export default function BookingCancel() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { data: appt } = useAppointmentByToken(token);
  const cancel = useCancelByToken();
  const [reason, setReason] = useState(REASONS[0]);
  const [comment, setComment] = useState("");

  const submit = async () => {
    try {
      await cancel.mutateAsync({ token: token!, reason, comment });
      toast({ title: "Agendamento cancelado" });
      navigate(`/agendamento/${token}/gerenciar`);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (!appt) return <div className="p-10 text-center">Carregando…</div>;

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-xl mx-auto bg-card rounded-xl border p-6">
        <h1 className="text-2xl font-bold mb-4">Cancelar Agendamento</h1>
        <p className="text-sm text-muted-foreground mb-4">Tem certeza que deseja cancelar?</p>
        <div className="space-y-3 mb-4">
          <Label>Motivo</Label>
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
          <Label>Comentário (opcional)</Label>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
          <Button variant="destructive" onClick={submit} disabled={cancel.isPending}>Confirmar Cancelamento</Button>
        </div>
      </div>
    </div>
  );
}
