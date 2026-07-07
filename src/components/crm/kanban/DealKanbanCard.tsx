import { MoreHorizontal, MessageCircle, Calendar, FileText, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadAvatar, LeadTags, LeadOwner, DealValue } from "../shared";
import { Deal, Lead } from "@/types/crm.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DealKanbanCardProps {
  deal: Deal & { lead?: Lead };
  onClick?: (dealId: string) => void;
  onOpenLead?: (leadId: string) => void;
  onOpenChat?: (leadId: string) => void;
  onAddActivity?: (dealId: string) => void;
}

export function DealKanbanCard({ deal, onClick, onOpenLead, onOpenChat, onAddActivity }: DealKanbanCardProps) {
  const lead = deal.lead;
  
  // Status definitions
  const hasOverdueActivity = false; // Mock - compute from deal.next_activity_at
  const pendingActivities = lead?.pending_activities_count || 0;
  
  return (
    <div 
      className={cn(
        "bg-card rounded-lg p-3 shadow-[0_1px_3px_hsl(220_15%_10%/0.08)] border border-border flex flex-col gap-3 cursor-pointer hover:border-primary/40 transition-colors",
        hasOverdueActivity && "border-destructive/40 bg-destructive/5"
      )}
      onClick={() => onClick?.(deal.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <LeadAvatar name={lead?.name || null} className="w-6 h-6" fallbackClassName="text-[10px]" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold truncate" title={lead?.name || "Desconhecido"}>
              {lead?.name || "Desconhecido"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate font-mono">
              #{deal.id.split('-')[0]}
            </span>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-xs">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.(deal.id); }}>
              Abrir Negócio
            </DropdownMenuItem>
            {lead && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenLead?.(lead.id); }}>
                Abrir Perfil do Lead
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddActivity?.(deal.id); }}>
              Nova Tarefa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground truncate" title={deal.title}>
          {deal.title || "Sem produto"}
        </span>
        <div className="flex items-center justify-between mt-1">
          <DealValue value={deal.value} currency={deal.currency} className="text-[13px]" />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <LeadOwner ownerName={deal.owner_id ? "Atendente" : null} />
          
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="truncate max-w-[70px]">
              {deal.expected_close_date 
                ? format(new Date(deal.expected_close_date), 'dd/MM/yyyy')
                : "Sem data"
              }
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1.5">
            {pendingActivities > 0 ? (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-600">
                <AlertCircle className="w-3 h-3" />
                {pendingActivities} pendentes
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-medium">Sem atividades</span>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 bg-secondary hover:bg-secondary/80 rounded-md"
              onClick={(e) => { e.stopPropagation(); lead && onOpenChat?.(lead.id); }}
            >
              <MessageCircle className="h-3 w-3 text-muted-foreground" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 bg-secondary hover:bg-secondary/80 rounded-md"
              onClick={(e) => { e.stopPropagation(); onAddActivity?.(deal.id); }}
            >
              <Calendar className="h-3 w-3 text-muted-foreground" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 bg-secondary hover:bg-secondary/80 rounded-md"
              onClick={(e) => { e.stopPropagation(); onClick?.(deal.id); }}
            >
              <FileText className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Tags */}
      {lead?.tags && lead.tags.length > 0 && (
        <div className="pt-2 border-t border-border mt-1">
          <LeadTags tags={lead.tags} maxVisible={3} />
        </div>
      )}
    </div>
  );
}
