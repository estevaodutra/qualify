import { useState } from "react";
import { LocalNode } from "./shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Zap, Play, Send,
  MessageSquare, Clock, GitBranch, Bell, Link2,
  Image, Video, Music, FileText, Smile,
  BarChart3, MousePointerClick, List, MapPin, Contact, Calendar,
  Pencil, ImageIcon, UserPlus, UserMinus, ShieldPlus, ShieldMinus, Settings, CircleDot,
} from "lucide-react";

interface UnifiedNodeConfigPanelProps {
  node: LocalNode;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
  open: boolean;
  mode: "group" | "dispatch";
  onManualSend?: () => void;
  isSendingManual?: boolean;
  renderMediaUploader?: (props: {
    mediaType: string;
    currentUrl: string;
    onUpload: (url: string, filename?: string) => void;
    onUrlChange: (url: string) => void;
    placeholder: string;
  }) => React.ReactNode;
  renderPollActionDialog?: (props: {
    open: boolean;
    onClose: () => void;
    optionIndex: number;
    optionText: string;
    currentAction: unknown;
    onSave: (action: unknown) => void;
  }) => React.ReactNode;
  getOptionAction?: (node: LocalNode, index: number) => unknown;
  getActionIconColor?: (actionType?: string) => string;
  getActionLabel?: (actionType?: string) => string;
}

const NODE_TITLES: Record<string, { title: string; icon: React.ElementType }> = {
  message: { title: "Texto", icon: MessageSquare },
  image: { title: "Imagem", icon: Image },
  video: { title: "Vídeo", icon: Video },
  audio: { title: "Áudio", icon: Music },
  document: { title: "Documento", icon: FileText },
  sticker: { title: "Figurinha", icon: Smile },
  poll: { title: "Enquete", icon: BarChart3 },
  buttons: { title: "Botões", icon: MousePointerClick },
  list: { title: "Lista", icon: List },
  location: { title: "Localização", icon: MapPin },
  contact: { title: "Contato", icon: Contact },
  event: { title: "Evento", icon: Calendar },
  delay: { title: "Delay", icon: Clock },
  condition: { title: "Condição", icon: GitBranch },
  notify: { title: "Notificar", icon: Bell },
  webhook: { title: "Webhook", icon: Link2 },
  webhook_forward: { title: "Enviar p/ Webhook", icon: Send },
  group_create: { title: "Criar Grupo", icon: Plus },
  group_rename: { title: "Renomear Grupo", icon: Pencil },
  group_photo: { title: "Alterar Foto", icon: ImageIcon },
  group_description: { title: "Alterar Descrição", icon: FileText },
  group_add_participant: { title: "Adicionar Participante", icon: UserPlus },
  group_remove_participant: { title: "Remover Participante", icon: UserMinus },
  group_promote_admin: { title: "Promover Admin", icon: ShieldPlus },
  group_remove_admin: { title: "Remover Admin", icon: ShieldMinus },
  group_settings: { title: "Configurações do Grupo", icon: Settings },
  status_image: { title: "Status Imagem", icon: CircleDot },
  status_video: { title: "Status Vídeo", icon: CircleDot },
};

const QUICK_DELAYS = [
  { label: "15 min", minutes: 15, hours: 0, days: 0 },
  { label: "30 min", minutes: 30, hours: 0, days: 0 },
  { label: "1 hora", minutes: 0, hours: 1, days: 0 },
  { label: "2 horas", minutes: 0, hours: 2, days: 0 },
  { label: "1 dia", minutes: 0, hours: 0, days: 1 },
  { label: "2 dias", minutes: 0, hours: 0, days: 2 },
];

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const SENDABLE_NODE_TYPES = [
  "message", "image", "video", "audio", "document", "sticker",
  "buttons", "list", "poll", "location", "contact", "event",
  "status_image", "status_video",
  "group_create", "group_rename", "group_photo", "group_description",
  "group_add_participant", "group_remove_participant",
  "group_promote_admin", "group_remove_admin", "group_settings",
];

function NodeScheduleSection({
  config,
  onUpdateConfig,
  onManualSend,
  isSendingManual,
  nodeType,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  onManualSend?: () => void;
  isSendingManual?: boolean;
  nodeType: string;
}) {
  if (!SENDABLE_NODE_TYPES.includes(nodeType)) return null;

  const schedule = (config.schedule as {
    enabled?: boolean; scheduleType?: string;
    days?: number[]; times?: string[];
    fixedDate?: string; fixedTime?: string;
    delayValue?: number; delayUnit?: string; delayTime?: string;
  }) || {};
  const enabled = schedule.enabled || false;
  const scheduleType = schedule.scheduleType || "recurring";
  const days = schedule.days || [];
  const times = schedule.times || [];

  const updateSchedule = (patch: Partial<typeof schedule>) => {
    onUpdateConfig("schedule", { ...schedule, ...patch });
  };

  const toggleDay = (day: number) => {
    const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    updateSchedule({ days: newDays });
  };

  const addTime = () => {
    updateSchedule({ times: [...times, "09:00"] });
  };

  const removeTime = (index: number) => {
    updateSchedule({ times: times.filter((_, i) => i !== index) });
  };

  const updateTime = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    updateSchedule({ times: newTimes });
  };

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Agendar envio</Label>
            <p className="text-xs text-muted-foreground">Definir quando esta mensagem será enviada</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={checked => updateSchedule({ enabled: checked })}
          />
        </div>

        {enabled && (
          <div className="space-y-3 pl-1">
            {/* Schedule type selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de agendamento</Label>
              <Select value={scheduleType} onValueChange={v => updateSchedule({ scheduleType: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">📅 Data e hora fixa</SelectItem>
                  <SelectItem value="delay">⏱️ Delay relativo</SelectItem>
                  <SelectItem value="recurring">🔄 Recorrente (dias da semana)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* FIXED */}
            {scheduleType === "fixed" && (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={(schedule.fixedDate as string) || ""}
                    onChange={e => updateSchedule({ fixedDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hora</Label>
                  <Input
                    type="time"
                    value={(schedule.fixedTime as string) || "09:00"}
                    onChange={e => updateSchedule({ fixedTime: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* DELAY */}
            {scheduleType === "delay" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      type="number"
                      min={1}
                      value={(schedule.delayValue as number) || 1}
                      onChange={e => updateSchedule({ delayValue: Number(e.target.value) })}
                      className="h-8 text-xs w-20"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Unidade</Label>
                    <Select value={(schedule.delayUnit as string) || "days"} onValueChange={v => updateSchedule({ delayUnit: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horário</Label>
                    <Input
                      type="time"
                      value={(schedule.delayTime as string) || "08:00"}
                      onChange={e => updateSchedule({ delayTime: e.target.value })}
                      className="h-8 text-xs w-24"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  💡 Enviado após {(schedule.delayValue as number) || 1} {(schedule.delayUnit as string) === "minutes" ? "min" : (schedule.delayUnit as string) === "hours" ? "h" : "dias"} da entrada na campanha
                </p>
              </div>
            )}

            {/* RECURRING */}
            {scheduleType === "recurring" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dias da semana</Label>
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAY_LABELS.map((label, idx) => (
                      <Badge
                        key={idx}
                        variant={days.includes(idx) ? "default" : "outline"}
                        className="cursor-pointer text-xs px-2 py-1 select-none"
                        onClick={() => toggleDay(idx)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Horários</Label>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={addTime}>
                      <Plus className="h-3 w-3 mr-1" /> Horário
                    </Button>
                  </div>
                  {times.map((time, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={time}
                        onChange={e => updateTime(idx, e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTime(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {times.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhum horário definido</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {onManualSend && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onManualSend}
            disabled={isSendingManual}
          >
            <Play className="h-4 w-4 mr-2" />
            {isSendingManual ? "Disparando..." : "Disparar agora"}
          </Button>
        )}
      </div>
    </>
  );
}

export function UnifiedNodeConfigPanel({
  node,
  onUpdate,
  onClose,
  open,
  mode,
  onManualSend,
  isSendingManual,
  renderMediaUploader,
  renderPollActionDialog,
  getOptionAction,
  getActionIconColor,
  getActionLabel,
}: UnifiedNodeConfigPanelProps) {
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);

  const nodeInfo = NODE_TITLES[node.nodeType] || NODE_TITLES.message;
  const Icon = nodeInfo.icon;

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ ...node.config, [key]: value });
  };

  const isGroup = mode === "group";

  const openActionDialog = (index: number) => {
    setEditingOptionIndex(index);
    setActionDialogOpen(true);
  };

  const renderMediaField = (mediaType: string, placeholder: string) => {
    if (renderMediaUploader) {
      return renderMediaUploader({
        mediaType,
        currentUrl: (node.config.url as string) || "",
        onUpload: (url, filename) => {
          const updates: Record<string, unknown> = { ...node.config, url };
          if (filename) updates.filename = filename;
          onUpdate(updates);
        },
        onUrlChange: (url) => updateConfig("url", url),
        placeholder,
      });
    }
    return (
      <Input
        placeholder={placeholder}
        value={(node.config.url as string) || ""}
        onChange={e => updateConfig("url", e.target.value)}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] !flex !flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <DialogTitle className="text-sm">{nodeInfo.title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          <div className="space-y-4">
            {/* Node Label/Name */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Nome do componente</Label>
              <Input
                placeholder={nodeInfo.title}
                value={(node.config.label as string) || ""}
                onChange={e => updateConfig("label", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Separator />

          {/* MESSAGE */}
          {node.nodeType === "message" && (
            <>
              <div className="space-y-2">
                <Label>Conteúdo da Mensagem</Label>
                <Textarea
                  placeholder="Digite a mensagem..."
                  value={(node.config.content as string) || ""}
                  onChange={e => updateConfig("content", e.target.value)}
                  rows={isGroup ? 4 : 5}
                />
                <p className="text-xs text-muted-foreground">
                  {isGroup
                    ? <>Variáveis: {"{{name}}"}, {"{{phone}}"}, {"{{group}}"}</>
                    : <>Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}</>
                  }
                </p>
              </div>
              {!isGroup && node.config.content && (
                <div>
                  <Label className="text-sm text-muted-foreground">Prévia:</Label>
                  <div className="mt-2 p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">
                    {String(node.config.content)
                      .replace("{nome}", "João")
                      .replace("{telefone}", "+55 11 99999-9999")
                      .replace("{email}", "joao@email.com")}
                  </div>
                </div>
              )}
              {isGroup && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Visualização Única</Label>
                      <p className="text-xs text-muted-foreground">Mensagem desaparece após ser lida</p>
                    </div>
                    <Switch
                      checked={(node.config.viewOnce as boolean) || false}
                      onCheckedChange={checked => updateConfig("viewOnce", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enviar no privado</Label>
                    <Switch
                      checked={(node.config.sendPrivate as boolean) || false}
                      onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Mencionar membro</Label>
                    <Switch
                      checked={(node.config.mentionMember as boolean) || false}
                      onCheckedChange={checked => updateConfig("mentionMember", checked)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* IMAGE */}
          {node.nodeType === "image" && (
            <>
              <div className="space-y-2">
                <Label>{isGroup ? "Mídia" : "URL da Mídia"}</Label>
                {renderMediaField("image", "https://exemplo.com/imagem.jpg")}
              </div>
              <div className="space-y-2">
                <Label>{isGroup ? "Legenda (opcional)" : "Legenda / Mensagem"}</Label>
                <Textarea
                  placeholder={isGroup ? "Descrição da mídia..." : "Texto que acompanha a mídia..."}
                  value={(node.config.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={isGroup ? 2 : 3}
                />
                {!isGroup && (
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}
                  </p>
                )}
              </div>
              {isGroup && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Visualização Única</Label>
                      <p className="text-xs text-muted-foreground">Mídia desaparece após ser vista</p>
                    </div>
                    <Switch
                      checked={(node.config.viewOnce as boolean) || false}
                      onCheckedChange={checked => updateConfig("viewOnce", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enviar no privado</Label>
                    <Switch
                      checked={(node.config.sendPrivate as boolean) || false}
                      onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* VIDEO */}
          {node.nodeType === "video" && (
            <>
              <div className="space-y-2">
                <Label>{isGroup ? "Mídia" : "URL da Mídia"}</Label>
                {renderMediaField("video", "https://exemplo.com/video.mp4")}
              </div>
              <div className="space-y-2">
                <Label>{isGroup ? "Legenda (opcional)" : "Legenda / Mensagem"}</Label>
                <Textarea
                  placeholder={isGroup ? "Descrição da mídia..." : "Texto que acompanha a mídia..."}
                  value={(node.config.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={isGroup ? 2 : 3}
                />
                {!isGroup && (
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}
                  </p>
                )}
              </div>
              {isGroup && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Recado (Video Note)</Label>
                      <p className="text-xs text-muted-foreground">Envia como bolinha circular flutuante</p>
                    </div>
                    <Switch
                      checked={(node.config.isVideoNote as boolean) || false}
                      onCheckedChange={checked => updateConfig("isVideoNote", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Visualização Única</Label>
                      <p className="text-xs text-muted-foreground">Mídia desaparece após ser vista</p>
                    </div>
                    <Switch
                      checked={(node.config.viewOnce as boolean) || false}
                      onCheckedChange={checked => updateConfig("viewOnce", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enviar no privado</Label>
                    <Switch
                      checked={(node.config.sendPrivate as boolean) || false}
                      onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* AUDIO */}
          {node.nodeType === "audio" && (
            <>
              <div className="space-y-2">
                <Label>{isGroup ? "Áudio" : "URL da Mídia"}</Label>
                {renderMediaField("audio", "https://exemplo.com/audio.ogg")}
              </div>
              {!isGroup && (
                <div className="space-y-2">
                  <Label>Legenda / Mensagem</Label>
                  <Textarea
                    placeholder="Texto que acompanha a mídia..."
                    value={(node.config.caption as string) || ""}
                    onChange={e => updateConfig("caption", e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}
                  </p>
                </div>
              )}
              {isGroup && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Mensagem de voz (PTT)</Label>
                    <Switch
                      checked={(node.config.isVoiceMessage as boolean) ?? true}
                      onCheckedChange={checked => updateConfig("isVoiceMessage", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Visualização Única</Label>
                      <p className="text-xs text-muted-foreground">Áudio desaparece após ser ouvido</p>
                    </div>
                    <Switch
                      checked={(node.config.viewOnce as boolean) || false}
                      onCheckedChange={checked => updateConfig("viewOnce", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enviar no privado</Label>
                    <Switch
                      checked={(node.config.sendPrivate as boolean) || false}
                      onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* DOCUMENT */}
          {node.nodeType === "document" && (
            <>
              <div className="space-y-2">
                <Label>{isGroup ? "Documento" : "URL da Mídia"}</Label>
                {renderMediaField("document", "https://exemplo.com/documento.pdf")}
              </div>
              <div className="space-y-2">
                <Label>Nome do Arquivo</Label>
                <Input
                  placeholder="contrato.pdf"
                  value={(node.config.filename as string) || ""}
                  onChange={e => updateConfig("filename", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{isGroup ? "Legenda (opcional)" : "Legenda / Mensagem"}</Label>
                <Textarea
                  placeholder={isGroup ? "Descrição do documento..." : "Texto que acompanha a mídia..."}
                  value={(node.config.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={2}
                />
                {!isGroup && (
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}
                  </p>
                )}
              </div>
              {isGroup && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Visualização Única</Label>
                      <p className="text-xs text-muted-foreground">Documento desaparece após ser visto</p>
                    </div>
                    <Switch
                      checked={(node.config.viewOnce as boolean) || false}
                      onCheckedChange={checked => updateConfig("viewOnce", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enviar no privado</Label>
                    <Switch
                      checked={(node.config.sendPrivate as boolean) || false}
                      onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* STICKER - Group only */}
          {node.nodeType === "sticker" && isGroup && (
            <>
              <div className="space-y-2">
                <Label>Sticker</Label>
                {renderMediaField("sticker", "https://exemplo.com/sticker.webp")}
                <p className="text-xs text-muted-foreground">WebP 512x512px recomendado</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visualização Única</Label>
                  <p className="text-xs text-muted-foreground">Sticker desaparece após ser visto</p>
                </div>
                <Switch
                  checked={(node.config.viewOnce as boolean) || false}
                  onCheckedChange={checked => updateConfig("viewOnce", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enviar no privado</Label>
                <Switch
                  checked={(node.config.sendPrivate as boolean) || false}
                  onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                />
              </div>
            </>
          )}

          {/* POLL - Group only */}
          {node.nodeType === "poll" && isGroup && (
            <>
              <div className="space-y-2">
                <Label>Pergunta</Label>
                <Textarea
                  placeholder="Qual sua preferência?"
                  value={(node.config.question as string) || ""}
                  onChange={e => updateConfig("question", e.target.value)}
                  maxLength={255}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Máximo 255 caracteres</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Opções (até 12)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6"
                    onClick={() => {
                      const options = [...((node.config.options as string[]) || [])];
                      if (options.length < 12) {
                        options.push("");
                        updateConfig("options", options);
                      }
                    }}
                    disabled={((node.config.options as string[]) || []).length >= 12}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {((node.config.options as string[]) || ["", "", ""]).map((opt, i) => {
                  const action = getOptionAction?.(node, i);
                  const hasAction = action && (action as any)?.actionType !== "none";

                  return (
                    <div key={i} className="flex gap-1">
                      <Input
                        placeholder={`Opção ${i + 1}`}
                        value={opt}
                        onChange={e => {
                          const options = [...((node.config.options as string[]) || [])];
                          options[i] = e.target.value;
                          updateConfig("options", options);
                        }}
                        className="flex-1"
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => openActionDialog(i)}
                            >
                              <Zap className={`h-4 w-4 ${hasAction ? (getActionIconColor?.((action as any)?.actionType) || "text-primary") : "text-muted-foreground"}`} />
                              {hasAction && (
                                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {hasAction ? (getActionLabel?.((action as any)?.actionType) || "Ação configurada") : "Configurar ação"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {((node.config.options as string[]) || []).length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            const options = [...((node.config.options as string[]) || [])];
                            options.splice(i, 1);
                            updateConfig("options", options);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <Label>Múltipla escolha</Label>
                <Switch
                  checked={(node.config.multiSelect as boolean) || false}
                  onCheckedChange={checked => updateConfig("multiSelect", checked)}
                />
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Enquetes funcionam apenas em grupos
              </p>
              {renderPollActionDialog?.({
                open: actionDialogOpen,
                onClose: () => { setActionDialogOpen(false); setEditingOptionIndex(null); },
                optionIndex: editingOptionIndex ?? 0,
                optionText: ((node.config.options as string[]) || [])[editingOptionIndex ?? 0] || "",
                currentAction: editingOptionIndex !== null ? getOptionAction?.(node, editingOptionIndex) : null,
                onSave: (action) => {
                  if (editingOptionIndex !== null) {
                    const optionActions = (node.config.optionActions as Record<string, unknown>) || {};
                    onUpdate({
                      ...node.config,
                      optionActions: { ...optionActions, [String(editingOptionIndex)]: action },
                    });
                  }
                },
              })}
            </>
          )}

          {/* BUTTONS */}
          {node.nodeType === "buttons" && (() => {
            if (isGroup) {
              type ButtonAction = { id: string; label: string; type: "REPLY" | "CALL" | "URL"; phone?: string; url?: string; };
              const buttons = (node.config.buttons as ButtonAction[]) || [];
              const updateButton = (index: number, field: keyof ButtonAction, value: string) => {
                const updated = [...buttons];
                updated[index] = { ...updated[index], [field]: value };
                updateConfig("buttons", updated);
              };
              const addButton = () => {
                if (buttons.length < 3) updateConfig("buttons", [...buttons, { id: String(buttons.length + 1), label: "", type: "REPLY" }]);
              };
              const removeButton = (index: number) => {
                const updated = [...buttons]; updated.splice(index, 1); updateConfig("buttons", updated);
              };
              return (
                <>
                  <div className="space-y-2">
                    <Label>Título (opcional)</Label>
                    <Input placeholder="Título da mensagem" value={(node.config.title as string) || ""} onChange={e => updateConfig("title", e.target.value)} maxLength={60} />
                    <p className="text-xs text-muted-foreground">Até 60 caracteres</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Texto da Mensagem</Label>
                    <Textarea placeholder="Escolha uma opção:" value={(node.config.text as string) || ""} onChange={e => updateConfig("text", e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rodapé (opcional)</Label>
                    <Input placeholder="Texto do rodapé" value={(node.config.footer as string) || ""} onChange={e => updateConfig("footer", e.target.value)} maxLength={60} />
                    <p className="text-xs text-muted-foreground">Até 60 caracteres</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Botões (até 3)</Label>
                      <Button variant="ghost" size="sm" className="h-6" onClick={addButton} disabled={buttons.length >= 3}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                    {buttons.map((btn, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-3">
                        <div className="flex gap-2">
                          <Input placeholder={`Botão ${i + 1}`} value={btn.label || ""} onChange={e => updateButton(i, "label", e.target.value)} />
                          {buttons.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeButton(i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo de Ação</Label>
                          <Select value={btn.type || "REPLY"} onValueChange={v => updateButton(i, "type", v)}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="REPLY">Resposta Rápida</SelectItem>
                              <SelectItem value="CALL">Ligar</SelectItem>
                              <SelectItem value="URL">Abrir Link</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {btn.type === "CALL" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Número de Telefone</Label>
                            <Input placeholder="+55 11 99999-9999" value={btn.phone || ""} onChange={e => updateButton(i, "phone", e.target.value)} />
                          </div>
                        )}
                        {btn.type === "URL" && (
                          <div className="space-y-1">
                            <Label className="text-xs">URL do Link</Label>
                            <Input placeholder="https://exemplo.com" value={btn.url || ""} onChange={e => updateButton(i, "url", e.target.value)} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              );
            } else {
              const buttons = (node.config.buttons as { id: string; label: string }[]) || [];
              return (
                <>
                  <div className="space-y-2">
                    <Label>Texto da Mensagem</Label>
                    <Textarea placeholder="Texto exibido acima dos botões..." value={(node.config.text as string) || ""} onChange={e => updateConfig("text", e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Botões (até 3)</Label>
                      <Button variant="ghost" size="sm" className="h-6" onClick={() => {
                        if (buttons.length < 3) updateConfig("buttons", [...buttons, { id: String(buttons.length + 1), label: "" }]);
                      }} disabled={buttons.length >= 3}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                    {buttons.map((btn, i) => (
                      <div key={i} className="flex gap-1">
                        <Input placeholder={`Botão ${i + 1}`} value={btn.label} onChange={e => {
                          const updated = [...buttons]; updated[i] = { ...updated[i], label: e.target.value }; updateConfig("buttons", updated);
                        }} className="flex-1" />
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => {
                          updateConfig("buttons", buttons.filter((_, idx) => idx !== i));
                        }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              );
            }
          })()}

          {/* LIST */}
          {node.nodeType === "list" && (() => {
            if (isGroup) {
              return (
                <>
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input placeholder="Menu Principal" value={(node.config.title as string) || ""} onChange={e => updateConfig("title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input placeholder="Ver opções" value={(node.config.buttonText as string) || ""} onChange={e => updateConfig("buttonText", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Seções</Label>
                    {((node.config.sections as { title: string; rows: { id: string; title: string; description: string }[] }[]) || []).map((section, sIdx) => (
                      <div key={sIdx} className="border rounded-lg p-2 space-y-2">
                        <Input placeholder="Título da seção" value={section.title} onChange={e => {
                          const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                          sections[sIdx].title = e.target.value;
                          updateConfig("sections", sections);
                        }} />
                        {section.rows.map((row, rIdx) => (
                          <div key={rIdx} className="ml-2 space-y-1">
                            <Input placeholder="Título do item" value={row.title} className="h-8 text-xs" onChange={e => {
                              const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                              sections[sIdx].rows[rIdx].title = e.target.value;
                              updateConfig("sections", sections);
                            }} />
                            <Input placeholder="Descrição (opcional)" value={row.description} className="h-8 text-xs" onChange={e => {
                              const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                              sections[sIdx].rows[rIdx].description = e.target.value;
                              updateConfig("sections", sections);
                            }} />
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="h-6 w-full" onClick={() => {
                          const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                          sections[sIdx].rows.push({ id: String(Date.now()), title: "", description: "" });
                          updateConfig("sections", sections);
                        }}>
                          <Plus className="h-3 w-3 mr-1" /> Adicionar item
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => {
                      const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                      sections.push({ title: "", rows: [{ id: String(Date.now()), title: "", description: "" }] });
                      updateConfig("sections", sections);
                    }}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar seção
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Configure seções e até 10 opções</p>
                </>
              );
            } else {
              return (
                <>
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input placeholder="Título da lista" value={(node.config.title as string) || ""} onChange={e => updateConfig("title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input placeholder="Selecionar" value={(node.config.buttonText as string) || "Selecionar"} onChange={e => updateConfig("buttonText", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Corpo da Mensagem</Label>
                    <Textarea placeholder="Texto exibido antes da lista..." value={(node.config.body as string) || ""} onChange={e => updateConfig("body", e.target.value)} rows={3} />
                  </div>
                </>
              );
            }
          })()}

          {/* LOCATION - Group only */}
          {node.nodeType === "location" && isGroup && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input type="number" step="any" placeholder="-23.5505" value={(node.config.latitude as string) || ""} onChange={e => updateConfig("latitude", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input type="number" step="any" placeholder="-46.6333" value={(node.config.longitude as string) || ""} onChange={e => updateConfig("longitude", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome do Local</Label>
                <Input placeholder="Escritório Central" value={(node.config.name as string) || ""} onChange={e => updateConfig("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input placeholder="Av. Paulista, 1000" value={(node.config.address as string) || ""} onChange={e => updateConfig("address", e.target.value)} />
              </div>
            </>
          )}

          {/* CONTACT - Group only */}
          {node.nodeType === "contact" && isGroup && (
            <>
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input placeholder="João Silva" value={(node.config.fullName as string) || ""} onChange={e => updateConfig("fullName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input placeholder="5511999999999" value={(node.config.phone as string) || ""} onChange={e => updateConfig("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input type="email" placeholder="joao@empresa.com" value={(node.config.email as string) || ""} onChange={e => updateConfig("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Organização (opcional)</Label>
                <Input placeholder="Empresa LTDA" value={(node.config.organization as string) || ""} onChange={e => updateConfig("organization", e.target.value)} />
              </div>
            </>
          )}

          {/* EVENT - Group only */}
          {node.nodeType === "event" && isGroup && (
            <>
              <div className="space-y-2">
                <Label>Nome do Evento</Label>
                <Input placeholder="Reunião de Equipe" value={(node.config.name as string) || ""} onChange={e => updateConfig("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea placeholder="Detalhes do evento..." value={(node.config.description as string) || ""} onChange={e => updateConfig("description", e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Data/Hora Início</Label>
                <Input type="datetime-local" value={(node.config.startDate as string) || ""} onChange={e => updateConfig("startDate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data/Hora Fim</Label>
                <Input type="datetime-local" value={(node.config.endDate as string) || ""} onChange={e => updateConfig("endDate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Local (opcional)</Label>
                <Input placeholder="Sala de Reuniões" value={(node.config.location as string) || ""} onChange={e => updateConfig("location", e.target.value)} />
              </div>
            </>
          )}

          {/* DELAY */}
          {node.nodeType === "delay" && (() => {
            if (isGroup) {
              return (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Dias</Label>
                      <Input type="number" min="0" value={(node.config.days as number) || 0} onChange={e => updateConfig("days", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Horas</Label>
                      <Input type="number" min="0" max="23" value={(node.config.hours as number) || 0} onChange={e => updateConfig("hours", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Minutos</Label>
                      <Input type="number" min="0" max="59" value={(node.config.minutes as number) || 0} onChange={e => updateConfig("minutes", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Segundos</Label>
                      <Input type="number" min="0" max="59" value={(node.config.seconds as number) || 0} onChange={e => updateConfig("seconds", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </>
              );
            } else {
              return (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Dias</Label>
                      <Input type="number" min={0} value={(node.config.days as number) || 0} onChange={e => updateConfig("days", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Horas</Label>
                      <Input type="number" min={0} max={23} value={(node.config.hours as number) || 0} onChange={e => updateConfig("hours", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Minutos</Label>
                      <Input type="number" min={0} max={59} value={(node.config.minutes as number) || 0} onChange={e => updateConfig("minutes", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Atalhos rápidos:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {QUICK_DELAYS.map(qd => (
                        <Button key={qd.label} variant="outline" size="sm" onClick={() => {
                          onUpdate({ ...node.config, minutes: qd.minutes, hours: qd.hours, days: qd.days });
                        }}>
                          {qd.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ℹ️ O sistema aguardará este tempo antes de enviar a próxima mensagem da sequência.
                  </p>
                </>
              );
            }
          })()}

          {/* CONDITION - Group only */}
          {node.nodeType === "condition" && isGroup && (
            <>
              <div className="space-y-2">
                <Label>Campo</Label>
                <Select value={(node.config.field as string) || "member_count"} onValueChange={v => updateConfig("field", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member_count">Quantidade de membros</SelectItem>
                    <SelectItem value="member_role">Cargo do membro</SelectItem>
                    <SelectItem value="message_count">Mensagens enviadas</SelectItem>
                    <SelectItem value="time_in_group">Tempo no grupo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operador</Label>
                <Select value={(node.config.operator as string) || "greater_than"} onValueChange={v => updateConfig("operator", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="not_equals">Diferente de</SelectItem>
                    <SelectItem value="greater_than">Maior que</SelectItem>
                    <SelectItem value="less_than">Menor que</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input value={(node.config.value as string) || ""} onChange={e => updateConfig("value", e.target.value)} placeholder="Digite o valor..." />
              </div>
            </>
          )}

          {/* NOTIFY - Group only */}
          {node.nodeType === "notify" && isGroup && (
            <>
              <div className="space-y-2">
                <Label>Mensagem da Notificação</Label>
                <Textarea placeholder="Digite a notificação..." value={(node.config.message as string) || ""} onChange={e => updateConfig("message", e.target.value)} rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Notificar admins</Label>
                <Switch checked={(node.config.notifyAdmins as boolean) ?? true} onCheckedChange={checked => updateConfig("notifyAdmins", checked)} />
              </div>
            </>
          )}

          {/* WEBHOOK - Group only */}
          {node.nodeType === "webhook" && isGroup && (
            <>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input type="url" placeholder="https://..." value={(node.config.url as string) || ""} onChange={e => updateConfig("url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={(node.config.method as string) || "POST"} onValueChange={v => updateConfig("method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Body (JSON)</Label>
                <Textarea placeholder='{"key": "value"}' value={(node.config.body as string) || ""} onChange={e => updateConfig("body", e.target.value)} rows={3} className="font-mono text-xs" />
              </div>
            </>
          )}

          {/* GROUP MANAGEMENT NODES */}
          {node.nodeType === "group_create" && isGroup && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome do Grupo</Label>
                <Input
                  placeholder="Nome do novo grupo..."
                  value={(node.config.groupName as string) || ""}
                  onChange={e => updateConfig("groupName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Participantes (números com DDI)</Label>
                {((node.config.phones as string[]) || [""]).map((phone, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="5511999999999"
                      value={phone}
                      onChange={e => {
                        const phones = [...((node.config.phones as string[]) || [""])];
                        phones[idx] = e.target.value;
                        updateConfig("phones", phones);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        const phones = [...((node.config.phones as string[]) || [""])];
                        phones.splice(idx, 1);
                        updateConfig("phones", phones.length ? phones : [""]);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const phones = [...((node.config.phones as string[]) || [""])];
                    phones.push("");
                    updateConfig("phones", phones);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar número
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Um novo grupo será criado com os participantes listados</p>
            </div>
          )}

          {node.nodeType === "group_rename" && isGroup && (
            <div className="space-y-2">
              <Label>Novo Nome do Grupo</Label>
              <Input
                placeholder="Nome do grupo..."
                value={(node.config.newName as string) || ""}
                onChange={e => updateConfig("newName", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">O grupo será renomeado quando este nó for executado</p>
            </div>
          )}

          {node.nodeType === "group_photo" && isGroup && (
            <div className="space-y-2">
              <Label>Foto do Grupo</Label>
              {renderMediaUploader ? renderMediaUploader({
                mediaType: "image",
                currentUrl: (node.config.url as string) || "",
                onUpload: (url) => updateConfig("url", url),
                onUrlChange: (url) => updateConfig("url", url),
                placeholder: "https://exemplo.com/foto.jpg",
              }) : (
                <Input
                  placeholder="URL da foto..."
                  value={(node.config.url as string) || ""}
                  onChange={e => updateConfig("url", e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">A foto do grupo será atualizada</p>
            </div>
          )}

          {node.nodeType === "group_description" && isGroup && (
            <div className="space-y-2">
              <Label>Nova Descrição</Label>
              <Textarea
                placeholder="Descrição do grupo..."
                value={(node.config.description as string) || ""}
                onChange={e => updateConfig("description", e.target.value)}
                rows={4}
              />
            </div>
          )}

          {node.nodeType === "group_add_participant" && isGroup && (() => {
            const phones = (node.config.phones as string[]) || [""];
            return (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Números para Adicionar</Label>
                    <Button variant="ghost" size="sm" className="h-6" onClick={() => updateConfig("phones", [...phones, ""])}>
                      <Plus className="h-3 w-3 mr-1" /> Número
                    </Button>
                  </div>
                  {phones.map((phone, i) => (
                    <div key={i} className="flex gap-1">
                      <Input
                        placeholder="5511999999999"
                        value={phone}
                        onChange={e => {
                          const updated = [...phones];
                          updated[i] = e.target.value;
                          updateConfig("phones", updated);
                        }}
                        className="flex-1"
                      />
                      {phones.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => updateConfig("phones", phones.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Formato: código do país + DDD + número (sem espaços)</p>
                </div>
              </>
            );
          })()}

          {node.nodeType === "group_remove_participant" && isGroup && (
            <div className="space-y-2">
              <Label>Número do Participante</Label>
              <Input
                placeholder="5511999999999"
                value={(node.config.phone as string) || ""}
                onChange={e => updateConfig("phone", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">O participante será removido do grupo</p>
            </div>
          )}

          {node.nodeType === "group_promote_admin" && isGroup && (
            <div className="space-y-2">
              <Label>Número do Participante</Label>
              <Input
                placeholder="5511999999999"
                value={(node.config.phone as string) || ""}
                onChange={e => updateConfig("phone", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">O participante será promovido a administrador</p>
            </div>
          )}

          {node.nodeType === "group_remove_admin" && isGroup && (
            <div className="space-y-2">
              <Label>Número do Participante</Label>
              <Input
                placeholder="5511999999999"
                value={(node.config.phone as string) || ""}
                onChange={e => updateConfig("phone", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">O participante será rebaixado de administrador</p>
            </div>
          )}

          {node.nodeType === "group_settings" && isGroup && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Apenas admins enviam mensagens</Label>
                  <p className="text-xs text-muted-foreground">Restringe o envio de mensagens a administradores</p>
                </div>
                <Switch
                  checked={(node.config.adminOnlyMessage as boolean) || false}
                  onCheckedChange={checked => updateConfig("adminOnlyMessage", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Apenas admins editam info</Label>
                  <p className="text-xs text-muted-foreground">Restringe a edição de nome, foto e descrição</p>
                </div>
                <Switch
                  checked={(node.config.adminOnlyEditInfo as boolean) || false}
                  onCheckedChange={checked => updateConfig("adminOnlyEditInfo", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo de aprovação</Label>
                  <p className="text-xs text-muted-foreground">Novos membros precisam de aprovação</p>
                </div>
                <Switch
                  checked={(node.config.approvalMode as boolean) || false}
                  onCheckedChange={checked => updateConfig("approvalMode", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Grupo trancado</Label>
                  <p className="text-xs text-muted-foreground">Impede novas entradas via link</p>
                </div>
                <Switch
                  checked={(node.config.locked as boolean) || false}
                  onCheckedChange={checked => updateConfig("locked", checked)}
                />
              </div>
            </>
          )}

          {/* STATUS IMAGE */}
          {node.nodeType === "status_image" && (
            <>
              <div className="space-y-2">
                <Label>Mídia do Status</Label>
                {renderMediaField("image", "https://exemplo.com/imagem.jpg")}
              </div>
              <div className="space-y-2">
                <Label>Legenda (opcional)</Label>
                <Textarea
                  placeholder="Texto do status..."
                  value={(node.config.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* STATUS VIDEO */}
          {node.nodeType === "status_video" && (
            <>
              <div className="space-y-2">
                <Label>Mídia do Status</Label>
                {renderMediaField("video", "https://exemplo.com/video.mp4")}
              </div>
              <div className="space-y-2">
                <Label>Legenda (opcional)</Label>
                <Textarea
                  placeholder="Texto do status..."
                  value={(node.config.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* WEBHOOK FORWARD */}
          {node.nodeType === "webhook_forward" && (
            <>
              <div className="space-y-2">
                <Label>URL do Webhook *</Label>
                <Input
                  type="url"
                  placeholder="https://n8n.exemplo.com/webhook/..."
                  value={(node.config.url as string) || ""}
                  onChange={e => updateConfig("url", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  O sistema enviará automaticamente todos os dados do lead e da campanha para esta URL
                </p>
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={(node.config.method as string) || "POST"} onValueChange={v => updateConfig("method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Headers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Headers customizados</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => {
                      const headers = ((node.config.headers as Array<{key: string; value: string}>) || []);
                      updateConfig("headers", [...headers, { key: "", value: "" }]);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Header
                  </Button>
                </div>
                {((node.config.headers as Array<{key: string; value: string}>) || []).map((header, idx) => (
                  <div key={idx} className="flex gap-1">
                    <Input
                      placeholder="Chave"
                      value={header.key}
                      onChange={e => {
                        const headers = [...((node.config.headers as Array<{key: string; value: string}>) || [])];
                        headers[idx] = { ...headers[idx], key: e.target.value };
                        updateConfig("headers", headers);
                      }}
                      className="flex-1 h-8 text-xs"
                    />
                    <Input
                      placeholder="Valor"
                      value={header.value}
                      onChange={e => {
                        const headers = [...((node.config.headers as Array<{key: string; value: string}>) || [])];
                        headers[idx] = { ...headers[idx], value: e.target.value };
                        updateConfig("headers", headers);
                      }}
                      className="flex-1 h-8 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        const headers = ((node.config.headers as Array<{key: string; value: string}>) || []).filter((_, i) => i !== idx);
                        updateConfig("headers", headers);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Incluir dados da instância</Label>
                  <p className="text-xs text-muted-foreground">Envia ID, nome e telefone da instância</p>
                </div>
                <Switch
                  checked={(node.config.includeInstance as boolean) ?? true}
                  onCheckedChange={checked => updateConfig("includeInstance", checked)}
                />
              </div>

              {isGroup && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Incluir dados dos grupos</Label>
                    <p className="text-xs text-muted-foreground">Envia lista de grupos vinculados</p>
                  </div>
                  <Switch
                    checked={(node.config.includeGroups as boolean) ?? true}
                    onCheckedChange={checked => updateConfig("includeGroups", checked)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Payload adicional (JSON, opcional)</Label>
                <Textarea
                  placeholder={'{"chave": "valor"}'}
                  value={(node.config.customPayload as string) || ""}
                  onChange={e => updateConfig("customPayload", e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Será mesclado com o payload automático (lead, campanha, instância, etc.)
                </p>
              </div>

              <div className="rounded-md bg-muted p-3 space-y-1">
                <p className="text-xs font-medium">📦 Payload automático inclui:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Dados do lead (telefone, nome, JID, campos personalizados)</li>
                  <li>Dados da campanha (ID, nome)</li>
                  <li>Dados da sequência (ID, nome)</li>
                  {isGroup ? <li>Dados dos grupos vinculados</li> : <li>Dados do contato</li>}
                  <li>Timestamp do envio</li>
                </ul>
              </div>
            </>
          )}

          {/* Schedule & Manual Send Section */}
          <NodeScheduleSection
            config={node.config}
            onUpdateConfig={updateConfig}
            onManualSend={onManualSend}
            isSendingManual={isSendingManual}
            nodeType={node.nodeType}
          />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
