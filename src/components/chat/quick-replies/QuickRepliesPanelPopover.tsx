import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import {
  QuickReply,
  QuickReplyContentType
} from "@/types/quickReplyTypes";
import { cn } from "@/lib/utils";
import {
  Zap, Search, MessageSquare, Image as ImageIcon, Video, Mic,
  Radio, FileText, Link2, Sparkles, TrendingUp, Layers
} from "lucide-react";

interface QuickRepliesPanelPopoverProps {
  onSelectReply: (reply: QuickReply) => void;
  disabled?: boolean;
}

export default function QuickRepliesPanelPopover({
  onSelectReply,
  disabled = false,
}: QuickRepliesPanelPopoverProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "by_group" | "most_used">("all");
  const [search, setSearch] = useState("");

  const { groups, quickReplies, isLoading } = useQuickReplies();

  const getTypeIcon = (type: QuickReplyContentType) => {
    switch (type) {
      case "image": return ImageIcon;
      case "video": return Video;
      case "audio": return Mic;
      case "video_note": return Radio;
      case "document": return FileText;
      case "link": return Link2;
      default: return MessageSquare;
    }
  };

  const getReplyPreview = (reply: QuickReply) => {
    const payload = reply.content_json?.content as any;
    if (!payload) return "";
    switch (reply.content_type) {
      case "text":
        return payload.text || "";
      case "image":
      case "video":
      case "document":
        return payload.caption || payload.fileName || payload.mediaUrl || "";
      case "audio":
        return payload.asVoice ? "Mensagem de voz" : "Áudio anexo";
      case "video_note":
        return "Vídeo Recado (PTV)";
      case "link":
        return payload.url || payload.text || "";
      default:
        return "";
    }
  };

  // Filter active replies
  const activeReplies = useMemo(() => {
    return quickReplies.filter(r => r.active);
  }, [quickReplies]);

  // Filtered by search
  const filteredReplies = useMemo(() => {
    let list = [...activeReplies];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.shortcut.toLowerCase().includes(q) ||
        r.normalized_shortcut.includes(q) ||
        getReplyPreview(r).toLowerCase().includes(q)
      );
    }

    if (activeTab === "most_used") {
      list.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    } else {
      list.sort((a, b) => a.position - b.position);
    }

    return list;
  }, [activeReplies, search, activeTab]);

  // Grouped structure
  const groupedData = useMemo(() => {
    if (activeTab !== "by_group") return [];
    
    const result: Array<{ groupName: string; groupColor: string; replies: QuickReply[] }> = [];

    groups.forEach(g => {
      const replies = filteredReplies.filter(r => r.group_id === g.id);
      if (replies.length > 0) {
        result.push({ groupName: g.name, groupColor: g.color || "#10B981", replies });
      }
    });

    const ungrouped = filteredReplies.filter(r => !r.group_id);
    if (ungrouped.length > 0) {
      result.push({ groupName: "Sem grupo", groupColor: "#6B7280", replies: ungrouped });
    }

    return result;
  }, [groups, filteredReplies, activeTab]);

  const handleSelect = (reply: QuickReply) => {
    onSelectReply(reply);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          title="Respostas Rápidas (⚡)"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 mb-0.5 rounded-xl cursor-pointer transition-colors"
        >
          <Zap className="h-4.5 w-4.5 fill-amber-500/20 text-amber-500" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-80 p-0 bg-popover/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl z-[9990] overflow-hidden"
      >
        {/* Header Tabs */}
        <div className="p-3 border-b border-border/40 bg-card/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/30" /> Respostas Rápidas
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Use / no chat</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-muted/40 p-0.5 rounded-xl text-[11px] font-semibold border border-border/30">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex-1 py-1 rounded-lg transition-all",
                activeTab === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tudo
            </button>
            <button
              onClick={() => setActiveTab("by_group")}
              className={cn(
                "flex-1 py-1 rounded-lg transition-all",
                activeTab === "by_group"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Por grupo
            </button>
            <button
              onClick={() => setActiveTab("most_used")}
              className={cn(
                "flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1",
                activeTab === "most_used"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="h-3 w-3" /> Mais usadas
            </button>
          </div>

          {/* Search input */}
          <div className="relative pt-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar atalho ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-[11px] rounded-xl bg-background/60 border-border/40"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="max-h-64 overflow-y-auto divide-y divide-border/20 p-1">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Carregando...
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground/60 space-y-1">
              <Sparkles className="h-6 w-6 opacity-30 mx-auto text-primary" />
              <p>Nenhuma resposta rápida encontrada</p>
            </div>
          ) : activeTab === "by_group" ? (
            groupedData.map((g) => (
              <div key={g.groupName} className="p-1 space-y-1">
                <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.groupColor }} />
                  {g.groupName}
                </div>
                {g.replies.map((reply) => {
                  const IconComp = getTypeIcon(reply.content_type);
                  const groupObj = groups.find(grp => grp.id === reply.group_id);
                  const accentColor = groupObj?.color || "#10B981";

                  return (
                    <div
                      key={reply.id}
                      onClick={() => handleSelect(reply)}
                      className="p-2 rounded-xl hover:bg-primary/10 cursor-pointer transition-colors flex items-start gap-2.5 group"
                    >
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        <IconComp className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-1">
                          <span className="font-bold text-xs text-foreground truncate">
                            {reply.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-primary">
                            /{reply.shortcut}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {getReplyPreview(reply)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            filteredReplies.map((reply) => {
              const IconComp = getTypeIcon(reply.content_type);
              const groupObj = groups.find(g => g.id === reply.group_id);
              const accentColor = groupObj?.color || "#10B981";

              return (
                <div
                  key={reply.id}
                  onClick={() => handleSelect(reply)}
                  className="p-2.5 rounded-xl hover:bg-primary/10 cursor-pointer transition-colors flex items-start gap-2.5 group"
                >
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-bold text-xs text-foreground truncate">
                        {reply.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                        /{reply.shortcut}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate leading-snug">
                      {getReplyPreview(reply)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
