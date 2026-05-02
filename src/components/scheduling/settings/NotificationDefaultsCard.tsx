import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSchedulingSettings } from "@/hooks/useSchedulingSettings";
import { useInstances } from "@/hooks/useInstances";

export default function NotificationDefaultsCard() {
  const { data, upsert } = useSchedulingSettings();
  const { instances = [] } = useInstances();

  const selected = data?.default_whatsapp_instance_id || "none";

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Notificações</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs mb-1.5 block">Instância WhatsApp padrão (hint)</Label>
          <Select value={selected} onValueChange={(v) => upsert.mutate({ default_whatsapp_instance_id: v === "none" ? null : v })}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {instances.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Enviado como sugestão no payload do webhook da agenda. A escolha final da instância é feita pelo n8n.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <Label>Enviar confirmação por email</Label>
          <Switch checked={data?.send_email_confirmation || false} onCheckedChange={(v) => upsert.mutate({ send_email_confirmation: v })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Enviar convite de calendário (.ics)</Label>
          <Switch checked={data?.send_ics_invite || false} onCheckedChange={(v) => upsert.mutate({ send_ics_invite: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
