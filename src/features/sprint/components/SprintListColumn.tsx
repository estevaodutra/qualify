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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SprintListColumnProps {
  list: SprintList;
  index?: number;
}

export function getColumnTheme(title: string, index = 0) {
  const norm = (title || "").toLowerCase().trim();

  // Vermelho / Rose: Pendente, A Fazer, etc.
  if (
    norm.includes("pendente") ||
    norm.includes("fazer") ||
    norm.includes("todo") ||
    norm.includes("backlog")
  ) {
    return {
      icon: "🔴",
      textColor: "text-rose-600 dark:text-rose-400",
      containerBg: "border-rose-400/30 bg-gradient-to-b from-rose-500/10 via-rose-500/5 to-transparent",
      badgeStyle: "bg-background/90 text-rose-700 dark:text-rose-300 border-rose-300/40",
      plusBtn: "hover:bg-rose-500 hover:text-white",
      dropBorder: "border-rose-500 ring-2 ring-rose-500/30",
    };
  }

  // Amarelo / Âmbar: Fazendo, Em Andamento, etc.
  if (
    norm.includes("fazendo") ||
    norm.includes("andamento") ||
    norm.includes("doing") ||
    norm.includes("progresso") ||
    norm.includes("execu")
  ) {
    return {
      icon: "🟡",
      textColor: "text-amber-600 dark:text-amber-400",
      containerBg: "border-amber-400/30 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent",
      badgeStyle: "bg-background/90 text-amber-700 dark:text-amber-300 border-amber-300/40",
      plusBtn: "hover:bg-amber-500 hover:text-white",
      dropBorder: "border-amber-500 ring-2 ring-amber-500/30",
    };
  }

  // Verde / Esmeralda: Concluída, Concluído, etc.
  if (
    norm.includes("conclu") ||
    norm.includes("feito") ||
    norm.includes("done") ||
    norm.includes("finaliza")
  ) {
    return {
      icon: "🟢",
      textColor: "text-emerald-600 dark:text-emerald-400",
      containerBg: "border-emerald-400/30 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent",
      badgeStyle: "bg-background/90 text-emerald-700 dark:text-emerald-300 border-emerald-300/40",
      plusBtn: "hover:bg-emerald-500 hover:text-white",
      dropBorder: "border-emerald-500 ring-2 ring-emerald-500/30",
    };
  }

  // Cores alternadas para colunas personalizadas extras
  const presets = [
    {
      icon: "🔵",
      textColor: "text-blue-600 dark:text-blue-400",
      containerBg: "border-blue-400/30 bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent",
      badgeStyle: "bg-background/90 text-blue-700 dark:text-blue-300 border-blue-300/40",
      plusBtn: "hover:bg-blue-500 hover:text-white",
      dropBorder: "border-blue-500 ring-2 ring-blue-500/30",
    },
    {
      icon: "🟣",
      textColor: "text-purple-600 dark:text-purple-400",
      containerBg: "border-purple-400/30 bg-gradient-to-b from-purple-500/10 via-purple-500/5 to-transparent",
      badgeStyle: "bg-background/90 text-purple-700 dark:text-purple-300 border-purple-300/40",
      plusBtn: "hover:bg-purple-500 hover:text-white",
      dropBorder: "border-purple-500 ring-2 ring-purple-500/30",
    },
  ];

  return presets[index % presets.length];
}

export const SprintListColumn: React.FC<SprintListColumnProps> = ({ list, index = 0 }) => {
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

  const theme = getColumnTheme(list.title, index);

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
    setIsAddingCard(false);
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
        "w-80 shrink-0 flex flex-col max-h-full rounded-3xl border shadow-xs transition-all backdrop-blur-sm",
        theme.containerBg,
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      {/* Header da Coluna Formatado exatamente como solicitado */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between px-3.5 py-3 cursor-grab active:cursor-grabbing border-b border-border/40 rounded-t-3xl group/stage select-none"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base shrink-0 select-none">{theme.icon}</span>

          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              autoFocus
              className="text-xs font-black uppercase tracking-wider bg-background border border-border px-2 py-0.5 rounded text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              className={cn(
                "text-xs font-black uppercase tracking-wider truncate cursor-pointer hover:opacity-80 transition-opacity",
                theme.textColor
              )}
              title="Clique para editar o nome da coluna"
            >
              {list.title}
            </h2>
          )}
        </div>

        {/* Lado Direito: Pill do Contador + Botão '+' + Menu */}
        <div className="flex items-center gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full border shadow-2xs",
              theme.badgeStyle
            )}
          >
            {filteredCards.length}
          </Badge>

          {/* Botão '+' idêntico ao modelo */}
          <button
            type="button"
            onClick={() => {
              setIsAddingCard((prev) => !prev);
              setNewCardTitle("");
            }}
            className={cn(
              "h-6 w-6 rounded-lg bg-background/80 hover:bg-primary hover:text-primary-foreground border border-border/80 flex items-center justify-center text-muted-foreground transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95",
              theme.plusBtn
            )}
            title={`Adicionar novo cartão em ${list.title}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-3.5 w-3.5" />
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
      </div>

      {/* Composer Rápido Aberto pelo '+' do Cabeçalho */}
      {isAddingCard && (
        <div className="m-2.5 p-3 rounded-2xl bg-card border-2 border-primary/50 shadow-md space-y-2 animate-in fade-in-50 duration-150">
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
                setNewCardTitle("");
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
              Adicionar Cartão
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsAddingCard(false);
                setNewCardTitle("");
              }}
              className="h-7 w-7 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cartões da Lista */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {filteredCards.map((card) => (
            <SprintCardItem key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>

      {/* Rodapé sutil se o composer não estiver aberto */}
      {!isAddingCard && (
        <div className="p-2 border-t border-border/30">
          <Button
            variant="ghost"
            onClick={() => setIsAddingCard(true)}
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <Plus className="h-3 w-3" />
            <span>Adicionar um cartão</span>
          </Button>
        </div>
      )}
    </div>
  );
};
