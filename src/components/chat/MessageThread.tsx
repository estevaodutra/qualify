import { useEffect, useRef, useState } from "react";
import {  Loader2, FileText, Lock, MapPin, Check, CheckCheck, User , Play, Pause } from "lucide-react";
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


function CustomAudioPlayer({ src, isOperator, isInternal, timeString }: { src: string; isOperator: boolean; isInternal: boolean; timeString: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = speed === 1 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100;
      setProgress(p || 0);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={cn(
      "flex flex-col gap-1 p-2 rounded-2xl min-w-[220px] shadow-sm relative overflow-hidden",
      !isOperator && "bg-card border border-border/40 text-card-foreground rounded-tl-none",
      isOperator && !isInternal && "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-tr-none",
      isOperator && isInternal && "bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-tr-none"
    )}>
      {isInternal && (
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 opacity-85 px-1">
          <Lock className="h-3 w-3 shrink-0" />
          Nota Interna
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <button onClick={togglePlay} className={cn(
          "h-10 w-10 flex items-center justify-center rounded-full shrink-0 transition-colors shadow-sm",
          isOperator && !isInternal ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}>
          {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-1" fill="currentColor" />}
        </button>
        
        <div className="flex flex-col flex-1 mx-1 gap-1">
          <div className="flex justify-between items-center text-[10px] font-bold opacity-90 px-0.5">
            <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          {/* Fake Progress */}
          <div className="h-1.5 bg-foreground/20 rounded-full overflow-hidden relative cursor-pointer group" onClick={(e) => {
             if(audioRef.current && audioRef.current.duration) {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                audioRef.current.currentTime = pos * audioRef.current.duration;
             }
          }}>
            <div className={cn(
              "h-full absolute top-0 left-0 transition-all duration-75",
              isOperator && !isInternal ? "bg-primary-foreground" : "bg-primary"
            )} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button onClick={toggleSpeed} className={cn(
          "text-xs font-bold px-1.5 py-1 rounded-md shrink-0 w-8 text-center transition-colors",
          isOperator && !isInternal ? "hover:bg-primary-foreground/20" : "hover:bg-foreground/10"
        )}>
          {speed}x
        </button>
      </div>
      
      {/* Time string in corner */}
      <div className={cn(
        "text-[9px] flex justify-end px-1 opacity-70",
        isOperator && !isInternal ? "text-primary-foreground/90" : "text-muted-foreground"
      )}>
        {timeString}
      </div>

      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={() => setIsPlaying(false)} 
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="hidden" 
      />
    </div>
  );
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
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const lastMessageId = messages[messages.length - 1]?.id;
  const prevLastMessageIdRef = useRef(lastMessageId);

  // Auto-scroll to bottom of conversation initially or when receiving new message
  useEffect(() => {
    if (isLoading || messages.length === 0) return;
    
    if (!hasInitialScrolled) {
      bottomRef.current?.scrollIntoView();
      setHasInitialScrolled(true);
      prevLastMessageIdRef.current = lastMessageId;
    } else if (lastMessageId && prevLastMessageIdRef.current !== lastMessageId) {
      // Chegou nova mensagem no final
      prevLastMessageIdRef.current = lastMessageId;
      
      const container = containerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          setShowNewMessageButton(true);
        }
      }
    }
  }, [lastMessageId, isLoading, hasInitialScrolled, messages.length]);

  // If conversation changes, reset scroll flags
  useEffect(() => {
    setHasInitialScrolled(false);
    setShowNewMessageButton(false);
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
                {msg.message_type === "audio" ? (
                  <CustomAudioPlayer 
                    src={msg.media_url || ""} 
                    isOperator={isOperator} 
                    isInternal={isInternal} 
                    timeString={formatTime(msg.created_at)} 
                  />
                ) : msg.message_type === "ptv" ? (
                  <div className="flex flex-col items-center gap-1 relative group">
                    <video 
                      src={msg.media_url || ""} 
                      controls 
                      className={cn(
                        "w-56 h-56 rounded-full object-cover shadow-sm transition-transform duration-300",
                        isOperator && !isInternal ? "border-4 border-primary/20" : "border-4 border-card"
                      )} 
                    />
                    <div className={cn(
                      "absolute bottom-4 right-4 bg-background/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] flex items-center gap-1 shadow-sm font-medium",
                      isOperator && !isInternal ? "text-primary-foreground/90" : "text-muted-foreground"
                    )}>
                      {formatTime(msg.created_at)}
                      {isOperator && (
                        <span className="ml-0.5">
                          {msg.status === "sent" ? <Check className="h-3 w-3" /> : <CheckCheck className="h-3 w-3 text-blue-400" />}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
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
                    {formatTime(msg.created_at)}
                    {isOperator && (
                      <span className="ml-0.5">
                        {msg.status === "sent" ? <Check className="h-3 w-3" /> : <CheckCheck className="h-3 w-3 text-blue-400" />}
                      </span>
                    )}
                  </div>
                </div>
                )}

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
      
      {showNewMessageButton && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-center z-10">
          <button 
            onClick={() => {
              setShowNewMessageButton(false);
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-primary text-primary-foreground shadow-lg px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 animate-bounce cursor-pointer hover:bg-primary/90 transition-colors"
          >
            Novas mensagens <span className="text-lg leading-none">↓</span>
          </button>
        </div>
      )}
    </div>
  );
}
