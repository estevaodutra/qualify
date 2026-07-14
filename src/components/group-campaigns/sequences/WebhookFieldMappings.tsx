import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface WebhookFieldMappingsProps {
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

  const handleCopyWebhook = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">Requisição HTTP (Webhook)</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-sm font-medium text-slate-600">
          Quando uma requisição HTTP é recebida
        </p>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Url do webhook</label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 break-all select-all font-mono leading-relaxed">
              {webhookUrl || "Nenhuma URL disponível (salve o fluxo primeiro)"}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 h-auto self-stretch rounded-xl border-slate-200 hover:bg-slate-50 hover:text-primary transition-colors"
              onClick={handleCopyWebhook}
              disabled={!webhookUrl}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-amber-50/80 border border-amber-200/60 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-amber-700/90 leading-relaxed">
            O webhook possui um limite de 120 requisições por minuto. Caso precisar aumentar o limite entre em contato com o suporte.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Fonte de dados</label>
          <div>
            <div className="inline-flex items-center px-4 py-1.5 bg-blue-500 text-white font-semibold text-xs rounded-full">
              Ex: {triggerConfig.dataSource || "Webhook"}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Identificador único para este gatilho.</p>
        </div>
      </div>
    </div>
  );
}
