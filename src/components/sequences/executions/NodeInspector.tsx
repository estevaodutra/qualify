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
  return (
    <Card className="w-[340px] shrink-0 flex flex-col border-slate-200/60 bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Inspetor do Bloco</h4>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{nodeExecution.nodeType} · {nodeExecution.nodeId}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-50" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="input" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-5 rounded-none bg-slate-50 h-9">
          <TabsTrigger value="input" className="text-[10px]">Entrada</TabsTrigger>
          <TabsTrigger value="output" className="text-[10px]">Saída</TabsTrigger>
          <TabsTrigger value="logs" className="text-[10px]">Logs</TabsTrigger>
          <TabsTrigger value="error" className="text-[10px]">Erro</TabsTrigger>
          <TabsTrigger value="meta" className="text-[10px]">Meta</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="input" className="p-3 mt-0">
            <JsonBlock value={nodeExecution.input} />
          </TabsContent>
          <TabsContent value="output" className="p-3 mt-0">
            <JsonBlock value={nodeExecution.output} />
          </TabsContent>
          <TabsContent value="logs" className="p-3 mt-0">
            <JsonBlock value={nodeExecution.logs} />
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
