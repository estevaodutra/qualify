import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Filter, MessageSquare, Clock, User, CheckCircle, HelpCircle, Loader2, Settings, Info, CheckSquare, Zap } from "lucide-react";
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
import { Pin, Archive, Inbox, Users, Folder } from "lucide-react";
import { useGroupFolders } from "@/hooks/useGroupFolders";

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
    }, 500);
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
    
    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  // Group conversations by lead_id so each lead appears ONLY ONCE in the Inbox list.
  // Group conversations are kept unique by their JID so different groups are never collapsed.
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

    const list = Array.from(map.values()).map(item => {
      const instanceCount = new Set(item.all.map(c => c.instance_id).filter(Boolean)).size;
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

  // Compute total counts for type tabs
  const { totalGroupsCount, totalIndividualCount } = useMemo(() => {
    let groups = 0;
    let individual = 0;
    conversations.forEach((conv) => {
      const p = conv.lead?.phone || conv.contact_phone || "";
      const c = (conv.lead?.custom_fields as Record<string, any>) || {};
      const isGrp = p.length > 15 || p.includes("@g.us") || p.includes("-group") || c.is_group === true;
      if (isGrp) groups++;
      else individual++;
    });
    return { totalGroupsCount: groups, totalIndividualCount: individual };
  }, [conversations]);

  const currentConvType = (filters as AdvancedChatFilters).conversationType || "all";

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-card/10 border-r border-border/40">
      {/* Header Search & Sort */}
      <div className="p-4 border-b border-border/40 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Caixa de Entrada
          </h2>
          <button
            onClick={() => setIsManagerOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            title="Respostas Rápidas"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <QuickRepliesManagerModal
          open={isManagerOpen}
          onOpenChange={setIsManagerOpen}
        />

        {/* Conversation Type Filter: Todas | Leads | Grupos */}
        <div className="flex bg-muted/40 p-1 rounded-xl gap-1 border border-border/30">
          <button
            type="button"
            onClick={() => setFilters({ ...filters, conversationType: "all" } as any)}
            className={cn(
              "flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              currentConvType === "all"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Todas</span>
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, conversationType: "individual" } as any)}
            className={cn(
              "flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              currentConvType === "individual"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3.5 w-3.5" />
            <span>Leads</span>
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, conversationType: "group" } as any)}
            className={cn(
              "flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative",
              currentConvType === "group"
                ? "bg-background text-purple-600 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5 text-purple-600" />
            <span>Grupos</span>
            {totalGroupsCount > 0 && (
              <span className="text-[10px] bg-purple-500/20 text-purple-600 px-1.5 py-0.2 rounded-full font-extrabold ml-0.5">
                {totalGroupsCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Folder Filter Pills for Groups */}
        {currentConvType === "group" && groupFolders.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, groupFolderId: null } as any)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 cursor-pointer border",
                !(filters as AdvancedChatFilters).groupFolderId
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                  : "bg-background/80 hover:bg-muted text-muted-foreground border-border/40"
              )}
            >
              <Folder className="h-3 w-3" />
              <span>Todas as pastas</span>
            </button>
            {groupFolders.map((f) => {
              const isSelected = (filters as AdvancedChatFilters).groupFolderId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      groupFolderId: isSelected ? null : f.id,
                    } as any)
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border",
                    isSelected
                      ? "bg-purple-600 text-white border-purple-600 font-semibold shadow-xs"
                      : "bg-background/80 hover:bg-muted text-muted-foreground border-border/40"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: f.color || "#a855f7" }}
                  />
                  <span>{f.name}</span>
                </button>
              );
            })}
          </div>
        )}
        
        {/* View Tabs: Inbox vs Archived (Only rendered if there are archived conversations or currently viewing archived) */}
        {(archivedCount > 0 || (filters as AdvancedChatFilters).archiveMode === "archived_only") && (
          <div className="flex bg-muted/40 p-1 rounded-xl gap-1 border border-border/30">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, archiveMode: "active_only" } as any)}
              className={cn(
                "flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                (filters as AdvancedChatFilters).archiveMode !== "archived_only"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Entrada</span>
            </button>
            <button
              type="button"
              onClick={() => setFilters({ ...filters, archiveMode: "archived_only" } as any)}
              className={cn(
                "flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative",
                (filters as AdvancedChatFilters).archiveMode === "archived_only"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Arquivadas</span>
              {archivedCount > 0 && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-full font-extrabold ml-0.5">
                  {archivedCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Search & Unified Filter Button */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou número..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-primary/5 bg-background/50 hover:bg-background/80 focus:bg-background transition-colors duration-200"
            />
          </div>

          <Button
            variant={activeCategoryCount > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={cn(
              "h-9 px-3 text-xs font-bold rounded-xl gap-1.5 shrink-0 transition-all cursor-pointer",
              activeCategoryCount > 0
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros</span>
            {activeCategoryCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-bold rounded-full bg-background/30 text-current ml-0.5">
                {activeCategoryCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Active Filter Chips */}
        <ActiveFilterChips
          filters={filters as AdvancedChatFilters}
          onUpdateFilters={(next) => setFilters(next)}
          operators={operators}
          instances={instances}
          groupFolders={groupFolders}
        />

        {/* Drawer Component */}
        <ChatFilterDrawer
          open={isFilterDrawerOpen}
          onOpenChange={setIsFilterDrawerOpen}
          appliedFilters={filters as AdvancedChatFilters}
          onApplyFilters={(next) => setFilters(next)}
          operators={operators}
          instances={instances}
        />

        {/* Sort By Toggle & Discreet Selection Toggle */}
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold pt-1 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span>{sortedConversations.length} Contatos</span>
            <button
              type="button"
              onClick={() => {
                if (isSelectionMode) {
                  handleCancelSelection();
                } else {
                  setIsSelectionMode(true);
                }
              }}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium tracking-normal transition-colors flex items-center gap-1 cursor-pointer",
                isSelectionMode
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "hover:bg-muted text-muted-foreground/80 hover:text-foreground"
              )}
              title={isSelectionMode ? "Cancelar seleção em massa" : "Selecionar conversas para ação em massa"}
            >
              <CheckSquare className="h-3 w-3" />
              <span>{isSelectionMode ? "Concluir" : "Selecionar"}</span>
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy("recent")}
              className={cn(
                "hover:text-primary transition-colors cursor-pointer",
                sortBy === "recent" && "text-primary font-bold"
              )}
            >
              Recentes
            </button>
            <span>•</span>
            <button
              onClick={() => setSortBy("waiting")}
              className={cn(
                "hover:text-primary transition-colors cursor-pointer",
                sortBy === "waiting" && "text-primary font-bold"
              )}
            >
              Espera
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Active during Selection Mode) */}
      {isSelectionMode && (
        <div className="px-3.5 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-2 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
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
              className="h-7 px-3 text-xs font-bold gap-1.5 shadow-sm shadow-primary/25 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Disparar Fluxo</span>
            </Button>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/20">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground/60 space-y-2">
            <MessageSquare className="h-10 w-10 opacity-30 animate-pulse text-primary" />
            <p className="text-xs font-medium">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <>
            {sortedConversations.map((conv) => {
              const isSelected = !isSelectionMode && (conv.id === selectedId || (conv.allLeadConversations && conv.allLeadConversations.some((c: any) => c.id === selectedId)));
              const isChecked = selectedConvIds.has(conv.id);
              const waitTime = getWaitTime(conv.waiting_since);
              const isUnassigned = !conv.operator_id;

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
                    "p-3.5 flex items-start gap-2.5 cursor-pointer select-none transition-all duration-200 hover:bg-primary/5 group relative",
                    isSelected ? "bg-primary/10 border-l-[3px] border-primary" : "bg-transparent",
                    isSelectionMode && isChecked ? "bg-primary/10 border-l-[3px] border-primary font-medium" : "",
                    conv.unread_count > 0 && "bg-primary/[0.02] font-semibold"
                  )}
                >
                  {/* Selection Checkbox (Visible in selection mode) */}
                  {isSelectionMode && (
                    <div
                      className="pt-0.5 shrink-0"
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

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    {/* Line 1: Lead Name / Title & Wait Time & Pin & Actions Menu */}
                    <div className="flex justify-between items-center gap-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {conv.is_pinned && (
                          <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500/20" title="Conversa Fixada" />
                        )}
                        {(() => {
                          const p = conv.lead?.phone || conv.contact_phone || "";
                          const c = (conv.lead?.custom_fields as Record<string, any>) || {};
                          const isGrp = p.length > 15 || p.includes("@g.us") || p.includes("-group") || c.is_group === true;
                          return (
                            <>
                              {isGrp && (
                                <div className="p-0.5 rounded bg-purple-500/10 text-purple-600 shrink-0" title="Grupo WhatsApp">
                                  <Users className="h-3 w-3" />
                                </div>
                              )}
                              <span className="font-semibold text-sm truncate text-card-foreground">
                                {conv.lead?.name?.trim() || (conv.contact_name && conv.contact_name !== "Grupo" ? conv.contact_name.trim() : null) || (isGrp ? "Grupo WhatsApp" : conv.lead?.phone || conv.contact_phone || "Contato Sem Nome")}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Wait Time Indicator */}
                        {waitTime && (
                          <span className="text-[10px] flex items-center gap-1 font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full animate-pulse">
                            <Clock className="h-2.5 w-2.5" />
                            {waitTime}
                          </span>
                        )}

                        {/* Conversation Actions Menu */}
                        {!isSelectionMode && (
                          <ConversationActionsMenu
                            conversation={conv}
                            className="h-6 w-6 opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                    </div>

                    {/* Instance Tag under name + (i) multi-connection indicator */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {conv.instance?.name ? (
                        <span 
                          className="text-[10px] font-medium text-muted-foreground/80 flex items-center gap-1 bg-muted/40 px-1.5 py-0.2 rounded border border-border/30 max-w-[200px] truncate"
                          title={`Conexão: ${conv.instance.name}`}
                        >
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            conv.instance.status === "connected" ? "bg-emerald-500" : "bg-muted-foreground/50"
                          )} />
                          <span className="truncate">{conv.instance.name}</span>
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-medium text-amber-500/80 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 max-w-[130px] truncate">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="truncate">Sem conexão</span>
                        </span>
                      )}

                      {/* (i) info icon badge when lead talks on multiple connections */}
                      {conv.instanceCount > 1 && (
                        <span 
                          className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 flex items-center gap-1 shrink-0 cursor-help"
                          title={`Este contato possui histórico em ${conv.instanceCount} conexões diferentes. Exibindo a mais recente.`}
                        >
                          <Info className="h-2.5 w-2.5" />
                          +{conv.instanceCount - 1} conexões
                        </span>
                      )}
                    </div>

                    {/* Line 2: Message Preview */}
                    <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                      {conv.last_message_preview || "Nenhuma mensagem"}
                    </p>

                    {/* Line 3: Meta Attributes (Tags, Operator, Unread, Status Badge) */}
                    <div className="flex justify-between items-center pt-1">
                      {/* Badges / Attribution */}
                      <div className="flex items-center gap-1.5">
                        {/* Operator assignment */}
                        {isUnassigned ? (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 bg-muted/40 px-1 rounded">
                            <HelpCircle className="h-2.5 w-2.5" />
                            Pendente
                          </span>
                        ) : (
                          <span className="text-[10px] text-primary flex items-center gap-0.5 bg-primary/10 px-1 rounded max-w-[90px] truncate">
                            <User className="h-2.5 w-2.5 shrink-0" />
                            {conv.operator?.full_name?.split(" ")[0] || "Operador"}
                          </span>
                        )}

                        {/* Status badge */}
                        <span
                          className={cn(
                            "text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider shrink-0",
                            conv.status === "open" && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
                            conv.status === "in_progress" && "bg-purple-500/10 text-purple-500 border border-purple-500/20",
                            conv.status === "waiting" && "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
                            conv.status === "resolved" && "bg-green-500/10 text-green-500 border border-green-500/20"
                          )}
                        >
                          {conv.status === "open" && "Aberto"}
                          {conv.status === "in_progress" && "Atendimento"}
                          {conv.status === "waiting" && "Espera"}
                          {conv.status === "resolved" && "Resolvido"}
                        </span>
                      </div>

                      {/* Unread Counter Badge */}
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center px-1 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Loading / End of list indicator */}
            <div ref={loadMoreRef} className="p-4 flex justify-center">
              {isFetchingNextPage ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : hasNextPage ? (
                <div className="h-5" /> // Spacer for observer to trigger before they actually reach the end
              ) : sortedConversations.length >= 30 ? (
                <span className="text-xs text-muted-foreground/50">Você chegou ao fim</span>
              ) : null}
            </div>
          </>
        )}
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
    </div>
  );
}
