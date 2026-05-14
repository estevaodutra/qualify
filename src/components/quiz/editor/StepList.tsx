import { useState } from "react";
import { Plus, GripVertical, Trash2, ChevronRight } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QuizStep } from "@/hooks/useQuizSteps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  steps: QuizStep[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onAddStep: () => void;
  onDeleteStep: (id: string) => void;
  onReorder: (ids: string[]) => void;
}

function SortableStep({
  step,
  index,
  isSelected,
  onSelect,
  onDelete,
}: {
  step: QuizStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer group text-sm",
        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        isDragging && "opacity-50"
      )}
      onClick={onSelect}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </span>

      <span className={cn("w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
        isSelected ? "bg-primary-foreground text-primary" : "bg-muted-foreground/20 text-muted-foreground"
      )}>
        {index + 1}
      </span>

      <span className="flex-1 truncate">{step.name}</span>

      {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}

      <button
        className={cn("opacity-0 group-hover:opacity-100 transition-opacity", isSelected && "opacity-100")}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="w-3.5 h-3.5 text-destructive" />
      </button>
    </div>
  );
}

export function StepList({ steps, selectedStepId, onSelectStep, onAddStep, onDeleteStep, onReorder }: Props) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(steps, oldIndex, newIndex);
    onReorder(reordered.map((s) => s.id));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapas</span>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onAddStep}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {steps.map((step, i) => (
              <SortableStep
                key={step.id}
                step={step}
                index={i}
                isSelected={selectedStepId === step.id}
                onSelect={() => onSelectStep(step.id)}
                onDelete={() => onDeleteStep(step.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {steps.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Nenhuma etapa ainda.<br />
            <button className="text-primary underline mt-1" onClick={onAddStep}>Adicionar etapa</button>
          </div>
        )}
      </div>

      <div className="p-2 border-t">
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={onAddStep}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Nova etapa
        </Button>
      </div>
    </div>
  );
}
