import { Button } from "@/components/ui/button";

interface PeriodFilterProps {
  value: number;
  onChange: (days: number) => void;
}

const periods = [
  { days: 7, label: "7 dias" },
  { days: 14, label: "14 dias" },
  { days: 30, label: "30 dias" },
];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Período:</span>
      {periods.map((p) => (
        <Button
          key={p.days}
          size="sm"
          variant={value === p.days ? "default" : "outline"}
          onClick={() => onChange(p.days)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
