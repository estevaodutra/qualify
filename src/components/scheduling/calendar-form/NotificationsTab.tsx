import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useInstances } from "@/hooks/useInstances";
import { useRef } from "react";
import type { CalendarNotifications } from "@/hooks/useCalendarDetails";

const VARIABLES = [
  "{{lead.name}}",
  "{{lead.phone}}",
  "{{appointment.date}}",
  "{{appointment.time}}",
  "{{calendar.name}}",
  "{{attendant.name}}",
  "{{appointment.manage_link}}",
];

interface Props {
  state: CalendarNotifications;
  onChange: (s: CalendarNotifications) => void;
}

export function NotificationsTab({ state, onChange }: Props) {
  const { instances } = useInstances();
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const update = <K extends keyof CalendarNotifications>(key: K, value: CalendarNotifications[K]) => {
    onChange({ ...state, [key]: value });
  };

  const insertVariable = (field: keyof CalendarNotifications, variable: string) => {
    const el = refs.current[field as string];
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const current = state[field] as string;
    const next = current.slice(0, start) + variable + current.slice(end);
    update(field, next as never);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + variable.length;
    }, 0);
  };

  const VarChips = ({ field }: { field: keyof CalendarNotifications }) => (
    <div className="flex flex-wrap gap-1">
      {VARIABLES.map((v) => (
        <Badge
          key={v}
          variant="secondary"
          className="cursor-pointer hover:bg-accent text-[10px] font-mono"
          onClick={() => insertVariable(field, v)}
        >
          {v}
        </Badge>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground px-1">
        As mensagens são disparadas via webhook central da agenda. Configure os templates abaixo; a entrega é feita pelo n8n.
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Confirmação por WhatsApp</Label>
          <Switch checked={state.whatsappEnabled} onCheckedChange={(c) => update("whatsappEnabled", c)} />
        </div>

        {state.whatsappEnabled && (
          <>
            <div className="space-y-2">
              <Label className="text-sm">Instância</Label>
              <Select value={state.whatsappInstanceId ?? "none"} onValueChange={(v) => update("whatsappInstanceId", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {instances.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Mensagem de confirmação</Label>
              <Textarea
                ref={(el) => { refs.current.confirmationMessage = el; }}
                value={state.confirmationMessage}
                onChange={(e) => update("confirmationMessage", e.target.value)}
                rows={4}
              />
              <VarChips field="confirmationMessage" />
            </div>
          </>
        )}
      </Card>

      {[
        { key: "reminder1day", label: "Lembrete 1 dia antes" },
        { key: "reminder1hour", label: "Lembrete 1 hora antes" },
        { key: "reminder15min", label: "Lembrete 15 minutos antes" },
      ].map(({ key, label }) => {
        const enabledKey = `${key}Enabled` as keyof CalendarNotifications;
        const msgKey = `${key}Message` as keyof CalendarNotifications;
        return (
          <Card key={key} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">{label}</Label>
              <Switch
                checked={state[enabledKey] as boolean}
                onCheckedChange={(c) => update(enabledKey, c as never)}
              />
            </div>
            {(state[enabledKey] as boolean) && (
              <div className="space-y-2">
                <Textarea
                  ref={(el) => { refs.current[msgKey] = el; }}
                  value={state[msgKey] as string}
                  onChange={(e) => update(msgKey, e.target.value as never)}
                  rows={3}
                />
                <VarChips field={msgKey} />
              </div>
            )}
          </Card>
        );
      })}

      <Card className="p-4 space-y-3">
        <Label className="text-base font-semibold">Notificações ao Atendente</Label>
        <Label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-normal">Quando lead cancelar</span>
          <Switch checked={state.notifyOnCancel} onCheckedChange={(c) => update("notifyOnCancel", c)} />
        </Label>
        <Label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-normal">Quando lead reagendar</span>
          <Switch checked={state.notifyOnReschedule} onCheckedChange={(c) => update("notifyOnReschedule", c)} />
        </Label>
      </Card>
    </div>
  );
}
