import { Deal, PipelineStage } from "@/types/crm.types";
import { DealKanbanCard } from "@/components/crm/kanban/DealKanbanCard";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PipelineStageColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  onOpenDeal: (deal: Deal) => void;
  onEditStage: (stage: PipelineStage) => void;
}

export function PipelineStageColumn({ stage, deals, onOpenDeal, onEditStage }: PipelineStageColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    data: {
      type: "Column",
      stage,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="flex flex-col h-full w-[300px] shrink-0 bg-muted/50 rounded-xl border-2 border-dashed border-primary opacity-50"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex flex-col h-full w-[300px] shrink-0 bg-muted/20 rounded-xl border border-border/40"
    >
      {/* Stage Header */}
      <div 
        {...attributes} 
        {...listeners}
        className="p-3.5 border-b border-border/40 flex items-center justify-between sticky top-0 bg-background/50 backdrop-blur-sm z-10 rounded-t-xl group/stage cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || "#94a3b8" }} />
          <span className="font-semibold text-sm text-foreground truncate max-w-[150px]">{stage.name}</span>
          <span className="bg-secondary text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            {deals?.length || 0}
          </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover/stage:opacity-100 transition-opacity" onPointerDown={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-secondary">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-secondary">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditStage(stage)}>Editar Etapa</DropdownMenuItem>
              <DropdownMenuItem>Mover para Esquerda</DropdownMenuItem>
              <DropdownMenuItem>Mover para Direita</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Excluir Etapa</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Deals List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-6 custom-scrollbar">
        {deals?.map(deal => (
          <div key={deal.id} onClick={() => onOpenDeal(deal)}>
            <DealKanbanCard deal={deal} />
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-border/40 bg-background/30 rounded-b-xl">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground text-xs h-8">
          <Plus className="w-3.5 h-3.5 mr-2" /> Novo Negócio
        </Button>
      </div>
    </div>
  );
}
