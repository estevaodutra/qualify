import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const LABELS: Record<string, string> = {
  schedule_conflict: "Conflito de agenda",
  no_longer_needed: "Não preciso mais",
  will_reschedule: "Vou reagendar",
  other: "Outro motivo",
  not_informed: "Não informado",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "hsl(var(--accent))", "hsl(var(--secondary))"];

export default function CancelReasonsChart({ data }: { data: Array<{ reason: string; total: number; pct: number }> }) {
  const chart = data.map(d => ({ name: LABELS[d.reason] || d.reason, value: Number(d.total), pct: Number(d.pct) }));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Motivos de cancelamento</CardTitle></CardHeader>
      <CardContent className="h-72">
        {chart.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem cancelamentos no período</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {chart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
