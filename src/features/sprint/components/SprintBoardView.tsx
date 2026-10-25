import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const navigate = useNavigate();
  const { activeCompanyId } = useCompany();
  const { data: members = [] } = useCompanyMembers();

  const {
    currentBoard,
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Avoid accidental drag on clicks
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

    // Moving Card over Card in different or same column
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

    // Moving Card directly over an empty Column container
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

    // Reordering columns
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

    // Reordering cards within the same column
    if (active.data.current?.type === "Card") {
      const activeCard = active.data.current?.card as SprintCard;
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
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
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
    <div
      style={{ backgroundColor: currentBoard.background_value }}
      className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden"
    >
      {/* Board Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/sprint")}
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <h1 className="text-lg font-bold text-white tracking-tight">
            {currentBoard.title}
          </h1>

          <button className="text-white/60 hover:text-amber-400 transition-colors">
            <Star className={cn("h-4 w-4", currentBoard.is_favorite && "fill-amber-400 text-amber-400")} />
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar cartões..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-primary w-36 md:w-48 transition-all"
            />
          </div>

          {/* Labels Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 gap-1.5",
                  selectedLabelFilters.length > 0 && "bg-white/20 text-white font-semibold"
                )}
              >
                <Tag className="h-3 w-3" />
                <span>Etiquetas</span>
                {selectedLabelFilters.length > 0 && (
                  <span className="ml-1 text-[10px] bg-primary text-white rounded-full px-1.5 py-0.2">
                    {selectedLabelFilters.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 bg-slate-900 border-slate-800 text-slate-200">
              <div className="text-xs font-semibold px-2 py-1 text-slate-400">Filtrar por etiqueta</div>
              <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                {labels.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => toggleLabelFilter(l.id)}
                    style={{ backgroundColor: l.color }}
                    className={cn(
                      "w-full text-left px-2.5 py-1 rounded text-xs font-semibold text-white shadow-sm transition-opacity",
                      selectedLabelFilters.includes(l.id) ? "opacity-100 ring-2 ring-white" : "opacity-60 hover:opacity-90"
                    )}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Members Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 gap-1.5",
                  selectedMemberFilters.length > 0 && "bg-white/20 text-white font-semibold"
                )}
              >
                <Users className="h-3 w-3" />
                <span>Membros</span>
                {selectedMemberFilters.length > 0 && (
                  <span className="ml-1 text-[10px] bg-primary text-white rounded-full px-1.5 py-0.2">
                    {selectedMemberFilters.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 bg-slate-900 border-slate-800 text-slate-200">
              <div className="text-xs font-semibold px-2 py-1 text-slate-400">Filtrar por membro</div>
              <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                {members.filter((m) => m.is_active).map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleMemberFilter(member.user_id)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-xs transition-colors",
                      selectedMemberFilters.includes(member.user_id)
                        ? "bg-primary/20 text-primary font-medium"
                        : "hover:bg-slate-800 text-slate-300"
                    )}
                  >
                    {member.full_name || member.email}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 gap-1"
            >
              <X className="h-3 w-3" />
              <span>Limpar filtros</span>
            </Button>
          )}

          {/* Board Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
              <DropdownMenuItem
                onClick={async () => {
                  if (confirm("Tem certeza que deseja excluir este quadro?")) {
                    await deleteBoard(currentBoard.id);
                    navigate("/sprint");
                  }
                }}
                className="text-red-400 hover:text-red-300 gap-2 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Excluir Quadro</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Board Horizontal Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-start gap-4 h-full">
            <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => (
                <SprintListColumn key={list.id} list={list} />
              ))}
            </SortableContext>

            {/* + Add Another List Button */}
            <div className="w-72 shrink-0">
              {isAddingList ? (
                <form
                  onSubmit={handleCreateList}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-2"
                >
                  <input
                    type="text"
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="Nome da lista..."
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button type="submit" size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 text-white">
                      Adicionar Lista
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAddingList(false)}
                      className="h-7 w-7 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingList(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar outra lista</span>
                </button>
              )}
            </div>
          </div>

          {/* Drag Overlay for smooth preview */}
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

      {/* Card Details Modal */}
      <SprintCardModal />
    </div>
  );
};
