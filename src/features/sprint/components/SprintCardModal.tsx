import { SprintCardTagPopover } from "./SprintCardTagPopover";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSprintStore } from "../state/sprintStore";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckSquare,
  Pencil,
  Clock,
  Tag,
  Users,
  Trash2,
  Plus,
  MessageSquare,
  FileText,
  StickyNote,
  AlignLeft,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SprintMentionInput } from "./SprintMentionInput";
import { SprintMentionTextarea } from "./SprintMentionTextarea";
import { SprintChecklistItem } from "../types";
import { SprintMentionRenderer } from "./SprintMentionRenderer";
import { extractMentionedUserIds } from "../utils/mentionExtractor";
import { notifySprintCardMention } from "@/services/notificationService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";


interface ChecklistTitleEditorProps {
  title: string;
  onSave: (newTitle: string) => void;
}

const ChecklistTitleEditor: React.FC<ChecklistTitleEditorProps> = ({ title, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(title);

  useEffect(() => {
    setVal(title);
  }, [title]);

  const handleCommit = () => {
    setIsEditing(false);
    if (val.trim() && val.trim() !== title) {
      onSave(val.trim());
    } else {
      setVal(title);
    }
  };

  if (isEditing) {
    return (
      <div className="w-full max-w-sm">
        <SprintMentionInput
          value={val}
          onChange={setVal}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCommit();
            }
            if (e.key === "Escape") {
              setIsEditing(false);
              setVal(title);
            }
          }}
          autoFocus
          className="font-semibold text-sm bg-background border border-primary px-2 py-0.5 rounded text-foreground focus:outline-none ring-1 ring-primary w-full"
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 -ml-1.5 hover:bg-muted/80 transition-colors"
      title="Clique para editar o título com menção (@)"
    >
      <SprintMentionRenderer text={title} className="font-semibold text-sm text-foreground" />
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const ChecklistItemRow: React.FC<{
  item: SprintChecklistItem;
  checklistId: string;
  cardId: string;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateTitle: (newTitle: string) => void;
}> = ({ item, checklistId, cardId, onToggle, onDelete, onUpdateTitle }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.title);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(item.notes || "");
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const {
    updateChecklistItemNotes,
    addChecklistItemComment,
    deleteChecklistItemComment,
    autoAssignMemberMention,
  } = useSprintStore();
  const { user } = useAuth();
  const { members = [] } = useCompanyMembers();

  useEffect(() => {
    setEditText(item.title);
  }, [item.title]);

  useEffect(() => {
    setNotesText(item.notes || "");
  }, [item.notes]);

  const handleSave = () => {
    setIsEditing(false);
    if (editText.trim() && editText.trim() !== item.title) {
      onUpdateTitle(editText.trim());
    } else {
      setEditText(item.title);
    }
  };

  const handleSaveNotes = async () => {
    await updateChecklistItemNotes(checklistId, item.id, notesText.trim() || null);
    setIsEditingNotes(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isSubmittingComment) return;
    try {
      setIsSubmittingComment(true);
      await addChecklistItemComment(checklistId, item.id, cardId, commentInput.trim());
      setCommentInput("");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const commentsCount = item.comments?.length || item.comments_count || 0;
  const hasInfo = commentsCount > 0 || !!item.notes;

  return (
    <div className="space-y-1">
      <div className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={item.is_completed}
            onChange={onToggle}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
          />

          {isEditing ? (
            <div className="flex-1 min-w-0">
              <SprintMentionInput
                value={editText}
                onChange={setEditText}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditText(item.title);
                  }
                }}
                autoFocus
                className="text-sm bg-background border border-primary px-2 py-1 rounded w-full"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                onClick={() => setIsEditing(true)}
                className="flex-1 min-w-0 cursor-pointer"
                title="Clique para editar item com menções (@)"
              >
                <SprintMentionRenderer
                  text={item.title}
                  isCompleted={item.is_completed}
                  className={cn(
                    "text-sm break-words",
                    item.is_completed ? "line-through text-muted-foreground" : "text-foreground"
                  )}
                />
              </div>

              {/* Indicador de Notas / Comentários na Atividade */}
              {hasInfo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailsOpen((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors shrink-0 cursor-pointer"
                  title="Ver notas e comentários desta atividade"
                >
                  <MessageSquare className="h-2.5 w-2.5" />
                  {commentsCount > 0 ? (
                    <span>{commentsCount}</span>
                  ) : (
                    <span>Nota</span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação na Atividade */}
        <div className="flex items-center gap-0.5">
          {/* Botão de Comentar / Nota */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 transition-all",
              hasInfo || isDetailsOpen
                ? "opacity-100 text-primary bg-primary/10"
                : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            title="Comentar ou adicionar nota nesta atividade"
          >
            <MessageSquare className="h-3 w-3" />
          </Button>

          {/* Botão Editar Item */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
            onClick={() => setIsEditing(true)}
            title="Editar item com menção (@)"
          >
            <Pencil className="h-3 w-3" />
          </Button>

          {/* Botão Excluir Item */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            onClick={onDelete}
            title="Excluir item"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Painel Expansível de Detalhes / Comentários da Atividade */}
      {isDetailsOpen && (
        <div className="ml-6 pl-3 border-l-2 border-primary/40 my-1.5 space-y-3 bg-muted/15 rounded-r-xl p-3 border border-border/50 animate-in fade-in-50 duration-150">
          {/* Seção: Informações / Nota da Atividade */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <StickyNote className="h-3 w-3 text-primary" />
                <span>Nota / Informações da Atividade</span>
              </span>
              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-[11px] text-primary hover:underline font-normal cursor-pointer"
                >
                  {item.notes ? "Editar nota" : "+ Adicionar nota"}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <SprintMentionTextarea
                  value={notesText}
                  onChange={setNotesText}
                  minHeight={65}
                  showToolbar={true}
                  placeholder="Instruções detalhadas, links, notas sobre a atividade... (use @, *negrito*, _itálico_)"
                  onMentionSelected={(m) => {
                    autoAssignMemberMention(cardId, {
                      user_id: m.user_id,
                      full_name: m.full_name || undefined,
                      email: m.email || undefined,
                    });
                  }}
                />
                <div className="flex items-center gap-1.5">
                  <Button size="sm" className="h-7 text-xs px-3" onClick={handleSaveNotes}>
                    Salvar Nota
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setNotesText(item.notes || "");
                      setIsEditingNotes(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : item.notes ? (
              <div
                onClick={() => setIsEditingNotes(true)}
                className="p-2.5 rounded-lg bg-background border border-border/80 text-xs text-foreground cursor-pointer hover:border-primary/50 transition-colors"
                title="Clique para editar a nota"
              >
                <SprintMentionRenderer text={item.notes} />
              </div>
            ) : (
              <div
                onClick={() => setIsEditingNotes(true)}
                className="p-2 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground italic cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors"
              >
                Nenhuma nota adicionada. Clique para acrescentar informações ou observações a esta tarefa.
              </div>
            )}
          </div>

          {/* Seção: Comentários nesta atividade */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3 text-primary" />
                <span>Comentários ({commentsCount})</span>
              </span>
            </div>

            {/* Lista de comentários da atividade */}
            {(item.comments || []).length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {item.comments?.map((comment) => {
                  const author = members.find((m) => m.user_id === comment.user_id);
                  const authorName = author?.full_name || author?.email || "Usuário";
                  return (
                    <div
                      key={comment.id}
                      className="flex gap-2 text-xs bg-background p-2 rounded-lg border border-border/70 shadow-2xs"
                    >
                      <Avatar className="h-5 w-5 mt-0.5 shrink-0">
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-bold text-[8px]">
                          {authorName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-foreground text-[11px] truncate">
                            {authorName}
                          </span>
                          <span className="text-[9px] text-muted-foreground shrink-0">
                            {format(new Date(comment.created_at), "dd/MM HH:mm")}
                          </span>
                        </div>
                        <div className="text-[11px] text-foreground leading-normal">
                          <SprintMentionRenderer text={comment.content} />
                        </div>
                        {user?.id === comment.user_id && (
                          <div className="mt-1 text-right">
                            <button
                              type="button"
                              onClick={() => deleteChecklistItemComment(checklistId, item.id, comment.id)}
                              className="text-[9px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input para adicionar comentário */}
            <form onSubmit={handleAddComment} className="flex items-center gap-1.5 pt-0.5">
              <SprintMentionInput
                value={commentInput}
                onChange={setCommentInput}
                placeholder="Comentar nesta atividade... (use @ para citar)"
                className="h-7 text-xs bg-background flex-1"
                onMentionSelected={(m) => {
                  autoAssignMemberMention(cardId, {
                    user_id: m.user_id,
                    full_name: m.full_name || undefined,
                    email: m.email || undefined,
                  });
                }}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentInput.trim() || isSubmittingComment}
                className="h-7 px-2.5 text-xs shrink-0"
              >
                {isSubmittingComment ? "Enviando..." : "Comentar"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const SprintCardModal: React.FC = () => {
  const { user } = useAuth();
  const { members = [] } = useCompanyMembers();
  const {
    activeCard,
    activeCardId,
    closeCardModal,
    lists,
    labels,
    updateCard,
    archiveCard,
    cardComments,
    addComment,
    deleteComment,
    addChecklist,
    deleteChecklist,
    updateChecklistTitle,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    updateChecklistItemTitle,
    toggleCardLabel,
    toggleCardMember,
    autoAssignMemberMention,
  } = useSprintStore();

  const [title, setTitle] = useState(activeCard?.title || "");
  const [description, setDescription] = useState(activeCard?.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [mentionedChecklistMembers, setMentionedChecklistMembers] = useState<Record<string, Array<{ user_id: string }>>>({});
  const [mentionedCommentMembers, setMentionedCommentMembers] = useState<Array<{ user_id: string }>>([]);
  const [mentionedDescMembers, setMentionedDescMembers] = useState<Array<{ user_id: string }>>([]);

  // Sincroniza o título e a descrição sempre que o cartão ativo mudar
  useEffect(() => {
    if (activeCard) {
      setTitle(activeCard.title || "");
      setDescription(activeCard.description || "");
    }
  }, [activeCard?.id, activeCard?.title, activeCard?.description]);

  if (!activeCard || !activeCardId) return null;

  const currentList = lists.find((l) => l.id === activeCard.list_id);

  const handleTitleBlur = () => {
    if (title.trim() && title !== activeCard.title) {
      updateCard(activeCard.id, { title: title.trim() });
    }
  };

  const handleSaveDescription = async () => {
    await updateCard(activeCard.id, { description });
    setIsEditingDesc(false);

    if (description.trim() && user && activeCard) {
      const mentionedUserIds = extractMentionedUserIds(description, members, mentionedDescMembers);
      if (mentionedUserIds.length > 0) {
        const authorName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Um membro";
        await notifySprintCardMention({
          companyId: activeCard.company_id,
          boardId: activeCard.board_id,
          cardId: activeCard.id,
          cardTitle: activeCard.title,
          authorUserId: user.id,
          authorName,
          mentionedUserIds,
          contextType: "description",
          contextText: description,
        });
      }
    }
    setMentionedDescMembers([]);
  };

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    addChecklist(activeCard.id, newChecklistTitle.trim());
    setNewChecklistTitle("");
    setIsAddingChecklist(false);
  };

  const handleCreateChecklistItem = async (checklistId: string) => {
    const text = newItemTitles[checklistId];
    if (!text || !text.trim() || !activeCard) return;

    const trimmedText = text.trim();
    const explicitMembers = mentionedChecklistMembers[checklistId] || [];
    const mentionedUserIds = extractMentionedUserIds(trimmedText, members, explicitMembers);

    await addChecklistItem({
      checklistId,
      cardId: activeCard.id,
      title: trimmedText,
    });

    if (mentionedUserIds.length > 0 && user) {
      const authorName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Um membro";
      await notifySprintCardMention({
        companyId: activeCard.company_id,
        boardId: activeCard.board_id,
        cardId: activeCard.id,
        cardTitle: activeCard.title,
        authorUserId: user.id,
        authorName,
        mentionedUserIds,
        contextType: "checklist",
        contextText: trimmedText,
        checklistItemId: checklistId,
      });
    }

    setNewItemTitles((prev) => ({ ...prev, [checklistId]: "" }));
    setMentionedChecklistMembers((prev) => ({ ...prev, [checklistId]: [] }));
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !activeCard) return;

    const commentText = newComment.trim();
    const mentionedUserIds = extractMentionedUserIds(commentText, members, mentionedCommentMembers);

    await addComment({
      cardId: activeCard.id,
      userId: user.id,
      content: commentText,
    });

    if (mentionedUserIds.length > 0) {
      const authorName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Um membro";
      await notifySprintCardMention({
        companyId: activeCard.company_id,
        boardId: activeCard.board_id,
        cardId: activeCard.id,
        cardTitle: activeCard.title,
        authorUserId: user.id,
        authorName,
        mentionedUserIds,
        contextType: "comment",
        contextText: commentText,
      });
    }

    setNewComment("");
    setMentionedCommentMembers([]);
  };

  return (
    <Dialog open={!!activeCardId} onOpenChange={(open) => !open && closeCardModal()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border text-card-foreground p-6 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle asChild>
            <div className="flex items-start justify-between gap-4 w-full">
              <SprintMentionInput
                value={title}
                onChange={setTitle}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                onMentionSelected={(m) => {
                  autoAssignMemberMention(activeCard.id, {
                    user_id: m.user_id,
                    full_name: m.full_name || undefined,
                    email: m.email || undefined,
                  });
                }}
                placeholder="Título do cartão... (use @ para citar)"
                className="text-xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full px-1 py-0.5 rounded transition-all text-foreground font-['Sora'] shadow-none"
              />
            </div>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            na lista <span className="font-semibold text-foreground underline">{currentList?.title || "Geral"}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
          {/* Coluna Principal */}
          <div className="md:col-span-3 space-y-6">
            {/* Metadados: Etiquetas, Membros e Prazo */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Etiquetas */}
              {(activeCard.labels || []).length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Etiquetas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCard.labels?.map((label) => (
                      <span
                        key={label.id}
                        style={{ backgroundColor: label.color }}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow-2xs"
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Membros */}
              {(activeCard.members || []).length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Membros
                  </h4>
                  <div className="flex items-center -space-x-1.5">
                    {activeCard.members?.map((m) => {
                      const memberData = members.find((x) => x.user_id === m.user_id);
                      const name = memberData?.full_name || memberData?.email || "Membro";
                      return (
                        <Avatar
                          key={m.user_id}
                          className="h-7 w-7 border-2 border-background ring-1 ring-border"
                          title={name}
                        >
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                            {name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prazo de Entrega */}
              {activeCard.due_date && (
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Data de Entrega
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCard(activeCard.id, { is_completed: !activeCard.is_completed })}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                        activeCard.is_completed
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                          : "bg-secondary border-border text-foreground hover:bg-secondary/80"
                      )}
                    >
                      <CheckCircle2 className={cn("h-4 w-4", activeCard.is_completed ? "text-emerald-500" : "text-muted-foreground")} />
                      <span>{format(new Date(activeCard.due_date), "dd 'de' MMM, HH:mm", { locale: ptBR })}</span>
                      {activeCard.is_completed && <span className="text-[10px] font-bold uppercase">(Concluído)</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                <span>Descrição</span>
              </div>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <SprintMentionTextarea
                    value={description}
                    onChange={setDescription}
                    minHeight={96}
                    showToolbar={true}
                    placeholder="Adicione uma descrição detalhada... (use @ para mencionar, *negrito*, _itálico_, ~tachado~, > citação, - listas)"
                    onMentionSelected={(m) => {
                      autoAssignMemberMention(activeCard.id, {
                        user_id: m.user_id,
                        full_name: m.full_name || undefined,
                        email: m.email || undefined,
                      });
                      setMentionedDescMembers((prev) => [...prev, { user_id: m.user_id }]);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveDescription}>
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className="min-h-[70px] p-3 rounded-xl bg-muted/20 border border-border/80 hover:border-border cursor-pointer text-sm text-foreground whitespace-pre-wrap transition-colors"
                >
                  {activeCard.description ? (
                    <SprintMentionRenderer text={activeCard.description} />
                  ) : (
                    <span className="text-muted-foreground italic">
                      Adicione uma descrição mais detalhada...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Checklists */}
            {(activeCard.checklists || []).map((checklist) => {
              const totalItems = checklist.items.length;
              const completedItems = checklist.items.filter((i) => i.is_completed).length;
              const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

              return (
                <div key={checklist.id} className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-sm flex-1 min-w-0">
                      <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                      <ChecklistTitleEditor
                        title={checklist.title}
                        onSave={(newTitle) => updateChecklistTitle(checklist.id, newTitle)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteChecklist(checklist.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                      <span>Progresso</span>
                      <span>{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                  </div>

                  {/* Itens do Checklist */}
                  <div className="space-y-1.5 pt-1">
                    {checklist.items.map((item) => (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        checklistId={checklist.id}
                        cardId={activeCard.id}
                        onToggle={() => toggleChecklistItem(checklist.id, item.id)}
                        onDelete={() => deleteChecklistItem(checklist.id, item.id)}
                        onUpdateTitle={(newTitle) =>
                          updateChecklistItemTitle(checklist.id, item.id, newTitle)
                        }
                      />
                    ))}

                    {/* Adicionar Item com Menção */}
                    <div className="pt-2 flex items-center gap-2">
                      <SprintMentionInput
                        value={newItemTitles[checklist.id] || ""}
                        onChange={(val) =>
                          setNewItemTitles((prev) => ({ ...prev, [checklist.id]: val }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateChecklistItem(checklist.id);
                          }
                        }}
                        onMentionSelected={(m) => {
                          autoAssignMemberMention(activeCard.id, {
                            user_id: m.user_id,
                            full_name: m.full_name || undefined,
                            email: m.email || undefined,
                          });
                          setMentionedChecklistMembers((prev) => ({
                            ...prev,
                            [checklist.id]: [...(prev[checklist.id] || []), { user_id: m.user_id }],
                          }));
                        }}
                        placeholder="Adicionar item... (digite @ para citar responsável)"
                        className="text-xs h-8"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCreateChecklistItem(checklist.id)}
                        className="h-8 px-3 text-xs"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Atividades e Comentários */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Atividades e Comentários</span>
              </div>

              <form onSubmit={handleAddComment} className="space-y-2">
                <SprintMentionTextarea
                  value={newComment}
                  onChange={setNewComment}
                  rows={2}
                  minHeight={64}
                  showToolbar={false}
                  placeholder="Escreva um comentário... (use @ para citar alguém, *negrito*, _itálico_)"
                  onMentionSelected={(m) => {
                    autoAssignMemberMention(activeCard.id, {
                      user_id: m.user_id,
                      full_name: m.full_name || undefined,
                      email: m.email || undefined,
                    });
                    setMentionedCommentMembers((prev) => [...prev, { user_id: m.user_id }]);
                  }}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim()}
                  className="text-xs h-8 px-4"
                >
                  Comentar
                </Button>
              </form>

              {/* Feed de Comentários */}
              <div className="space-y-3 pt-2">
                {cardComments.map((c) => {
                  const author = members.find((m) => m.user_id === c.user_id);
                  const authorName = author?.full_name || author?.email || "Usuário";
                  return (
                    <div key={c.id} className="flex gap-3 text-xs">
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold text-[10px]">
                          {authorName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/20 border border-border/80 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-foreground">{authorName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        <div className="text-foreground whitespace-pre-wrap"><SprintMentionRenderer text={c.content} /></div>
                        {user?.id === c.user_id && (
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              onClick={() => deleteComment(c.id)}
                              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Coluna Lateral de Ações */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Adicionar ao Cartão
            </h4>

            <div className="space-y-2">
              {/* Membros */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs h-8"
                  >
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Membros</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2 bg-popover border-border text-popover-foreground">
                  <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">Membros da Equipe</div>
                  <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                    {members.filter((m) => m.is_active).map((member) => {
                      const isAssigned = (activeCard.members || []).some((m) => m.user_id === member.user_id);
                      return (
                        <button
                          key={member.id}
                          onClick={() =>
                            toggleCardMember(activeCard.id, {
                              user_id: member.user_id,
                              full_name: member.full_name || undefined,
                              email: member.email || undefined,
                            })
                          }
                          className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                            isAssigned ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"
                          )}
                        >
                          <span className="truncate">{member.full_name || member.email}</span>
                          {isAssigned && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Etiquetas com Suporte a Criar e Adicionar Tag */}
              <SprintCardTagPopover
                card={activeCard}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs h-8"
                  >
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Etiquetas</span>
                  </Button>
                }
              />

              {/* Checklist */}
              {isAddingChecklist ? (
                <form onSubmit={handleCreateChecklist} className="space-y-2 p-2 bg-muted/40 rounded-lg border border-border">
                  <SprintMentionInput
                    value={newChecklistTitle}
                    onChange={setNewChecklistTitle}
                    placeholder="Título do Checklist... (use @)"
                    autoFocus
                    className="h-7 text-xs bg-background"
                  />
                  <div className="flex gap-1">
                    <Button type="submit" size="sm" className="h-7 text-[11px]">Criar</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingChecklist(false)} className="h-7 text-[11px]">Cancelar</Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingChecklist(true)}
                  className="w-full justify-start gap-2 text-xs h-8"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Checklist</span>
                </Button>
              )}

              {/* Datas */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs h-8"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Datas</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3 bg-popover border-border text-popover-foreground">
                  <div className="text-xs font-semibold mb-2">Definir Prazo</div>
                  <input
                    type="datetime-local"
                    defaultValue={activeCard.due_date ? new Date(activeCard.due_date).toISOString().slice(0, 16) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateCard(activeCard.id, { due_date: val ? new Date(val).toISOString() : null });
                    }}
                    className="w-full bg-background border border-border rounded-md p-2 text-xs text-foreground"
                  />
                  {activeCard.due_date && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCard(activeCard.id, { due_date: null })}
                      className="w-full mt-2 text-destructive hover:text-destructive text-xs h-7"
                    >
                      Remover Prazo
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Ações
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveCard(activeCard.id)}
                className="w-full justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs h-8"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Arquivar Cartão</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
