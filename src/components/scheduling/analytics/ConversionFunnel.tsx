import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data?: { visits: number; slot_selected: number; details_filled: number; confirmed: number };
}

export default function ConversionFunnel({ data }: Props) {
  const d = data || { visits: 0, slot_selected: 0, details_filled: 0, confirmed: 0 };
  const steps = [
    { label: "Visitas na página", value: d.visits },
    { label: "Selecionaram horário", value: d.slot_selected },
    { label: "Preencheram dados", value: d.details_filled },
    { label: "Agendamentos confirmados", value: d.confirmed },
  ];
  const max = Math.max(...steps.map(s => s.value), 1);
  const overall = d.visits > 0 ? ((d.confirmed / d.visits) * 100).toFixed(1) : "0";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Funil de conversão</CardTitle>
        <div className="text-sm">
          <span className="text-muted-foreground">Conversão geral: </span>
          <span className="font-bold text-primary">{overall}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((s, i) => {
          const width = (s.value / max) * 100;
          const prevValue = i === 0 ? s.value : steps[i - 1].value;
          const stepPct = prevValue > 0 ? ((s.value / prevValue) * 100).toFixed(1) : "0";
          return (
            <div key={s.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">{s.value} {i > 0 && <span className="ml-1">({stepPct}%)</span>}</span>
              </div>
              <div className="h-8 rounded bg-muted overflow-hidden flex items-center">
                <div className="h-full bg-primary flex items-center justify-end px-3 text-primary-foreground text-xs font-medium transition-all"
                     style={{ width: `${Math.max(width, 2)}%` }}>
                  {s.value > 0 && s.value}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
