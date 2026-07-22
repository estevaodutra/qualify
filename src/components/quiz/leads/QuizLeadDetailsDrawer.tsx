import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuizLeadDetails } from "@/hooks/quiz/useQuizLeadDetails";
import { QuizLeadTimeline } from "./QuizLeadTimeline";
import { X, Calendar, Globe, Monitor, Phone, Mail, User, Shield, Tag, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  submissionId: string | null;
  onClose: () => void;
}

export function QuizLeadDetailsDrawer({ submissionId, onClose }: Props) {
  const { data, isLoading } = useQuizLeadDetails(submissionId);

  if (!submissionId) return null;

  const getStatusBadge = (stat: string) => {
    switch (stat) {
      case "anonymous":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">Anônimo</Badge>;
      case "started":
        return <Badge className="bg-blue-500 text-white">Iniciado</Badge>;
      case "identified":
        return <Badge className="bg-amber-500 text-white">Identificado</Badge>;
      case "completed":
        return <Badge className="bg-emerald-500 text-white">Concluído</Badge>;
      case "abandoned":
        return <Badge className="bg-rose-500 text-white">Abandonou</Badge>;
      case "disqualified":
        return <Badge className="bg-red-500 text-white">Reprovado</Badge>;
      default:
        return <Badge variant="outline">{stat}</Badge>;
    }
  };

  return (
    <Sheet open={!!submissionId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-[580px] sm:max-w-[580px] overflow-y-auto p-0 flex flex-col h-full bg-slate-50">
        <SheetHeader className="p-6 bg-white border-b shrink-0 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {data?.submission.publicId || "Carregando..."}
              </span>
              {data && getStatusBadge(data.submission.status)}
            </div>
            <SheetTitle className="text-lg font-bold text-slate-800">
              {data?.submission.leadName || "Visitante Anônimo"}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Jornada de preenchimento do funil de quiz.
            </SheetDescription>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-500 gap-2">
            <span className="h-5 w-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
            Carregando detalhes...
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
            Lead não encontrado ou excluído.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Lead Card Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              <Card className="bg-white border-slate-100 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Contato</span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 opacity-40 shrink-0" />
                      <span className="font-mono">{data.submission.leadPhone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 opacity-40 shrink-0" />
                      <span className="truncate">{data.submission.leadEmail || "—"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-100 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Origem & Metadados</span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 opacity-40 shrink-0" />
                      <span className="truncate" title={data.submission.utmSource || "Direto"}>
                        UTM: {data.submission.utmSource || "Sem Origem"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5 opacity-40 shrink-0" />
                      <span>{data.submission.deviceType || "desktop"} / {data.submission.browser || "Chrome"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* UTM Metadata */}
            {(data.submission.utmSource || data.submission.utmCampaign || data.submission.utmMedium) && (
              <div className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dados de Campanha (UTMs)</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {data.submission.utmSource && (
                    <div><span className="text-slate-400">Source:</span> <span className="font-semibold">{data.submission.utmSource}</span></div>
                  )}
                  {data.submission.utmMedium && (
                    <div><span className="text-slate-400">Medium:</span> <span className="font-semibold">{data.submission.utmMedium}</span></div>
                  )}
                  {data.submission.utmCampaign && (
                    <div><span className="text-slate-400">Campaign:</span> <span className="font-semibold">{data.submission.utmCampaign}</span></div>
                  )}
                  {data.submission.utmContent && (
                    <div><span className="text-slate-400">Content:</span> <span className="font-semibold">{data.submission.utmContent}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Answers */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Respostas Mapeadas</h4>
              {data.answers.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sem respostas salvas nesta jornada.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.answers.map((ans) => (
                    <div key={ans.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col space-y-1">
                      <span className="text-[10px] text-indigo-600 font-bold uppercase">{ans.stepName}</span>
                      <div className="text-xs text-slate-800 font-semibold">
                        {Array.isArray(ans.value) ? ans.value.join(", ") : String(ans.value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CRM Lead Sync */}
            {data.submission.leadId && (
              <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Lead Vinculado ao CRM</h5>
                    <p className="text-[10px] text-slate-500">Histórico de jornada totalmente sincronizado com o contato.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-slate-200" onClick={() => window.open(`/leads`, "_blank")}>
                  <span>Abrir CRM</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Timeline da Jornada</h4>
              <QuizLeadTimeline timeline={data.timeline} firstSeenAt={data.submission.firstSeenAt} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
