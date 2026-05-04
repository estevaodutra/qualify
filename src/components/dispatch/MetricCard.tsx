import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className }: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return TrendingUp;
    if (trend.value < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-[#22DD4F]";
    if (trend.value < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getTrendBg = () => {
    if (!trend) return "";
    if (trend.value > 0) return "bg-[#22DD4F]/10 text-[#22DD4F]";
    if (trend.value < 0) return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const TrendIcon = getTrendIcon();

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/40 dark:border-white/8",
        "bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl",
        "p-6 shadow-elevation-sm transition-all duration-300",
        "hover:shadow-elevation-md hover:-translate-y-1",
        className
      )}
    >
      {/* Background accent glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/6 blur-2xl transition-all duration-500 group-hover:bg-primary/10" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60">
            {title}
          </p>
          <p className="metric-value text-foreground font-['JetBrains_Mono']">{value}</p>
          {subtitle && (
            <p className="text-xs font-medium text-muted-foreground/55 leading-snug">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className="ml-4 shrink-0 rounded-lg bg-gradient-to-br from-[#8A3CFF]/15 to-[#2E39D9]/10 p-2 border border-[#8A3CFF]/20 transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-5 w-5 text-[#8A3CFF]" />
          </div>
        )}
      </div>

      {trend && TrendIcon && (
        <div className={cn("relative z-10 mt-4 flex items-center gap-2", getTrendColor())}>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", getTrendBg())}>
            <TrendIcon className="h-3 w-3" />
            {trend.value > 0 ? "+" : ""}{trend.value}%
          </span>
          {trend.label && (
            <span className="text-[11px] font-medium text-muted-foreground/60">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
