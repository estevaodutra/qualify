import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X, MessageCircle } from "lucide-react";
import { useChatExpressStore } from "@/stores/chatExpress.store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ChatExpressSidebar() {
  const { sessions, activeLeadId, activateSession, closeSession } = useChatExpressStore();

  return (
    <div className="w-[72px] bg-card border-r border-border/40 flex flex-col items-center py-4 gap-4 overflow-y-auto overflow-x-hidden scrollbar-none shrink-0 relative z-20">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-sm">
        <MessageCircle className="w-5 h-5" />
      </div>

      <div className="w-8 h-px bg-border/50 rounded-full" />

      {sessions.map((session) => {
        const isActive = session.leadId === activeLeadId;
        const fallback = session.leadName.substring(0, 2).toUpperCase();

        return (
          <Tooltip key={session.leadId} delayDuration={300}>
            <TooltipTrigger asChild>
              <div
                className="relative group cursor-pointer"
                onClick={() => activateSession(session.leadId)}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
                
                <div className={cn(
                  "relative w-12 h-12 rounded-2xl transition-all duration-300 ring-offset-2 ring-offset-background",
                  isActive ? "ring-2 ring-primary shadow-md scale-105" : "hover:scale-105 hover:bg-muted/50 p-0.5 opacity-80 hover:opacity-100"
                )}>
                  <Avatar className="w-full h-full rounded-2xl">
                    <AvatarImage src={session.avatarUrl || ""} alt={session.leadName} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm">
                      {fallback}
                    </AvatarFallback>
                  </Avatar>

                  {/* Unread Badge */}
                  {session.unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] shadow-sm animate-in zoom-in">
                      {session.unreadCount > 99 ? '99+' : session.unreadCount}
                    </Badge>
                  )}
                </div>

                {/* Close Button (Shows on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSession(session.leadId);
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-background border border-border rounded-full flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all shadow-sm z-10 scale-90 group-hover:scale-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold text-xs py-1.5 px-3">
              {session.leadName}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
