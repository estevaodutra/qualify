import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        // Number/Provider statuses
        active: "bg-success/15 text-success",
        paused: "bg-muted text-muted-foreground",
        banned: "bg-error/15 text-error",
        warming: "bg-warning/15 text-warning",
        // Dispatch statuses
        pending: "bg-muted text-muted-foreground",
        sent: "bg-success/15 text-success",
        sending: "bg-info/15 text-info",
        failed: "bg-error/15 text-error",
        retrying: "bg-warning/15 text-warning",
        // Campaign statuses
        draft: "bg-muted text-muted-foreground",
        running: "bg-success/15 text-success",
        completed: "bg-info/15 text-info",
        terminated: "bg-error/15 text-error",
        // Provider statuses
        connected: "bg-[#22DD4F]/12 text-[#22DD4F]",
        disconnected: "bg-[#FF7A7A]/12 text-[#FF7A7A]",
        degraded: "bg-[#FFB432]/12 text-[#FFB432]",
        waitingConnection: "bg-warning/15 text-warning",
        // Queue statuses
        expired: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      status: "pending",
      size: "md",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  className?: string;
  showDot?: boolean;
}

const statusDotColors: Record<string, string> = {
  active: "bg-success",
  paused: "bg-muted-foreground",
  banned: "bg-error",
  warming: "bg-warning animate-pulse-subtle shadow-[0_0_6px_currentColor]",
  pending: "bg-muted-foreground",
  sent: "bg-success",
  sending: "bg-info animate-pulse-subtle shadow-[0_0_6px_currentColor]",
  failed: "bg-error",
  retrying: "bg-warning animate-pulse-subtle",
  draft: "bg-muted-foreground",
  running: "bg-success animate-pulse-subtle shadow-[0_0_6px_currentColor]",
  completed: "bg-info",
  terminated: "bg-error",
  connected: "bg-[#22DD4F]",
  disconnected: "bg-[#FF7A7A]",
  degraded: "bg-[#FFB432] animate-pulse-subtle",
  waitingConnection: "bg-warning animate-pulse-subtle",
  expired: "bg-warning",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  banned: "Banned",
  warming: "Warming",
  pending: "Pending",
  sent: "Sent",
  sending: "Sending",
  failed: "Failed",
  retrying: "Retrying",
  draft: "Draft",
  running: "Running",
  completed: "Completed",
  terminated: "Terminated",
  connected: "Connected",
  disconnected: "Disconnected",
  degraded: "Degraded",
  waitingConnection: "Waiting Connection",
  expired: "Expirada",
};

export function StatusBadge({ status, size, className, showDot = true }: StatusBadgeProps) {
  const statusKey = status || "pending";
  
  return (
    <span className={cn(statusBadgeVariants({ status, size }), className)}>
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", statusDotColors[statusKey])} />
      )}
      {statusLabels[statusKey]}
    </span>
  );
}
