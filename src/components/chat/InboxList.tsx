import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  MessageSquare,
  Clock,
  User,
  HelpCircle,
  Loader2,
  Settings,
  Info,
  CheckSquare,
  Zap,
  Pin,
  Archive,
  Users,
  Folder,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Star,
  MoreVertical,
} from "lucide-react";
import QuickRepliesManagerModal from "@/components/chat/quick-replies/QuickRepliesManagerModal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChatConversation, ChatFilters } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import { AdvancedChatFilters, getActiveCategoryCount } from "@/types/chatFilterTypes";
import ChatFilterDrawer from "./filters/ChatFilterDrawer";
import ActiveFilterChips from "./filters/ActiveFilterChips";
import ConversationActionsMenu from "./actions/ConversationActionsMenu";
import BatchWorkflowDispatchDialog from "./batch/BatchWorkflowDispatchDialog";
import { Button } from "@/components/ui/button";
import { useGroupFolders } from "@/hooks/useGroupFolders";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InboxListProps {
  conversations: ChatConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  operators: { id: string; name: string }[];
  instances?: Array<{ id: string; name: string; phoneNumber?: string; status: string }>;
  filters: AdvancedChatFilters | ChatFilters;
  setFilters: (filters: AdvancedChatFilters | ChatFilters) => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  archivedCount?: number;
}

// Generate pastel monogram initials and color
function getAvatarInfo(name: string, isGroup: boolean) {
  const clean = name.replace(/[^\w\sÀ-ú]/gi, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  let initials = "";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length === 1) {
    initials = parts[0].substring(0, 1).toUpperCase();
  } else {
    initials = isGroup ? "GP" : "CT";
  }

  // Consistent pleasant pastel hues
  const colors = [
    "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colors[Math.abs(hash) % colors.length];

  return { initials, colorClass };
}

// Format message preview timestamp
function formatMessageTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export default function InboxList({
  conversations,
  selectedId,
  onSelect,
  operators,
  instances = [],
  filters,
  setFilters,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  archivedCount = 0,
}: InboxListProps) {
  const { user } = useAuth();

  // Search & Filter State
  const [localSearch, setLocalSearch] = useState((filters as AdvancedChatFilters).search || "");
  const [sortBy, setSortBy] = useState<"recent" | "waiting">("recent");
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { folders: groupFolders = [] } = useGroupFolders();

  // Active top quick pill: "all" | "unread" | "favorites" | "groups"
  const [activePill, setActivePill] = useState<"all" | "unread" | "favorites" | "groups">(() => {
    const adv = filters as AdvancedChatFilters;
    if (adv.favoritesOnly) return "favorites";
    if (adv.unreadMode === "unread_only") return "unread";
    if (adv.conversationType === "group") return "groups";
    return "all";
  });

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  const activeCategoryCount = getActiveCategoryCount(filters as AdvancedChatFilters);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== localSearch) {
        setFilters({ ...filters, search: localSearch });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [localSearch, filters, setFilters]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isFetchingNextPage || !hasNextPage) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage();
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Format wait time safely
  const getWaitTime = (waitingSince: string | null) => {
    if (!waitingSince) return null;
    const now = new Date();
    const wait = new Date(waitingSince);
    const diffMs = now.getTime() - wait.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  // Group conversations by lead_id so each lead appears ONLY ONCE in the Inbox list.
  const sortedConversations = useMemo(() => {
    const map = new Map<string, {
      primary: ChatConversation;
      all: ChatConversation[];
      totalUnread: number;
    }>();

    conversations.forEach((conv) => {
      const p = conv.lead?.phone || conv.contact_phone || "";
      const c = (conv.lead?.custom_fields as Record<string, any>) || {};
      const isGrp = p.length > 15 || p.includes("@g.us") || p.includes("-group") || c.is_group === true;

      const key = isGrp
        ? (p.includes("@g.us") || p.includes("-group") || p.startsWith("1203") ? p.toLowerCase() : conv.id)
        : (conv.lead_id || conv.lead?.phone || conv.id);

      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          primary: conv,
          all: [conv],
          totalUnread: conv.unread_count || 0,
        });
      } else {
        existing.all.push(conv);
        existing.totalUnread += (conv.unread_count || 0);

        // Keep the conversation with the latest last_message_at as primary
        if (new Date(conv.last_message_at).getTime() > new Date(existing.primary.last_message_at).getTime()) {
          existing.primary = conv;
        }
      }
    });

    const list = Array.from(map.values()).map((item) => {
      const instanceCount = new Set(item.all.map((c) => c.instance_id).filter(Boolean)).size;
      return {
        ...item.primary,
        unread_count: item.totalUnread,
        allLeadConversations: item.all,
        instanceCount,
      };
    });

    return list.sort((a, b) => {
      if (sortBy === "waiting") {
        if (!a.waiting_since) return 1;
        if (!b.waiting_since) return -1;
        return new Date(a.waiting_since).getTime() - new Date(b.waiting_since).getTime();
      }
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  }, [conversations, sortBy]);

  // Bulk Selection Helpers & Memos
  const toggleSelectConversation = (id: string) => {
    setSelectedConvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedConvIds.size === sortedConversations.length) {
      setSelectedConvIds(new Set());
    } else {
      setSelectedConvIds(new Set(sortedConversations.map((c) => c.id)));
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedConvIds(new Set());
  };

  const selectedConversations = useMemo(() => {
    return sortedConversations.filter((c) => selectedConvIds.has(c.id));
  }, [sortedConversations, selectedConvIds]);

  // Compute counts for pill badges:
  // unread count (conversations with unread > 0)
  // groups count (conversations that are groups)
  const { totalGroupsCount, totalUnreadConvsCount } = useMemo(() => {
    let groups = 0;
    let unread = 0;
    sortedConversations.forEach((conv) => {
      const p = conv.lead?.phone || conv.contact_phone || "";
      const c = (conv.lead?.custom_fields as Record<string, any>) || {};
      const isGrp = p.length > 15 || p.includes("@g.us") || p.includes("-group") || c.is_group === true;
      if (isGrp) groups++;
      if (conv.unread_count > 0) unread++;
    });
    return { totalGroupsCount: groups, totalUnreadConvsCount: unread };
  }, [sortedConversations]);

  // Handle Quick Pill Selection (Tudo | Não lidas | Favoritas | Grupos)
  const handlePillSelect = (pill: "all" | "unread" | "favorites" | "groups") => {
    setActivePill(pill);
    const adv = { ...(filters as AdvancedChatFilters) };

    if (pill === "all") {
      adv.conversationType = "all";
      adv.unreadMode = "all";
      adv.favoritesOnly = false;
      adv.groupFolderId = null;
    } else if (pill === "unread") {
      adv.conversationType = "all";
      adv.unreadMode = "unread_only";
      adv.favoritesOnly = false;
      adv.groupFolderId = null;
    } else if (pill === "favorites") {
      adv.conversationType = "all";
      adv.unreadMode = "all";
      adv.favoritesOnly = true;
      adv.groupFolderId = null;
    } else if (pill === "groups") {
      adv.conversationType = "group";
      adv.unreadMode = "all";
      adv.favoritesOnly = false;
    }

    setFilters(adv);
  };

  // Separate pinned conversations vs normal conversations
  const { pinnedConversations, normalConversations } = useMemo(() => {
    const pinned: typeof sortedConversations = [];
    const normal: typeof sortedConversations = [];

    sortedConversations.forEach((c) => {
      if (c.is_pinned) pinned.push(c);
      else normal.push(c);
    });

    return { pinnedConversations: pinned, normalConversations: normal };
  }, [sortedConversations]);

  const isArchivedActive = (filters as AdvancedChatFilters).archiveMode === "archived_only";

  // Render a single conversation row card
  const renderConversationItem = (conv: typeof sortedConversations[0]) => {
    const isSelected = !isSelectionMode && (conv.id === selectedId || (conv.allLeadConversations && conv.allLeadConversations.some((c: any) => c.id === selectedId)));
    const isChecked = selectedConvIds.has(conv.id);
    const waitTime = getWaitTime(conv.waiting_since);

    const phone = conv.lead?.phone || conv.contact_phone || "";
    const customF = (conv.lead?.custom_fields as Record<string, any>) || {};
    const isGrp = phone.length > 15 || phone.includes("@g.us") || phone.includes("-group") || customF.is_group === true;

    const displayName =
      conv.lead?.name?.trim() ||
      (conv.contact_name && conv.contact_name !== "Grupo" ? conv.contact_name.trim() : null) ||
      (isGrp ? "Grupo WhatsApp" : phone || "Contato Sem Nome");

    const avatarUrl =
      (conv as any).group_photo_url ||
      customF.profile_picture_url ||
      customF.pictureUrl ||
      customF.group_photo_url ||
      null;

    const { initials, colorClass } = getAvatarInfo(displayName, isGrp);
    const messageTime = formatMessageTime(conv.last_message_at);

    // Green badge for unread in groups or normal purple
    const isGreenBadge = isGrp && conv.unread_count > 0;

    return (
      <div
        key={conv.id}
        onClick={() => {
          if (isSelectionMode) {
            toggleSelectConversation(conv.id);
          } else {
            onSelect(conv.id);
          }
        }}
        className={cn(
          "px-3.5 py-3 flex items-center gap-3 cursor-pointer select-none transition-all duration-150 group relative border-b border-border/30",
          isSelected ? "bg-primary/10 border-l-[3px] border-l-primary" : "hover:bg-muted/40 bg-transparent",
          isSelectionMode && isChecked ? "bg-primary/10 border-l-[3px] border-l-primary font-medium" : "",
          conv.unread_count > 0 && !isSelected && "bg-primary/[0.02]"
        )}
      >
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectConversation(conv.id);
            }}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleSelectConversation(conv.id)}
              className="data-[state=checked]:bg-primary h-4 w-4 rounded-sm border-border/80"
            />
          </div>
        )}

        {/* Avatar */}
        <div className="shrink-0 relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className={cn(
                "h-11 w-11 object-cover shadow-2xs border border-border/40",
                isGrp ? "rounded-full" : "rounded-2xl"
              )}
            />
          ) : (
            <div
              className={cn(
                "h-11 w-11 flex items-center justify-center font-bold text-sm tracking-tight shadow-2xs select-none",
                isGrp ? "rounded-full" : "rounded-2xl",
                colorClass
              )}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          {/* Line 1: Contact/Group Name + Timestamp or Wait Badge */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-bold text-xs text-foreground truncate">
              {displayName}
            </span>

            <div className="shrink-0 flex items-center gap-1.5">
              {waitTime ? (
                <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 dark:bg-rose-500/15 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5 text-rose-500" />
                  <span>{waitTime}</span>
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground font-medium">
                  {messageTime}
                </span>
              )}

              {/* Hover 3-dots actions menu button */}
              {!isSelectionMode && (
                <div
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ConversationActionsMenu
                    conversation={conv}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Line 2: WhatsApp Instance / Sender Tag */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            {conv.instance?.name && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate max-w-[200px]">{conv.instance.name}</span>
              </>
            )}
          </div>

          {/* Line 3: Last Message Preview */}
          <p className="text-[11.5px] text-muted-foreground/90 truncate leading-snug">
            {conv.last_message_preview || "Nenhuma mensagem recente"}
          </p>

          {/* Line 4: Status Badges (Pendente / Aberto) + Unread Counter / Pin Icon */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/80 flex items-center gap-0.5 bg-muted/50 px-1.5 py-0.5 rounded-md font-medium">
                <Clock className="h-2.5 w-2.5" />
                <span>Pendente</span>
              </span>

              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-blue-600 bg-blue-500/10 border border-blue-500/20 uppercase tracking-tight">
                Aberto
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {conv.is_pinned && (
                <Pin className="h-3.5 w-3.5 text-primary fill-primary shrink-0" />
              )}

              {conv.unread_count > 0 && (
                <span
                  className={cn(
                    "min-w-4 h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-xs",
                    isGreenBadge ? "bg-emerald-600" : "bg-primary"
                  )}
                >
                  {conv.unread_count}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-card/20 border-r border-border/40 select-none">
      {/* 1. Header Toolbar */}
      <div className="p-4 pb-3 border-b border-border/30 space-y-3 shrink-0 bg-background/50 backdrop-blur-xs">
        {/* Title Row: Caixa de Entrada + Top Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-primary">
            Caixa de Entrada
          </h2>

          <div className="flex items-center gap-1">
            {/* Filter Drawer Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={cn(
                "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                activeCategoryCount > 0 && "text-primary bg-primary/10"
              )}
              title="Filtros avançados"
            >
              <Filter className="h-4 w-4" />
            </Button>

            {/* Selection Mode Toggle (Raio / Ações em massa) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isSelectionMode) handleCancelSelection();
                else setIsSelectionMode(true);
              }}
              className={cn(
                "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                isSelectionMode && "text-primary bg-primary/10"
              )}
              title="Ação em massa / Disparos"
            >
              <Zap className="h-4 w-4" />
            </Button>

            {/* Options Menu (Settings / Quick Replies) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 z-[10000]">
                <DropdownMenuItem
                  onClick={() => setIsManagerOpen(true)}
                  className="text-xs font-semibold py-2 rounded-lg cursor-pointer flex items-center gap-2"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Respostas Rápidas</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Pesquisar ou começar uma nova conversa"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9.5 pr-3 h-10 text-xs rounded-xl border-border/50 bg-muted/40 hover:bg-muted/60 focus:bg-background transition-colors duration-200"
          />
        </div>

        {/* Quick Filter Pills Row: Tudo | Não lidas | Favoritas | Grupos */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {/* Tudo */}
          <button
            type="button"
            onClick={() => handlePillSelect("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs",
              activePill === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Tudo
          </button>

          {/* Não lidas */}
          <button
            type="button"
            onClick={() => handlePillSelect("unread")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs",
              activePill === "unread"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>Não lidas</span>
            {totalUnreadConvsCount > 0 && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0 rounded-full font-extrabold",
                  activePill === "unread"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-purple-500/20 text-purple-600"
                )}
              >
                {totalUnreadConvsCount}
              </span>
            )}
          </button>

          {/* Favoritas */}
          <button
            type="button"
            onClick={() => handlePillSelect("favorites")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs flex items-center gap-1",
              activePill === "favorites"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Star className={cn("h-3 w-3", activePill === "favorites" && "fill-current")} />
            <span>Favoritas</span>
          </button>

          {/* Grupos */}
          <DropdownMenu>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handlePillSelect("groups")}
                className={cn(
                  "px-3 py-1.5 rounded-l-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs",
                  activePill === "groups"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>Grupos</span>
                {totalGroupsCount > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0 rounded-full font-extrabold",
                      activePill === "groups"
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-purple-500/20 text-purple-600"
                    )}
                  >
                    {totalGroupsCount}
                  </span>
                )}
              </button>

              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "px-1.5 py-1.5 rounded-r-full text-xs transition-all shrink-0 cursor-pointer border-l border-border/20 shadow-2xs",
                    activePill === "groups"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Filtrar por pasta de grupos"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
            </div>

            {groupFolders.length > 0 && (
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 z-[10000]">
                <DropdownMenuItem
                  onClick={() => {
                    handlePillSelect("groups");
                    setFilters({ ...(filters as AdvancedChatFilters), groupFolderId: null });
                  }}
                  className="text-xs font-semibold py-1.5 rounded-lg cursor-pointer"
                >
                  Todas as pastas
                </DropdownMenuItem>
                {groupFolders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => {
                      setActivePill("groups");
                      setFilters({
                        ...(filters as AdvancedChatFilters),
                        conversationType: "group",
                        groupFolderId: f.id,
                      });
                    }}
                    className="text-xs font-semibold py-1.5 rounded-lg cursor-pointer flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: f.color || "#a855f7" }}
                    />
                    <span className="truncate">{f.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>

        {/* Banner Arquivadas */}
        <div
          onClick={() => {
            const nextMode = isArchivedActive ? "active_only" : "archived_only";
            setFilters({ ...(filters as AdvancedChatFilters), archiveMode: nextMode });
          }}
          className={cn(
            "p-2.5 rounded-xl border border-border/40 flex items-center justify-between cursor-pointer transition-colors text-xs font-medium shadow-2xs",
            isArchivedActive
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted/30 hover:bg-muted/60 text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">
              {isArchivedActive ? "Exibindo Arquivadas" : "Arquivadas"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs font-semibold">
            <span>{archivedCount}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Bulk Selection Bar */}
        {isSelectionMode && (
          <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-primary whitespace-nowrap">
                {selectedConvIds.size} selecionada{selectedConvIds.size !== 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] text-muted-foreground hover:text-primary underline cursor-pointer truncate"
              >
                {selectedConvIds.size === sortedConversations.length ? "Desmarcar todas" : "Selecionar todas"}
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelSelection}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={selectedConvIds.size === 0}
                onClick={() => setIsBatchDialogOpen(true)}
                className="h-7 px-3 text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>Disparar Fluxo</span>
              </Button>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        <ActiveFilterChips
          filters={filters as AdvancedChatFilters}
          onUpdateFilters={(next) => setFilters(next)}
          operators={operators}
          instances={instances}
          groupFolders={groupFolders}
        />
      </div>

      {/* Filter Drawer */}
      <ChatFilterDrawer
        open={isFilterDrawerOpen}
        onOpenChange={setIsFilterDrawerOpen}
        appliedFilters={filters as AdvancedChatFilters}
        onApplyFilters={(next) => setFilters(next)}
        operators={operators}
        instances={instances}
      />

      {/* 2. Conversations List Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/20">
        {/* Section 1: Fixadas (Pinned) */}
        {!isArchivedActive && (
          <div className="pb-1">
            <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
              <Pin className="h-3.5 w-3.5 fill-current" />
              <span>Fixadas ({1 + pinnedConversations.length})</span>
            </div>

            {/* Special Pinned Card: Copiloto IA */}
            {!isSelectionMode && (
              <div
                onClick={() => onSelect("copilot-ia")}
                className={cn(
                  "mx-3 my-1.5 p-3 rounded-2xl cursor-pointer select-none transition-all duration-150 border flex items-center gap-3 relative group shadow-2xs",
                  selectedId === "copilot-ia"
                    ? "bg-purple-500/15 border-purple-500/40 shadow-xs ring-1 ring-purple-500/30"
                    : "bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/20"
                )}
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-xs text-foreground truncate">
                        Copiloto IA
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1 py-0 h-3.5 font-semibold shrink-0"
                      >
                        IA
                      </Badge>
                    </div>
                    <span className="text-[10px] text-primary font-medium shrink-0">
                      Online
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    Assistente de Estratégia e Conteúdo
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground/80 flex items-center gap-0.5 bg-muted/60 px-1.5 py-0.2 rounded-md font-medium">
                        <Clock className="h-2.5 w-2.5" />
                        <span>Pendente</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold text-blue-600 bg-blue-500/10 border border-blue-500/20 uppercase tracking-tight">
                        Aberto
                      </span>
                    </div>
                    <Pin className="h-3.5 w-3.5 text-primary fill-primary" />
                  </div>
                </div>
              </div>
            )}

            {/* Other Pinned Conversations */}
            {pinnedConversations.map(renderConversationItem)}
          </div>
        )}

        {/* Section 2: Conversas (Normal) */}
        <div>
          <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 text-xs font-bold text-primary">
            <MessageSquare className="h-3.5 w-3.5 fill-current" />
            <span>Conversas</span>
          </div>

          {normalConversations.length === 0 && pinnedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground/60 space-y-2">
              <MessageSquare className="h-10 w-10 opacity-30 animate-pulse text-primary" />
              <p className="text-xs font-medium">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            normalConversations.map(renderConversationItem)
          )}
        </div>

        {/* Loading Indicator */}
        <div ref={loadMoreRef} className="p-4 flex justify-center">
          {isFetchingNextPage ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : hasNextPage ? (
            <div className="h-5" />
          ) : sortedConversations.length >= 30 ? (
            <span className="text-xs text-muted-foreground/50">Você chegou ao fim</span>
          ) : null}
        </div>
      </div>

      {/* Batch Workflow Dispatch Dialog */}
      <BatchWorkflowDispatchDialog
        open={isBatchDialogOpen}
        onOpenChange={setIsBatchDialogOpen}
        conversations={selectedConversations}
        instances={instances}
        onComplete={() => {
          handleCancelSelection();
        }}
      />

      <QuickRepliesManagerModal
        open={isManagerOpen}
        onOpenChange={setIsManagerOpen}
      />
    </div>
  );
}
