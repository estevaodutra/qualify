import { ChatConversation, PipelineStage } from "@/hooks/useChat";
import { QuickReply } from "@/types/quickReplyTypes";
import QuickRepliesSidebarPanel from "./quick-replies/QuickRepliesSidebarPanel";
import LeadContextPanel from "./LeadContextPanel";
import { cn } from "@/lib/utils";

export type ChatSidebarMode = "quick_replies" | "lead_details";

interface ChatSidebarProps {
  conversation: ChatConversation;
  stages: PipelineStage[];
  sidebarMode: ChatSidebarMode;
  onSetSidebarMode: (mode: ChatSidebarMode) => void;
  onSelectQuickReply: (reply: QuickReply) => void;
  className?: string;
}

export default function ChatSidebar({
  conversation,
  stages,
  sidebarMode,
  onSetSidebarMode,
  onSelectQuickReply,
  className,
}: ChatSidebarProps) {
  return (
    <div className={cn("h-full shrink-0 relative flex", className)}>
      {/* 1. Quick Replies Panel (Always mounted to preserve search, group collapse, and scroll state) */}
      <div className={cn("h-full w-full", sidebarMode !== "quick_replies" && "hidden")}>
        <QuickRepliesSidebarPanel
          onSelectReply={onSelectQuickReply}
        />
      </div>

      {/* 2. Lead Context Panel (Card do Lead, displayed when mode is 'lead_details') */}
      {sidebarMode === "lead_details" && (
        <div className="h-full w-full">
          <LeadContextPanel
            conversation={conversation}
            stages={stages}
            onClose={() => onSetSidebarMode("quick_replies")}
          />
        </div>
      )}
    </div>
  );
}
