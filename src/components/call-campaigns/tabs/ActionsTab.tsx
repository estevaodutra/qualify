import { useState, useMemo } from "react";
import { useCallActions, CallAction, CallActionType } from "@/hooks/useCallActions";
import { useWorkflowDefinitions } from "@/hooks/useWorkflowDefinitions";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, Zap, GripVertical, GitBranch, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ActionsTabProps {
  campaignId: string;
}

const actionTypeLabels: Record<string, string> = {
  start_workflow: "Disparar Workflow",
  quick_reply: "Disparar Mensagem Rápida",
  start_sequence: "Disparar Workflow",
  add_tag: "Adicionar Tag",
  update_status: "Atualizar Status",
  webhook: "Webhook",
  none: "Apenas Registrar",
  custom_message: "Mensagem Personalizada",
};

const colorOptions = [
  { value: "#10b981", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#f59e0b", label: "Amarelo" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#6b7280", label: "Cinza" },
];

function getConfigSummary(actionType: string, config: Record<string, unknown>): string | null {
  if (actionType === "start_workflow" || actionType === "start_sequence") {
    const name = (config.workflowName as string) || (config.sequenceName as string);
    if (name) return `Fluxo: ${name}`;
    const id = config.workflowId || config.sequenceId;
    return id ? `Fluxo: ${String(id).slice(0, 8)}...` : null;
  }
  if (actionType === "quick_reply") {
    const title = (config.quickReplyTitle as string) || (config.title as string);
    if (title) return `Mensagem Rápida: ${title}`;
    const id = config.quickReplyId;
    return id ? `Mensagem: ${String(id).slice(0, 8)}...` : null;
  }
  if (actionType === "add_tag" && config.tag) return `Tag: ${config.tag}`;
  if (actionType === "webhook" && (config.url || config.webhook_url)) {
    const url = String(config.url || config.webhook_url);
    return `URL: ${url.slice(0, 30)}...`;
  }
  return null;
}

interface SortableActionItemProps {
  action: CallAction;
  onEdit: (action: CallAction) => void;
  onDelete: (id: string) => void;
}

function SortableActionItem({ action, onEdit, onDelete }: SortableActionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: action.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const configSummary = getConfigSummary(action.actionType, action.actionConfig);
  const isWorkflow = action.actionType === "start_workflow" || action.actionType === "start_sequence";
  const isQuickReply = action.actionType === "quick_reply";

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-lg border bg-card/40 hover:bg-card/70 transition-colors">
      <button type="button" className="cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: action.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{action.name}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 font-normal">
            {isWorkflow ? (
              <>
                <GitBranch className="h-2.5 w-2.5 text-primary" />
                Workflow
              </>
            ) : isQuickReply ? (
              <>
                <MessageSquare className="h-2.5 w-2.5 text-emerald-500" />
                Mensagem Rápida
              </>
            ) : (
              actionTypeLabels[action.actionType] || action.actionType
            )}
          </Badge>
        </div>
        {configSummary && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{configSummary}</p>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => onEdit(action)}>
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer" onClick={() => onDelete(action.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ActionsTab({ campaignId }: ActionsTabProps) {
  const { actions, isLoading, createAction, updateAction, deleteAction, reorderActions, isCreating } =
    useCallActions(campaignId);
  const { definitions: workflows = [], isLoading: isWorkflowsLoading } = useWorkflowDefinitions();
  const { quickReplies = [], isLoading: isRepliesLoading } = useQuickReplies();

  const [showDialog, setShowDialog] = useState(false);
  const [editingAction, setEditingAction] = useState<CallAction | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#10b981",
    actionType: "start_workflow" as CallActionType,
    actionConfig: {} as Record<string, unknown>,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = actions.findIndex((a) => a.id === active.id);
    const newIndex = actions.findIndex((a) => a.id === over.id);
    const newOrder = arrayMove(actions, oldIndex, newIndex);
    reorderActions(newOrder.map((a) => a.id));
  };

  const handleOpenCreate = () => {
    setEditingAction(null);
    setFormData({
      name: "",
      color: "#10b981",
      actionType: "start_workflow",
      actionConfig: {},
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (action: CallAction) => {
    setEditingAction(action);
    const normalizedType: CallActionType =
      action.actionType === "start_sequence" ? "start_workflow" : action.actionType;

    setFormData({
      name: action.name,
      color: action.color,
      actionType: normalizedType,
      actionConfig: { ...action.actionConfig },
    });
    setShowDialog(true);
  };

  const handleActionTypeChange = (newType: CallActionType) => {
    setFormData({ ...formData, actionType: newType, actionConfig: {} });
  };

  const isFormValid =
    !!formData.name.trim() &&
    ((formData.actionType === "start_workflow" || formData.actionType === "start_sequence")
      ? !!(formData.actionConfig.workflowId || formData.actionConfig.sequenceId)
      : formData.actionType === "quick_reply"
      ? !!formData.actionConfig.quickReplyId
      : true);

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingAction) {
      await updateAction({
        id: editingAction.id,
        updates: {
          name: formData.name,
          color: formData.color,
          actionType: formData.actionType,
          actionConfig: formData.actionConfig,
        },
      });
    } else {
      await createAction({
        name: formData.name,
        color: formData.color,
        actionType: formData.actionType,
        actionConfig: formData.actionConfig,
      });
    }
    setShowDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenCreate} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Nova Ação
        </Button>
      </div>

      {actions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma ação cadastrada</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Crie ações para que o operador possa disparar workflows ou mensagens rápidas pelo card da ligação.
          </p>
          <Button onClick={handleOpenCreate} className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Criar Ação
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações de Resultado ({actions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={actions.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                {actions.map((action) => (
                  <SortableActionItem
                    key={action.id}
                    action={action}
                    onEdit={handleOpenEdit}
                    onDelete={deleteAction}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

      {/* Dialog Nova / Editar Ação */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAction ? "Editar Ação" : "Nova Ação"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Nome da Ação */}
            <div className="grid gap-2">
              <Label htmlFor="actionName">Nome da Ação</Label>
              <Input
                id="actionName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Não Atendeu, Venda Concluída..."
              />
            </div>

            {/* Cor */}
            <div className="grid gap-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                      formData.color === color.value
                        ? "border-foreground scale-110 shadow-sm"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Tipo de Ação (Apenas as duas funções solicitadas) */}
            <div className="grid gap-2">
              <Label htmlFor="actionType">Tipo de Ação</Label>
              <Select
                value={
                  formData.actionType === "start_sequence"
                    ? "start_workflow"
                    : formData.actionType
                }
                onValueChange={(v) => handleActionTypeChange(v as CallActionType)}
              >
                <SelectTrigger id="actionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start_workflow">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      <span className="font-medium">Disparar Workflow</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="quick_reply">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium">Disparar Mensagem Rápida</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Segunda caixa de seleção: Seletor de Workflow */}
            {(formData.actionType === "start_workflow" || formData.actionType === "start_sequence") && (
              <div className="grid gap-2 animate-in fade-in-50 duration-200">
                <Label htmlFor="workflowSelect">Selecionar Fluxo / Workflow</Label>
                <Select
                  value={
                    (formData.actionConfig.workflowId as string) ||
                    (formData.actionConfig.sequenceId as string) ||
                    ""
                  }
                  onValueChange={(v) => {
                    const selected = workflows.find((w) => w.id === v || w.sourceId === v);
                    const name = selected?.name || "Workflow";
                    setFormData({
                      ...formData,
                      actionConfig: {
                        ...formData.actionConfig,
                        workflowId: v,
                        workflowName: name,
                        sequenceId: v,
                        sequenceName: name,
                      },
                    });
                  }}
                >
                  <SelectTrigger id="workflowSelect">
                    <SelectValue placeholder="Selecione o fluxo a ser executado..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {workflows.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Nenhum fluxo encontrado. Crie um workflow na seção Workflows.
                      </div>
                    ) : (
                      workflows.map((wf) => (
                        <SelectItem key={wf.id} value={wf.id}>
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium">{wf.name}</span>
                            {wf.status && (
                              <span className="text-[10px] text-muted-foreground ml-1">
                                ({wf.status === "active" ? "Ativo" : wf.status})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Ao clicar nesta ação no card da ligação, o fluxo selecionado será disparado para o contato.
                </p>
              </div>
            )}

            {/* Segunda caixa de seleção: Seletor de Mensagem Rápida */}
            {formData.actionType === "quick_reply" && (
              <div className="grid gap-2 animate-in fade-in-50 duration-200">
                <Label htmlFor="quickReplySelect">Selecionar Mensagem Rápida</Label>
                <Select
                  value={(formData.actionConfig.quickReplyId as string) || ""}
                  onValueChange={(v) => {
                    const selected = quickReplies.find((r) => r.id === v);
                    const title = selected?.title || "Mensagem Rápida";
                    const contentJson = (selected?.content_json as any)?.content || (selected as any)?.content;
                    setFormData({
                      ...formData,
                      actionConfig: {
                        ...formData.actionConfig,
                        quickReplyId: v,
                        quickReplyTitle: title,
                        shortcut: selected?.shortcut,
                        contentType: selected?.content_type,
                        content: contentJson,
                      },
                    });
                  }}
                >
                  <SelectTrigger id="quickReplySelect">
                    <SelectValue placeholder="Selecione a resposta rápida a enviar..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {quickReplies.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Nenhuma resposta rápida cadastrada. Cadastre em Chat &gt; Respostas Rápidas.
                      </div>
                    ) : (
                      quickReplies.map((qr) => (
                        <SelectItem key={qr.id} value={qr.id}>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="font-medium">{qr.title}</span>
                            {qr.shortcut && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                /{qr.shortcut}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  A mensagem rápida selecionada será enviada diretamente para o WhatsApp do contato.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid || isCreating}>
              {editingAction ? "Salvar" : isCreating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
