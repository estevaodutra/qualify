import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Mail, CheckCircle2, Archive, ArchiveRestore, MoreVertical, Loader2 } from "lucide-react";
import { ChatConversation } from "@/hooks/useChat";
import { useConversationActions } from "@/hooks/useConversationActions";

interface ConversationActionsMenuProps {
  conversation: ChatConversation;
  trigger?: React.ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
  onActionComplete?: () => void;
}

export default function ConversationActionsMenu({
  conversation,
  trigger,
  align = "end",
  className,
  onActionComplete,
}: ConversationActionsMenuProps) {
  const {
    pinConversation,
    unpinConversation,
    markConversationUnread,
    markConversationRead,
    archiveConversation,
    unarchiveConversation,
    isPending,
  } = useConversationActions();

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (conversation.is_pinned) {
        await unpinConversation(conversation.id);
      } else {
        await pinConversation(conversation.id);
      }
      onActionComplete?.();
    } catch (err) {}
  };

  const handleReadToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if ((conversation.unread_count || 0) > 0) {
        await markConversationRead(conversation.id);
      } else {
        await markConversationUnread(conversation.id);
      }
      onActionComplete?.();
    } catch (err) {}
  };

  const handleArchiveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (conversation.is_archived) {
        await unarchiveConversation(conversation.id);
      } else {
        await archiveConversation(conversation.id);
      }
      onActionComplete?.();
    } catch (err) {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 ${className || ""}`}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52 rounded-xl p-1.5 z-[10000] shadow-xl">
        {/* 1. Pin / Unpin */}
        <DropdownMenuItem
          onClick={handlePinToggle}
          className="text-xs font-semibold py-2 rounded-lg cursor-pointer flex items-center gap-2.5"
        >
          {conversation.is_pinned ? (
            <>
              <PinOff className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Desafixar conversa</span>
            </>
          ) : (
            <>
              <Pin className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Fixar conversa</span>
            </>
          )}
        </DropdownMenuItem>

        {/* 2. Read / Unread */}
        <DropdownMenuItem
          onClick={handleReadToggle}
          className="text-xs font-semibold py-2 rounded-lg cursor-pointer flex items-center gap-2.5"
        >
          {(conversation.unread_count || 0) > 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
              <span>Marcar como lida</span>
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 text-blue-500 shrink-0" />
              <span>Marcar como não lida</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 border-border/40" />

        {/* 3. Archive / Unarchive */}
        <DropdownMenuItem
          onClick={handleArchiveToggle}
          className="text-xs font-semibold py-2 rounded-lg cursor-pointer flex items-center gap-2.5 text-slate-700 dark:text-slate-200"
        >
          {conversation.is_archived ? (
            <>
              <ArchiveRestore className="h-4 w-4 text-purple-500 shrink-0" />
              <span>Desarquivar conversa</span>
            </>
          ) : (
            <>
              <Archive className="h-4 w-4 text-purple-500 shrink-0" />
              <span>Arquivar conversa</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
