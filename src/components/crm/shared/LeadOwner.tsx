import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadOwnerProps {
  ownerName: string | null;
  className?: string;
}

export function LeadOwner({ ownerName, className }: LeadOwnerProps) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <User className="w-3 h-3" />
      </div>
      <span className="truncate max-w-[100px]">
        {ownerName || "Sem atendente"}
      </span>
    </div>
  );
}
