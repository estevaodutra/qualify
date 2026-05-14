import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuizFunnel } from "@/hooks/useQuizFunnels";
import { QuizEditorShell } from "@/components/quiz/editor/QuizEditorShell";

export default function QuizEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: funnel, isLoading, error } = useQuizFunnel(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-muted-foreground">Funil não encontrado.</p>
        <button className="text-primary underline text-sm" onClick={() => navigate("/quiz")}>
          Voltar para Meus Funis
        </button>
      </div>
    );
  }

  return <QuizEditorShell funnel={funnel} />;
}
