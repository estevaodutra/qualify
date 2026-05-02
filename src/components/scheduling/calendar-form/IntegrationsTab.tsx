import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import type { CalendarIntegrations } from "@/hooks/useCalendarDetails";
import type { CalendarModality } from "@/hooks/useCalendars";

export interface LeadFieldDraft {
  id: string;
  fieldName: string;
  fieldType: "text" | "phone" | "email" | "number";
  isRequired: boolean;
  isDefault: boolean;
}

interface Props {
  modality: CalendarModality;
  state: CalendarIntegrations;
  onChange: (s: CalendarIntegrations) => void;
  leadFields: LeadFieldDraft[];
  onLeadFieldsChange: (f: LeadFieldDraft[]) => void;
}

export function IntegrationsTab({ modality, state, onChange, leadFields, onLeadFieldsChange }: Props) {
  const { campaigns } = useCallCampaigns();

  const update = <K extends keyof CalendarIntegrations>(key: K, value: CalendarIntegrations[K]) => {
    onChange({ ...state, [key]: value });
  };

  const addField = () => {
    onLeadFieldsChange([
      ...leadFields,
      { id: `tmp-${crypto.randomUUID()}`, fieldName: "", fieldType: "text", isRequired: false, isDefault: false },
    ]);
  };

  const updateField = (idx: number, partial: Partial<LeadFieldDraft>) => {
    const next = [...leadFields];
    next[idx] = { ...next[idx], ...partial };
    onLeadFieldsChange(next);
  };

  const removeField = (idx: number) => {
    if (leadFields[idx].isDefault) return;
    onLeadFieldsChange(leadFields.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Campanha de Ligação</Label>
          <Switch checked={state.callCampaignEnabled} onCheckedChange={(c) => update("callCampaignEnabled", c)} />
        </div>
        {state.callCampaignEnabled && (
          <>
            <Select value={state.callCampaignId ?? "none"} onValueChange={(v) => update("callCampaignId", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione campanha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RadioGroup value={state.callCampaignTiming} onValueChange={(v) => update("callCampaignTiming", v as CalendarIntegrations["callCampaignTiming"])}>
              <Label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
                <RadioGroupItem value="immediate" /> Adicionar imediatamente
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
                <RadioGroupItem value="scheduled" /> Agendar para horário do agendamento
              </Label>
            </RadioGroup>
          </>
        )}
      </Card>

      {modality === "video" && (
        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Videochamada</Label>
          <RadioGroup value={state.videoProvider ?? ""} onValueChange={(v) => update("videoProvider", v as CalendarIntegrations["videoProvider"])}>
            <Label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
              <RadioGroupItem value="google_meet" /> Google Meet
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
              <RadioGroupItem value="zoom" /> Zoom
            </Label>
          </RadioGroup>
          <Label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-normal">Gerar link automaticamente</span>
            <Switch checked={state.videoAutoLink} onCheckedChange={(c) => update("videoAutoLink", c)} />
          </Label>
          <Label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-normal">Incluir link na confirmação</span>
            <Switch checked={state.videoIncludeInConfirmation} onCheckedChange={(c) => update("videoIncludeInConfirmation", c)} />
          </Label>
        </Card>
      )}

      {modality === "in_person" && (
        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Presencial</Label>
          <div className="space-y-2">
            <Label className="text-sm">Endereço completo</Label>
            <Input value={state.inPersonAddress} onChange={(e) => update("inPersonAddress", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Link do Google Maps</Label>
            <Input value={state.inPersonMapsUrl} onChange={(e) => update("inPersonMapsUrl", e.target.value)} placeholder="https://maps.google.com/..." />
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <Label className="text-base font-semibold">Webhooks</Label>
        {[
          { enabledKey: "webhookCreatedEnabled", urlKey: "webhookCreatedUrl", label: "Agendamento criado" },
          { enabledKey: "webhookCancelledEnabled", urlKey: "webhookCancelledUrl", label: "Agendamento cancelado" },
          { enabledKey: "webhookRescheduledEnabled", urlKey: "webhookRescheduledUrl", label: "Agendamento reagendado" },
          { enabledKey: "webhookCompletedEnabled", urlKey: "webhookCompletedUrl", label: "Agendamento concluído" },
        ].map(({ enabledKey, urlKey, label }) => (
          <div key={enabledKey} className="space-y-2">
            <Label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-normal">{label}</span>
              <Switch
                checked={state[enabledKey as keyof CalendarIntegrations] as boolean}
                onCheckedChange={(c) => update(enabledKey as keyof CalendarIntegrations, c as never)}
              />
            </Label>
            {(state[enabledKey as keyof CalendarIntegrations] as boolean) && (
              <Input
                value={state[urlKey as keyof CalendarIntegrations] as string}
                onChange={(e) => update(urlKey as keyof CalendarIntegrations, e.target.value as never)}
                placeholder="https://..."
              />
            )}
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-3">
        <Label className="text-base font-semibold">Campos do Lead</Label>
        <div className="space-y-2">
          {leadFields.map((f, idx) => (
            <div key={f.id} className="flex items-center gap-2">
              <Input
                value={f.fieldName}
                onChange={(e) => updateField(idx, { fieldName: e.target.value })}
                disabled={f.isDefault}
                placeholder="Nome do campo"
                className="flex-1"
              />
              <Select value={f.fieldType} onValueChange={(v) => updateField(idx, { fieldType: v as LeadFieldDraft["fieldType"] })} disabled={f.isDefault}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                </SelectContent>
              </Select>
              <Label className="flex items-center gap-1 text-xs">
                <Switch checked={f.isRequired} onCheckedChange={(c) => updateField(idx, { isRequired: c })} />
                Obrig.
              </Label>
              {!f.isDefault && (
                <Button type="button" size="icon" variant="ghost" onClick={() => removeField(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Campo
        </Button>
      </Card>
    </div>
  );
}
