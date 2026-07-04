import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TriggerConfigComponentProps } from "../types";

export function ApiTriggerConfig({ sequenceId }: TriggerConfigComponentProps) {
  const webhookUrl = sequenceId
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-sequence/${sequenceId}`
    : "";

  return (
    <div className="space-y-3 p-3 rounded-lg bg-background border">
      <div className="space-y-2">
        <Label className="text-sm">URL do Webhook</Label>
        <Input value={webhookUrl} readOnly className="font-mono text-xs" />
        <p className="text-xs text-muted-foreground">Envie um POST para esta URL para disparar a automação.</p>
      </div>
    </div>
  );
}
