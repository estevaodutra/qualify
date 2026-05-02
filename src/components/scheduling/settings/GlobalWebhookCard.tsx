import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSchedulingSettings } from "@/hooks/useSchedulingSettings";

export default function GlobalWebhookCard() {
  const { data, upsert } = useSchedulingSettings();
  const [url, setUrl] = useState("");

  useEffect(() => { setUrl(data?.webhook_global_url || ""); }, [data?.webhook_global_url]);

  const enabled = data?.webhook_global_enabled || false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Webhook global</CardTitle>
        <CardDescription>Webhooks específicos por calendário sobrescrevem o global</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="webhook-enabled">Habilitar webhooks globais</Label>
          <Switch id="webhook-enabled" checked={enabled} onCheckedChange={(v) => upsert.mutate({ webhook_global_enabled: v })} />
        </div>
        <div>
          <Label className="text-xs">URL base</Label>
          <div className="flex gap-2">
            <Input placeholder="https://seu-endpoint.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} disabled={!enabled} />
            <Button variant="outline" disabled={!enabled || upsert.isPending} onClick={() => upsert.mutate({ webhook_global_url: url })}>Salvar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
