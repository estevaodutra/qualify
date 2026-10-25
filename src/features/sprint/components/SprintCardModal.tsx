import React, { useState } from "react";
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
  Clock,
  Tag,
  Users,
  Trash2,
  Plus,
  MessageSquare,
  AlignLeft,
  X,
  Calendar as CalendarIcon,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SprintMentionInput } from "./SprintMentionInput";
import { SprintMentionTextarea } from "./SprintMentionTextarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const SprintCardModal: React.FC = () => {
  const { user } = useAuth();
  const { data: members = [] } = useCompanyMembers();
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
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
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

  if (!activeCard || !activeCardId) return null;

  const currentList = lists.find((l) => l.id === activeCard.list_id);

  const handleTitleBlur = () => {
    if (title.trim() && title !== activeCard.title) {
      updateCard(activeCard.id, { title: title.trim() });
    }
  };

  const handleSaveDescription = () => {
    updateCard(activeCard.id, { description });
    setIsEditingDesc(false);
  };

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    addChecklist(activeCard.id, newChecklistTitle.trim());
    setNewChecklistTitle("");
    setIsAddingChecklist(false);
  };

  const handleCreateChecklistItem = (checklistId: string) => {
    const text = newItemTitles[checklistId];
    if (!text || !text.trim()) return;

    addChecklistItem({
      checklistId,
      cardId: activeCard.id,
      title: text.trim(),
    });

    setNewItemTitles((prev) => ({ ...prev, [checklistId]: "" }));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    addComment({
      cardId: activeCard.id,
      userId: user.id,
      content: newComment.trim(),
    });
    setNewComment("");
  };

  return (
    <Dialog open={!!activeCardId} onOpenChange={(open) => !open && closeCardModal()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-start justify-between gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-xl font-bold bg-transparent border-b border-transparent hover:border-slate-700 focus:border-primary focus:outline-none w-full px-1 py-0.5 rounded transition-all text-white"
            />
          </div>
          <p className="text-xs text-slate-400">
            na lista <span className="font-semibold text-slate-300 underline">{currentList?.title || "Geral"}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
          {/* Main Content Area (3 Cols) */}
          <div className="md:col-span-3 space-y-6">
            {/* Quick Metadata: Labels & Members */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Labels */}
              {(activeCard.labels || []).length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Etiquetas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCard.labels?.map((label) => (
                      <span
                        key={label.id}
                        style={{ backgroundColor: label.color }}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow-sm"
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Members */}
              {(activeCard.members || []).length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Membros
                  </h4>
                  <div className="flex items-center -space-x-1.5">
                    {activeCard.members?.map((m) => {
                      const memberData = members.find((x) => x.user_id === m.user_id);
                      const name = memberData?.full_name || memberData?.email || "Membro";
                      return (
                        <Avatar
                          key={m.user_id}
                          className="h-7 w-7 border-2 border-slate-900 ring-1 ring-slate-700"
                          title={name}
                        >
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-[10px]">
                            {name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Due Date */}
              {activeCard.due_date && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Data de Entrega
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCard(activeCard.id, { is_completed: !activeCard.is_completed })}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                        activeCard.is_completed
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                      )}
                    >
                      <CheckCircle2 className={cn("h-4 w-4", activeCard.is_completed ? "text-emerald-400" : "text-slate-500")} />
                      <span>{format(new Date(activeCard.due_date), "dd 'de' MMM, HH:mm", { locale: ptBR })}</span>
                      {activeCard.is_completed && <span className="text-[10px] font-bold uppercase">(Concluído)</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                <AlignLeft className="h-4 w-4 text-slate-400" />
                <span>Descrição</span>
              </div>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <SprintMentionTextarea
                    value={description}
                    onChange={setDescription}
                    placeholder="Adicione uma descrição detalhada... (use @ para mencionar)"
                    onMentionSelected={(m) => autoAssignMemberMention(activeCard.id, { user_id: m.user_id, full_name: m.full_name || undefined, email: m.email || undefined })}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveDescription} className="bg-primary hover:bg-primary/90 text-white">
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
                  className="min-h-[70px] p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer text-sm text-slate-300 whitespace-pre-wrap transition-colors"
                >
                  {activeCard.description || (
                    <span className="text-slate-500 italic">
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
                <div key={checklist.id} className="space-y-3 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span>{checklist.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-red-400"
                      onClick={() => deleteChecklist(checklist.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                      <span>Progresso</span>
                      <span>{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-1.5 bg-slate-800" />
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 pt-1">
                    {checklist.items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.is_completed}
                            onChange={() => toggleChecklistItem(checklist.id, item.id)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                          <span
                            className={cn(
                              "text-sm break-words flex-1",
                              item.is_completed ? "line-through text-slate-500" : "text-slate-200"
                            )}
                          >
                            {item.title}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                          onClick={() => deleteChecklistItem(checklist.id, item.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    {/* Add Item Input with @ Mention */}
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
                        }}
                        placeholder="Adicionar item... (digite @ para mencionar responsável)"
                        className="text-xs py-1.5"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCreateChecklistItem(checklist.id)}
                        className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Comments & Activity Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <span>Atividades e Comentários</span>
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="space-y-2">
                <SprintMentionTextarea
                  value={newComment}
                  onChange={setNewComment}
                  rows={2}
                  placeholder="Escreva um comentário... (use @ para citar alguém)"
                  onMentionSelected={(m) =>
                    autoAssignMemberMention(activeCard.id, {
                      user_id: m.user_id,
                      full_name: m.full_name || undefined,
                      email: m.email || undefined,
                    })
                  }
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim()}
                  className="bg-primary hover:bg-primary/90 text-white text-xs h-8 px-4"
                >
                  Comentar
                </Button>
              </form>

              {/* Comments Feed */}
              <div className="space-y-3 pt-2">
                {cardComments.map((c) => {
                  const author = members.find((m) => m.user_id === c.user_id);
                  const authorName = author?.full_name || author?.email || "Usuário";
                  return (
                    <div key={c.id} className="flex gap-3 text-xs">
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarFallback className="bg-slate-800 text-slate-300 font-semibold text-[10px]">
                          {authorName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-slate-200">{authorName}</span>
                          <span className="text-[10px] text-slate-500">
                            {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap">{c.content}</p>
                        {user?.id === c.user_id && (
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              onClick={() => deleteComment(c.id)}
                              className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
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

          {/* Right Sidebar Actions (1 Col) */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Adicionar ao Cartão
            </h4>

            <div className="space-y-2">
              {/* Membros Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 text-xs h-8"
                  >
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>Membros</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2 bg-slate-900 border-slate-800 text-slate-200">
                  <div className="text-xs font-semibold px-2 py-1 text-slate-400">Membros da Equipe</div>
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
                            "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors",
                            isAssigned ? "bg-primary/20 text-primary font-medium" : "hover:bg-slate-800 text-slate-300"
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

              {/* Etiquetas Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 text-xs h-8"
                  >
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    <span>Etiquetas</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2 bg-slate-900 border-slate-800 text-slate-200">
                  <div className="text-xs font-semibold px-2 py-1 text-slate-400">Etiquetas do Quadro</div>
                  <div className="space-y-1.5 mt-1.5 max-h-56 overflow-y-auto">
                    {labels.map((label) => {
                      const isAttached = (activeCard.labels || []).some((l) => l.id === label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleCardLabel(activeCard.id, label)}
                          style={{ backgroundColor: label.color }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-transform active:scale-95",
                            isAttached && "ring-2 ring-white"
                          )}
                        >
                          <span>{label.name}</span>
                          {isAttached && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Checklist Popover */}
              {isAddingChecklist ? (
                <form onSubmit={handleCreateChecklist} className="space-y-2 p-2 bg-slate-800/40 rounded-lg border border-slate-700/60">
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="Título do Checklist"
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex gap-1">
                    <Button type="submit" size="sm" className="h-7 text-[11px] bg-primary text-white">Criar</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingChecklist(false)} className="h-7 text-[11px]">Cancelar</Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingChecklist(true)}
                  className="w-full justify-start gap-2 bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 text-xs h-8"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
                  <span>Checklist</span>
                </Button>
              )}

              {/* Data Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 text-xs h-8"
                  >
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Datas</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3 bg-slate-900 border-slate-800 text-slate-200">
                  <div className="text-xs font-semibold mb-2">Definir Prazo</div>
                  <input
                    type="datetime-local"
                    defaultValue={activeCard.due_date ? new Date(activeCard.due_date).toISOString().slice(0, 16) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateCard(activeCard.id, { due_date: val ? new Date(val).toISOString() : null });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs text-white"
                  />
                  {activeCard.due_date && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCard(activeCard.id, { due_date: null })}
                      className="w-full mt-2 text-red-400 hover:text-red-300 text-xs h-7"
                    >
                      Remover Prazo
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ações
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveCard(activeCard.id)}
                className="w-full justify-start gap-2 bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-950/40 text-xs h-8"
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
