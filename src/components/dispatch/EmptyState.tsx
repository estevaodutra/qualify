import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="mb-4 bg-gradient-to-br from-[#8A3CFF]/10 to-[#2E39D9]/8 border border-[#8A3CFF]/15 rounded-2xl p-4">
        <Icon className="h-8 w-8 text-[#8A3CFF]/60" />
      </div>
      <h3 className="text-lg font-['Sora'] font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
