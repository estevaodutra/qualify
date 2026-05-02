import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TimeRange {
  start: string;
  end: string;
}

export interface DayAvailability {
  enabled: boolean;
  ranges: TimeRange[];
}

export interface ScheduleTabState {
  days: Record<number, DayAvailability>; // 0 = sunday
  bufferMinutes: number;
  minNoticeHours: number;
  dailyLimit: number;
  windowDays: number;
}

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const defaultScheduleState: ScheduleTabState = {
  days: {
    0: { enabled: false, ranges: [{ start: "09:00", end: "18:00" }] },
    1: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
    2: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
    3: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
    4: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
    5: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
    6: { enabled: false, ranges: [{ start: "09:00", end: "18:00" }] },
  },
  bufferMinutes: 0,
  minNoticeHours: 4,
  dailyLimit: 0,
  windowDays: 30,
};

interface Props {
  state: ScheduleTabState;
  onChange: (s: ScheduleTabState) => void;
}

export function ScheduleTab({ state, onChange }: Props) {
  const updateDay = (day: number, partial: Partial<DayAvailability>) => {
    onChange({ ...state, days: { ...state.days, [day]: { ...state.days[day], ...partial } } });
  };

  const updateRange = (day: number, idx: number, partial: Partial<TimeRange>) => {
    const ranges = [...state.days[day].ranges];
    ranges[idx] = { ...ranges[idx], ...partial };
    updateDay(day, { ranges });
  };

  const addRange = (day: number) => {
    updateDay(day, { ranges: [...state.days[day].ranges, { start: "14:00", end: "18:00" }] });
  };

  const removeRange = (day: number, idx: number) => {
    updateDay(day, { ranges: state.days[day].ranges.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <Label className="text-base font-semibold">Disponibilidade Semanal</Label>
        <div className="space-y-3">
          {DAY_LABELS.map((label, day) => {
            const d = state.days[day];
            return (
              <div key={day} className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`day-${day}`}
                    checked={d.enabled}
                    onCheckedChange={(c) => updateDay(day, { enabled: !!c })}
                  />
                  <Label htmlFor={`day-${day}`} className="w-24 cursor-pointer font-medium">{label}</Label>
                  {!d.enabled && <span className="text-xs text-muted-foreground">Indisponível</span>}
                </div>
                {d.enabled && (
                  <div className="ml-9 space-y-2">
                    {d.ranges.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={r.start}
                          onChange={(e) => updateRange(day, idx, { start: e.target.value })}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={r.end}
                          onChange={(e) => updateRange(day, idx, { end: e.target.value })}
                          className="w-32"
                        />
                        {d.ranges.length > 1 && (
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeRange(day, idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="ghost" onClick={() => addRange(day)} className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Adicionar intervalo
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <Label className="text-base font-semibold">Configurações Avançadas</Label>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Buffer entre agendamentos</Label>
            <Select value={String(state.bufferMinutes)} onValueChange={(v) => onChange({ ...state, bufferMinutes: parseInt(v, 10) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sem buffer</SelectItem>
                <SelectItem value="5">5 minutos</SelectItem>
                <SelectItem value="10">10 minutos</SelectItem>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Antecedência mínima</Label>
            <Select value={String(state.minNoticeHours)} onValueChange={(v) => onChange({ ...state, minNoticeHours: parseInt(v, 10) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hora</SelectItem>
                <SelectItem value="2">2 horas</SelectItem>
                <SelectItem value="4">4 horas</SelectItem>
                <SelectItem value="12">12 horas</SelectItem>
                <SelectItem value="24">24 horas</SelectItem>
                <SelectItem value="48">48 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Limite diário (0 = ilimitado)</Label>
            <Input
              type="number"
              min={0}
              value={state.dailyLimit}
              onChange={(e) => onChange({ ...state, dailyLimit: parseInt(e.target.value, 10) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Janela de agendamento</Label>
            <Select value={String(state.windowDays)} onValueChange={(v) => onChange({ ...state, windowDays: parseInt(v, 10) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );
}
