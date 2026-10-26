import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SprintCard } from "../types";
import { useSprintStore } from "../state/sprintStore";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { CheckSquare, MessageSquare, Clock, Archive } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SprintMentionRenderer } from "./SprintMentionRenderer";

interface SprintCardItemProps {
  card: SprintCard;
}

export const SprintCardItem: React.FC<SprintCardItemProps> = ({ card }) => {
  const { openCardModal, archiveCard } = useSprintStore();
  const { members = [] } = useCompanyMembers();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalChecklistItems = (card.checklists || []).reduce(
    (acc, chk) => acc + chk.items.length,
    0
  );
  const completedChecklistItems = (card.checklists || []).reduce(
    (acc, chk) => acc + chk.items.filter((i) => i.is_completed).length,
    0
  );

  let dueDateBadgeColor = "text-muted-foreground bg-secondary";
  if (card.due_date) {
    const d = new Date(card.due_date);
    if (card.is_completed) {
      dueDateBadgeColor = "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
    } else if (isPast(d) && !isToday(d)) {
      dueDateBadgeColor = "text-rose-600 bg-rose-500/10 border-rose-500/20";
    } else if (isToday(d)) {
      dueDateBadgeColor = "text-amber-600 bg-amber-500/10 border-amber-500/20";
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => openCardModal(card.id)}
      className={cn(
        "group relative rounded-lg bg-card border border-border p-3 shadow-[0_1px_3px_hsl(220_15%_10%/0.08)] hover:border-primary/40 cursor-grab active:cursor-grabbing transition-all select-none space-y-2",
        isDragging && "opacity-40 scale-95 border-dashed border-primary"
      )}
    >
      {/* Botão de Arquivar Direto com 1 clique */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          archiveCard(card.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 bg-card/90 backdrop-blur-xs border border-transparent hover:border-amber-500/20 cursor-pointer shadow-2xs"
        title="Arquivar cartão"
      >
        <Archive className="h-3.5 w-3.5" />
      </button>
      {/* Cover Color (se houver) */}
      {card.cover_color && (
        <div
          style={{ backgroundColor: card.cover_color }}
          className="h-6 -mx-3 -mt-3 rounded-t-lg"
        />
      )}

      {/* Etiquetas */}
      {(card.labels || []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels?.map((label) => (
            <span
              key={label.id}
              style={{ backgroundColor: label.color }}
              className="h-1.5 w-7 rounded-full shadow-2xs"
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Título do Cartão */}
      <h3 className="text-xs md:text-sm font-medium text-foreground leading-snug break-words pr-6">
        <SprintMentionRenderer text={card.title} isCompleted={card.is_completed} />
      </h3>

      {/* Badges do Rodapé */}
      <div className="flex items-center justify-between pt-1 gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Prazo */}
          {card.due_date && (
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-transparent",
                dueDateBadgeColor
              )}
            >
              <Clock className="h-3 w-3" />
              <span>{format(new Date(card.due_date), "dd MMM", { locale: ptBR })}</span>
            </div>
          )}

          {/* Checklist */}
          {totalChecklistItems > 0 && (
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                completedChecklistItems === totalChecklistItems
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              <CheckSquare className="h-3 w-3" />
              <span>
                {completedChecklistItems}/{totalChecklistItems}
              </span>
            </div>
          )}

          {/* Comentários */}
          {(card.comments_count || 0) > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{card.comments_count}</span>
            </div>
          )}
        </div>

        {/* Membros Atribuídos */}
        {(card.members || []).length > 0 && (
          <div className="flex items-center -space-x-1.5 shrink-0 ml-auto">
            {card.members?.map((m) => {
              const memberData = members.find((x) => x.user_id === m.user_id);
              const name = memberData?.full_name || memberData?.email || "Membro";
              return (
                <Avatar
                  key={m.user_id}
                  className="h-5 w-5 border border-background ring-1 ring-border"
                  title={name}
                >
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-[8px]">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
