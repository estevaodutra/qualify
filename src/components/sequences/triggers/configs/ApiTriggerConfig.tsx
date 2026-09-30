import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { TriggerConfigComponentProps } from "../types";

export function ApiTriggerConfig({ sequenceId, config, onChange }: TriggerConfigComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const { toast } = useToast();

  const webhookUrl = sequenceId
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-sequence/${sequenceId}`
    : "";

  const handleCaptureLastExecution = async () => {
    if (!sequenceId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("sequence_executions")
        .select("trigger_context")
        .eq("sequence_id", sequenceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Nenhum disparo encontrado",
          description: "Faça um disparo de teste do n8n para esta URL antes de capturar.",
          variant: "destructive",
        });
        return;
      }

      const context = data.trigger_context as Record<string, any> || {};
      const payloadBody = context.webhookPayload?.body || context.webhookPayload || context;

      if (Object.keys(payloadBody).length === 0) {
        toast({
          title: "Payload vazio",
          description: "O último disparo não possuía corpo JSON válido.",
          variant: "destructive",
        });
        return;
      }

      onChange({
        ...config,
        referencePayload: payloadBody,
      });

      setHasCaptured(true);
      toast({
        title: "Payload capturado!",
        description: "Os dados do último disparo já estão disponíveis para mapeamento.",
      });

      setTimeout(() => setHasCaptured(false), 3000);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao buscar disparo",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg bg-background border">
      <div className="space-y-2">
        <Label className="text-sm">URL do Webhook</Label>
        <Input value={webhookUrl} readOnly className="font-mono text-xs" />
        <p className="text-xs text-muted-foreground">Envie um POST para esta URL para disparar a automação.</p>
      </div>

      <div className="pt-2 border-t space-y-2">
        <Label className="text-sm">Dados de Referência</Label>
        <p className="text-xs text-muted-foreground">
          Para mapear campos dinâmicos, faça um disparo de teste no n8n e clique abaixo para capturar os dados recebidos.
        </p>
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full mt-2" 
          onClick={handleCaptureLastExecution}
          disabled={isLoading || !sequenceId}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : hasCaptured ? (
            <Check className="w-4 h-4 mr-2 text-emerald-500" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {hasCaptured ? "Capturado com sucesso" : "Capturar Último Disparo"}
        </Button>

        {config.referencePayload && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-[10px] font-mono text-muted-foreground truncate">
            Payload ativo: {Object.keys(config.referencePayload).length} chaves encontradas
          </div>
        )}
      </div>
    </div>
  );
}
