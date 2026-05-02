import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  data: Array<{ dow: number; hour: number; total: number }>;
}

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 08-17

export default function HourHeatmap({ data }: Props) {
  const map = new Map<string, number>();
  let max = 0;
  for (const d of data) {
    const key = `${d.dow}-${d.hour}`;
    map.set(key, Number(d.total));
    if (d.total > max) max = Number(d.total);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Horários mais populares</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `48px repeat(${HOURS.length}, 40px)` }}>
            <div />
            {HOURS.map(h => <div key={h} className="text-[10px] text-muted-foreground text-center">{String(h).padStart(2,"0")}h</div>)}
            {DAYS.map((label, idx) => {
              const dow = idx + 1; // 1=Monday
              return (
                <>
                  <div key={`d-${dow}`} className="text-xs text-muted-foreground flex items-center">{label}</div>
                  {HOURS.map(h => {
                    const total = map.get(`${dow}-${h}`) || 0;
                    const opacity = max > 0 ? total / max : 0;
                    return (
                      <div
                        key={`${dow}-${h}`}
                        title={`${label} ${h}h: ${total}`}
                        className={cn("h-10 rounded border border-border flex items-center justify-center text-[10px]",
                          total === 0 ? "bg-muted" : "text-primary-foreground")}
                        style={total > 0 ? { backgroundColor: `hsl(var(--primary) / ${Math.max(0.2, opacity)})` } : undefined}
                      >
                        {total > 0 ? total : ""}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
