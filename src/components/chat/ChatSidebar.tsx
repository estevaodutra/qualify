import { ChatConversation, PipelineStage } from "@/hooks/useChat";
import { QuickReply } from "@/types/quickReplyTypes";
import QuickRepliesSidebarPanel from "./quick-replies/QuickRepliesSidebarPanel";
import LeadContextPanel from "./LeadContextPanel";
import GroupContextPanel from "./group/GroupContextPanel";
import { cn } from "@/lib/utils";

export type ChatSidebarMode = "quick_replies" | "lead_details";

interface ChatSidebarProps {
  conversation: ChatConversation;
  stages: PipelineStage[];
  sidebarMode: ChatSidebarMode;
  onSetSidebarMode: (mode: ChatSidebarMode) => void;
  onSelectQuickReply: (reply: QuickReply) => void;
  onSelectConversation?: (id: string) => void;
  className?: string;
}

export default function ChatSidebar({
  conversation,
  stages,
  sidebarMode,
  onSetSidebarMode,
  onSelectQuickReply,
  onSelectConversation,
  className,
}: ChatSidebarProps) {
  const phone = conversation?.lead?.phone || conversation?.contact_phone || "";
  const customFields = (conversation?.lead?.custom_fields as Record<string, any>) || {};
  const isGroup =
    phone.length > 15 ||
    phone.includes("@g.us") ||
    phone.includes("-group") ||
    customFields.is_group === true;

  return (
    <div className={cn("h-full shrink-0 relative flex", className)}>
      {/* 1. Quick Replies Panel (Always mounted to preserve search, group collapse, and scroll state) */}
      <div className={cn("h-full w-full", sidebarMode !== "quick_replies" && "hidden")}>
        <QuickRepliesSidebarPanel
          onSelectReply={onSelectQuickReply}
        />
      </div>

      {/* 2. Details Panel (GroupContextPanel for Groups, LeadContextPanel for Direct Leads) */}
      {sidebarMode === "lead_details" && (
        <div className="h-full w-full">
          {isGroup ? (
            <GroupContextPanel
              conversation={conversation}
              onClose={() => onSetSidebarMode("quick_replies")}
              onSelectConversation={onSelectConversation}
            />
          ) : (
            <LeadContextPanel
              conversation={conversation}
              stages={stages}
              onClose={() => onSetSidebarMode("quick_replies")}
            />
          )}
        </div>
      )}
    </div>
  );
}

