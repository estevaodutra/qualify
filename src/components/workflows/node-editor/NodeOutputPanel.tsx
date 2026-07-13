import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { NodeJsonViewer } from "./NodeJsonViewer";
import { NodeTableViewer } from "./NodeTableViewer";
import { NodeSchemaViewer } from "./NodeSchemaViewer";
import { Network, HelpCircle, CheckCircle, XCircle } from "lucide-react";

interface NodeOutputPanelProps {
  outputData: any;
  status: "success" | "error" | "not_run";
  errorText?: string;
  onRunNode: () => void;
}

export function NodeOutputPanel({ outputData, status, errorText, onRunNode }: NodeOutputPanelProps) {
  const [activeTab, setActiveTab] = useState<"json" | "table" | "schema">("json");

  return (
    <div className="flex-1 flex flex-col min-h-0 border rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Network className="h-4 w-4 text-[#8A3CFF]" /> Saída (Output)
        </h3>

        <div className="flex items-center gap-3">
          {/* Status badge */}
          {status === "success" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              <CheckCircle className="h-3.5 w-3.5" /> Sucesso
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/5 px-2 py-0.5 rounded-lg border border-destructive/10">
              <XCircle className="h-3.5 w-3.5" /> Falha
            </span>
          )}
          {status === "not_run" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border">
              Não Executado
            </span>
          )}

          {status !== "not_run" && (
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
              <TabsList className="h-7 p-0.5 rounded-lg bg-slate-100/80 border">
                <TabsTrigger value="json" className="h-6 text-[10px] rounded-md px-2.5">JSON</TabsTrigger>
                <TabsTrigger value="table" className="h-6 text-[10px] rounded-md px-2.5">Tabela</TabsTrigger>
                <TabsTrigger value="schema" className="h-6 text-[10px] rounded-md px-2.5">Schema</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col justify-stretch">
        {status === "not_run" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed rounded-xl gap-3">
            <HelpCircle className="h-8 w-8 text-slate-300 stroke-[1.5]" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">Nenhum output disponível</p>
              <p className="text-[10px] text-muted-foreground max-w-[200px] leading-normal mx-auto">
                Execute esta etapa para visualizar os resultados gerados por este node.
              </p>
            </div>
            <Button type="button" size="sm" onClick={onRunNode} className="text-xs rounded-xl h-8 px-4">
              Executar esta etapa
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {status === "error" && errorText && (
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive text-[11px] mb-3 leading-relaxed">
                <p className="font-semibold mb-0.5">Erro na Execução:</p>
                <p>{errorText}</p>
              </div>
            )}
            
            {outputData ? (
              <div className="flex-1 flex flex-col min-h-0">
                {activeTab === "json" && <NodeJsonViewer data={outputData} />}
                {activeTab === "table" && <NodeTableViewer data={outputData} />}
                {activeTab === "schema" && <NodeSchemaViewer data={outputData} />}
              </div>
            ) : (
              <div className="text-muted-foreground text-xs italic text-center py-8">
                Nenhum dado gerado no output (retorno vazio).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
