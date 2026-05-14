import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MousePointerClick, Users, CheckSquare, TrendingUp } from "lucide-react";
import { QuizFunnel } from "@/hooks/useQuizFunnels";
import { QuizStep } from "@/hooks/useQuizSteps";
import { QuizComponent } from "@/hooks/useQuizComponents";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  funnel: QuizFunnel;
  steps: QuizStep[];
  components: QuizComponent[];
}

interface AnswerRow {
  step_id: string;
  component_id: string;
  answer_value: unknown;
}

export function PerformanceTab({ funnel, steps, components }: Props) {
  const { user } = useAuth();

  const { data: answers = [], isLoading } = useQuery({
    queryKey: ["quiz_perf_answers", funnel.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quiz_answers")
        .select("step_id, component_id, answer_value")
        .eq("funnel_id", funnel.id);
      if (error) throw error;
      return data as AnswerRow[];
    },
    enabled: !!funnel.id && !!user,
  });

  const completionRate =
    funnel.visitsCount > 0
      ? Math.round((funnel.completionsCount / funnel.visitsCount) * 100)
      : 0;

  // Group answers by step
  const answersByStep: Record<string, AnswerRow[]> = {};
  for (const a of answers) {
    if (!answersByStep[a.step_id]) answersByStep[a.step_id] = [];
    answersByStep[a.step_id].push(a);
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<MousePointerClick />} value={funnel.visitsCount} label="Visitas" color="text-blue-500" />
        <SummaryCard icon={<Users />} value={funnel.responsesCount} label="Iniciadas" color="text-orange-500" />
        <SummaryCard icon={<CheckSquare />} value={funnel.completionsCount} label="Concluídas" color="text-green-500" />
        <SummaryCard icon={<TrendingUp />} value={`${completionRate}%`} label="Taxa de conclusão" color="text-purple-500" />
      </div>

      {/* Per-step analytics */}
      {steps.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhuma etapa criada ainda.
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Análise por etapa</h3>
          {steps.map((step) => {
            const stepAnswers = answersByStep[step.id] || [];
            const uniqueSubmissions = new Set(stepAnswers.map((a) => a.component_id)).size;
            const stepComponents = components.filter((c) => c.stepId === step.id);
            const optionsComponents = stepComponents.filter((c) => c.componentType === "options");

            return (
              <Card key={step.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{step.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {stepAnswers.length} resposta(s)
                    </span>
                  </div>

                  {/* Options breakdown */}
                  {optionsComponents.map((comp) => {
                    const compAnswers = stepAnswers.filter((a) => a.component_id === comp.id);
                    const options = (comp.config.options as Array<{ id: string; text: string; value: string }>) || [];
                    const total = compAnswers.length;

                    if (options.length === 0) return null;

                    // Count each option selection
                    const counts: Record<string, number> = {};
                    for (const opt of options) counts[opt.id] = 0;
                    for (const answer of compAnswers) {
                      const selected = answer.answer_value as string[];
                      if (Array.isArray(selected)) {
                        for (const id of selected) {
                          if (counts[id] !== undefined) counts[id]++;
                        }
                      }
                    }

                    return (
                      <div key={comp.id} className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {(comp.config.question as string) || "Quiz"}
                        </p>
                        {options.map((opt) => {
                          const count = counts[opt.id] || 0;
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={opt.id} className="space-y-0.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="truncate max-w-[200px]">
                                  <span className="font-semibold">{opt.value}.</span> {opt.text}
                                </span>
                                <span className="text-muted-foreground shrink-0 ml-2">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {optionsComponents.length === 0 && stepAnswers.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sem respostas nesta etapa ainda.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={color}>{icon}</div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
