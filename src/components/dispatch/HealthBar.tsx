import { cn } from "@/lib/utils";

interface HealthBarProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HealthBar({ value, label, showValue = true, size = "md", className }: HealthBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const getHealthColor = () => {
    if (clampedValue >= 80) return "bg-success";
    if (clampedValue >= 50) return "bg-warning";
    return "bg-error";
  };

  const getHealthBgColor = () => {
    if (clampedValue >= 80) return "bg-success/20";
    if (clampedValue >= 50) return "bg-warning/20";
    return "bg-error/20";
  };

  const heights = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showValue && <span className="font-mono text-xs font-medium">{clampedValue}%</span>}
        </div>
      )}
      <div className={cn("w-full overflow-hidden rounded-full", getHealthBgColor(), heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", getHealthColor())}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
