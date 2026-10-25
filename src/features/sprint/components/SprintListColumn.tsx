import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SprintList, SprintCard } from "../types";
import { SprintCardItem } from "./SprintCardItem";
import { SprintMentionInput } from "./SprintMentionInput";
import { useSprintStore } from "../state/sprintStore";
import { useAuth } from "@/contexts/AuthContext";
import { MoreHorizontal, Plus, Trash2, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SprintListColumnProps {
  list: SprintList;
}

export const SprintListColumn: React.FC<SprintListColumnProps> = ({ list }) => {
  const { user } = useAuth();
  const {
    createCard,
    updateListTitle,
    archiveList,
    searchFilter,
    selectedLabelFilters,
    selectedMemberFilters,
  } = useSprintStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: "Column",
      list,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== list.title) {
      updateListTitle(list.id, title.trim());
    }
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    const cardTitle = newCardTitle.trim();
    setNewCardTitle("");
    await createCard({
      listId: list.id,
      boardId: list.board_id,
      companyId: list.company_id,
      title: cardTitle,
      userId: user?.id,
    });
  };

  const filteredCards = list.cards.filter((card) => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchDesc = card.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (selectedLabelFilters.length > 0) {
      const cardLabelIds = (card.labels || []).map((l) => l.id);
      const hasLabel = selectedLabelFilters.some((id) => cardLabelIds.includes(id));
      if (!hasLabel) return false;
    }

    if (selectedMemberFilters.length > 0) {
      const cardMemberIds = (card.members || []).map((m) => m.user_id);
      const hasMember = selectedMemberFilters.some((id) => cardMemberIds.includes(id));
      if (!hasMember) return false;
    }

    return true;
  });

  const cardIds = filteredCards.map((c) => c.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-72 shrink-0 flex flex-col max-h-full rounded-xl bg-card border border-border/70 shadow-xs transition-all",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      {/* Header da Coluna */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between p-3 cursor-grab active:cursor-grabbing border-b border-border/50 bg-muted/20 rounded-t-xl group/stage"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/stage:text-muted-foreground transition-colors shrink-0" />
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              autoFocus
              className="text-sm font-semibold bg-background border border-border px-2 py-0.5 rounded text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
            >
              {list.title}
            </h2>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {filteredCards.length}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => archiveList(list.id)}
              className="text-destructive gap-2 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Arquivar Lista</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cartões da Lista */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {filteredCards.map((card) => (
            <SprintCardItem key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>

      {/* Rodapé: Adicionar Cartão */}
      <div className="p-2.5 border-t border-border/50">
        {isAddingCard ? (
          <div className="space-y-2">
            <SprintMentionInput
              value={newCardTitle}
              onChange={setNewCardTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCard();
                }
                if (e.key === "Escape") {
                  setIsAddingCard(false);
                }
              }}
              autoFocus
              placeholder="Título do cartão... (use @ para citar)"
              className="text-xs"
            />
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={handleAddCard}
                className="h-7 px-3 text-xs"
              >
                Adicionar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsAddingCard(false)}
                className="h-7 w-7 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsAddingCard(true)}
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar um cartão</span>
          </Button>
        )}
      </div>
    </div>
  );
};
