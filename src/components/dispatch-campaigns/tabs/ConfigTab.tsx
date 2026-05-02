import { useState, useEffect } from "react";
import { DispatchCampaign } from "@/hooks/useDispatchCampaigns";
import { useInstances } from "@/hooks/useInstances";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ConfigTabProps {
  campaign: DispatchCampaign;
  onUpdate: (id: string, updates: Partial<DispatchCampaign>) => Promise<void>;
}

export function ConfigTab({ campaign, onUpdate }: ConfigTabProps) {
  const { instances } = useInstances();
  const connectedInstances = instances.filter(i => i.status === "connected");

  const [isUpdating, setIsUpdating] = useState(false);
  const [form, setForm] = useState({
    name: campaign.name,
    description: campaign.description || "",
    status: campaign.status,
    instanceId: campaign.instanceId || "",
    useExclusiveInstance: campaign.useExclusiveInstance,
  });

  useEffect(() => {
    setForm({
      name: campaign.name,
      description: campaign.description || "",
      status: campaign.status,
      instanceId: campaign.instanceId || "",
      useExclusiveInstance: campaign.useExclusiveInstance,
    });
  }, [campaign.id, campaign.name, campaign.description, campaign.status, campaign.instanceId, campaign.useExclusiveInstance]);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(campaign.id, {
        name: form.name,
        description: form.description || undefined,
        status: form.status as "draft" | "active" | "paused" | "completed",
        instanceId: form.instanceId || undefined,
        useExclusiveInstance: form.useExclusiveInstance,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Configure o nome e descrição da campanha.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: "draft" | "active" | "paused" | "completed") => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Envio</CardTitle>
          <CardDescription>Defina a instância que será usada para enviar mensagens.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Instância (Número que envia) *</Label>
            <Select value={form.instanceId} onValueChange={v => setForm({ ...form, instanceId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma instância" />
              </SelectTrigger>
              <SelectContent>
                {connectedInstances.map(instance => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.name} {instance.phoneNumber ? `(${instance.phoneNumber})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="exclusive"
              checked={form.useExclusiveInstance}
              onCheckedChange={checked => setForm({ ...form, useExclusiveInstance: !!checked })}
            />
            <div className="space-y-1">
              <Label htmlFor="exclusive" className="font-medium cursor-pointer">
                Uso exclusivo desta instância
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando ativado, esta instância só será usada para esta campanha.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
