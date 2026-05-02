import { useState } from "react";
import { useCallActions, CallAction, CallActionType } from "@/hooks/useCallActions";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useSequences } from "@/hooks/useSequences";
import { useDispatchSequences } from "@/hooks/useDispatchSequences";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, Zap, GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

const actionTypeLabels: Record<CallActionType, string> = {
  start_sequence: "Iniciar Sequência",
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

const statusOptions = [
  { value: "completed", label: "Concluído" },
  { value: "failed", label: "Falhou" },
  { value: "no_answer", label: "Não Atendeu" },
  { value: "busy", label: "Ocupado" },
  { value: "pending", label: "Pendente" },
];

function getConfigSummary(actionType: CallActionType, config: Record<string, unknown>): string | null {
  switch (actionType) {
    case "start_sequence":
      return config.sequenceId ? `Sequência: ${String(config.sequenceId).slice(0, 8)}...` : null;
    case "add_tag":
      return config.tag ? `Tag: ${config.tag}` : null;
    case "update_status": {
      const opt = statusOptions.find((s) => s.value === config.status);
      return opt ? `Status: ${opt.label}` : null;
    }
    case "webhook":
      return config.url ? `URL: ${String(config.url).slice(0, 30)}${String(config.url).length > 30 ? "..." : ""}` : null;
    case "custom_message":
      return config.webhook_url ? `Webhook: ${String(config.webhook_url).slice(0, 30)}...` : null;
    default:
      return null;
  }
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

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-lg border">
      <button type="button" className="cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: action.color }} />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{action.name}</p>
        <p className="text-sm text-muted-foreground">{actionTypeLabels[action.actionType]}</p>
        {configSummary && <p className="text-xs text-muted-foreground truncate">{configSummary}</p>}
      </div>
      <Button variant="ghost" size="icon" onClick={() => onEdit(action)}>
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(action.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ActionsTab({ campaignId }: ActionsTabProps) {
  const { actions, isLoading, createAction, updateAction, deleteAction, reorderActions, isCreating } =
    useCallActions(campaignId);
  const { campaigns: groupCampaigns } = useGroupCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAction, setEditingAction] = useState<CallAction | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#10b981",
    actionType: "none" as CallActionType,
    actionConfig: {} as Record<string, unknown>,
  });
  const selectedCampaignId = (formData.actionConfig.campaignId as string) || undefined;
  const selectedCampaignType = (formData.actionConfig.campaignType as string) || undefined;
  const { sequences: groupSequences } = useSequences(selectedCampaignType === "group" ? selectedCampaignId : undefined);
  const { sequences: dispatchSequences } = useDispatchSequences(selectedCampaignType === "dispatch" ? selectedCampaignId : undefined);
  const campaignSequences = selectedCampaignType === "dispatch" ? dispatchSequences : groupSequences;

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
    setFormData({ name: "", color: "#10b981", actionType: "none", actionConfig: {} });
    setShowDialog(true);
  };

  const handleOpenEdit = (action: CallAction) => {
    setEditingAction(action);
    setFormData({
      name: action.name,
      color: action.color,
      actionType: action.actionType,
      actionConfig: { ...action.actionConfig },
    });
    setShowDialog(true);
  };

  const handleActionTypeChange = (newType: CallActionType) => {
    setFormData({ ...formData, actionType: newType, actionConfig: {} });
  };

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
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ação
        </Button>
      </div>

      {actions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma ação cadastrada</h3>
          <p className="text-muted-foreground mb-4">
            Crie ações para classificar o resultado das ligações.
          </p>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Ação
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ações de Resultado ({actions.length})</CardTitle>
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAction ? "Editar Ação" : "Nova Ação"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="actionName">Nome da Ação</Label>
              <Input
                id="actionName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Venda Concluída"
              />
            </div>
            <div className="grid gap-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="actionType">Tipo de Ação</Label>
              <Select
                value={formData.actionType}
                onValueChange={(v) => handleActionTypeChange(v as CallActionType)}
              >
                <SelectTrigger id="actionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(actionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic config fields */}
            {formData.actionType === "start_sequence" && (
              <>
                <div className="grid gap-2">
                  <Label>Campanha</Label>
                  <Select
                    value={(formData.actionConfig.campaignId as string) || ""}
                    onValueChange={(v) => {
                      const isGroup = groupCampaigns.some((c) => c.id === v);
                      setFormData({
                        ...formData,
                        actionConfig: { campaignId: v, campaignType: isGroup ? "group" : "dispatch", sequenceId: "" },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupCampaigns.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Campanhas de Grupo</SelectLabel>
                          {groupCampaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {dispatchCampaigns.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Campanhas de Disparos</SelectLabel>
                          {dispatchCampaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {formData.actionConfig.campaignId && (
                  <div className="grid gap-2">
                    <Label>Sequência</Label>
                    <Select
                      value={(formData.actionConfig.sequenceId as string) || ""}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          actionConfig: { ...formData.actionConfig, sequenceId: v },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a sequência" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignSequences.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {formData.actionType === "add_tag" && (
              <div className="grid gap-2">
                <Label htmlFor="tag">Nome da Tag</Label>
                <Input
                  id="tag"
                  value={(formData.actionConfig.tag as string) || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actionConfig: { ...formData.actionConfig, tag: e.target.value },
                    })
                  }
                  placeholder="Ex: venda-concluida"
                />
              </div>
            )}

            {formData.actionType === "update_status" && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status do Lead</Label>
                <Select
                  value={(formData.actionConfig.status as string) || ""}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      actionConfig: { ...formData.actionConfig, status: v },
                    })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.actionType === "webhook" && (
              <div className="grid gap-2">
                <Label htmlFor="webhookUrl">URL do Webhook</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  value={(formData.actionConfig.url as string) || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actionConfig: { ...formData.actionConfig, url: e.target.value },
                    })
                  }
                  placeholder="https://example.com/webhook"
                />
              </div>
            )}

            {formData.actionType === "custom_message" && (
              <div className="grid gap-2">
                <Label htmlFor="customMsgWebhookUrl">URL do Webhook</Label>
                <Input
                  id="customMsgWebhookUrl"
                  type="url"
                  value={(formData.actionConfig.webhook_url as string) || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actionConfig: { ...formData.actionConfig, webhook_url: e.target.value },
                    })
                  }
                  placeholder="https://example.com/webhook"
                />
                <p className="text-xs text-muted-foreground">
                  A mensagem digitada pelo operador será enviada neste webhook.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim() || isCreating}>
              {editingAction ? "Salvar" : isCreating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
