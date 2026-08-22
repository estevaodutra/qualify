import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, X } from "lucide-react";
import { WorkflowNodeExecution } from "@/hooks/useWorkflowExecutions";
import { maskSensitiveData } from "@/lib/maskSensitiveData";
import { useToast } from "@/hooks/use-toast";

interface NodeInspectorProps {
  nodeExecution: WorkflowNodeExecution;
  onClose: () => void;
}

function JsonBlock({ value }: { value: unknown }) {
  const { toast } = useToast();
  const formatted = JSON.stringify(maskSensitiveData(value) ?? {}, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    toast({ title: "Copiado para a área de transferência" });
  };

  if (value === null || value === undefined) {
    return <p className="text-xs text-slate-400 italic p-3">Nenhum dado registrado.</p>;
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 rounded hover:bg-slate-200/60"
        title="Copiar"
        onClick={handleCopy}
      >
        <Copy className="h-3 w-3" />
      </Button>
      <pre className="text-[10px] bg-muted/50 rounded-lg p-3 pr-8 overflow-auto max-h-[420px] font-mono whitespace-pre-wrap break-words">
        {formatted}
      </pre>
    </div>
  );
}

export function NodeInspector({ nodeExecution, onClose }: NodeInspectorProps) {
  const output = nodeExecution.output as { branch?: string; result?: boolean; condition?: string } | null;
  const input = nodeExecution.input as any;

  const isCondition = nodeExecution.nodeType === "condition" || nodeExecution.nodeType === "condicao";
  const isTrigger = nodeExecution.nodeType === "trigger" || nodeExecution.nodeType === "start" || nodeExecution.nodeType === "inicio";

  const conditionResult = output?.result;
  const branchTaken = output?.branch;

  return (
    <Card className="w-[360px] shrink-0 flex flex-col border-slate-200/60 bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Inspetor do Bloco</h4>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{nodeExecution.nodeType} · {nodeExecution.nodeId.substring(0, 8)}...</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-200/60" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="diag" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-5 rounded-none bg-slate-100/70 h-9">
          <TabsTrigger value="diag" className="text-[10px] font-bold">Diagnóstico</TabsTrigger>
          <TabsTrigger value="input" className="text-[10px]">Entrada</TabsTrigger>
          <TabsTrigger value="output" className="text-[10px]">Saída</TabsTrigger>
          <TabsTrigger value="error" className="text-[10px]">Erro</TabsTrigger>
          <TabsTrigger value="meta" className="text-[10px]">Meta</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="diag" className="p-4 mt-0 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Status do Processamento:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase text-[10px]">
                  {nodeExecution.status}
                </span>
              </div>

              {isTrigger && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl space-y-1 text-xs">
                  <p className="font-bold text-emerald-800 flex items-center gap-1.5">🚀 Gatilho Inicial</p>
                  <p className="text-[11px] text-emerald-700">O fluxo foi iniciado para o contato abaixo.</p>
                  {input?.respondentPhone && (
                    <p className="text-[11px] font-mono text-emerald-900 pt-1">Telefone: {input.respondentPhone}</p>
                  )}
                </div>
              )}

              {isCondition && (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Avaliação da Condição:</span>
                    {conditionResult === true ? (
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                        VERDADEIRO
                      </span>
                    ) : (
                      <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                        FALSO (Fallback)
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-200/60 pt-2">
                    <p><span className="font-medium text-slate-500">Condição Testada:</span> <code className="bg-slate-200/60 px-1 py-0.5 rounded">{output?.condition || input?.conditionType || "CRM/Lead"}</code></p>
                    <p><span className="font-medium text-slate-500">Saída Percorrida:</span> <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono">{branchTaken === "fallback" ? "Quando não atender a nenhuma condição (vermelha)" : branchTaken || "Verdadeiro (verde)"}</code></p>
                  </div>

                  {conditionResult === false && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-bold">⚠️ Diagnóstico do Ramo:</p>
                      <p className="leading-relaxed">
                        O lead avaliado não atendeu à condição. A automação tomou a <strong>saída vermelha</strong> (<em>Quando não atender a nenhuma condição</em>).
                      </p>
                      <p className="leading-relaxed font-semibold pt-1">
                        👉 Se o fluxo encerrou aqui, certifique-se de conectar a saída vermelha deste nó ao próximo bloco que deseja executar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!isTrigger && !isCondition && (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs">
                  <p className="font-bold text-slate-800">Ação Executada</p>
                  <p className="text-[11px] text-slate-600">O bloco de {nodeExecution.nodeType} foi processado com sucesso.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="input" className="p-3 mt-0">
            <JsonBlock value={nodeExecution.input} />
          </TabsContent>
          <TabsContent value="output" className="p-3 mt-0">
            <JsonBlock value={nodeExecution.output} />
          </TabsContent>
          <TabsContent value="error" className="p-3 mt-0">
            <JsonBlock value={nodeExecution.error} />
          </TabsContent>
          <TabsContent value="meta" className="p-3 mt-0 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="font-semibold">{nodeExecution.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Início</span><span className="font-mono text-[10px]">{nodeExecution.startedAt ? new Date(nodeExecution.startedAt).toLocaleString("pt-BR") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Término</span><span className="font-mono text-[10px]">{nodeExecution.finishedAt ? new Date(nodeExecution.finishedAt).toLocaleString("pt-BR") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Duração</span><span className="font-mono text-[10px]">{nodeExecution.durationMs != null ? `${nodeExecution.durationMs}ms` : "—"}</span></div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}
