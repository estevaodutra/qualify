import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8", className)}>
      <div className="space-y-1.5 animate-slide-left">
        <h1 className="text-3xl font-['Sora'] font-bold tracking-tight sm:text-4xl leading-none">
          {typeof title === "string" ? <span className="gradient-text">{title}</span> : title}
        </h1>
        {description && (
          <p className="text-[13px] font-medium text-muted-foreground/65 max-w-xl leading-relaxed mt-2">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 animate-fade-in stagger-2">
          {actions}
        </div>
      )}
    </div>
  );
}
