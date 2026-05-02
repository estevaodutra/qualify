import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePublicCalendar } from "@/hooks/usePublicBooking";
import BookingLayout from "./BookingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveBookingState, loadBookingState } from "@/lib/booking-slots";

export default function BookingQualification() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: calendar } = usePublicCalendar(slug);
  const [answers, setAnswers] = useState<Record<string, string>>(loadBookingState(slug || "").answers || {});

  if (!calendar) return <div className="p-10 text-center">Carregando…</div>;

  const submit = () => {
    for (const q of calendar.questions) {
      if (q.is_required && !answers[q.id]) {
        alert(`Responda: ${q.question_text}`);
        return;
      }
    }
    saveBookingState(slug!, { answers });
    navigate(`/agendar/${slug}/dados`);
  };

  return (
    <BookingLayout calendar={calendar}>
      <h1 className="text-2xl font-bold mb-4">Responda algumas perguntas</h1>
      <div className="space-y-4">
        {calendar.questions.map((q) => (
          <div key={q.id}>
            <Label>{q.question_text}{q.is_required && " *"}</Label>
            {q.question_type === "long_text" ? (
              <Textarea value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            ) : q.question_type === "multiple_choice" ? (
              <div className="space-y-1 mt-1">
                {(q.options || []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <Input type={q.question_type === "number" ? "number" : "text"} value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-6">
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        <Button onClick={submit}>Continuar</Button>
      </div>
    </BookingLayout>
  );
}
