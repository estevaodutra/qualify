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
    if (clampedValue >= 80) return "bg-gradient-to-r from-[#8A3CFF] to-[#2E39D9]";
    if (clampedValue >= 60) return "bg-gradient-to-r from-[#FFB432] to-[#FF7A7A]";
    return "bg-gradient-to-r from-[#FF7A7A] to-[#FF5CF7]";
  };

  const getHealthBgColor = () => {
    if (clampedValue >= 80) return "bg-[#8A3CFF]/15";
    if (clampedValue >= 60) return "bg-[#FFB432]/15";
    return "bg-[#FF7A7A]/15";
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
