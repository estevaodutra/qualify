import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  direct: "Link direto",
  campaign: "Campanha",
  other: "Outros",
};

function normalize(source: string): string {
  const s = (source || "direct").toLowerCase();
  if (["whatsapp", "wa"].includes(s)) return "whatsapp";
  if (["email", "mail"].includes(s)) return "email";
  if (["direct", ""].includes(s)) return "direct";
  if (s.includes("campaign")) return "campaign";
  return "other";
}

export default function SourcesChart({ data }: { data: Array<{ source: string; total: number; pct: number }> }) {
  const grouped = new Map<string, { total: number; pct: number }>();
  for (const d of data) {
    const key = normalize(d.source);
    const g = grouped.get(key) || { total: 0, pct: 0 };
    g.total += Number(d.total);
    g.pct += Number(d.pct);
    grouped.set(key, g);
  }
  const items = Array.from(grouped.entries()).sort((a, b) => b[1].total - a[1].total);
  const maxPct = Math.max(...items.map(i => i[1].pct), 1);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Origem dos agendamentos</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Sem dados</div>}
        {items.map(([key, v]) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{LABELS[key] || key}</span>
              <span className="text-muted-foreground">{v.total} ({v.pct.toFixed(1)}%)</span>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${(v.pct / maxPct) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
