import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data?: {
    conversion_rate: number; conversion_prev: number;
    appointments_total: number; appointments_prev: number;
    cancellations_total: number; cancellations_prev: number;
    no_shows_total: number; no_shows_prev: number;
  };
  loading?: boolean;
}

function delta(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / prev) * 100);
}

function Card_({ label, value, prev, invert = false, suffix = "" }: { label: string; value: number; prev: number; invert?: boolean; suffix?: string }) {
  const d = delta(value, prev);
  const good = invert ? d <= 0 : d >= 0;
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold">{value}{suffix}</div>
        <div className={cn("text-xs flex items-center gap-1", good ? "text-emerald-600" : "text-destructive")}>
          {d >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(d)}% vs período anterior
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewCards({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-5 h-32 animate-pulse bg-muted/30" /></Card>)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card_ label="Taxa de Conversão" value={data.conversion_rate} prev={data.conversion_prev} suffix="%" />
      <Card_ label="Agendamentos" value={data.appointments_total} prev={data.appointments_prev} />
      <Card_ label="Cancelamentos" value={data.cancellations_total} prev={data.cancellations_prev} invert />
      <Card_ label="No-shows" value={data.no_shows_total} prev={data.no_shows_prev} invert />
    </div>
  );
}
