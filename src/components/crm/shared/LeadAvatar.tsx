import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface LeadAvatarProps {
  name: string | null;
  url?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function LeadAvatar({ name, url, className, fallbackClassName }: LeadAvatarProps) {
  const initials = (name || "?").substring(0, 2).toUpperCase();
  
  return (
    <Avatar className={cn("h-8 w-8 rounded-full border border-border/50", className)}>
      <AvatarImage src={url || undefined} alt={name || "Lead"} />
      <AvatarFallback className={cn("bg-primary/10 text-primary font-semibold text-xs", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
