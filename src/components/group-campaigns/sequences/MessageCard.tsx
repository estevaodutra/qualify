import { cn } from "@/lib/utils";
import { LocalNode } from "@/components/sequences/shared-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal, Pencil, Copy, Pause, Play, ArrowUp, ArrowDown, Trash2,
  MessageSquare, Image, Video, Music, FileText, Smile,
  BarChart3, MousePointerClick, List, MapPin, Contact, Calendar, Zap, History,
} from "lucide-react";

export type MessageStatus = "scheduled" | "today" | "sent" | "error" | "paused";

interface MessageCardProps {
  node: LocalNode;
  status: MessageStatus;
  errorMessage?: string | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onTogglePause: () => void;
  onExecute?: () => void;
  onViewLogs?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  message: { label: "Mensagem de Texto", icon: MessageSquare },
  image: { label: "Imagem", icon: Image },
  video: { label: "Vídeo", icon: Video },
  audio: { label: "Áudio", icon: Music },
  document: { label: "Documento", icon: FileText },
  sticker: { label: "Figurinha", icon: Smile },
  poll: { label: "Enquete", icon: BarChart3 },
  buttons: { label: "Botões", icon: MousePointerClick },
  list: { label: "Lista", icon: List },
  location: { label: "Localização", icon: MapPin },
  contact: { label: "Contato", icon: Contact },
  event: { label: "Evento", icon: Calendar },
};

const STATUS_STYLES: Record<MessageStatus, { border: string; headerBg: string; dot: string }> = {
  scheduled: { border: "border-border", headerBg: "bg-muted", dot: "bg-muted-foreground/40" },
  today: { border: "border-warning", headerBg: "bg-warning/15", dot: "bg-warning" },
  sent: { border: "border-success", headerBg: "bg-success/15", dot: "bg-success" },
  error: { border: "border-destructive", headerBg: "bg-destructive/15", dot: "bg-destructive" },
  paused: { border: "border-muted-foreground/50", headerBg: "bg-muted-foreground/10", dot: "bg-muted-foreground" },
};

function getScheduleLabel(node: LocalNode): { prefix: string; dateStr: string } {
  const schedule = node.config.schedule as Record<string, unknown> | undefined;
  if (!schedule?.enabled) return { prefix: "Sem agendamento", dateStr: "" };

  const scheduleType = (schedule.scheduleType as string) || "recurring";

  if (scheduleType === "fixed") {
    const d = schedule.fixedDate as string;
    const t = schedule.fixedTime as string;
    if (d && t) {
      const [y, m, day] = d.split("-");
      return { prefix: "Programado para:", dateStr: `${day}/${m}/${y} - ${t}` };
    }
    return { prefix: "Programado para:", dateStr: "Data não definida" };
  }

  if (scheduleType === "delay") {
    const v = schedule.delayValue as number || 0;
    const u = schedule.delayUnit as string || "days";
    const t = schedule.delayTime as string || "";
    const unitLabel = u === "minutes" ? "min" : u === "hours" ? "h" : "dias";
    return { prefix: "Delay:", dateStr: `${v} ${unitLabel}${t ? ` às ${t}` : ""}` };
  }

  // recurring
  const days = (schedule.days as number[]) || [];
  const times = (schedule.times as string[]) || [];
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const dayStr = days.map(d => dayLabels[d]).join(", ") || "—";
  const timeStr = times.join(", ") || "—";
  return { prefix: "Recorrente:", dateStr: `${dayStr} · ${timeStr}` };
}

function getContentPreview(node: LocalNode): string {
  const c = node.config;
  switch (node.nodeType) {
    case "message": return (c.content as string) || "";
    case "image":
    case "video":
    case "document": return (c.caption as string) || (c.filename as string) || (c.url as string) || "";
    case "audio": return (c.url as string) || "Áudio";
    case "poll": {
      const q = (c.question as string) || "";
      const opts = (c.options as string[]) || [];
      return q + (opts.length ? `\n${opts.filter(Boolean).map(o => `○ ${o}`).join("\n")}` : "");
    }
    case "buttons": return (c.text as string) || "";
    case "list": return (c.title as string) || "";
    case "location": return (c.name as string) || (c.address as string) || "Localização";
    case "contact": return (c.fullName as string) || (c.phone as string) || "Contato";
    case "event": return (c.name as string) || "Evento";
    default: return "";
  }
}

export function MessageCard({
  node, status, errorMessage,
  onEdit, onDuplicate, onTogglePause, onExecute, onViewLogs, onMoveUp, onMoveDown, onDelete,
  isFirst, isLast,
}: MessageCardProps) {
  const meta = TYPE_META[node.nodeType] || TYPE_META.message;
  const Icon = meta.icon;
  const styles = STATUS_STYLES[status];
  const { prefix, dateStr } = getScheduleLabel(node);
  const preview = getContentPreview(node);
  const isPaused = status === "paused";
  const customLabel = node.config.label as string;

  return (
    <div className={cn("w-72 rounded-lg border shadow-sm shrink-0 transition-colors", styles.border)}>
      {/* Header */}
      <div className={cn("px-3 py-2 rounded-t-lg flex justify-between items-start gap-2", styles.headerBg)}>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{prefix}</p>
          <p className="text-sm font-semibold text-foreground truncate">{dateStr || "—"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-3.5 w-3.5" /> Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={onTogglePause}>
              {isPaused ? <Play className="mr-2 h-3.5 w-3.5" /> : <Pause className="mr-2 h-3.5 w-3.5" />}
              {isPaused ? "Ativar" : "Pausar"}
            </DropdownMenuItem>
            {onExecute && (
              <DropdownMenuItem onClick={onExecute} className="text-primary focus:text-primary">
                <Zap className="mr-2 h-3.5 w-3.5" /> Executar agora
              </DropdownMenuItem>
            )}
            {onViewLogs && (
              <DropdownMenuItem onClick={onViewLogs}>
                <History className="mr-2 h-3.5 w-3.5" /> Ver logs
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {!isFirst && <DropdownMenuItem onClick={onMoveUp}><ArrowUp className="mr-2 h-3.5 w-3.5" /> Mover para cima</DropdownMenuItem>}
            {!isLast && <DropdownMenuItem onClick={onMoveDown}><ArrowDown className="mr-2 h-3.5 w-3.5" /> Mover para baixo</DropdownMenuItem>}
            {(!isFirst || !isLast) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-foreground">{customLabel || meta.label}</span>
        </div>
        {preview && (
          <p className="text-xs text-muted-foreground line-clamp-5 whitespace-pre-wrap break-words">
            {preview}
          </p>
        )}
      </div>

      {/* Error */}
      {status === "error" && errorMessage && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-destructive">⚠️ {errorMessage}</p>
        </div>
      )}
    </div>
  );
}

export { TYPE_META, STATUS_STYLES, getScheduleLabel };
