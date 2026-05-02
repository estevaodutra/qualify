import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePublicCalendar, useCreatePublicAppointment } from "@/hooks/usePublicBooking";
import BookingLayout from "./BookingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadBookingState, saveBookingState } from "@/lib/booking-slots";
import { toast } from "@/hooks/use-toast";

export default function BookingDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: calendar } = usePublicCalendar(slug);
  const create = useCreatePublicAppointment();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!calendar) return <div className="p-10 text-center">Carregando…</div>;

  const fields = calendar.lead_fields.length > 0
    ? calendar.lead_fields
    : [
        { id: "name", field_name: "Nome", field_type: "text" as const, is_required: true, is_default: true, sort_order: 0 },
        { id: "phone", field_name: "Telefone", field_type: "phone" as const, is_required: true, is_default: true, sort_order: 1 },
      ];

  const submit = async () => {
    for (const f of fields) {
      if (f.is_required && !form[f.id]) { alert(`Preencha: ${f.field_name}`); return; }
    }
    const state = loadBookingState(slug!);
    if (!state.scheduled_start) { navigate(`/agendar/${slug}`); return; }

    setLoading(true);
    try {
      const name = form["name"] || form[fields.find((f) => f.field_type === "text")?.id || ""] || "";
      const phone = form["phone"] || form[fields.find((f) => f.field_type === "phone")?.id || ""] || "";
      const email = form["email"] || form[fields.find((f) => f.field_type === "email")?.id || ""] || null;
      const custom: Record<string, string> = { ...form };
      const res = await create.mutateAsync({
        calendar_id: calendar.id,
        attendant_id: state.attendantId || null,
        scheduled_start: state.scheduled_start,
        lead_name: name,
        lead_phone: phone,
        lead_email: email,
        custom_fields: custom,
        answers: state.answers || {},
      });
      saveBookingState(slug!, { token: res.cancel_token });
      navigate(`/agendar/${slug}/sucesso`);
    } catch (e: any) {
      toast({ title: "Erro ao confirmar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BookingLayout calendar={calendar}>
      <h1 className="text-2xl font-bold mb-4">Preencha seus dados</h1>
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.id}>
            <Label>{f.field_name}{f.is_required && " *"}</Label>
            <Input
              type={f.field_type === "email" ? "email" : f.field_type === "number" ? "number" : "text"}
              value={form[f.id] || ""}
              onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-6">
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        <Button onClick={submit} disabled={loading}>{loading ? "Confirmando…" : ((calendar.texts as any)?.confirm_button || "Confirmar Agendamento")}</Button>
      </div>
    </BookingLayout>
  );
}
