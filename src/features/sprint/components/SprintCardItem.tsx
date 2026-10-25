import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SprintCard } from "../types";
import { useSprintStore } from "../state/sprintStore";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { CheckSquare, MessageSquare, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SprintCardItemProps {
  card: SprintCard;
}

export const SprintCardItem: React.FC<SprintCardItemProps> = ({ card }) => {
  const { openCardModal } = useSprintStore();
  const { data: members = [] } = useCompanyMembers();

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

  // Checklist counts
  const totalChecklistItems = (card.checklists || []).reduce(
    (acc, chk) => acc + chk.items.length,
    0
  );
  const completedChecklistItems = (card.checklists || []).reduce(
    (acc, chk) => acc + chk.items.filter((i) => i.is_completed).length,
    0
  );

  // Due date status
  let dueDateBadgeColor = "text-slate-400 bg-slate-800/80";
  if (card.due_date) {
    const d = new Date(card.due_date);
    if (card.is_completed) {
      dueDateBadgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    } else if (isPast(d) && !isToday(d)) {
      dueDateBadgeColor = "text-rose-400 bg-rose-500/10 border-rose-500/30";
    } else if (isToday(d)) {
      dueDateBadgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
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
        "group relative rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-3 shadow-md hover:shadow-xl cursor-grab active:cursor-grabbing transition-all select-none space-y-2.5",
        isDragging && "opacity-40 scale-95 border-dashed border-primary"
      )}
    >
      {/* Cover Color (optional) */}
      {card.cover_color && (
        <div
          style={{ backgroundColor: card.cover_color }}
          className="h-7 -mx-3 -mt-3 rounded-t-xl"
        />
      )}

      {/* Labels */}
      {(card.labels || []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels?.map((label) => (
            <span
              key={label.id}
              style={{ backgroundColor: label.color }}
              className="h-2 w-8 rounded-full shadow-sm"
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Card Title */}
      <h3 className="text-sm font-medium text-slate-100 leading-snug break-words">
        {card.title}
      </h3>

      {/* Badges Footer */}
      <div className="flex items-center justify-between pt-1 gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Due date */}
          {card.due_date && (
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border border-transparent",
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
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium",
                completedChecklistItems === totalChecklistItems
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-slate-800/80 text-slate-400"
              )}
            >
              <CheckSquare className="h-3 w-3" />
              <span>
                {completedChecklistItems}/{totalChecklistItems}
              </span>
            </div>
          )}

          {/* Comments count */}
          {(card.comments_count || 0) > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <MessageSquare className="h-3 w-3" />
              <span>{card.comments_count}</span>
            </div>
          )}
        </div>

        {/* Assigned members avatars */}
        {(card.members || []).length > 0 && (
          <div className="flex items-center -space-x-1.5 shrink-0 ml-auto">
            {card.members?.map((m) => {
              const memberData = members.find((x) => x.user_id === m.user_id);
              const name = memberData?.full_name || memberData?.email || "Membro";
              return (
                <Avatar
                  key={m.user_id}
                  className="h-5 w-5 border border-slate-900 ring-1 ring-slate-800"
                  title={name}
                >
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-[8px]">
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
