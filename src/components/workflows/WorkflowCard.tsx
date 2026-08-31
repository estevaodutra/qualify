import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical, FolderInput, ExternalLink, Send, Users, Skull, Activity, PhoneCall, Trash2, Copy, Webhook, CalendarClock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowDefinition, WorkflowSourceType } from "@/hooks/useWorkflowDefinitions";
import type { WorkflowFolder } from "@/hooks/useWorkflowFolders";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativa",
  paused: "Pausada",
  error: "Com erro",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/10 text-success border-success/30",
  paused: "bg-warning/10 text-warning border-warning/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

export function getWorkflowTypeMeta(workflow: WorkflowDefinition): { label: string; icon: any; className?: string } {
  if (workflow.sourceType === "context_campaign") {
    return { label: "Contexto", icon: Activity, className: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10" };
  }
  if (workflow.sourceType === "call_campaign") {
    return { label: "Ligação", icon: PhoneCall, className: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10" };
  }
  if (workflow.sourceType === "pirate_campaign") {
    return { label: "Pirata", icon: Skull, className: "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10" };
  }

  const config = workflow.triggerConfig || {};
  const isGroup = 
    config.destinationMode === "groups" || 
    config.isGroup === true || 
    config.groupScope === "selected" || 
    (Array.isArray(config.selectedGroupJids) && config.selectedGroupJids.length > 0) || 
    workflow.triggerType === "group_event";

  if (isGroup) {
    return { label: "Grupo", icon: Users, className: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" };
  }

  const isWebhook = workflow.triggerType === "webhook" || workflow.triggerType === "api" || !!config.referencePayload;
  if (isWebhook) {
    return { label: "Webhook", icon: Webhook, className: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10" };
  }

  if (workflow.triggerType === "scheduled") {
    return { label: "Agendado", icon: CalendarClock, className: "border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10" };
  }

  return { label: "WhatsApp", icon: Send, className: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" };
}

const SOURCE_TYPE_BUILDER_ROUTE: Record<WorkflowSourceType, (def: WorkflowDefinition) => string | null> = {
  dispatch_sequence: () => null, // resolved via /workflows/:id/builder
  group_sequence: () => null,
  context_campaign: () => "/campaigns/whatsapp/contexto",
  pirate_campaign: () => "/campaigns/whatsapp/pirata",
  call_campaign: () => "/campaigns/telefonia/ligacao",
};

interface WorkflowCardProps {
  workflow: WorkflowDefinition;
  folders: WorkflowFolder[];
  onMoveToFolder: (folderId: string | null) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export function WorkflowCard({ workflow, folders, onMoveToFolder, onDelete, onDuplicate }: WorkflowCardProps) {
  const navigate = useNavigate();
  const meta = getWorkflowTypeMeta(workflow);
  const Icon = meta.icon;

  const openBuilder = () => {
    const legacyRoute = SOURCE_TYPE_BUILDER_ROUTE[workflow.sourceType](workflow);
    navigate(legacyRoute || `/workflows/${workflow.id}/builder`);
  };

  return (
    <Card
      draggable
      onDragStart={(e) => e.dataTransfer.setData("application/x-workflow-id", workflow.id)}
      className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-xl shadow-sm hover:shadow-elevation-md transition-all cursor-grab active:cursor-grabbing"
    >
      <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5 min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border", STATUS_COLORS[workflow.status])}>
              {STATUS_LABELS[workflow.status]}
            </Badge>
            <Badge variant="outline" className={cn("text-[9px] font-semibold gap-1 border", meta.className)}>
              <Icon className="h-3 w-3" /> {meta.label}
            </Badge>
          </div>
          <CardTitle className="text-sm font-bold truncate">{workflow.name}</CardTitle>
          {workflow.description && (
            <p className="text-xs text-muted-foreground/70 line-clamp-2">{workflow.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openBuilder}>
              <ExternalLink className="h-3.5 w-3.5 mr-2" /> Abrir automação
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar automação
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-3.5 w-3.5 mr-2" /> Mover para pasta
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onMoveToFolder(null)}>Sem pasta</DropdownMenuItem>
                {folders.map((folder) => (
                  <DropdownMenuItem key={folder.id} onClick={() => onMoveToFolder(folder.id)}>
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir automação
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pt-0">
        <Button variant="ghost" size="sm" className="w-full justify-start text-primary/80 hover:text-primary" onClick={openBuilder}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir
        </Button>
      </CardContent>
    </Card>
  );
}
