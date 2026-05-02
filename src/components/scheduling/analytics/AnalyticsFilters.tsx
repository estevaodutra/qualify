import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCalendars } from "@/hooks/useCalendars";
import { useAttendants } from "@/hooks/useAttendants";

export type Preset = "this_month" | "last_month" | "last_7" | "custom";

export interface FilterState {
  preset: Preset;
  from: string;
  to: string;
  calendarId: string; // "all" or uuid
  attendantId: string;
}

interface Props {
  value: FilterState;
  onChange: (v: FilterState) => void;
}

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export function applyPreset(preset: Preset, current: FilterState): FilterState {
  const now = new Date();
  if (preset === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { ...current, preset, from: ymd(from), to: ymd(now) };
  }
  if (preset === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { ...current, preset, from: ymd(from), to: ymd(to) };
  }
  if (preset === "last_7") {
    const from = new Date(now); from.setDate(from.getDate() - 6);
    return { ...current, preset, from: ymd(from), to: ymd(now) };
  }
  return { ...current, preset };
}

export default function AnalyticsFilters({ value, onChange }: Props) {
  const { calendars = [] } = useCalendars();
  const { attendants = [] } = useAttendants();

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-card">
      <div className="min-w-[160px]">
        <Label className="text-xs">Período</Label>
        <Select value={value.preset} onValueChange={(v) => onChange(applyPreset(v as Preset, value))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
            <SelectItem value="last_7">Últimos 7 dias</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.preset === "custom" && (
        <>
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
          </div>
        </>
      )}

      <div className="min-w-[180px]">
        <Label className="text-xs">Calendário</Label>
        <Select value={value.calendarId} onValueChange={(v) => onChange({ ...value, calendarId: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {calendars.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[180px]">
        <Label className="text-xs">Atendente</Label>
        <Select value={value.attendantId} onValueChange={(v) => onChange({ ...value, attendantId: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {attendants.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
