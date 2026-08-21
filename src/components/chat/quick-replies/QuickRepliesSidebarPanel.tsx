import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import {
  QuickReply,
  QuickReplyGroup,
  QuickReplyContentType
} from "@/types/quickReplyTypes";
import { cn } from "@/lib/utils";
import {
  Search, Zap, MessageSquare, Image as ImageIcon, Video, Mic,
  Radio, FileText, Link2, ChevronDown, ChevronRight, TrendingUp,
  Sparkles, Settings
} from "lucide-react";
import QuickRepliesManagerModal from "./QuickRepliesManagerModal";

interface QuickRepliesSidebarPanelProps {
  onSelectReply: (reply: QuickReply) => void;
  className?: string;
}

export default function QuickRepliesSidebarPanel({
  onSelectReply,
  className,
}: QuickRepliesSidebarPanelProps) {
  const { groups, quickReplies, isLoading } = useQuickReplies();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "by_group" | "most_used">("all");
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroupIds(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

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

  // Map active groups
  const activeGroupsMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    groups.forEach(g => {
      map[g.id] = g.active !== false;
    });
    return map;
  }, [groups]);

  // Active groups list
  const activeGroups = useMemo(() => {
    return groups.filter(g => g.active !== false);
  }, [groups]);

  // Filter active replies (reply itself must be active AND if in a group, group must be active)
  const activeReplies = useMemo(() => {
    return quickReplies.filter(r => {
      if (r.active === false) return false;
      if (r.group_id && activeGroupsMap[r.group_id] === false) return false;
      return true;
    });
  }, [quickReplies, activeGroupsMap]);

  // Filtered replies by search and tab
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

  // Grouped structure (only showing active groups)
  const groupedData = useMemo(() => {
    const result: Array<{ group: QuickReplyGroup | null; replies: QuickReply[] }> = [];

    activeGroups.forEach(g => {
      const replies = filteredReplies.filter(r => r.group_id === g.id);
      result.push({ group: g, replies });
    });

    const ungrouped = filteredReplies.filter(r => !r.group_id);
    if (ungrouped.length > 0 || activeGroups.length === 0) {
      result.push({ group: null, replies: ungrouped });
    }

    return result;
  }, [activeGroups, filteredReplies]);

  return (
    <div className={cn("w-[340px] shrink-0 border-l border-border/40 bg-card/20 flex flex-col h-full overflow-hidden select-none", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/20 space-y-3 shrink-0 bg-background/30 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/10 p-1.5 rounded-xl border border-amber-500/20 text-amber-500">
              <Zap className="h-4 w-4 fill-amber-500/30" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-card-foreground leading-none">Respostas Rápidas</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Clique para usar no chat</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsManagerOpen(true)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl"
            title="Gerenciar Respostas Rápidas"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar atalho ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs rounded-xl border-border/40 bg-background/60 focus:bg-background"
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-muted/40 p-0.5 rounded-xl text-[11px] font-semibold border border-border/30">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex-1 py-1 rounded-lg transition-all",
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm font-bold"
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
                ? "bg-background text-foreground shadow-sm font-bold"
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
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-3 w-3 text-amber-500" /> Mais usadas
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Carregando respostas rápidas...
          </div>
        ) : filteredReplies.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-muted-foreground/60">
            <Sparkles className="h-8 w-8 mx-auto opacity-30 text-primary" />
            <p className="text-xs font-semibold">Nenhuma resposta encontrada</p>
            <p className="text-[10px] text-muted-foreground">Tente outro termo de busca.</p>
          </div>
        ) : activeTab === "by_group" || activeTab === "all" ? (
          groupedData.map(({ group, replies }) => {
            if (replies.length === 0) return null;
            const groupId = group ? group.id : "ungrouped";
            const isCollapsed = collapsedGroupIds[groupId];
            const accentColor = group?.color || "#10B981";

            return (
              <div key={groupId} className="space-y-2">
                {/* Group Accordion Header */}
                <button
                  onClick={() => toggleGroupCollapse(groupId)}
                  className="w-full flex items-center justify-between p-1.5 px-2 rounded-xl hover:bg-muted/30 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="font-bold text-xs text-foreground truncate">
                      {group ? group.name : "Sem grupo"}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-bold rounded-full">
                    {replies.length}
                  </Badge>
                </button>

                {/* Group Replies */}
                {!isCollapsed && (
                  <div className="space-y-1.5 pl-3">
                    {replies.map(reply => {
                      const IconComp = getTypeIcon(reply.content_type);
                      const preview = getReplyPreview(reply);

                      return (
                        <div
                          key={reply.id}
                          onClick={() => onSelectReply(reply)}
                          className="p-2.5 bg-background/70 hover:bg-primary/10 border border-border/30 hover:border-primary/40 rounded-2xl flex items-start gap-2.5 cursor-pointer transition-all duration-200 shadow-sm group"
                        >
                          <div
                            className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm transition-transform group-hover:scale-105"
                            style={{
                              backgroundColor: `${accentColor}18`,
                              color: accentColor,
                              border: `1px solid ${accentColor}30`
                            }}
                          >
                            <IconComp className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-1">
                              <span className="font-bold text-xs text-foreground truncate">
                                {reply.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded shrink-0">
                                /{reply.shortcut}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate leading-snug mt-0.5">
                              {preview || "Sem conteúdo textual"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Most Used Flat List */
          <div className="space-y-1.5">
            {filteredReplies.map(reply => {
              const IconComp = getTypeIcon(reply.content_type);
              const preview = getReplyPreview(reply);
              const groupObj = groups.find(g => g.id === reply.group_id);
              const accentColor = groupObj?.color || "#10B981";

              return (
                <div
                  key={reply.id}
                  onClick={() => onSelectReply(reply)}
                  className="p-2.5 bg-background/70 hover:bg-primary/10 border border-border/30 hover:border-primary/40 rounded-2xl flex items-start gap-2.5 cursor-pointer transition-all duration-200 shadow-sm group"
                >
                  <div
                    className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm"
                    style={{
                      backgroundColor: `${accentColor}18`,
                      color: accentColor,
                      border: `1px solid ${accentColor}30`
                    }}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-bold text-xs text-foreground truncate">
                        {reply.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded shrink-0">
                        /{reply.shortcut}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate leading-snug mt-0.5">
                      {preview || "Sem conteúdo textual"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Replies Management Modal */}
      <QuickRepliesManagerModal
        open={isManagerOpen}
        onOpenChange={setIsManagerOpen}
      />
    </div>
  );
}
