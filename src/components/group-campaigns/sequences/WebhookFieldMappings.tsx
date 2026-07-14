import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Info, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Eye, Code2 } from "lucide-react";
import { toast } from "sonner";
import { toCanonicalPayload } from "@/lib/workflows/canonicalPayload";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FieldMapping {
  sourceField: string;
  variableName: string;
}

interface WebhookFieldMappingsProps {
  fieldMappings?: FieldMapping[];
  onFieldMappingsChange?: (mappings: FieldMapping[]) => void;
  webhookUrl: string;
  triggerConfig: any;
  onTriggerConfigChange: (config: any) => void;
}

export function WebhookFieldMappings({
  webhookUrl,
  triggerConfig,
  onTriggerConfigChange,
}: WebhookFieldMappingsProps) {
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  
  // Test payload states
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingStartTime, setWaitingStartTime] = useState<string | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedJsonView, setSelectedJsonView] = useState<any>(null);
  
  const pollingRef = useRef<any>(null);
  const sequenceId = webhookUrl ? webhookUrl.split("/").pop() : null;

  const handleCopyWebhook = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchHistory = async () => {
    if (!sequenceId) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("workflow_executions")
        .select("id, started_at, status, trigger_payload")
        .eq("sequence_id", sequenceId)
        .order("started_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentExecutions(data || []);
    } catch (err) {
      console.error("Error loading execution history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Poll for new executions when waiting for test payload
  useEffect(() => {
    if (isWaiting && waitingStartTime && sequenceId) {
      pollingRef.current = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from("workflow_executions")
            .select("id, started_at, status, trigger_payload")
            .eq("sequence_id", sequenceId)
            .gte("started_at", waitingStartTime)
            .order("started_at", { ascending: false })
            .limit(1);

          if (error) throw error;

          if (data && data.length > 0) {
            // Found a new execution!
            setIsWaiting(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
            
            toast.success("Payload de teste recebido com sucesso!");
            fetchHistory();

            // Set the new payload as reference automatically
            const referencePayload = toCanonicalPayload(data[0].trigger_payload);
            
            onTriggerConfigChange({
              ...triggerConfig,
              referencePayload
            });
          }
        } catch (err) {
          console.error("Error polling for test payload:", err);
        }
      }, 3000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isWaiting, waitingStartTime, sequenceId]);

  useEffect(() => {
    fetchHistory();
  }, [sequenceId]);

  const handleStartWaiting = () => {
    setIsWaiting(true);
    setWaitingStartTime(new Date().toISOString());
    toast.info("Aguardando payload... Envie um POST para a URL do webhook.");
  };

  const handleSelectReference = (execution: any) => {
    const referencePayload = toCanonicalPayload(execution.trigger_payload);
    
    onTriggerConfigChange({
      ...triggerConfig,
      referencePayload
    });
    toast.success("Payload selecionado como referência para mapeamentos!");
  };

  const activeReference = triggerConfig?.referencePayload ? toCanonicalPayload(triggerConfig.referencePayload) : null;

  const examplePayload = `{
  "method": "POST",
  "headers": {
    "content-type": "application/json"
  },
  "query_params": {},
  "body": {
    "nome": "João Silva",
    "phone": "5511999999999",
    "email": "joao@email.com",
    "produto": "Plano Premium",
    "valor": 199.90
  }
}`;

  return (
    <div className="space-y-4 p-3 rounded-lg bg-background border">
      {/* Warning/Guide Alert */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Mapeamento de Dados</p>
          <p className="leading-relaxed">
            Este bloco serve apenas para <strong>receber</strong> os dados. O mapeamento do payload para campos do Lead/Negócio deve ser feito no bloco <strong>Mapeamento de Campos</strong> (Operação de Campo) no fluxo de ações.
          </p>
        </div>
      </div>

      {/* Webhook URL Section */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center justify-between">
          <span>URL de Entrada do Webhook</span>
          <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
            Método: POST
          </Badge>
        </Label>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Copie a URL abaixo e configure no sistema de origem (Hotmart, HubSpot, Kiwify, etc) para enviar dados para este Workflow.
        </p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={webhookUrl || "Salve a sequência para gerar a URL"}
            className="font-mono text-[10px] h-9 bg-slate-50/50 rounded-xl"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl shrink-0 h-9 w-9 border-slate-200"
            onClick={handleCopyWebhook}
            disabled={!webhookUrl}
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-500" />}
          </Button>
        </div>
      </div>

      {/* Waiting state / Manual Trigger test */}
      <div className="pt-2 border-t space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Testar Integração</Label>
          {isWaiting && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando envio...
            </span>
          )}
        </div>
        
        {isWaiting ? (
          <div className="p-3 text-center rounded-xl bg-slate-50 border border-dashed space-y-2">
            <p className="text-xs font-semibold text-slate-700">Aguardando payload real...</p>
            <p className="text-[11px] text-muted-foreground">
              Dispare um evento de teste do seu sistema de origem para a URL acima.
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsWaiting(false)}
              className="text-xs text-destructive hover:bg-destructive/5 rounded-xl h-7"
            >
              Cancelar Teste
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-[#8A3CFF]/30 hover:bg-[#8A3CFF]/5 text-[#8A3CFF] text-xs font-semibold h-9"
            onClick={handleStartWaiting}
            disabled={!webhookUrl}
          >
            Aguardar payload de teste
          </Button>
        )}
      </div>

      {/* Reference Payload Info */}
      {activeReference && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-emerald-800">Payload de referência ativo</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-normal">
            Os campos deste payload estão disponíveis no editor para autocomplete e mapeamentos.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedJsonView(activeReference)}
              className="h-7 text-[10px] border-emerald-500/20 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-medium"
            >
              <Eye className="h-3 w-3 mr-1" /> Ver JSON de Referência
            </Button>
          </div>
        </div>
      )}

      {/* Webhook History list */}
      <div className="pt-2 border-t space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Últimos payloads recebidos</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={fetchHistory} disabled={isLoadingHistory}>
            <RefreshCw className={`h-3 w-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {recentExecutions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4 bg-slate-50 rounded-xl">
            Nenhum payload real recebido ainda.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {recentExecutions.map((exec) => {
              const webPayload = toCanonicalPayload(exec.trigger_payload);
              const hasWebhookData = !!webPayload && Object.keys(webPayload.body || {}).length > 0;
              const isRef = activeReference && JSON.stringify(activeReference) === JSON.stringify(webPayload);

              return (
                <div key={exec.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700 truncate">
                      {hasWebhookData ? `${webPayload.method || "POST"} - Recebido` : "Disparo manual"}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(exec.started_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-200/50"
                      onClick={() => setSelectedJsonView(webPayload)}
                      title="Ver JSON"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectReference(exec)}
                      disabled={isRef}
                      className={`h-7 px-2.5 text-[10px] font-semibold rounded-lg ${
                        isRef 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50" 
                          : "border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isRef ? "Em uso" : "Usar como ref."}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generic Payload Example Doc */}
      <Collapsible open={showDocs} onOpenChange={setShowDocs}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground text-xs rounded-xl hover:bg-slate-100"
          >
            <Code2 className="h-3.5 w-3.5 mr-2" />
            {showDocs ? "Ocultar" : "Ver"} exemplo de payload esperado
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="rounded-xl bg-slate-50 p-3 space-y-2 border">
            <p className="text-[11px] text-muted-foreground leading-normal">
              O payload recebido pelo webhook no node de gatilho assume esta estrutura base:
            </p>
            <pre className="text-[9px] font-mono bg-white p-2.5 rounded-lg border overflow-x-auto max-h-48">
              {examplePayload}
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* JSON Viewer Dialog */}
      <Dialog open={!!selectedJsonView} onOpenChange={(open) => { if (!open) setSelectedJsonView(null); }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader className="shrink-0 border-b pb-3">
            <DialogTitle className="text-sm font-semibold">Visualizar JSON Recebido</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pt-4">
            <pre className="text-[10px] font-mono bg-slate-50 p-4 rounded-xl border whitespace-pre-wrap break-words overflow-auto">
              {JSON.stringify(selectedJsonView, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
