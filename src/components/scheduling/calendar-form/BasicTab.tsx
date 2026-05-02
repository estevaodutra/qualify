import { Phone, Video, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAttendants } from "@/hooks/useAttendants";
import { slugify, type CalendarModality, type CalendarDistribution } from "@/hooks/useCalendars";
import { useState } from "react";

export interface BasicTabState {
  name: string;
  slug: string;
  description: string;
  modality: CalendarModality;
  duration: number;
  customDuration: boolean;
  color: string;
  distribution: CalendarDistribution;
  attendantIds: string[];
}

const COLOR_PRESETS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#6366f1",
];

const DURATIONS = [15, 30, 45, 60];

interface Props {
  state: BasicTabState;
  onChange: (s: BasicTabState) => void;
}

export function BasicTab({ state, onChange }: Props) {
  const { attendants, create: createAttendant } = useAttendants();
  const [showAddAttendant, setShowAddAttendant] = useState(false);
  const [newAttendantName, setNewAttendantName] = useState("");

  const update = <K extends keyof BasicTabState>(key: K, value: BasicTabState[K]) => {
    onChange({ ...state, [key]: value });
  };

  const updateName = (name: string) => {
    onChange({ ...state, name, slug: state.slug || slugify(name) });
  };

  const toggleAttendant = (id: string) => {
    const has = state.attendantIds.includes(id);
    update("attendantIds", has ? state.attendantIds.filter((a) => a !== id) : [...state.attendantIds, id]);
  };

  const handleCreateAttendant = async () => {
    if (!newAttendantName.trim()) return;
    const created = await createAttendant.mutateAsync({ name: newAttendantName.trim() });
    update("attendantIds", [...state.attendantIds, created.id]);
    setNewAttendantName("");
    setShowAddAttendant(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="cal-name">Nome do calendário *</Label>
        <Input id="cal-name" value={state.name} onChange={(e) => updateName(e.target.value)} placeholder="Ex: Reunião comercial" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cal-slug">URL (slug)</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/agendar/</span>
          <Input id="cal-slug" value={state.slug} onChange={(e) => update("slug", slugify(e.target.value))} placeholder="reuniao-comercial" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cal-desc">Descrição</Label>
        <Textarea id="cal-desc" value={state.description} onChange={(e) => update("description", e.target.value)} placeholder="Aparece na página pública" rows={3} />
      </div>

      <div className="space-y-3">
        <Label>Modalidade *</Label>
        <RadioGroup value={state.modality} onValueChange={(v) => update("modality", v as CalendarModality)} className="grid grid-cols-3 gap-3">
          {[
            { v: "call", label: "Ligação", icon: Phone },
            { v: "video", label: "Videochamada", icon: Video },
            { v: "in_person", label: "Presencial", icon: MapPin },
          ].map(({ v, label, icon: Icon }) => (
            <Label
              key={v}
              htmlFor={`mod-${v}`}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                state.modality === v ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              }`}
            >
              <RadioGroupItem value={v} id={`mod-${v}`} className="sr-only" />
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>Duração *</Label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <Button
              key={d}
              type="button"
              variant={!state.customDuration && state.duration === d ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ ...state, duration: d, customDuration: false })}
            >
              {d} min
            </Button>
          ))}
          <Button
            type="button"
            variant={state.customDuration ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ ...state, customDuration: true })}
          >
            Personalizado
          </Button>
        </div>
        {state.customDuration && (
          <Input
            type="number"
            min={5}
            value={state.duration}
            onChange={(e) => update("duration", parseInt(e.target.value, 10) || 30)}
            className="w-32"
          />
        )}
      </div>

      <div className="space-y-3">
        <Label>Cor do calendário</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={state.color}
            onChange={(e) => update("color", e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
          />
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update("color", c)}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
                  state.color === c ? "border-foreground scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Atendentes</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowAddAttendant((s) => !s)}>
            + Adicionar
          </Button>
        </div>

        {showAddAttendant && (
          <div className="flex gap-2">
            <Input
              value={newAttendantName}
              onChange={(e) => setNewAttendantName(e.target.value)}
              placeholder="Nome do atendente"
              onKeyDown={(e) => e.key === "Enter" && handleCreateAttendant()}
            />
            <Button type="button" size="sm" onClick={handleCreateAttendant} disabled={!newAttendantName.trim()}>
              Criar
            </Button>
          </div>
        )}

        {attendants.length === 0 && !showAddAttendant && (
          <p className="text-sm text-muted-foreground">Nenhum atendente cadastrado. Adicione um para começar.</p>
        )}

        <div className="space-y-2">
          {attendants.map((a) => (
            <Label key={a.id} className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={state.attendantIds.includes(a.id)} onCheckedChange={() => toggleAttendant(a.id)} />
              <span className="text-sm">{a.name}</span>
              {a.email && <span className="text-xs text-muted-foreground">({a.email})</span>}
            </Label>
          ))}
        </div>

        {state.attendantIds.length > 1 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <Label className="text-sm">Distribuição</Label>
            <RadioGroup value={state.distribution} onValueChange={(v) => update("distribution", v as CalendarDistribution)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="round_robin" id="dist-rr" />
                <Label htmlFor="dist-rr" className="cursor-pointer text-sm font-normal">Round-robin (sistema escolhe)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lead_choice" id="dist-lc" />
                <Label htmlFor="dist-lc" className="cursor-pointer text-sm font-normal">Lead escolhe</Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </Card>
    </div>
  );
}
