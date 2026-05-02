import { cn } from "@/lib/utils";

interface UsageMeterProps {
  used: number;
  total: number;
  label?: string;
  className?: string;
}

export function UsageMeter({ used, total, label, className }: UsageMeterProps) {
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

  const getStatusColor = () => {
    if (percentage >= 90) return "text-error";
    if (percentage >= 75) return "text-warning";
    return "text-muted-foreground";
  };

  const getBarColor = () => {
    if (percentage >= 90) return "bg-error";
    if (percentage >= 75) return "bg-warning";
    return "bg-primary";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <span className={cn("font-mono text-xs font-medium", getStatusColor())}>
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", getBarColor())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
