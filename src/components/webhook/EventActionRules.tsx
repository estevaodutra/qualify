import { useState } from "react";
import { Plus, Trash2, Webhook, Activity, Zap, Play, Settings2, Bell, MessageSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  useEventActionRules, 
  useCreateEventActionRule, 
  useUpdateEventActionRule, 
  useDeleteEventActionRule,
  EventActionRule 
} from "@/hooks/useWebhookEvents";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  "text_message", "image_message", "video_message", "audio_message",
  "document_message", "sticker_message", "location_message", "contact_message",
  "message_status", "message_reaction", "message_revoked", "poll_response",
  "group_join", "group_leave", "connection_status", "call_received", "unknown"
];

const ACTION_TYPES = [
  { value: "webhook", label: "Enviar Webhook Externo", icon: Webhook },
  { value: "add_to_campaign", label: "Adicionar à Campanha", icon: Zap },
  { value: "trigger_sequence", label: "Disparar Sequência", icon: Play },
];

export function EventActionRules() {
  const { toast } = useToast();
  const { data: rules, isLoading } = useEventActionRules();
  const createRule = useCreateEventActionRule();
  const updateRule = useUpdateEventActionRule();
  const deleteRule = useDeleteEventActionRule();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EventActionRule | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("text_message");
  const [actionType, setActionType] = useState("webhook");
  const [webhookUrl, setWebhookUrl] = useState("");

  const resetForm = () => {
    setName("");
    setEventType("text_message");
    setActionType("webhook");
    setWebhookUrl("");
    setEditingRule(null);
  };

  const handleEdit = (rule: EventActionRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setEventType(rule.eventType);
    setActionType(rule.actionType);
    setWebhookUrl(rule.actionConfig.url || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name || !eventType || !actionType) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const ruleData = {
      name,
      eventType,
      actionType,
      actionConfig: actionType === "webhook" ? { url: webhookUrl } : {},
      isActive: editingRule ? editingRule.isActive : true,
      conditions: {},
    };

    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, ...ruleData });
        toast({ title: "Sucesso", description: "Regra atualizada com sucesso" });
      } else {
        await createRule.mutateAsync(ruleData);
        toast({ title: "Sucesso", description: "Regra criada com sucesso" });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao salvar regra", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta regra?")) {
      await deleteRule.mutateAsync(id);
      toast({ title: "Excluído", description: "Regra removida com sucesso" });
    }
  };

  const toggleActive = async (rule: EventActionRule) => {
    await updateRule.mutateAsync({ id: rule.id, isActive: !rule.isActive });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Regras de Automação Técnica</h3>
          <p className="text-sm text-muted-foreground">
            Mapeie eventos do WhatsApp para ações automáticas de sistema.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Editar Regra" : "Criar Nova Regra"}</DialogTitle>
              <DialogDescription>
                Defina o gatilho classificatório e a ação correspondente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Regra</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Processamento de Resposta de Enquete" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Evento Gatilho</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label>Ação a Executar</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ACTION_TYPES.map(action => (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setActionType(action.value)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                        actionType === action.value && "border-primary"
                      )}
                    >
                      <action.icon className="h-6 w-6" />
                      <span className="text-[10px] font-medium leading-none text-center">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {actionType === "webhook" && (
                <div className="grid gap-2">
                  <Label htmlFor="url">URL do Webhook (POST)</Label>
                  <Input 
                    id="url" 
                    placeholder="https://n8n.exemplo.com/webhook/..." 
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editingRule ? "Salvar Alterações" : "Criar Regra"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rules?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Zap className="mb-4 h-10 w-10 text-muted-foreground/50" />
              <h4 className="text-lg font-medium">Nenhuma regra ativa</h4>
              <p className="max-w-xs text-sm text-muted-foreground">
                Crie sua primeira automação para processar eventos do WhatsApp automaticamente.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                Começar Agora
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules?.map((rule) => (
            <Card key={rule.id} className={cn(!rule.isActive && "opacity-60")}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      rule.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {rule.actionType === "webhook" ? <Webhook className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-base">{rule.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {rule.eventType.replace(/_/g, " ")}
                        </Badge>
                        {rule.intent && (
                          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 border-none">
                            Intenção: {INTENTS.find(i => i.value === rule.intent)?.label || rule.intent}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={rule.isActive} 
                      onCheckedChange={() => toggleActive(rule)} 
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(rule)}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Activity className="h-3 w-3" />
                  <span>
                    {rule.actionType === "webhook" 
                      ? `Envia para: ${rule.actionConfig.url?.substring(0, 40)}...` 
                      : `Ação: ${rule.actionType}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
