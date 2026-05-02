import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSchedulingSettings } from "@/hooks/useSchedulingSettings";

const TIMEZONES = [
  "America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Cuiaba",
  "America/New_York", "America/Los_Angeles", "America/Mexico_City",
  "Europe/Lisbon", "Europe/Madrid", "Europe/London", "UTC",
];

export default function DefaultTimezoneCard() {
  const { data, upsert } = useSchedulingSettings();
  const tz = data?.default_timezone || "America/Sao_Paulo";

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Fuso horário padrão</CardTitle></CardHeader>
      <CardContent>
        <Label className="text-xs mb-1.5 block">Fuso horário</Label>
        <Select value={tz} onValueChange={(v) => upsert.mutate({ default_timezone: v })}>
          <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
