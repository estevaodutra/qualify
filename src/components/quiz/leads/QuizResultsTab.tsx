import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizFunnel } from "@/hooks/useQuizFunnels";
import { QuizStep } from "@/hooks/useQuizSteps";
import { QuizComponent } from "@/hooks/useQuizComponents";
import { QuizSubmissionDetail } from "@/types/quiz/tracking";
import { Progress } from "@/components/ui/progress";
import { Award, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";

interface Props {
  funnel: QuizFunnel;
  steps: QuizStep[];
  components: QuizComponent[];
  leads: QuizSubmissionDetail[];
}

export function QuizResultsTab({ funnel, steps, components, leads }: Props) {
  const completedLeads = leads.filter(l => l.status === "completed");
  const identifiedLeads = leads.filter(l => l.status === "identified" || l.status === "completed");
  const disqualifiedLeads = leads.filter(l => l.status === "disqualified");

  const totalLeads = leads.length;
  const avgScore = completedLeads.length > 0
    ? Math.round(completedLeads.reduce((acc, l) => acc + (l.score || 0), 0) / completedLeads.length)
    : 0;

  // Profile distribution calculations (mapping final statuses)
  const approvedPct = totalLeads > 0 ? Math.round((completedLeads.length / totalLeads) * 100) : 0;
  const disqualifiedPct = totalLeads > 0 ? Math.round((disqualifiedLeads.length / totalLeads) * 100) : 0;
  const inProgressPct = totalLeads > 0 ? Math.round((leads.filter(l => ["started", "identified"].includes(l.status)).length / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Média de Pontos</p>
              <p className="text-2xl font-bold text-slate-800">{avgScore} pts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aprovados (Concluídos)</p>
              <p className="text-2xl font-bold text-slate-800">{completedLeads.length} leads</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reprovados / Desqualificados</p>
              <p className="text-2xl font-bold text-slate-800">{disqualifiedLeads.length} leads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Distribuição de Perfis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Aprovado / Perfil Ideal</span>
                <span>{approvedPct}%</span>
              </div>
              <Progress value={approvedPct} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Reprovado / Fora do Perfil</span>
                <span>{disqualifiedPct}%</span>
              </div>
              <Progress value={disqualifiedPct} className="h-2 bg-slate-100 [&>div]:bg-rose-500" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Em Andamento</span>
                <span>{inProgressPct}%</span>
              </div>
              <Progress value={inProgressPct} className="h-2 bg-slate-100 [&>div]:bg-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs text-slate-600">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Total de Entradas:</span>
              <span className="font-bold text-slate-800">{totalLeads}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Total de Leads Identificados:</span>
              <span className="font-bold text-slate-800">{identifiedLeads.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Taxa Geral de Identificação:</span>
              <span className="font-bold text-slate-800">
                {totalLeads > 0 ? Math.round((identifiedLeads.length / totalLeads) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
