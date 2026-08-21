import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import {
  QuickReplyGroup,
  QuickReply,
  QuickReplyContentType
} from "@/types/quickReplyTypes";
import GroupEditorDialog from "./GroupEditorDialog";
import DeleteGroupConfirmDialog from "./DeleteGroupConfirmDialog";
import QuickReplyEditorModal from "./QuickReplyEditorModal";
import { cn } from "@/lib/utils";
import {
  Search, Plus, FolderPlus, MessageSquare, Image as ImageIcon, Video, Mic,
  Radio, FileText, Link2, ChevronDown, ChevronRight, Edit2, Copy, Trash2,
  GripVertical, Sparkles, Folder, Layers
} from "lucide-react";

interface QuickRepliesManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickRepliesManagerModal({
  open,
  onOpenChange,
}: QuickRepliesManagerModalProps) {
  const {
    groups,
    quickReplies,
    isLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    createQuickReply,
    updateQuickReply,
    duplicateQuickReply,
    deleteQuickReply,
  } = useQuickReplies();

  // Search state
  const [search, setSearch] = useState("");

  // Collapsed groups local state
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});

  // Dialog States
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<QuickReplyGroup | null>(null);

  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<QuickReplyGroup | null>(null);

  const [isReplyEditorOpen, setIsReplyEditorOpen] = useState(false);
  const [replyToEdit, setReplyToEdit] = useState<QuickReply | null>(null);

  // Toggle Collapse
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroupIds(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Type Icon Resolver
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

  // Helper for text preview
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

  // Filtered Replies & Groups
  const filteredReplies = useMemo(() => {
    if (!search.trim()) return quickReplies;
    const q = search.toLowerCase();
    return quickReplies.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.shortcut.toLowerCase().includes(q) ||
      r.normalized_shortcut.includes(q) ||
      getReplyPreview(r).toLowerCase().includes(q)
    );
  }, [quickReplies, search]);

  // Grouped structure
  const groupedData = useMemo(() => {
    const result: Array<{ group: QuickReplyGroup | null; replies: QuickReply[] }> = [];

    // Registered groups
    groups.forEach(group => {
      const replies = filteredReplies.filter(r => r.group_id === group.id);
      result.push({ group, replies });
    });

    // Sem grupo
    const ungroupedReplies = filteredReplies.filter(r => !r.group_id);
    if (ungroupedReplies.length > 0 || groups.length === 0) {
      result.push({ group: null, replies: ungroupedReplies });
    }

    return result;
  }, [groups, filteredReplies]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 bg-card/95 backdrop-blur-2xl border border-border/60 rounded-3xl shadow-2xl z-[9990] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border/40 bg-card/40 flex justify-between items-center shrink-0">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Respostas Rápidas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie e gerencie conteúdos reutilizáveis multimídia para o Chat.
            </DialogDescription>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGroupToEdit(null);
                setIsGroupEditorOpen(true);
              }}
              className="rounded-xl text-xs font-semibold h-9 gap-1.5"
            >
              <FolderPlus className="h-4 w-4 text-primary" /> Novo grupo
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setReplyToEdit(null);
                setIsReplyEditorOpen(true);
              }}
              className="rounded-xl text-xs font-bold h-9 gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
            >
              <Plus className="h-4 w-4" /> Nova resposta
            </Button>
          </div>
        </div>

        {/* Toolbar Search */}
        <div className="p-4 border-b border-border/40 bg-card/10 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, atalho (/sinal), conteúdo ou grupo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 text-xs rounded-xl bg-background/60 border-border/50 focus:bg-background"
            />
          </div>
        </div>

        {/* List Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando respostas rápidas...
            </div>
          ) : groupedData.every(g => g.replies.length === 0) && groups.length === 0 ? (
            <div className="py-16 text-center space-y-3 text-muted-foreground/60">
              <Layers className="h-12 w-12 mx-auto opacity-30 text-primary" />
              <p className="text-sm font-semibold">Nenhuma resposta rápida cadastrada</p>
              <p className="text-xs max-w-sm mx-auto">
                Crie respostas reutilizáveis com texto, imagens, vídeos, áudios, PTVs, documentos e links para agilizar seus atendimentos.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setReplyToEdit(null);
                  setIsReplyEditorOpen(true);
                }}
                className="rounded-xl text-xs font-bold mt-2"
              >
                + Criar Primeira Resposta
              </Button>
            </div>
          ) : (
            groupedData.map(({ group, replies }) => {
              const groupId = group ? group.id : "ungrouped";
              const isCollapsed = collapsedGroupIds[groupId];
              const accentColor = group?.color || "#10B981";

              return (
                <div
                  key={groupId}
                  className="space-y-3 bg-card/20 border border-border/30 rounded-2xl p-3"
                >
                  {/* Group Header Bar */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleGroupCollapse(groupId)}
                      className="flex items-center gap-2 hover:bg-muted/40 p-1.5 rounded-xl transition-colors text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}

                      <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: accentColor }}
                      />

                      <span className="font-bold text-sm text-foreground">
                        {group ? group.name : "Sem grupo"}
                      </span>

                      <Badge
                        variant="secondary"
                        className="text-[10px] h-5 px-1.5 font-bold rounded-full ml-1"
                      >
                        {replies.length}
                      </Badge>
                    </button>

                    {/* Group actions */}
                    {group && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setGroupToEdit(group);
                            setIsGroupEditorOpen(true);
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                          title="Editar Grupo"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setGroupToDelete(group);
                            setIsDeleteGroupOpen(true);
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                          title="Excluir Grupo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Group Replies List */}
                  {!isCollapsed && (
                    <div className="space-y-2 pl-2">
                      {replies.length === 0 ? (
                        <div className="p-3 text-center text-[11px] text-muted-foreground/60 italic bg-muted/20 rounded-xl">
                          Nenhuma resposta neste grupo
                        </div>
                      ) : (
                        replies.map((reply) => {
                          const IconComp = getTypeIcon(reply.content_type);
                          const preview = getReplyPreview(reply);

                          return (
                            <div
                              key={reply.id}
                              className="p-3 bg-background/80 hover:bg-background border border-border/40 rounded-2xl flex items-center justify-between gap-3 shadow-sm transition-all duration-200 group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab shrink-0" />

                                {/* Type Icon styled with Group Accent Color */}
                                <div
                                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                                  style={{
                                    backgroundColor: `${accentColor}15`,
                                    color: accentColor,
                                    border: `1px solid ${accentColor}30`,
                                  }}
                                >
                                  <IconComp className="h-4.5 w-4.5" />
                                </div>

                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-foreground truncate">
                                      {reply.name}
                                    </span>
                                    <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
                                      /{reply.shortcut}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate leading-snug">
                                    {preview || "Sem conteúdo textual"}
                                  </p>
                                </div>
                              </div>

                              {/* Card Action Buttons */}
                              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => duplicateQuickReply(reply.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                                  title="Duplicar"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setReplyToEdit(reply);
                                    setIsReplyEditorOpen(true);
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                                  title="Editar"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteQuickReply(reply.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Child Dialogs */}
        <GroupEditorDialog
          open={isGroupEditorOpen}
          onOpenChange={setIsGroupEditorOpen}
          groupToEdit={groupToEdit}
          onSave={async (data) => {
            if (groupToEdit) {
              await updateGroup({ id: groupToEdit.id, ...data });
            } else {
              await createGroup(data);
            }
          }}
        />

        <DeleteGroupConfirmDialog
          open={isDeleteGroupOpen}
          onOpenChange={setIsDeleteGroupOpen}
          groupToDelete={groupToDelete}
          otherGroups={groups.filter(g => g.id !== groupToDelete?.id)}
          replyCount={quickReplies.filter(r => r.group_id === groupToDelete?.id).length}
          onConfirmDelete={async (targetGroupId) => {
            if (groupToDelete) {
              await deleteGroup({ id: groupToDelete.id, targetGroupId });
            }
          }}
        />

        <QuickReplyEditorModal
          open={isReplyEditorOpen}
          onOpenChange={setIsReplyEditorOpen}
          replyToEdit={replyToEdit}
          groups={groups}
          onSave={async (data) => {
            if (replyToEdit) {
              await updateQuickReply({ id: replyToEdit.id, ...data });
            } else {
              await createQuickReply(data);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
