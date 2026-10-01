import React, { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  ArrowLeft,
  Video,
  Phone,
  MoreVertical,
  Paperclip,
  Mic,
  Smile,
  Send,
  Play,
  Pause,
  Clock,
  Tag,
  Briefcase,
  CheckCheck,
  FileText,
  Radio,
  ExternalLink,
  ChevronRight,
  Maximize2,
  X
} from "lucide-react";
import { LocalNode, LocalConnection } from "./shared-types";
import { formatDelayLabel, normalizeDelayConfig } from "@/lib/workflows/delay";
import { getActionDefinition } from "./actions/actionRegistry";
import { cn } from "@/lib/utils";

interface WorkflowWhatsAppPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: LocalNode[];
  connections: LocalConnection[];
  workflowName?: string;
}

// Format message inline markdown (bold, italic, links)
function parseInlineFormatting(text: string): React.ReactNode[] {
  if (!text) return [];

  const pattern = /(https?:\/\/[^\s]+)|(\*[^\*\n]+\*)|(_[^_\n]+_)|(~[^~\n]+~)|(`[^`\n]+`)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    if (match[1]) {
      elements.push(
        <a
          key={match.index}
          href={matchedStr}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 hover:text-blue-700 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {matchedStr}
        </a>
      );
    } else if (match[2]) {
      const inner = matchedStr.slice(1, -1);
      elements.push(
        <strong key={match.index} className="font-bold">
          {parseInlineFormatting(inner)}
        </strong>
      );
    } else if (match[3]) {
      const inner = matchedStr.slice(1, -1);
      elements.push(
        <em key={match.index} className="italic">
          {parseInlineFormatting(inner)}
        </em>
      );
    } else if (match[4]) {
      const inner = matchedStr.slice(1, -1);
      elements.push(
        <del key={match.index} className="line-through opacity-80">
          {parseInlineFormatting(inner)}
        </del>
      );
    } else if (match[5]) {
      elements.push(
        <code key={match.index} className="bg-black/10 px-1 py-0.5 rounded text-[11px] font-mono">
          {matchedStr.slice(1, -1)}
        </code>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
}

function PreviewAudioPlayer({ src, timeString }: { src: string; timeString: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100;
      setProgress(p || 0);
    }
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col gap-1 p-2 rounded-2xl min-w-[210px] max-w-[240px] bg-[#d9fdd3] text-slate-800 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="h-9 w-9 flex items-center justify-center rounded-full shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
        </button>

        <div className="flex flex-col flex-1 mx-1 gap-1">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 px-0.5">
            <span>{formatSeconds(audioRef.current?.currentTime || 0)}</span>
            <span>{formatSeconds(duration || 15)}</span>
          </div>
          <div
            className="h-1.5 bg-emerald-200 rounded-full overflow-hidden relative cursor-pointer"
            onClick={(e) => {
              if (audioRef.current && audioRef.current.duration) {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                audioRef.current.currentTime = pos * audioRef.current.duration;
              }
            }}
          >
            <div className="h-full bg-emerald-600 transition-all duration-75" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="text-[9px] flex items-center justify-end gap-1 px-1 text-slate-500 font-medium">
        <span>{timeString}</span>
        <CheckCheck className="h-3 w-3 text-sky-500" />
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

// WhatsApp video note (round circle video)
function PreviewVideoNote({ src, timeString }: { src: string; timeString: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1 max-w-full">
      <div
        onClick={togglePlay}
        className="relative group cursor-pointer w-44 h-44 rounded-full overflow-hidden border-2 border-emerald-500/80 shadow-md bg-black flex items-center justify-center"
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          loop
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-cover"
        />
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center transition-opacity">
            <div className="h-11 w-11 rounded-full bg-white/90 text-emerald-700 flex items-center justify-center shadow-lg">
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          <Radio className="h-2.5 w-2.5 text-emerald-400 animate-pulse" />
          Vídeo Recado
        </div>
      </div>
      <div className="text-[9px] flex items-center gap-1 text-slate-500 font-medium pr-1">
        <span>{timeString}</span>
        <CheckCheck className="h-3 w-3 text-sky-500" />
      </div>
    </div>
  );
}

// Media Item representation
type FlowItem =
  | {
      id: string;
      kind: "event";
      type: "timer" | "tag" | "deal" | "trigger" | "action" | "condition" | "group";
      label: string;
      icon?: any;
    }
  | {
      id: string;
      kind: "message";
      msgType: "text" | "image" | "video" | "video_note" | "audio" | "document" | "poll";
      content?: string;
      url?: string;
      fileName?: string;
      pollOptions?: string[];
      timeString: string;
    };

export function WorkflowWhatsAppPreviewModal({
  open,
  onOpenChange,
  nodes,
  connections,
  workflowName = "Fluxo WhatsApp"
}: WorkflowWhatsAppPreviewModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Traverse the graph and order elements sequentially
  const flowItems = useMemo<FlowItem[]>(() => {
    if (!nodes || nodes.length === 0) return [];

    // Find trigger node or first node by coordinate X
    const triggerNode = nodes.find((n) => n.nodeType === "trigger");
    const startNode = triggerNode || [...nodes].sort((a, b) => (a.positionX || 0) - (b.positionX || 0))[0];

    // Build adjacency list for non-error connections
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) adjacency.set(node.id, []);

    // Prioritize default / standard connections
    for (const conn of connections) {
      if (conn.conditionPath === "error") continue;
      const targets = adjacency.get(conn.sourceNodeId) || [];
      targets.push(conn.targetNodeId);
      adjacency.set(conn.sourceNodeId, targets);
    }

    // Traverse starting from startNode (BFS/DFS ordered)
    const visited = new Set<string>();
    const orderedNodes: LocalNode[] = [];
    const queue: string[] = [startNode.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = nodes.find((n) => n.id === currentId);
      if (node) orderedNodes.push(node);

      const nextIds = adjacency.get(currentId) || [];
      for (const nextId of nextIds) {
        if (!visited.has(nextId)) queue.push(nextId);
      }
    }

    // Append any unconnected nodes sorted by positionX so no content is missed
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        orderedNodes.push(node);
        visited.add(node.id);
      }
    }

    // Now convert each node to FlowItems
    const items: FlowItem[] = [];
    let baseMinute = 30;

    for (const node of orderedNodes) {
      const timeStr = `14:${String(baseMinute % 60).padStart(2, "0")}`;
      baseMinute += 1;

      // 1. TRIGGER
      if (node.nodeType === "trigger") {
        const triggers = (node.config.triggers as any[]) || [];
        const label = triggers.length > 0
          ? (triggers[0].dataSource ? `Gatilho: ${triggers[0].dataSource}` : "Gatilho acionado")
          : "Gatilho: Início do Fluxo";

        items.push({
          id: `trig-${node.id}`,
          kind: "event",
          type: "trigger",
          label: label
        });
        continue;
      }

      // 2. DELAY / TIMER
      if (node.nodeType === "delay") {
        const normalized = normalizeDelayConfig(node.config);
        const delayLabel = formatDelayLabel(normalized.delayMs);
        items.push({
          id: `delay-${node.id}`,
          kind: "event",
          type: "timer",
          label: `Timer de ${delayLabel}`
        });
        continue;
      }

      // 3. ACTION (Tag, Deal, Lead, etc.)
      const isAction =
        node.nodeType === "action" ||
        node.nodeType === "tag_add" ||
        node.nodeType === "add_lead_tags" ||
        node.nodeType === "tag_remove" ||
        node.nodeType === "create_deal" ||
        node.nodeType === "move_deal_stage" ||
        node.nodeType === "deal_move" ||
        !!node.config.actionType;

      if (isAction) {
        const actType = (node.config.actionType as string) || node.nodeType;
        const params = (node.config.parameters as Record<string, any>) || node.config || {};

        if (actType === "add_lead_tags" || actType === "tag_add" || actType === "create_tag") {
          const tags = params.tags || params.tagNames || params.tagName;
          const tagStr = Array.isArray(tags) ? tags.join(", ") : tags ? String(tags) : "";
          items.push({
            id: `act-${node.id}`,
            kind: "event",
            type: "tag",
            label: tagStr ? `Tag adicionada: ${tagStr}` : "Tag adicionada"
          });
        } else if (actType === "remove_lead_tags" || actType === "tag_remove") {
          const tags = params.tags || params.tagNames;
          const tagStr = Array.isArray(tags) ? tags.join(", ") : tags ? String(tags) : "";
          items.push({
            id: `act-${node.id}`,
            kind: "event",
            type: "tag",
            label: tagStr ? `Tag removida: ${tagStr}` : "Tag removida"
          });
        } else if (actType === "move_deal_stage" || actType === "deal_move" || actType === "move_deal") {
          const stageName = params.stageName || params.stageTitle || "";
          items.push({
            id: `act-${node.id}`,
            kind: "event",
            type: "deal",
            label: stageName ? `Negócio movido: ${stageName}` : "Negócio movido"
          });
        } else if (actType === "create_deal" || actType === "deal_create") {
          const title = params.title || params.dealTitle || "";
          items.push({
            id: `act-${node.id}`,
            kind: "event",
            type: "deal",
            label: title ? `Negócio criado: ${title}` : "Negócio criado"
          });
        } else if (actType === "win_deal") {
          items.push({
            id: `act-${node.id}`,
            kind: "event",
            type: "deal",
            label: "Negócio marcado como Ganho"
          });
        } else if (actType === "lose_deal") {
          items.push({
            id: `act-${node.id}`,
            kind: "event",
            type: "deal",
            label: "Negócio marcado como Perdido"
          });
        } else {
          const def = getActionDefinition(actType);
          items.push({
            id: `act-${node.id}`,
            kind: "event",
            type: "action",
            label: def?.label || (node.config.label as string) || "Ação executada"
          });
        }
        continue;
      }

      // 4. GROUP MANAGEMENT
      if (node.nodeType === "group_management") {
        const actions = (node.config.actions as any[]) || [];
        const label = actions.length > 0 ? `Gestão de Grupo: ${actions[0].label || actions[0].type}` : "Gestão de Grupo";
        items.push({
          id: `grp-${node.id}`,
          kind: "event",
          type: "group",
          label: label
        });
        continue;
      }

      // 5. PHONE CALL OR URA
      if (node.nodeType === "phone_call" || node.nodeType === "ura") {
        items.push({
          id: `call-${node.id}`,
          kind: "event",
          type: "action",
          label: node.nodeType === "ura" ? "URA MOS BR executada" : "Ligação Call Panel iniciada"
        });
        continue;
      }

      // 6. CONTENT / MESSAGES
      if (node.nodeType === "content" || node.nodeType === "message") {
        const rawMessages = (node.config.messages as any[]) || [];

        if (rawMessages.length === 0) {
          // Check if single message is stored directly on config
          const text = (node.config.content as string) || (node.config.text as string) || "";
          const mediaUrl = (node.config.mediaUrl as string) || (node.config.url as string) || "";
          const type = (node.config.type as string) || (mediaUrl ? "image" : "text");

          if (text || mediaUrl) {
            items.push({
              id: `msg-${node.id}-direct`,
              kind: "message",
              msgType: (type as any) || "text",
              content: text,
              url: mediaUrl,
              timeString: timeStr
            });
          }
        } else {
          rawMessages.forEach((msg, idx) => {
            const mType = msg.type || "text";
            const textContent = msg.content || msg.body || msg.caption || msg.text || "";
            const mediaUrl = msg.url || msg.media_url || msg.mediaUrl || "";

            if (mType === "video_note" || mType === "video-note" || mType === "ptv") {
              items.push({
                id: `msg-${node.id}-${idx}`,
                kind: "message",
                msgType: "video_note",
                url: mediaUrl,
                content: textContent,
                timeString: timeStr
              });
            } else if (mType === "video") {
              items.push({
                id: `msg-${node.id}-${idx}`,
                kind: "message",
                msgType: "video",
                url: mediaUrl,
                content: textContent,
                timeString: timeStr
              });
            } else if (mType === "image") {
              items.push({
                id: `msg-${node.id}-${idx}`,
                kind: "message",
                msgType: "image",
                url: mediaUrl,
                content: textContent,
                timeString: timeStr
              });
            } else if (mType === "audio" || mType === "voice" || mType === "audio_ptt") {
              items.push({
                id: `msg-${node.id}-${idx}`,
                kind: "message",
                msgType: "audio",
                url: mediaUrl,
                content: textContent,
                timeString: timeStr
              });
            } else if (mType === "document" || mType === "file") {
              items.push({
                id: `msg-${node.id}-${idx}`,
                kind: "message",
                msgType: "document",
                url: mediaUrl,
                fileName: msg.fileName || textContent || "Documento Anexo",
                content: textContent,
                timeString: timeStr
              });
            } else if (mType === "poll") {
              const opts = Array.isArray(msg.options)
                ? msg.options.map((o: any) => (typeof o === "string" ? o : o.label || "Opção"))
                : [];
              items.push({
                id: `msg-${node.id}-${idx}`,
                kind: "message",
                msgType: "poll",
                content: msg.question || textContent || "Enquete",
                pollOptions: opts,
                timeString: timeStr
              });
            } else {
              items.push({
                id: `msg-${node.id}-${idx}`,
                kind: "message",
                msgType: "text",
                content: textContent || "Mensagem enviada",
                timeString: timeStr
              });
            }
          });
        }
      }
    }

    return items;
  }, [nodes, connections]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[440px] w-full p-0 bg-transparent border-none shadow-2xl overflow-hidden focus:outline-none">
          <DialogTitle className="sr-only">Visualizar Mensagens do Workflow</DialogTitle>
          <DialogDescription className="sr-only">
            Simulação interna do WhatsApp com mensagens e eventos disparados
          </DialogDescription>

          {/* Smartphone Frame Outer Shell */}
          <div className="relative mx-auto w-full max-w-[380px] sm:max-w-[410px] h-[780px] max-h-[88vh] bg-slate-900 rounded-[44px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-slate-700/60 flex flex-col select-none">
            
            {/* Top Speaker / Dynamic Island bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-800 rounded-full mr-2" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
            </div>

            {/* Inner Phone Screen */}
            <div className="relative w-full h-full bg-[#EFEAE2] rounded-[34px] overflow-hidden flex flex-col border border-slate-800 shadow-inner">
              
              {/* Status Bar */}
              <div className="h-7 w-full bg-[#075E54] text-white flex items-center justify-between px-6 pt-1 text-[11px] font-semibold shrink-0 z-20">
                <span>09:41</span>
                <div className="flex items-center gap-1.5 opacity-90">
                  <span className="text-[10px]">5G</span>
                  <div className="w-4 h-2 border border-white rounded-[2px] p-[1px] flex items-center">
                    <div className="w-full h-full bg-white rounded-[1px]" />
                  </div>
                </div>
              </div>

              {/* WhatsApp Chat Header */}
              <div className="bg-[#075E54] text-white px-3 py-2 flex items-center justify-between shadow-md shrink-0 z-20">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 border border-white/20 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                      {workflowName.charAt(0).toUpperCase() || "L"}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#075E54]" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold leading-tight truncate text-white max-w-[140px] sm:max-w-[180px]">
                      {workflowName || "Lead (Simulação)"}
                    </span>
                    <span className="text-[10px] text-emerald-200 leading-tight">online</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/90">
                  <Video className="h-4 w-4 cursor-pointer hover:opacity-80" />
                  <Phone className="h-3.5 w-3.5 cursor-pointer hover:opacity-80" />
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="p-1 hover:bg-white/10 rounded-full"
                    title="Fechar"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              {/* WhatsApp Messages Scrollable Body */}
              <div 
                className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#efeae2]"
                style={{
                  backgroundImage: `radial-gradient(#d3c9bf 0.85px, transparent 0.85px)`,
                  backgroundSize: "16px 16px"
                }}
              >
                {/* Security encryption pill banner */}
                <div className="flex justify-center my-1">
                  <span className="text-[9.5px] leading-tight text-amber-900/80 bg-amber-100/90 border border-amber-200/60 px-3 py-1.5 rounded-lg text-center max-w-[90%] shadow-sm">
                    🔒 Visualização rápida do fluxo. Nenhuma mensagem ou disparo real será executado.
                  </span>
                </div>

                {flowItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                    <Smartphone className="h-10 w-10 text-slate-400 mb-2 opacity-60" />
                    <p className="text-xs font-semibold text-slate-600">Nenhuma mensagem configurada</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Adicione blocos de mensagem ao fluxo para visualizá-los aqui.</p>
                  </div>
                )}

                {flowItems.map((item) => {
                  // SYSTEM EVENT PILL
                  if (item.kind === "event") {
                    const isTimer = item.type === "timer";
                    const isTag = item.type === "tag";
                    const isDeal = item.type === "deal";
                    const isTrigger = item.type === "trigger";

                    return (
                      <div key={item.id} className="flex justify-center my-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-semibold shadow-sm border",
                            isTimer && "bg-amber-100/95 border-amber-300 text-amber-900",
                            isTag && "bg-orange-100/95 border-orange-300 text-orange-900",
                            isDeal && "bg-blue-100/95 border-blue-300 text-blue-900",
                            isTrigger && "bg-purple-100/95 border-purple-300 text-purple-900",
                            !isTimer && !isTag && !isDeal && !isTrigger && "bg-slate-200/90 border-slate-300 text-slate-800"
                          )}
                        >
                          {isTimer && <Clock className="h-3 w-3 shrink-0 text-amber-600" />}
                          {isTag && <Tag className="h-3 w-3 shrink-0 text-orange-600" />}
                          {isDeal && <Briefcase className="h-3 w-3 shrink-0 text-blue-600" />}
                          {isTrigger && <Play className="h-3 w-3 shrink-0 text-purple-600" />}
                          <span>{item.label}</span>
                        </div>
                      </div>
                    );
                  }

                  // WHATSAPP OUTGOING MESSAGE (GREEN BALLOON)
                  return (
                    <div key={item.id} className="flex flex-col items-end w-full animate-in fade-in duration-200">
                      
                      {/* Audio message */}
                      {item.msgType === "audio" && (
                        <PreviewAudioPlayer src={item.url || ""} timeString={item.timeString} />
                      )}

                      {/* Video Note / PTV (Circular) */}
                      {item.msgType === "video_note" && (
                        <PreviewVideoNote src={item.url || ""} timeString={item.timeString} />
                      )}

                      {/* Standard Media or Text message balloon */}
                      {item.msgType !== "audio" && item.msgType !== "video_note" && (
                        <div className="bg-[#d9fdd3] text-slate-800 rounded-2xl rounded-tr-none shadow-sm p-2 max-w-[85%] border border-[#c1e8ba] relative">
                          
                          {/* Video */}
                          {item.msgType === "video" && (
                            <div className="space-y-1.5 mb-1">
                              {item.url ? (
                                <video
                                  src={item.url}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="w-full max-h-52 rounded-xl bg-black object-cover"
                                />
                              ) : (
                                <div className="h-28 w-full bg-slate-200/80 rounded-xl flex items-center justify-center text-slate-500 text-xs gap-1.5">
                                  <Video className="h-4 w-4" /> Vídeo sem link
                                </div>
                              )}
                            </div>
                          )}

                          {/* Image */}
                          {item.msgType === "image" && (
                            <div className="space-y-1.5 mb-1">
                              {item.url ? (
                                <div
                                  onClick={() => setSelectedImage(item.url || null)}
                                  className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200"
                                >
                                  <img
                                    src={item.url}
                                    alt="Mídia"
                                    className="w-full max-h-52 object-cover hover:scale-105 transition-transform duration-200"
                                  />
                                  <div className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Maximize2 className="h-3 w-3" />
                                  </div>
                                </div>
                              ) : (
                                <div className="h-28 w-full bg-slate-200/80 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                                  Imagem sem link
                                </div>
                              )}
                            </div>
                          )}

                          {/* Document */}
                          {item.msgType === "document" && (
                            <div className="flex items-center gap-2 p-2 bg-white/70 rounded-xl border border-emerald-300 mb-1">
                              <FileText className="h-6 w-6 text-emerald-700 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold truncate text-slate-800">{item.fileName || "Documento"}</p>
                                <span className="text-[10px] text-slate-500">Documento Anexo</span>
                              </div>
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 hover:bg-emerald-100 rounded text-emerald-700"
                                  title="Abrir arquivo"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Poll */}
                          {item.msgType === "poll" && (
                            <div className="space-y-2 p-2 bg-white/70 rounded-xl border border-emerald-300 mb-1">
                              <p className="text-xs font-bold text-slate-800">{item.content}</p>
                              <div className="space-y-1.5">
                                {(item.pollOptions || []).map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700">
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600" />
                                    <span className="truncate">{opt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Text Body */}
                          {item.content && item.msgType !== "poll" && (
                            <div className="text-xs leading-relaxed text-slate-800 break-words whitespace-pre-wrap px-0.5">
                              {parseInlineFormatting(item.content)}
                            </div>
                          )}

                          {/* Time & Read Receipts */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-500 font-medium">
                            <span>{item.timeString}</span>
                            <CheckCheck className="h-3 w-3 text-sky-500" />
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}

              </div>

              {/* WhatsApp Fake Input Footer */}
              <div className="p-2 bg-[#F0F2F5] border-t border-slate-200 flex items-center gap-1.5 shrink-0 z-20">
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center gap-2 border border-slate-200 shadow-sm">
                  <Smile className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-400 select-none flex-1 truncate">Mensagem</span>
                  <Paperclip className="h-4 w-4 text-slate-400 shrink-0 -rotate-45" />
                </div>
                <div className="w-8 h-8 rounded-full bg-[#00A884] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Mic className="h-4 w-4" />
                </div>
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-2xl bg-black/95 border-none p-2 shadow-2xl flex flex-col items-center justify-center">
            <DialogTitle className="sr-only">Visualizar Imagem Ampliada</DialogTitle>
            <img
              src={selectedImage}
              alt="Visualização"
              className="max-h-[80vh] w-auto object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
