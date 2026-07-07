import { useEffect, useRef, useState } from "react";
import { Loader2, FileText, Lock, MapPin, Check, CheckCheck, User } from "lucide-react";
import { ChatMessage, ChatConversation } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface MessageThreadProps {
  conversation: ChatConversation;
  messages: ChatMessage[];
  isLoading: boolean;
  fetchNextMessages?: () => void;
  hasNextMessages?: boolean;
  isFetchingNextMessages?: boolean;
}

export default function MessageThread({ 
  conversation, 
  messages, 
  isLoading,
  fetchNextMessages,
  hasNextMessages,
  isFetchingNextMessages
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

  // Auto-scroll to bottom of conversation initially or when sending new message
  // We avoid scrolling if we are just loading older messages
  useEffect(() => {
    if (isLoading) return;
    
    // Simple heuristic: if we load the very first time, scroll down
    if (!hasInitialScrolled && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
      setHasInitialScrolled(true);
    }
  }, [messages, isLoading, hasInitialScrolled]);

  // If messages array shrinks (change conversation), reset scroll flag
  useEffect(() => {
    setHasInitialScrolled(false);
  }, [conversation.id]);

  // Intersection Observer for top of list (load older messages)
  useEffect(() => {
    if (isFetchingNextMessages || !hasNextMessages || !fetchNextMessages) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Save scroll position relative to bottom so we can preserve it
        const container = containerRef.current;
        if (container) {
           // We might need a small timeout if React hasn't rendered it yet, 
           // but normally the react-query handles cache update seamlessly
           fetchNextMessages();
        }
      }
    }, { root: containerRef.current, threshold: 0.1 });

    if (topRef.current) {
      observerRef.current.observe(topRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasNextMessages, isFetchingNextMessages, fetchNextMessages]);


  // Group messages by date helper
  const groupedMessages = messages.reduce<Record<string, ChatMessage[]>>((groups, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  // Format time of message
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && !isFetchingNextMessages && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/30 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground mt-2 font-medium">Carregando mensagens...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-background/20 scrollbar-thin">
      
      {/* Top intersection target for loading older messages */}
      <div ref={topRef} className="w-full flex justify-center py-2 h-10">
        {isFetchingNextMessages && (
          <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />
        )}
      </div>

      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <div key={date} className="space-y-4">
          {/* Date separator */}
          <div className="flex justify-center">
            <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              {date}
            </span>
          </div>

          {/* Messages */}
          {msgs.map((msg) => {
            const isOperator = msg.sender_type === "operator";
            const isSystem = msg.sender_type === "system";
            const isInternal = msg.is_internal;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-[10px] text-muted-foreground bg-muted/30 px-3 py-1 rounded text-center max-w-sm italic">
                    {msg.body}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[70%] gap-1 animate-in fade-in duration-300",
                  isOperator ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                {/* Bubble Container */}
                <div
                  className={cn(
                    "p-3 rounded-2xl shadow-sm text-sm relative overflow-hidden",
                    // Lead messages (received)
                    !isOperator && "bg-card border border-border/40 text-card-foreground rounded-tl-none",
                    // Operator public messages (sent)
                    isOperator && !isInternal && "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-tr-none",
                    // Operator internal notes
                    isOperator && isInternal && "bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-tr-none"
                  )}
                >
                  {/* Internal note header */}
                  {isInternal && (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 opacity-85">
                      <Lock className="h-3 w-3 shrink-0" />
                      Nota Interna
                    </div>
                  )}

                  {/* Render content by type */}
                  {msg.message_type === "text" && (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                  )}

                  {msg.message_type === "image" && (
                    <div className="space-y-1">
                      <a href={msg.media_url || "#"} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border/20 max-w-[240px]">
                        <img src={msg.media_url || ""} alt="Anexo" className="w-full h-auto object-cover max-h-60 hover:scale-105 transition-transform duration-300" />
                      </a>
                      {msg.body && <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>}
                    </div>
                  )}

                  {msg.message_type === "video" && (
                    <div className="space-y-1">
                      <video src={msg.media_url || ""} controls className="max-w-[240px] rounded-lg border border-border/20 max-h-60" />
                      {msg.body && <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>}
                    </div>
                  )}

                  {msg.message_type === "audio" && (
                    <div className="py-1 min-w-[200px]">
                      <audio src={msg.media_url || ""} controls className="w-full h-8 outline-none filter dark:invert" />
                    </div>
                  )}

                  {msg.message_type === "document" && (
                    <div className="flex items-center gap-3 bg-background/20 p-2.5 rounded-lg border border-border/10 max-w-[240px]">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate text-foreground">
                          {msg.body || "Documento"}
                        </p>
                        <a
                          href={msg.media_url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Visualizar / Baixar
                        </a>
                      </div>
                    </div>
                  )}

                  {msg.message_type === "location" && (
                    <div className="flex flex-col gap-1 max-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span className="font-semibold text-xs">Localização</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{msg.body || "Localização compartilhada"}</p>
                      {msg.media_url && (
                        <a
                          href={msg.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-primary hover:underline pt-0.5"
                        >
                          Ver no Google Maps
                        </a>
                      )}
                    </div>
                  )}

                  {/* Bubble Footer (Time & Status check) */}
                  <div
                    className={cn(
                      "text-[9px] flex items-center justify-end gap-1 mt-1 opacity-70",
                      isOperator && !isInternal ? "text-primary-foreground/90" : "text-muted-foreground"
                    )}
                  >
                    <span>{formatTime(msg.created_at)}</span>
                    {isOperator && !isInternal && (
                      <span>
                        {msg.status === "pending" && <span className="animate-pulse">...</span>}
                        {msg.status === "sent" && <Check className="h-3 w-3 text-primary-foreground/80" />}
                        {(msg.status === "delivered" || msg.status === "read") && (
                          <CheckCheck className={cn("h-3 w-3", msg.status === "read" ? "text-sky-300" : "text-primary-foreground/80")} />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Operator signature (for notes or multiple operator identification) */}
                {isOperator && isInternal && (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1 pr-1">
                    <User className="h-2.5 w-2.5" /> Nota por Operador
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
