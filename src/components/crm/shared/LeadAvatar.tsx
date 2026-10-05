import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface LeadAvatarProps {
  name: string | null;
  url?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function LeadAvatar({ name, url, className, fallbackClassName }: LeadAvatarProps) {
  const hasName = Boolean(name && name.trim().length > 0);
  const initials = hasName ? name!.trim().substring(0, 2).toUpperCase() : "";

  return (
    <Avatar className={cn("h-8 w-8 rounded-full border border-border/50", className)}>
      <AvatarImage src={url || undefined} alt={name || "Lead"} />
      <AvatarFallback
        className={cn(
          hasName
            ? "bg-primary/10 text-primary font-semibold text-xs"
            : "bg-muted text-muted-foreground/60",
          fallbackClassName
        )}
      >
        {hasName ? initials : <User className="w-4 h-4 opacity-70" />}
      </AvatarFallback>
    </Avatar>
  );
}
