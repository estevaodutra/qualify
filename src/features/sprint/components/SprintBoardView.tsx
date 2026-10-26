import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSprintStore } from "../state/sprintStore";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { SprintListColumn } from "./SprintListColumn";
import { SprintCardItem } from "./SprintCardItem";
import { SprintSidebar } from "./SprintSidebar";
import { SprintCardModal } from "./SprintCardModal";
import { SprintCard, SprintList } from "../types";
import {
  ArrowLeft,
  Plus,
  Star,
  Search,
  Filter,
  Users,
  Tag,
  X,
  MoreHorizontal,
  Trash2,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const SprintBoardView: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const cardIdParam = searchParams.get("cardId");
  const navigate = useNavigate();
  const { activeCompanyId } = useCompany();
  const { data: members = [] } = useCompanyMembers();

  const {
    currentBoard,
    boards,
    loadBoards,
    updateBoard,
    lists,
    labels,
    loadBoardDetails,
    createList,
    reorderLists,
    moveCard,
    deleteBoard,
    searchFilter,
    setSearchFilter,
    selectedLabelFilters,
    toggleLabelFilter,
    selectedMemberFilters,
    toggleMemberFilter,
    clearFilters,
    openCardModal,
    activeCardId,
  } = useSprintStore();

  const [activeDragItem, setActiveDragItem] = useState<{
    type: "Column" | "Card";
    data: SprintList | SprintCard;
  } | null>(null);

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  useEffect(() => {
    if (boardId) {
      loadBoardDetails(boardId);
    }
  }, [boardId]);

  // Abre o card automaticamente se o cardId estiver na URL
  useEffect(() => {
    if (cardIdParam) {
      openCardModal(cardIdParam);
    }
  }, [cardIdParam, lists]);

  // Limpa o parâmetro da URL quando o modal for fechado
  useEffect(() => {
    if (!activeCardId && cardIdParam) {
      const next = new URLSearchParams(searchParams);
      next.delete("cardId");
      setSearchParams(next, { replace: true });
    }
  }, [activeCardId, cardIdParam, searchParams, setSearchParams]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return localStorage.getItem("sprint_sidebar_open") !== "false";
  });

  useEffect(() => {
    localStorage.setItem("sprint_sidebar_open", String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    if (activeCompanyId && boards.length === 0) {
      loadBoards(activeCompanyId);
    }
  }, [activeCompanyId, boards.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !boardId || !activeCompanyId) return;

    await createList({
      boardId,
      companyId: activeCompanyId,
      title: newListTitle.trim(),
    });

    setNewListTitle("");
    setIsAddingList(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { current } = event.active.data;
    if (current?.type === "Column") {
      setActiveDragItem({ type: "Column", data: current.list });
    } else if (current?.type === "Card") {
      setActiveDragItem({ type: "Card", data: current.card });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveACard = active.data.current?.type === "Card";
    const isOverACard = over.data.current?.type === "Card";
    const isOverAColumn = over.data.current?.type === "Column";

    if (!isActiveACard) return;

    if (isActiveACard && isOverACard) {
      const activeCard = active.data.current?.card as SprintCard;
      const overCard = over.data.current?.card as SprintCard;

      if (activeCard.list_id !== overCard.list_id) {
        const sourceList = lists.find((l) => l.id === activeCard.list_id);
        const targetList = lists.find((l) => l.id === overCard.list_id);
        if (sourceList && targetList) {
          const overIndex = targetList.cards.findIndex((c) => c.id === overId);
          moveCard({
            cardId: String(activeId),
            sourceListId: sourceList.id,
            targetListId: targetList.id,
            newIndex: overIndex >= 0 ? overIndex : 0,
          });
        }
      }
    }

    if (isActiveACard && isOverAColumn) {
      const activeCard = active.data.current?.card as SprintCard;
      const targetListId = String(overId);

      if (activeCard.list_id !== targetListId) {
        moveCard({
          cardId: String(activeId),
          sourceListId: activeCard.list_id,
          targetListId,
          newIndex: 0,
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (active.data.current?.type === "Column") {
      if (activeId !== overId) {
        const activeIndex = lists.findIndex((l) => l.id === activeId);
        const overIndex = lists.findIndex((l) => l.id === overId);
        if (activeIndex !== -1 && overIndex !== -1) {
          const reordered = arrayMove(lists, activeIndex, overIndex);
          reorderLists(reordered);
        }
      }
      return;
    }

    if (active.data.current?.type === "Card") {
      const targetList = lists.find((l) => l.cards.some((c) => c.id === activeId));
      if (!targetList) return;

      const overIndex = targetList.cards.findIndex((c) => c.id === overId);
      if (overIndex !== -1) {
        moveCard({
          cardId: String(activeId),
          sourceListId: targetList.id,
          targetListId: targetList.id,
          newIndex: overIndex,
        });
      }
    }
  };

  if (!currentBoard) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground bg-background">
        Carregando quadro...
      </div>
    );
  }

  const listIds = lists.map((l) => l.id);
  const hasActiveFilters =
    Boolean(searchFilter) ||
    selectedLabelFilters.length > 0 ||
    selectedMemberFilters.length > 0;

  return (
    <div className="flex-1 flex h-[calc(100vh-65px)] overflow-hidden bg-background">
      {/* Sidebar com Lista de Quadros */}
      <SprintSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Conteúdo Principal do Quadro */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Board Top Header seguindo o design do sistema */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Botão de Toggle da Sidebar de Quadros */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              title={isSidebarOpen ? "Recolher lista de quadros" : "Expandir lista de quadros"}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/sprint")}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              title="Voltar para todos os quadros"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-0">
              <div
                className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: currentBoard.background_value }}
              />
              <h1 className="text-base md:text-lg font-bold text-foreground tracking-tight font-['Sora'] truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {currentBoard.title}
              </h1>
            </div>

            <button
              onClick={() => updateBoard(currentBoard.id, { is_favorite: !currentBoard.is_favorite })}
              className="text-muted-foreground hover:text-amber-500 transition-colors ml-1 cursor-pointer shrink-0"
              title={currentBoard.is_favorite ? "Remover dos favoritos" : "Favoritar quadro"}
            >
              <Star className={cn("h-4 w-4", currentBoard.is_favorite && "fill-amber-500 text-amber-500")} />
            </button>
          </div>

        {/* Filtros e Ações */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Busca de Cartões */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar cartões..."
              className="pl-8 h-8 text-xs w-36 md:w-48 bg-background"
            />
          </div>

          {/* Filtro de Etiquetas */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={selectedLabelFilters.length > 0 ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
              >
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Etiquetas</span>
                {selectedLabelFilters.length > 0 && (
                  <Badge variant="default" className="h-4 px-1 text-[10px] ml-0.5">
                    {selectedLabelFilters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 bg-popover border-border text-popover-foreground">
              <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">Filtrar por etiqueta</div>
              <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                {labels.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => toggleLabelFilter(l.id)}
                    style={{ backgroundColor: l.color }}
                    className={cn(
                      "w-full text-left px-2.5 py-1 rounded text-xs font-semibold text-white shadow-xs transition-opacity cursor-pointer",
                      selectedLabelFilters.includes(l.id) ? "opacity-100 ring-2 ring-primary" : "opacity-75 hover:opacity-100"
                    )}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtro de Membros */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={selectedMemberFilters.length > 0 ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Membros</span>
                {selectedMemberFilters.length > 0 && (
                  <Badge variant="default" className="h-4 px-1 text-[10px] ml-0.5">
                    {selectedMemberFilters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 bg-popover border-border text-popover-foreground">
              <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">Filtrar por membro</div>
              <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                {members.filter((m) => m.is_active).map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleMemberFilter(member.user_id)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-xs transition-colors cursor-pointer",
                      selectedMemberFilters.includes(member.user_id)
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-foreground"
                    )}
                  >
                    {member.full_name || member.email}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs text-destructive hover:text-destructive gap-1 px-2"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpar filtros</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  if (confirm("Tem certeza que deseja excluir este quadro?")) {
                    await deleteBoard(currentBoard.id);
                    navigate("/sprint");
                  }
                }}
                className="text-destructive gap-2 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Excluir Quadro</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Área do Kanban com fundo padrão de board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-muted/20">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-start gap-4 h-full" style={{ minWidth: "max-content" }}>
            <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
              {lists.map((list, index) => (
                <SprintListColumn key={list.id} list={list} index={index} />
              ))}
            </SortableContext>

            {/* Botão de Adicionar Lista */}
            <div className="w-72 shrink-0">
              {isAddingList ? (
                <form
                  onSubmit={handleCreateList}
                  className="p-3 rounded-xl bg-card border border-border shadow-sm space-y-2"
                >
                  <Input
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="Nome da lista..."
                    autoFocus
                    className="h-8 text-xs"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button type="submit" size="sm" className="h-7 text-xs">
                      Adicionar Lista
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAddingList(false)}
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingList(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-card/60 hover:bg-card border border-border/80 hover:border-border text-foreground text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span>Adicionar outra lista</span>
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeDragItem?.type === "Column" && (
              <SprintListColumn list={activeDragItem.data as SprintList} />
            )}
            {activeDragItem?.type === "Card" && (
              <SprintCardItem card={activeDragItem.data as SprintCard} />
            )}
          </DragOverlay>
        </DndContext>
      </div>
      </div>

      <SprintCardModal />
    </div>
  );
};
