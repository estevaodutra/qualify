import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from "lucide-react";

interface AlertBannerProps {
  variant: "info" | "warning" | "error" | "success";
  title: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig = {
  info: {
    icon: Info,
    containerClass: "bg-info/10 border-info/30 text-info",
    iconClass: "text-info",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "bg-warning/10 border-warning/30 text-warning-foreground",
    iconClass: "text-warning",
  },
  error: {
    icon: AlertCircle,
    containerClass: "bg-error/10 border-error/30 text-error",
    iconClass: "text-error",
  },
  success: {
    icon: CheckCircle,
    containerClass: "bg-success/10 border-success/30 text-success",
    iconClass: "text-success",
  },
};

export function AlertBanner({
  variant,
  title,
  description,
  dismissible = false,
  onDismiss,
  className,
}: AlertBannerProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 transition-opacity",
        config.containerClass,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", config.iconClass)} />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="rounded-md p-1 hover:bg-foreground/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
