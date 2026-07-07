import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Filter, MessageSquare, Clock, User, CheckCircle, HelpCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChatConversation, ChatFilters } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface InboxListProps {
  conversations: ChatConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  operators: { id: string; name: string }[];
  filters: ChatFilters;
  setFilters: (filters: ChatFilters) => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export default function InboxList({ 
  conversations, 
  selectedId, 
  onSelect, 
  operators,
  filters,
  setFilters,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}: InboxListProps) {
  const { user } = useAuth();
  
  // Search & Filter State
  const [localSearch, setLocalSearch] = useState(filters.search || "");
  const [sortBy, setSortBy] = useState<"recent" | "waiting">("recent");
  
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

  // Client-side sort (Server already filtered it, we just handle sort order locally if needed)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (sortBy === "waiting") {
        if (!a.waiting_since) return 1;
        if (!b.waiting_since) return -1;
        return new Date(a.waiting_since).getTime() - new Date(b.waiting_since).getTime();
      }
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  }, [conversations, sortBy]);

  return (
    <div className="w-[320px] shrink-0 border-r border-border/40 bg-card/10 flex flex-col h-full overflow-hidden">
      {/* Header Search & Sort */}
      <div className="p-4 border-b border-border/40 space-y-3 shrink-0">
        <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Caixa de Entrada
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-lg border-primary/5 bg-background/50 hover:bg-background/80 focus:bg-background transition-colors duration-200"
          />
        </div>

        {/* Sort & Quick Filter Toggle */}
        <div className="flex gap-2">
          <select
            value={filters.status || "all"}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="flex-1 bg-background/50 border border-primary/5 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer focus:border-primary/30 transition-colors"
          >
            <option value="all">Todos os Status</option>
            <option value="open">Abertas</option>
            <option value="in_progress">Em Atendimento</option>
            <option value="waiting">Aguardando</option>
            <option value="resolved">Resolvidas</option>
            <option value="unread">Não Lidas</option>
          </select>

          <select
            value={filters.operatorId || "all"}
            onChange={(e) => setFilters({ ...filters, operatorId: e.target.value })}
            className="flex-1 bg-background/50 border border-primary/5 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer focus:border-primary/30 transition-colors"
          >
            <option value="all">Todos Operadores</option>
            <option value={user?.id || "me"}>Minhas</option>
            <option value="unassigned">Sem Atribuição</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By Toggle */}
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold pt-1 uppercase tracking-wider">
          <span>{sortedConversations.length} Conversas</span>
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
              const isSelected = conv.id === selectedId;
              const waitTime = getWaitTime(conv.waiting_since);
              const isUnassigned = !conv.operator_id;

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "p-3.5 flex flex-col gap-1.5 cursor-pointer select-none transition-all duration-300 hover:bg-primary/5",
                    isSelected ? "bg-primary/10 border-l-[3px] border-primary" : "bg-transparent",
                    conv.unread_count > 0 && "bg-primary/[0.02] font-semibold"
                  )}
                >
                  {/* Line 1: Lead Name / Title & Wait Time */}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm truncate max-w-[170px] text-card-foreground">
                      {conv.lead?.name || conv.lead?.phone || "Lead Sem Nome"}
                    </span>
                    
                    {/* Wait Time Indicator */}
                    {waitTime && (
                      <span className="text-[10px] flex items-center gap-1 font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full animate-pulse">
                        <Clock className="h-2.5 w-2.5" />
                        {waitTime}
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
    </div>
  );
}
