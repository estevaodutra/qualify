import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstances } from "@/hooks/useInstances";
import { useWebhookConfigs, getWebhookUrlForCategory } from "@/hooks/useWebhookConfigs";
import { buildGroupPayload } from "@/lib/webhook-utils";
import { Skull, List, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppGroup {
  phone: string;
  name: string;
  isGroup: boolean;
}

interface CreatePirateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    description?: string;
    instanceId?: string;
    webhookUrl?: string;
    webhookHeaders?: Record<string, string>;
    autoCreateLead?: boolean;
    ignoreDuplicates?: boolean;
    groups?: { jid: string; name: string }[];
  }) => Promise<void>;
  isCreating: boolean;
}

export function CreatePirateCampaignDialog({
  open, onOpenChange, onCreate, isCreating,
}: CreatePirateCampaignDialogProps) {
  const { instances } = useInstances();
  const { configs } = useWebhookConfigs();
  const connectedInstances = instances?.filter((i) => i.status === "connected") || [];

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instanceId, setInstanceId] = useState("");

  // Step 2: Groups
  const [availableGroups, setAvailableGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroupJids, setSelectedGroupJids] = useState<string[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Step 3: Config
  const [autoCreateLead, setAutoCreateLead] = useState(true);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);

  // Step 4: Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookHeaders, setWebhookHeaders] = useState<{ key: string; value: string }[]>([]);

  const reset = () => {
    setStep(1);
    setName("");
    setDescription("");
    setInstanceId("");
    setAvailableGroups([]);
    setSelectedGroupJids([]);
    setHasFetched(false);
    setAutoCreateLead(true);
    setIgnoreDuplicates(false);
    setWebhookUrl("");
    setWebhookHeaders([]);
  };

  const handleListGroups = async () => {
    if (!instanceId) return;
    const instance = instances?.find((i) => i.id === instanceId);
    if (!instance) return;

    setIsFetchingGroups(true);
    setHasFetched(true);
    try {
      const webhookUrlCat = getWebhookUrlForCategory("groups", configs);
      const payload = buildGroupPayload({
        action: "group.list",
        instance: {
          id: instance.id,
          name: instance.name,
          phone: instance.phoneNumber || "",
          provider: instance.provider,
          externalId: instance.idInstance || "",
          externalToken: instance.tokenInstance || "",
        },
      });

      const response = await fetch(webhookUrlCat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Falha");
      const data = await response.json();
      const rawGroups = data.groups || data || [];
      setAvailableGroups(rawGroups.filter((item: WhatsAppGroup) => item.isGroup === true));
    } catch {
      toast.error("Falha ao listar grupos");
      setAvailableGroups([]);
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleCreate = async () => {
    const headersObj: Record<string, string> = {};
    webhookHeaders.forEach((h) => {
      if (h.key.trim()) headersObj[h.key.trim()] = h.value;
    });

    const selectedGroups = availableGroups
      .filter((g) => selectedGroupJids.includes(g.phone))
      .map((g) => ({ jid: g.phone, name: g.name }));

    await onCreate({
      name,
      description: description || undefined,
      instanceId: instanceId || undefined,
      webhookUrl: webhookUrl || undefined,
      webhookHeaders: Object.keys(headersObj).length > 0 ? headersObj : undefined,
      autoCreateLead,
      ignoreDuplicates,
      groups: selectedGroups.length > 0 ? selectedGroups : undefined,
    });

    reset();
  };

  const canNext = () => {
    if (step === 1) return name.trim().length > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5" />
            Nova Campanha Pirata
          </DialogTitle>
          <DialogDescription>
            Passo {step} de 4
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step 1: Basic Data */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Campanha *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Captura Grupo Vendas" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Monitora grupos e captura novos membros" />
            </div>
            <div className="space-y-2">
              <Label>Instância WhatsApp</Label>
              <Select value={instanceId} onValueChange={setInstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar instância" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name} ({inst.phoneNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Select Groups */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleListGroups} disabled={!instanceId || isFetchingGroups}>
                <List className="mr-2 h-4 w-4" />
                Listar Grupos
              </Button>
            </div>

            {isFetchingGroups ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : availableGroups.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{selectedGroupJids.length} grupo(s) selecionado(s)</p>
                <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
                  {availableGroups.map((group) => (
                    <div
                      key={group.phone}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedGroupJids((prev) =>
                          prev.includes(group.phone)
                            ? prev.filter((j) => j !== group.phone)
                            : [...prev, group.phone]
                        );
                      }}
                    >
                      <Checkbox checked={selectedGroupJids.includes(group.phone)} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{group.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : hasFetched ? (
              <p className="text-center py-4 text-muted-foreground">Nenhum grupo encontrado</p>
            ) : (
              <p className="text-center py-4 text-muted-foreground">Clique em "Listar Grupos" para carregar</p>
            )}
          </div>
        )}

        {/* Step 3: Config */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Criar lead automaticamente</p>
                <p className="text-sm text-muted-foreground">
                  Quando um membro entrar no grupo, criar lead automaticamente.
                </p>
              </div>
              <Switch checked={autoCreateLead} onCheckedChange={setAutoCreateLead} />
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="font-medium">Comportamento para leads duplicados</p>
              <RadioGroup
                value={ignoreDuplicates ? "ignore" : "fire"}
                onValueChange={(v) => setIgnoreDuplicates(v === "ignore")}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="fire" id="fire" className="mt-1" />
                  <div>
                    <Label htmlFor="fire">Disparar webhook novamente</Label>
                    <p className="text-sm text-muted-foreground">Se o mesmo número entrar novamente, dispara o webhook de novo.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="ignore" id="ignore" className="mt-1" />
                  <div>
                    <Label htmlFor="ignore">Ignorar duplicados</Label>
                    <p className="text-sm text-muted-foreground">Se o número já foi capturado nesta campanha, ignora.</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 4: Webhook */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://n8n.seudominio.com/webhook/pirata-leads" />
            </div>

            <div className="space-y-2">
              <Label>Headers (opcional)</Label>
              {webhookHeaders.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Header"
                    value={h.key}
                    onChange={(e) => {
                      const copy = [...webhookHeaders];
                      copy[i].key = e.target.value;
                      setWebhookHeaders(copy);
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Valor"
                    value={h.value}
                    onChange={(e) => {
                      const copy = [...webhookHeaders];
                      copy[i].value = e.target.value;
                      setWebhookHeaders(copy);
                    }}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setWebhookHeaders(webhookHeaders.filter((_, idx) => idx !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setWebhookHeaders([...webhookHeaders, { key: "", value: "" }])}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Header
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Prévia do Payload</Label>
              <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
                {JSON.stringify({
                  event: "pirate.lead.joined",
                  timestamp: "2025-03-14T10:30:00Z",
                  campaign: { id: "uuid", name: name || "..." },
                  group: { id: "120363...@g.us", name: "Nome do Grupo" },
                  lead: { phone: "5511999887766", lid: "123456789@lid" },
                }, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}>
            {step === 1 ? "Cancelar" : "← Anterior"}
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Próximo →
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
              <Skull className="mr-2 h-4 w-4" />
              {isCreating ? "Criando..." : "Criar Campanha"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
