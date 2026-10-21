/**
 * Modal: 📊 GERAR RELATÓRIO (Camada A / Seção 34).
 * Estrutura canônica de 5 seções derivadas do estado real da implementação:
 * 1. O QUE FOI FEITO (Entregas concluídas e evidências)
 * 2. O QUE ACONTECEU (Ativações e eventos)
 * 3. QUAIS NÚMEROS TIVEMOS (Leads, horas, margem, progresso)
 * 4. O QUE ESTÁ PENDENTE (Bloqueios, pendências e responsáveis)
 * 5. PRÓXIMOS PASSOS (Próximas ações e prazos previstos)
 *
 * 4 Formatos:
 * - Executivo
 * - Operacional
 * - Resumo para WhatsApp (formatado com * e emojis para copiar)
 * - Exportação Estruturada (JSON)
 */

import React, { useState } from "react";
import {
  FileText,
  Copy,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { sprintTasks } from "../../domain/ops";
import { computeProgressMetrics, computeSprintFinancials } from "../../metrics/calculations";
import { fmtDateTime, fmtMinutes } from "../../scheduler/time";

export const ReportsModal: React.FC = () => {
  const { workspace, activeSprintId, isReportModalOpen, setIsReportModalOpen } =
    useSprintOSStore();

  const [activeTab, setActiveTab] = useState("whatsapp");

  if (!workspace || !activeSprintId) return null;

  const sprint = workspace.sprints[activeSprintId];
  const tasks = sprintTasks(workspace, activeSprintId).filter((t) => !t.archivedAt);
  const progress = computeProgressMetrics(workspace, activeSprintId);
  const fin = computeSprintFinancials(workspace, activeSprintId);

  const doneTasks = tasks.filter((t) => t.status === "done");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const doingTasks = tasks.filter((t) => t.status === "doing");
  const blockedTasks = tasks.filter((t) => !!t.blockedReason);

  // Formato WhatsApp formatado com emojis e negrito
  const whatsappReport = `*RELATÓRIO DE IMPLEMENTAÇÃO — ${workspace.project.name.toUpperCase()}*
*Sprint:* ${sprint?.name || "Sprint 01"}
*Status:* ${progress.taskProgressPct}% concluído (Dia ${progress.currentWorkDayIndex}/${progress.businessDaysTotal})

*1. O QUE FOI FEITO:*
${doneTasks.length > 0 ? doneTasks.map((t) => `✅ ${t.title}`).join("\n") : "• Nenhuma entrega finalizada ainda"}

*2. O QUE ACONTECEU:*
• Operação ativada e cronograma alinhado em São Paulo
• Horas executadas: ${fmtMinutes(progress.effortLoggedMinutes)} de ${fmtMinutes(progress.effortTotalMinutes)} planejadas

*3. QUAIS NÚMEROS TIVEMOS:*
• Progresso: ${progress.taskProgressPct}% das entregas
• Horas restantes: ${fmtMinutes(progress.effortRemainingMinutes)}
• Atendimentos/Leads no funil: ${Object.values(workspace.funnel).reduce((sum, f) => sum + f.count, 0)}

*4. O QUE ESTÁ PENDENTE:*
${blockedTasks.length > 0 ? blockedTasks.map((t) => `⚠️ ${t.title}: ${t.blockedReason}`).join("\n") : "• Nenhum bloqueio ativo no momento"}

*5. PRÓXIMOS PASSOS:*
${doingTasks.length > 0 ? doingTasks.map((t) => `⏳ ${t.title}`).join("\n") : pendingTasks.slice(0, 3).map((t) => `📌 ${t.title}`).join("\n")}

_Relatório emitido via Sprint OS — Cockpit de Implementação_`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
      <DialogContent className="max-w-3xl bg-card border border-border text-card-foreground shadow-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <FileText className="h-4 w-4" />
              <DialogTitle className="text-base font-black text-foreground">
                Relatórios Canônicos de Execução
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted border border-border p-1 rounded-xl mb-4">
              <TabsTrigger value="whatsapp" className="text-xs font-bold gap-1.5">
                <Send className="h-3 w-3 text-emerald-400" />
                <span>Resumo WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger value="executive" className="text-xs font-bold">
                Executivo
              </TabsTrigger>
              <TabsTrigger value="operational" className="text-xs font-bold">
                Operacional Completo
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs font-bold">
                JSON Estruturado
              </TabsTrigger>
            </TabsList>

            {/* TAB: WHATSAPP */}
            <TabsContent value="whatsapp" className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Texto pré-formatado pronto para colar no grupo do cliente ou time:</span>
                <Button
                  onClick={() => copyToClipboard(whatsappReport)}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs gap-1.5 h-7"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copiar Mensagem</span>
                </Button>
              </div>

              <Textarea
                value={whatsappReport}
                readOnly
                rows={14}
                className="bg-muted/40 border-border text-emerald-600 dark:text-emerald-400 font-mono text-xs leading-relaxed"
              />
            </TabsContent>

            {/* TAB: EXECUTIVO */}
            <TabsContent value="executive" className="space-y-4 text-xs text-foreground/80">
              <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                  Relatório Executivo de Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground block">Projeto / Cliente:</span>
                    <strong className="text-foreground">{workspace.project.name} ({workspace.project.client})</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Progresso Físico:</span>
                    <strong className="text-primary">{progress.taskProgressPct}% concluído</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Entregas Finalizadas:</span>
                    <strong>{progress.tasksDone} de {progress.tasksTotal} tarefas</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Margem Bruta Estimada:</span>
                    <strong className="text-emerald-400">{fin.projectedGrossMarginPct}%</strong>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: OPERACIONAL */}
            <TabsContent value="operational" className="space-y-4 text-xs">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/5 border border-border">
                  <h4 className="font-bold text-foreground mb-1">1. Entregas Concluídas</h4>
                  <ul className="list-disc pl-5 text-foreground/70 space-y-0.5">
                    {doneTasks.map((t) => (
                      <li key={t.id}>{t.title}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-border">
                  <h4 className="font-bold text-foreground mb-1">2. Pendências e Bloqueios</h4>
                  {blockedTasks.length > 0 ? (
                    <ul className="list-disc pl-5 text-rose-300 space-y-0.5">
                      {blockedTasks.map((t) => (
                        <li key={t.id}>{t.title}: {t.blockedReason}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">Nenhum bloqueio registrado.</span>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB: JSON */}
            <TabsContent value="json" className="space-y-3">
              <div className="flex justify-end">
                <Button
                  onClick={() => copyToClipboard(JSON.stringify({ progress, financials: fin, doneTasks, blockedTasks }, null, 2))}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-border text-foreground gap-1.5"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copiar JSON</span>
                </Button>
              </div>
              <Textarea
                value={JSON.stringify({ progress, financials: fin, doneTasks, blockedTasks }, null, 2)}
                readOnly
                rows={12}
                className="bg-muted/20 border-border text-foreground/70 font-mono text-[11px]"
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
