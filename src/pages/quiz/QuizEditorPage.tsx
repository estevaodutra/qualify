// src/pages/quiz/QuizEditorPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuizFunnel } from "@/hooks/useQuizFunnels";
import { QuizBuilderShell } from "@/components/quiz/builder/QuizBuilderShell";

export default function QuizEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: funnel, isLoading, error } = useQuizFunnel(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
        <p className="text-muted-foreground text-sm font-medium">Funil não encontrado ou indisponível.</p>
        <button className="text-indigo-600 underline text-xs font-semibold" onClick={() => navigate("/quiz")}>
          Voltar para Meus Funis
        </button>
      </div>
    );
  }

  return <QuizBuilderShell funnelId={funnel.id} />;
}
