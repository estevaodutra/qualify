import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Play,
  MessageSquare,
  Tag,
  UserMinus,
  UserPlus,
  Bell,
  Ban,
  X,
  Plus,
  Webhook,
  ClipboardList,
} from "lucide-react";
import { useSequences } from "@/hooks/useSequences";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useGroupExecutionList } from "@/hooks/useGroupExecutionList";

// Action types
export type PollActionType =
  | "none"
  | "start_sequence"
  | "send_private_message"
  | "add_tag"
  | "remove_from_group"
  | "add_to_group"
  | "notify_admin"
  | "call_webhook"
  | "add_to_list";

export interface PollActionConfig {
  actionType: PollActionType;
  config: Record<string, unknown>;
}

interface PollActionDialogProps {
  open: boolean;
  onClose: () => void;
  optionIndex: number;
  optionText: string;
  currentAction: PollActionConfig | null;
  onSave: (action: PollActionConfig) => void;
  currentCampaignId?: string;
}

const ACTION_TYPES: { value: PollActionType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "none", label: "Nenhuma Ação", icon: Ban, color: "text-muted-foreground" },
  { value: "start_sequence", label: "Iniciar Sequência", icon: Play, color: "text-green-500" },
  { value: "send_private_message", label: "Enviar Mensagem Direta", icon: MessageSquare, color: "text-blue-500" },
  { value: "add_tag", label: "Adicionar Tag", icon: Tag, color: "text-yellow-500" },
  { value: "remove_from_group", label: "Remover do Grupo", icon: UserMinus, color: "text-red-500" },
  { value: "add_to_group", label: "Adicionar em Outro Grupo", icon: UserPlus, color: "text-purple-500" },
  { value: "notify_admin", label: "Notificar Administrador", icon: Bell, color: "text-orange-500" },
  { value: "call_webhook", label: "Acionar Webhook", icon: Webhook, color: "text-cyan-500" },
  { value: "add_to_list", label: "Adicionar a uma Lista", icon: ClipboardList, color: "text-emerald-500" },
];

const DELAY_OPTIONS = [
  { value: 0, label: "Imediatamente" },
  { value: 5, label: "5 segundos" },
  { value: 30, label: "30 segundos" },
  { value: 60, label: "1 minuto" },
  { value: 300, label: "5 minutos" },
];

const MESSAGE_TYPES = [
  { value: "text", label: "Texto" },
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "document", label: "Documento" },
  { value: "audio", label: "Áudio" },
];

function AddToListConfig({
  config,
  updateConfig,
  campaigns,
}: {
  config: Record<string, unknown>;
  updateConfig: (key: string, value: unknown) => void;
  campaigns: { id: string; name: string }[];
}) {
  const targetCampaignId = (config.campaignId as string) || "";
  const { lists, isLoading: loadingLists } = useGroupExecutionList(targetCampaignId);

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Campanha de destino</Label>
        <Select
          value={targetCampaignId}
          onValueChange={(v) => {
            updateConfig("campaignId", v);
            const camp = campaigns.find((c) => c.id === v);
            updateConfig("campaignName", camp?.name || "");
            updateConfig("listId", "");
            updateConfig("listName", "");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma campanha" />
          </SelectTrigger>
          <SelectContent>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {targetCampaignId && (
        <div className="space-y-2">
          <Label>Lista de destino</Label>
          <Select
            value={(config.listId as string) || undefined}
            onValueChange={(v) => {
              updateConfig("listId", v);
              const list = lists.find((l) => l.id === v);
              updateConfig("listName", list?.name || "");
            }}
            disabled={loadingLists}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingLists ? "Carregando..." : "Selecione uma lista"} />
            </SelectTrigger>
            <SelectContent>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
              {lists.length === 0 && !loadingLists && (
                <SelectItem value="__empty__" disabled>
                  Nenhuma lista encontrada
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O participante será adicionado à lista selecionada
          </p>
        </div>
      )}
    </div>
  );
}

export function PollActionDialog({
  open,
  onClose,
  optionIndex,
  optionText,
  currentAction,
  onSave,
  currentCampaignId,
}: PollActionDialogProps) {
  const [actionType, setActionType] = useState<PollActionType>("none");
  const [config, setConfig] = useState<Record<string, unknown>>({});

  // Data hooks
  const { campaigns } = useGroupCampaigns();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(currentCampaignId || "");
  const { sequences } = useSequences(selectedCampaignId || undefined);
  const { linkedGroups } = useCampaignGroups(currentCampaignId || null);

  // Tag input state
  const [newTag, setNewTag] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (currentAction) {
        setActionType(currentAction.actionType);
        setConfig(currentAction.config);
        // Set selected campaign from config or use current
        const configCampaignId = currentAction.config.campaignId as string;
        setSelectedCampaignId(configCampaignId || currentCampaignId || "");
      } else {
        setActionType("none");
        setConfig({});
        setSelectedCampaignId(currentCampaignId || "");
      }
    }
  }, [open, currentAction, currentCampaignId]);

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave({ actionType, config });
    onClose();
  };

  const addTag = () => {
    if (newTag.trim()) {
      const tags = (config.tags as string[]) || [];
      if (!tags.includes(newTag.trim())) {
        updateConfig("tags", [...tags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const tags = (config.tags as string[]) || [];
    updateConfig("tags", tags.filter((t) => t !== tagToRemove));
  };

  const selectedActionInfo = ACTION_TYPES.find((a) => a.value === actionType);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Configurar Ação
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Opção {optionIndex + 1}: <span className="font-medium">"{optionText}"</span>
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-4">
            {/* Action Type Select */}
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as PollActionType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma ação" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      <div className="flex items-center gap-2">
                        <action.icon className={`h-4 w-4 ${action.color}`} />
                        <span>{action.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Config Based on Action Type */}
            {actionType === "start_sequence" && (
              <div className="space-y-4 pt-2">
                <Tabs
                  value={selectedCampaignId === currentCampaignId ? "current" : "other"}
                  onValueChange={(v) => {
                    if (v === "current") {
                      setSelectedCampaignId(currentCampaignId || "");
                      updateConfig("campaignId", currentCampaignId);
                    } else {
                      setSelectedCampaignId("");
                      updateConfig("campaignId", "");
                      updateConfig("sequenceId", "");
                    }
                  }}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="current" className="flex-1">Esta campanha</TabsTrigger>
                    <TabsTrigger value="other" className="flex-1">Outra campanha</TabsTrigger>
                  </TabsList>

                  <TabsContent value="other" className="mt-3">
                    <div className="space-y-2">
                      <Label>Campanha</Label>
                      <Select
                        value={selectedCampaignId}
                        onValueChange={(v) => {
                          setSelectedCampaignId(v);
                          updateConfig("campaignId", v);
                          updateConfig("sequenceId", "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma campanha" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns
                            .filter((c) => c.id !== currentCampaignId)
                            .map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label>Sequência</Label>
                  <Select
                    value={(config.sequenceId as string) || ""}
                    onValueChange={(v) => updateConfig("sequenceId", v)}
                    disabled={!selectedCampaignId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCampaignId ? "Selecione uma sequência" : "Selecione uma campanha primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sequences.map((seq) => (
                        <SelectItem key={seq.id} value={seq.id}>
                          {seq.name}
                        </SelectItem>
                      ))}
                      {sequences.length === 0 && selectedCampaignId && (
                        <SelectItem value="" disabled>
                          Nenhuma sequência encontrada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Delay antes de iniciar</Label>
                  <Select
                    value={String((config.delaySeconds as number) || 0)}
                    onValueChange={(v) => updateConfig("delaySeconds", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELAY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enviar no privado</Label>
                    <p className="text-xs text-muted-foreground">
                      Executa a sequência no chat privado do participante
                    </p>
                  </div>
                  <Switch
                    checked={(config.sendPrivate as boolean) || false}
                    onCheckedChange={(v) => updateConfig("sendPrivate", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Executar apenas uma vez</Label>
                    <p className="text-xs text-muted-foreground">
                      Ignora votos repetidos do mesmo participante
                    </p>
                  </div>
                  <Switch
                    checked={(config.executeOnce as boolean) ?? true}
                    onCheckedChange={(v) => updateConfig("executeOnce", v)}
                  />
                </div>
              </div>
            )}

            {actionType === "send_private_message" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Tipo de Mensagem</Label>
                  <Select
                    value={(config.messageType as string) || "text"}
                    onValueChange={(v) => updateConfig("messageType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSAGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Conteúdo</Label>
                  <Textarea
                    placeholder="Oi {{name}}! Obrigado por responder..."
                    value={(config.content as string) || ""}
                    onChange={(e) => updateConfig("content", e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{{name}}"}, {"{{phone}}"}, {"{{group}}"}, {"{{option}}"}
                  </p>
                </div>

                {(config.messageType as string) !== "text" && (
                  <div className="space-y-2">
                    <Label>URL da Mídia</Label>
                    <Input
                      placeholder="https://exemplo.com/arquivo.pdf"
                      value={(config.mediaUrl as string) || ""}
                      onChange={(e) => updateConfig("mediaUrl", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Delay antes de enviar</Label>
                  <Select
                    value={String((config.delaySeconds as number) || 5)}
                    onValueChange={(v) => updateConfig("delaySeconds", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELAY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {actionType === "add_tag" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Tags a adicionar</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome da tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" size="icon" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {((config.tags as string[]) || []).map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tags são usadas para segmentar participantes
                  </p>
                </div>
              </div>
            )}

            {actionType === "remove_from_group" && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enviar mensagem antes</Label>
                    <p className="text-xs text-muted-foreground">
                      Envia uma mensagem privada antes de remover
                    </p>
                  </div>
                  <Switch
                    checked={(config.sendMessageBefore as boolean) || false}
                    onCheckedChange={(v) => updateConfig("sendMessageBefore", v)}
                  />
                </div>

                {(config.sendMessageBefore as boolean) && (
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea
                      placeholder="Você foi removido por..."
                      value={(config.message as string) || ""}
                      onChange={(e) => updateConfig("message", e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Delay antes de remover</Label>
                  <Select
                    value={String((config.delaySeconds as number) || 5)}
                    onValueChange={(v) => updateConfig("delaySeconds", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELAY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {actionType === "add_to_group" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Grupo de destino</Label>
                  <Select
                    value={(config.targetGroupJid as string) || ""}
                    onValueChange={(v) => {
                      const group = linkedGroups?.find((g) => g.groupJid === v);
                      updateConfig("targetGroupJid", v);
                      updateConfig("targetGroupName", group?.groupName || "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkedGroups?.map((group) => (
                        <SelectItem key={group.groupJid} value={group.groupJid}>
                          {group.groupName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Grupos vinculados à campanha atual
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enviar boas-vindas</Label>
                    <p className="text-xs text-muted-foreground">
                      Envia mensagem após adicionar ao grupo
                    </p>
                  </div>
                  <Switch
                    checked={(config.sendWelcome as boolean) || false}
                    onCheckedChange={(v) => updateConfig("sendWelcome", v)}
                  />
                </div>

                {(config.sendWelcome as boolean) && (
                  <div className="space-y-2">
                    <Label>Mensagem de boas-vindas</Label>
                    <Textarea
                      placeholder="Bem-vindo ao grupo VIP!"
                      value={(config.welcomeMessage as string) || ""}
                      onChange={(e) => updateConfig("welcomeMessage", e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {actionType === "notify_admin" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Tipo de notificação</Label>
                  <Select
                    value={(config.notifyType as string) || "whatsapp"}
                    onValueChange={(v) => updateConfig("notifyType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="webhook">Webhook Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(config.notifyType as string) === "whatsapp" && (
                  <div className="space-y-2">
                    <Label>Telefone do Administrador</Label>
                    <Input
                      placeholder="5511999999999"
                      value={(config.targetPhone as string) || ""}
                      onChange={(e) => updateConfig("targetPhone", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: código do país + DDD + número
                    </p>
                  </div>
                )}

                {(config.notifyType as string) === "webhook" && (
                  <div className="space-y-2">
                    <Label>URL do Webhook</Label>
                    <Input
                      placeholder="https://seu-sistema.com/webhook"
                      value={(config.webhookUrl as string) || ""}
                      onChange={(e) => updateConfig("webhookUrl", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Mensagem de Notificação</Label>
                  <Textarea
                    placeholder="Novo lead: {{name}} respondeu '{{option}}' na enquete."
                    value={(config.message as string) || ""}
                    onChange={(e) => updateConfig("message", e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{{name}}"}, {"{{phone}}"}, {"{{group}}"}, {"{{option}}"}
                  </p>
                </div>
              </div>
            )}

            {actionType === "call_webhook" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>URL do Webhook</Label>
                  <Input
                    placeholder="https://seu-sistema.com/webhook/poll"
                    value={(config.webhookUrl as string) || ""}
                    onChange={(e) => updateConfig("webhookUrl", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O payload será enviado via POST para esta URL
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Repassar corpo original</Label>
                    <p className="text-xs text-muted-foreground">
                      Envia o payload original recebido, sem processamento
                    </p>
                  </div>
                  <Switch
                    checked={(config.forwardRawBody as boolean) || false}
                    onCheckedChange={(v) => updateConfig("forwardRawBody", v)}
                  />
                </div>

                {!(config.forwardRawBody as boolean) && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Incluir dados da instância</Label>
                      <p className="text-xs text-muted-foreground">
                        Adiciona informações da instância WhatsApp
                      </p>
                    </div>
                    <Switch
                      checked={(config.includeInstance as boolean) ?? true}
                      onCheckedChange={(v) => updateConfig("includeInstance", v)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Headers customizados (opcional)</Label>
                  <Textarea
                    placeholder='{"Authorization": "Bearer token"}'
                    value={(config.customHeaders as string) || ""}
                    onChange={(e) => updateConfig("customHeaders", e.target.value)}
                    rows={2}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    JSON com headers adicionais
                  </p>
                </div>
              </div>
            )}

            {actionType === "add_to_list" && (
              <AddToListConfig
                config={config}
                updateConfig={updateConfig}
                campaigns={campaigns}
              />
            )}

            {actionType === "none" && (
              <div className="py-4 text-center text-muted-foreground">
                <Ban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma ação será executada</p>
                <p className="text-xs mt-1">
                  A resposta será apenas registrada
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <selectedActionInfo.icon className={`h-4 w-4 mr-2 ${selectedActionInfo.color}`} />
            Salvar Ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get action icon color
export function getActionIconColor(actionType: PollActionType | undefined): string {
  const action = ACTION_TYPES.find((a) => a.value === actionType);
  return action?.color || "text-muted-foreground";
}

// Helper function to get action label
export function getActionLabel(actionType: PollActionType | undefined): string {
  const action = ACTION_TYPES.find((a) => a.value === actionType);
  return action?.label || "Nenhuma";
}
