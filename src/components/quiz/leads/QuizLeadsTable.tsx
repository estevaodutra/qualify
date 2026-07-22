import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { QuizFunnel } from "@/hooks/useQuizFunnels";
import { QuizStep } from "@/hooks/useQuizSteps";
import { QuizComponent } from "@/hooks/useQuizComponents";
import { QuizSubmissionDetail } from "@/types/quiz/tracking";
import { QuizLeadsToolbar } from "./QuizLeadsToolbar";
import { QuizLeadDetailsDrawer } from "./QuizLeadDetailsDrawer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Eye, Phone, Mail, User, Clock, Monitor } from "lucide-react";

interface Props {
  funnel: QuizFunnel;
  steps: QuizStep[];
  components: QuizComponent[];
  leads: QuizSubmissionDetail[];
  totalCount: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
  status: string;
  onStatusChange: (s: string) => void;
  utmSource: string;
  onUtmSourceChange: (s: string) => void;
  utmCampaign: string;
  onUtmCampaignChange: (s: string) => void;
  deviceType: string;
  onDeviceTypeChange: (s: string) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (r: { from?: Date; to?: Date }) => void;
  onRefresh?: () => void;
}

export function QuizLeadsTable({
  funnel,
  steps,
  components,
  leads,
  totalCount,
  isLoading,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  status,
  onStatusChange,
  utmSource,
  onUtmSourceChange,
  utmCampaign,
  onUtmCampaignChange,
  deviceType,
  onDeviceTypeChange,
  dateRange,
  onDateRangeChange,
  onRefresh
}: Props) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Visible submissions ids for lazy loading answers
  const visibleSubmissionIds = leads.map((l) => l.id);

  // Lazy load answers for current page leads list
  const { data: answers = [] } = useQuery({
    queryKey: ["leads_page_answers", visibleSubmissionIds],
    queryFn: async () => {
      if (visibleSubmissionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("quiz_answers")
        .select("submission_id, component_id, answer_value")
        .in("submission_id", visibleSubmissionIds);
      if (error) throw error;
      return data as Array<{ submission_id: string; component_id: string; answer_value: any }>;
    },
    enabled: visibleSubmissionIds.length > 0
  });

  const getAnswerText = (subId: string, compId: string) => {
    const ans = answers.find(a => a.submission_id === subId && a.component_id === compId);
    if (!ans) return null;
    const val = ans.answer_value;
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  // Find components that collect inputs/answers
  const filterableComponentTypes = [
    "options", "cards_choice", "field_name", "field_email",
    "field_phone", "field_textarea", "field_height", "field_weight", "scale_slider"
  ];
  
  const questionComponents = components
    .filter(c => filterableComponentTypes.includes(c.componentType))
    .sort((a, b) => {
      const stepA = steps.find(s => s.id === a.stepId);
      const stepB = steps.find(s => s.id === b.stepId);
      if (!stepA || !stepB) return 0;
      if (stepA.stepOrder !== stepB.stepOrder) return stepA.stepOrder - stepB.stepOrder;
      return a.componentOrder - b.componentOrder;
    });

  // Calculate passage rates
  const getStepPassageRate = (stepIdx: number) => {
    if (leads.length === 0) return 0;
    const reached = leads.filter(l => l.stepsCompleted >= stepIdx).length;
    return Math.round((reached / leads.length) * 100);
  };

  const getStatusBadge = (stat: string) => {
    switch (stat) {
      case "anonymous":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">Anônimo</Badge>;
      case "started":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">Iniciado</Badge>;
      case "identified":
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100">Identificado</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white">Concluído</Badge>;
      case "abandoned":
        return <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-100">Abandonou</Badge>;
      case "disqualified":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Reprovado</Badge>;
      default:
        return <Badge variant="outline">{stat}</Badge>;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4 flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <QuizLeadsToolbar
        search={search}
        onSearchChange={onSearchChange}
        status={status}
        onStatusChange={onStatusChange}
        utmSource={utmSource}
        onUtmSourceChange={onUtmSourceChange}
        utmCampaign={utmCampaign}
        onUtmCampaignChange={onUtmCampaignChange}
        deviceType={deviceType}
        onDeviceTypeChange={onDeviceTypeChange}
        leads={leads}
        onRefresh={() => {
          onRefresh?.();
          supabase.channel(`quiz_realtime_leads_${funnel.id}`).send({ type: "broadcast", event: "refresh", payload: {} });
        }}
      />

      {/* Main container with horizontal overflow and scrollbars */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-sm text-slate-500 gap-2">
              <span className="h-5 w-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              Carregando leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-sm text-slate-400">
              Nenhuma entrada ou lead corresponde aos filtros definidos.
            </div>
          ) : (
            <Table className="min-w-[1200px]">
              <TableHeader className="bg-slate-50 border-b">
                <TableRow>
                  <TableHead className="w-[100px] text-xs font-bold text-slate-700 uppercase">ID Curto</TableHead>
                  <TableHead className="w-[140px] text-xs font-bold text-slate-700 uppercase">Data/Hora</TableHead>
                  <TableHead className="w-[150px] text-xs font-bold text-slate-700 uppercase">Nome</TableHead>
                  <TableHead className="w-[130px] text-xs font-bold text-slate-700 uppercase">WhatsApp</TableHead>
                  <TableHead className="w-[100px] text-xs font-bold text-slate-700 uppercase">Status</TableHead>
                  <TableHead className="w-[120px] text-xs font-bold text-slate-700 uppercase">Progresso</TableHead>

                  {/* Dynamic question headers */}
                  {questionComponents.map((comp) => {
                    const step = steps.find(s => s.id === comp.stepId);
                    const stepIdx = steps.findIndex(s => s.id === comp.stepId);
                    const passRate = getStepPassageRate(stepIdx + 1);

                    return (
                      <TableHead key={comp.id} className="min-w-[160px] max-w-[240px] text-xs text-slate-600 border-l border-slate-100">
                        <div className="flex flex-col space-y-0.5 py-1">
                          <span className="font-bold text-slate-700 truncate">
                            {step?.name || `Etapa ${stepIdx + 1}`}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {comp.config.question || comp.config.label || "Pergunta"}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-indigo-50/50 text-indigo-700 border-indigo-100/50">
                              {passRate}% pass
                            </Badge>
                          </div>
                        </div>
                      </TableHead>
                    );
                  })}

                  <TableHead className="w-[120px] text-xs font-bold text-slate-700 uppercase border-l border-slate-100">Duração</TableHead>
                  <TableHead className="w-[120px] text-xs font-bold text-slate-700 uppercase">Origem (UTM)</TableHead>
                  <TableHead className="w-[80px] text-center text-xs font-bold text-slate-700 uppercase">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow
                    key={l.id}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                    onClick={() => setSelectedSubmissionId(l.id)}
                  >
                    <TableCell className="font-mono text-xs font-bold text-slate-900">
                      {l.publicId}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {format(new Date(l.firstSeenAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 opacity-40 shrink-0" />
                        <span className="truncate max-w-[130px]">{l.leadName || "Visitante Anônimo"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600">
                      {l.leadPhone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 opacity-40" />
                          <span>{l.leadPhone}</span>
                        </div>
                      ) : (
                        <span className="opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(l.status)}</TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>{l.stepsCompleted}/{steps.length} et.</span>
                          <span>{l.progressPercentage}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${l.progressPercentage}%` }}
                            className="h-full bg-indigo-500 rounded-full"
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Dynamic question answer cells */}
                    {questionComponents.map((comp) => {
                      const ansText = getAnswerText(l.id, comp.id);
                      return (
                        <TableCell key={comp.id} className="text-xs text-slate-600 truncate max-w-[200px] border-l border-slate-100 font-medium">
                          {ansText ? (
                            <span className="text-slate-800">{ansText}</span>
                          ) : (
                            <span className="text-muted-foreground/30 italic">Sem resposta</span>
                          )}
                        </TableCell>
                      );
                    })}

                    <TableCell className="text-xs text-slate-600 border-l border-slate-100 font-mono">
                      {l.totalDurationSeconds ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 opacity-40" />
                          <span>{l.totalDurationSeconds}s</span>
                        </div>
                      ) : (
                        <span className="opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 truncate max-w-[120px]">
                      {l.utmSource ? (
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                          {l.utmSource}
                        </Badge>
                      ) : (
                        <span className="opacity-30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 group-hover:text-indigo-600 hover:bg-slate-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubmissionId(l.id);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Server-side Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t shrink-0">
            <span className="text-xs text-slate-500">
              Mostrando <span className="font-semibold">{leads.length}</span> de{" "}
              <span className="font-semibold">{totalCount}</span> entradas
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-slate-200"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold text-slate-700 px-3">
                Pág. {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-slate-200"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Journey Detail Drawer */}
      <QuizLeadDetailsDrawer
        submissionId={selectedSubmissionId}
        onClose={() => setSelectedSubmissionId(null)}
      />
    </div>
  );
}
