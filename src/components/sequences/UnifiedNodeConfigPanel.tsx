import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { LocalNode, RandomizerBranch } from "./shared-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toCanonicalPayload } from "@/lib/workflows/canonicalPayload";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Zap, Play, Send,
  MessageSquare, Clock, GitBranch, Bell, Link2,
  Image, Video, Music, FileText, Smile,
  BarChart3, MousePointerClick, List, MapPin, Contact, Calendar,
  Pencil, ImageIcon, UserPlus, UserMinus, ShieldPlus, ShieldMinus, Settings, CircleDot,
  Shuffle, Tag, Award, Sliders, Sparkles, Info, RefreshCw, HelpCircle,
  ChevronDown, CheckCircle2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNodeBlockDefinition } from "./nodeDefinitions";
import { VariablePicker } from "./VariablePicker";
function formatWhatsAppText(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const formatted = escaped
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~(.*?)~/g, '<del>$1</del>')
    .replace(/```(.*?)```/gs, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>');
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
}

// Convert WhatsApp markdown to HTML for Tiptap editor
function waMarkdownToHtml(text: string): string {
  if (!text) return "<p></p>";
  // Normalize: colapsa 3+ newlines consecutivas em 2 (1 linha em branco)
  const normalized = text.replace(/\n{3,}/g, "\n\n");
  return normalized
    .split("\n")
    .map(line => {
      const html = line
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/```([^`]*)```/g, "<code>$1</code>")
        .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
        .replace(/_([^_\n]+)_/g, "<em>$1</em>")
        .replace(/~([^~\n]+)~/g, "<s>$1</s>");
      return `<p>${html || "<br>"}</p>`;
    })
    .join("");
}

// Convert Tiptap HTML back to WhatsApp markdown for storage
function htmlToWaMarkdown(html: string): string {
  if (!html) return "";
  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/g, "*$1*")
    .replace(/<b>([\s\S]*?)<\/b>/g, "*$1*")
    .replace(/<em>([\s\S]*?)<\/em>/g, "_$1_")
    .replace(/<i>([\s\S]*?)<\/i>/g, "_$1_")
    .replace(/<s>([\s\S]*?)<\/s>/g, "~$1~")
    .replace(/<del>([\s\S]*?)<\/del>/g, "~$1~")
    .replace(/<code>([\s\S]*?)<\/code>/g, "```$1```")
    // Parágrafo vazio (com ou sem <br>) → linha em branco ANTES das fronteiras
    .replace(/<p>(?:\s*<br\s*\/?>)?\s*<\/p>/g, "\n\n")
    // Fronteiras entre parágrafos não-vazios (sem \s* para não absorver os \n\n acima)
    .replace(/<\/p><p>/g, "\n")
    .replace(/<p>/g, "").replace(/<\/p>/g, "")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface UnifiedNodeConfigPanelProps {
  node: LocalNode;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
  open: boolean;
  mode: "group" | "dispatch";
  isGroup?: boolean;
  onManualSend?: () => void;
  isSendingManual?: boolean;
  nodes?: LocalNode[];
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
  randomizer: { title: "Randomizador", icon: Shuffle },
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
  content: { title: "Conteúdo", icon: MessageSquare },
  action: { title: "Ação", icon: Tag },
  tag_add: { title: "Adicionar Tag", icon: Tag },
  tag_remove: { title: "Remover Tag", icon: Tag },
  deal_move: { title: "Mover Negócio", icon: Award },
  channel_select: { title: "Selecionar Canal", icon: Send },
  field_op: { title: "Mapeamento de Campos", icon: Sliders },
  api_call: { title: "API", icon: Link2 },
  ai_agent: { title: "AI Assistant", icon: Sparkles },
  js_code: { title: "Executar JavaScript", icon: Sliders },
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
  "status", "status_image", "status_video",
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
                  <SelectItem value="recurring_month">📅 Recorrente (dia do mês)</SelectItem>
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

            {/* RECURRING OR RECURRING_MONTH */}
            {(scheduleType === "recurring" || scheduleType === "recurring_month") && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {scheduleType === "recurring" ? "Dias da semana" : "Dias do mês"}
                  </Label>
                  {scheduleType === "recurring" ? (
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
                  ) : (
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <Badge
                          key={day}
                          variant={days.includes(day) ? "default" : "outline"}
                          className="cursor-pointer text-[10px] px-0 h-6 w-full flex items-center justify-center select-none"
                          onClick={() => toggleDay(day)}
                        >
                          {day}
                        </Badge>
                      ))}
                    </div>
                  )}
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

function extractPaths(obj: any, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  let paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...extractPaths(value, currentPath));
    } else {
      paths.push(currentPath);
    }
  }
  return paths;
}

function getValueFromPath(obj: any, path: string): string {
  if (!obj || !path) return "";
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return "";
    }
  }
  if (current === undefined || current === null) return "";
  if (typeof current === "object") return JSON.stringify(current);
  return String(current);
}

export function UnifiedNodeConfigPanel({
  node,
  onUpdate,
  onClose,
  open,
  mode,
  isGroup: isGroupProp,
  onManualSend,
  isSendingManual,
  renderMediaUploader,
  renderPollActionDialog,
  getOptionAction,
  getActionIconColor,
  getActionLabel,
  nodes,
}: UnifiedNodeConfigPanelProps) {
  const { toast } = useToast();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);

  const { activeCompanyId } = useCompany();

  const [customFieldsMetadata, setCustomFieldsMetadata] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [activeInstances, setActiveInstances] = useState<any[]>([]);

  useEffect(() => {
    const fetchPanelData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch custom fields
        const { data: fields } = await supabase
          .from("custom_fields_metadata")
          .select("*")
          .order("name", { ascending: true });
        if (fields) setCustomFieldsMetadata(fields);

        // Fetch pipeline stages
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("*")
          .order("order_index", { ascending: true });
        if (stages) setPipelineStages(stages);

        // Fetch WhatsApp instances
        let instancesQuery = supabase
          .from("instances")
          .select("id, name, phone, status")
          .order("name", { ascending: true });

        if (activeCompanyId) {
          instancesQuery = instancesQuery.eq("company_id", activeCompanyId);
        } else {
          instancesQuery = instancesQuery.eq("user_id", user.id).is("company_id", null);
        }

        const { data: insts } = await instancesQuery;
        if (insts) setActiveInstances(insts);
      } catch (err) {
        console.error("Error loading UnifiedNodeConfigPanel resources:", err);
      }
    };

    fetchPanelData();
  }, [node.nodeType, activeCompanyId]);

  // "content"/"action" nodes carry their real sub-type inside config
  // (contentType/actionType) — resolvedNodeType lets every existing per-type
  // block below key off the sub-type transparently, whether the node arrived
  // here as a lifted "content"/"action" node (new canvas) or as a raw legacy
  // node_type (dispatch builder, timeline builder, or an already-saved node
  // predating the consolidation).
  const resolvedNodeType = node.nodeType === "content"
    ? ((node.config.contentType as string) || "message")
    : node.nodeType === "action"
    ? ((node.config.actionType as string) || "tag_add")
    : node.nodeType;

  const nodeInfo = NODE_TITLES[resolvedNodeType] || NODE_TITLES[node.nodeType] || NODE_TITLES.message;
  const Icon = nodeInfo.icon;

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ ...node.config, [key]: value });
  };

  const isGroup = isGroupProp !== undefined ? isGroupProp : mode === "group";

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
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3 shrink-0 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{nodeInfo.title}</h2>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
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

            {/* CONTENT / ACTION sub-type selector */}
            {/* CONTENT / ACTION sub-type selector */}
            {(node.nodeType === "content" || node.nodeType === "action") && (() => {
              const block = getNodeBlockDefinition(node.nodeType)!;
              const configKey = node.nodeType === "content" ? "contentType" : "actionType";
              const currentSubType = (node.config[configKey] as string) || block.subTypes![0].subType;
              return (
                <>
                  {node.nodeType === "content" && (
                    <div className="space-y-2 mb-4">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Conexão
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-48 text-xs">Deixe em branco para usar a conexão dos blocos anteriores ou da campanha padrão.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Select
                        value={(node.config.instanceId as string) || "default"}
                        onValueChange={(val) => updateConfig("instanceId", val === "default" ? "" : val)}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Selecionar (Padrão)</SelectItem>
                          {activeInstances.map(inst => (
                            <SelectItem key={inst.id} value={inst.id}>
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5 text-success" />
                                {inst.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Separator className="mt-4" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {node.nodeType === "content" ? "Tipo de conteúdo" : "Qual ação deseja executar?"}
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {block.subTypes!
                        .filter((sub) => {
                          if (sub.subType === "poll" && !isGroup) return false;
                          return true;
                        })
                        .map((sub) => {
                        const SubIcon = sub.icon;
                        const isSelected = currentSubType === sub.subType;
                        return (
                          <button
                            key={sub.subType}
                            type="button"
                            onClick={() => updateConfig(configKey, sub.subType)}
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all",
                              isSelected ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className={cn("p-1.5 rounded-lg", sub.color)}>
                              <SubIcon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-[10px] font-medium leading-tight">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Separator />
                </>
              );
            })()}

          {/* MESSAGE */}
          {resolvedNodeType === "message" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Conteúdo da Mensagem</Label>
                  <VariablePicker
                    isGroup={isGroup}
                    onSelect={(val) => {
                      const current = (node.config.content as string) || "";
                      updateConfig("content", current + val);
                    }}
                  />
                </div>
                <Textarea value={(node.config.content as string) || ""} onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight + 2}px`; updateConfig("content", e.target.value); }} onFocus={(e) => { e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight + 2}px`; }} placeholder="Digite a mensagem (Use *negrito*, _itálico_, ~riscado~)..." className="resize-none font-mono text-sm overflow-hidden" rows={isGroup ? 6 : 8} />
                <p className="text-xs text-muted-foreground">
                  {isGroup
                    ? <>Variáveis: {"{{name}}"}, {"{{phone}}"}, {"{{group_name}}"}</>
                    : <>Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}</>
                  }
                </p>
              </div>
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
                  {isGroup && (
                    <>
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
            </>
          )}

          {/* IMAGE */}
          {resolvedNodeType === "image" && (
            <>
              <div className="space-y-2">
                <Label>{isGroup ? "Mídia" : "URL da Mídia"}</Label>
                {renderMediaField("image", "https://exemplo.com/imagem.jpg")}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{isGroup ? "Legenda (opcional)" : "Legenda / Mensagem"}</Label>
                  <VariablePicker
                    isGroup={isGroup}
                    onSelect={(val) => {
                      const current = (node.config.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
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
              {isGroup && (
                <div className="flex items-center justify-between">
                  <Label>Enviar no privado</Label>
                  <Switch
                    checked={(node.config.sendPrivate as boolean) || false}
                    onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                  />
                </div>
              )}
            </>
          )}

          {/* VIDEO */}
          {resolvedNodeType === "video" && (
            <>
              <div className="space-y-2">
                <Label>{isGroup ? "Mídia" : "URL da Mídia"}</Label>
                {renderMediaField("video", "https://exemplo.com/video.mp4")}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{isGroup ? "Legenda (opcional)" : "Legenda / Mensagem"}</Label>
                  <VariablePicker
                    isGroup={isGroup}
                    onSelect={(val) => {
                      const current = (node.config.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
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
              {isGroup && (
                <div className="flex items-center justify-between">
                  <Label>Enviar no privado</Label>
                  <Switch
                    checked={(node.config.sendPrivate as boolean) || false}
                    onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                  />
                </div>
              )}
            </>
          )}

          {/* AUDIO */}
          {resolvedNodeType === "audio" && (
            <>
              <div className="space-y-2">
                <Label>{isGroup ? "Áudio" : "URL da Mídia"}</Label>
                {renderMediaField("audio", "https://exemplo.com/audio.ogg")}
              </div>
              {!isGroup && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Legenda / Mensagem</Label>
                    <VariablePicker
                      isGroup={isGroup}
                      onSelect={(val) => {
                        const current = (node.config.caption as string) || "";
                        updateConfig("caption", current + val);
                      }}
                    />
                  </div>
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
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Waveform</Label>
                  <p className="text-xs text-muted-foreground">Enviar como mensagem de voz (ondinhas)</p>
                </div>
                <Switch
                  checked={(node.config.waveform as boolean) ?? true}
                  onCheckedChange={checked => updateConfig("waveform", checked)}
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
              {isGroup && (
                <div className="flex items-center justify-between">
                  <Label>Enviar no privado</Label>
                  <Switch
                    checked={(node.config.sendPrivate as boolean) || false}
                    onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                  />
                </div>
              )}
            </>
          )}

          {/* DOCUMENT */}
          {resolvedNodeType === "document" && (
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
                <div className="flex items-center justify-between">
                  <Label>{isGroup ? "Legenda (opcional)" : "Legenda / Mensagem"}</Label>
                  <VariablePicker
                    isGroup={isGroup}
                    onSelect={(val) => {
                      const current = (node.config.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
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
              {isGroup && (
                <div className="flex items-center justify-between">
                  <Label>Enviar no privado</Label>
                  <Switch
                    checked={(node.config.sendPrivate as boolean) || false}
                    onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                  />
                </div>
              )}
            </>
          )}

          {/* STICKER */}
          {resolvedNodeType === "sticker" && (
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
              {isGroup && (
                <div className="flex items-center justify-between">
                  <Label>Enviar no privado</Label>
                  <Switch
                    checked={(node.config.sendPrivate as boolean) || false}
                    onCheckedChange={checked => updateConfig("sendPrivate", checked)}
                  />
                </div>
              )}
            </>
          )}

          {/* POLL - Group only */}
          {resolvedNodeType === "poll" && !isGroup && (
            <div className="p-4 bg-yellow-500/10 text-yellow-600 rounded-xl border border-yellow-500/20 text-sm">
              Enquetes estão disponíveis apenas quando a automação está habilitada para grupos. Ative o modo grupo no gatilho principal.
            </div>
          )}
          {resolvedNodeType === "poll" && isGroup && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pergunta</Label>
                  <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.question as string) || ""; updateConfig("question", current + val); }} />
                </div>
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
          {resolvedNodeType === "buttons" && (() => {
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
                    <div className="flex items-center justify-between">
                      <Label>Título (opcional)</Label>
                      <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.title as string) || ""; updateConfig("title", current + val); }} />
                    </div>
                    <Input placeholder="Título da mensagem" value={(node.config.title as string) || ""} onChange={e => updateConfig("title", e.target.value)} maxLength={60} />
                    <p className="text-xs text-muted-foreground">Até 60 caracteres</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Texto da Mensagem</Label>
                      <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.text as string) || ""; updateConfig("text", current + val); }} />
                    </div>
                    <Textarea placeholder="Escolha uma opção:" value={(node.config.text as string) || ""} onChange={e => updateConfig("text", e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Rodapé (opcional)</Label>
                      <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.footer as string) || ""; updateConfig("footer", current + val); }} />
                    </div>
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
                    <div className="flex items-center justify-between">
                      <Label>Texto da Mensagem</Label>
                      <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.text as string) || ""; updateConfig("text", current + val); }} />
                    </div>
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
          {resolvedNodeType === "list" && (() => {
            if (isGroup) {
              return (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Título</Label>
                      <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.title as string) || ""; updateConfig("title", current + val); }} />
                    </div>
                    <Input placeholder="Menu Principal" value={(node.config.title as string) || ""} onChange={e => updateConfig("title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Texto do Botão</Label>
                      <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.buttonText as string) || ""; updateConfig("buttonText", current + val); }} />
                    </div>
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
          {resolvedNodeType === "location" && isGroup && (
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
          {resolvedNodeType === "contact" && isGroup && (
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
          {resolvedNodeType === "event" && isGroup && (
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
                  <div className="grid grid-cols-4 gap-2">
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
                    <div className="space-y-1">
                      <Label className="text-xs">Segundos</Label>
                      <Input type="number" min={0} max={59} value={(node.config.seconds as number) || 0} onChange={e => updateConfig("seconds", parseInt(e.target.value) || 0)} />
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

          {/* CONDITION - Unified Custom and Standard Fields Mapping */}
          {node.nodeType === "condition" && (
            <>
              <div className="space-y-2">
                <Label>Mapear Campo / Variável</Label>
                <Select value={(node.config.field as string) || "name"} onValueChange={v => updateConfig("field", v)}>
                  <SelectTrigger className="rounded-xl border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome do Lead</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="tags">Etiquetas / Tags</SelectItem>
                    <SelectItem value="pipeline_stage_id">Etapa do CRM</SelectItem>
                    {customFieldsMetadata.map(f => (
                      <SelectItem key={f.id} value={f.key}>
                        {f.name} ({f.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operador Lógico</Label>
                <Select value={(node.config.operator as string) || "equals"} onValueChange={v => updateConfig("operator", v)}>
                  <SelectTrigger className="rounded-xl border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="not_equals">Diferente de</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="not_contains">Não contém</SelectItem>
                    <SelectItem value="starts_with">Começa com</SelectItem>
                    <SelectItem value="ends_with">Termina com</SelectItem>
                    <SelectItem value="is_set">Está preenchido</SelectItem>
                    <SelectItem value="is_empty">Não está preenchido</SelectItem>
                    <SelectItem value="between">Está entre (Mín / Máx)</SelectItem>
                    <SelectItem value="greater_than">Maior que</SelectItem>
                    <SelectItem value="less_than">Menor que</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {((node.config.operator as string) !== "is_set" && (node.config.operator as string) !== "is_empty" && (node.config.operator as string) !== "between") && (
                <div className="space-y-2">
                  <Label>Valor Comparado</Label>
                  <Input 
                    value={(node.config.value as string) || ""} 
                    onChange={e => updateConfig("value", e.target.value)} 
                    placeholder="Digite o valor de comparação..." 
                    className="rounded-xl border-border/40 bg-background/50 text-xs"
                  />
                </div>
              )}

              {(node.config.operator as string) === "between" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Valor Mínimo</Label>
                    <Input 
                      type="number"
                      value={(node.config.minValue as string) || ""} 
                      onChange={e => updateConfig("minValue", e.target.value)} 
                      placeholder="Min" 
                      className="rounded-xl border-border/40 bg-background/50 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Máximo</Label>
                    <Input 
                      type="number"
                      value={(node.config.maxValue as string) || ""} 
                      onChange={e => updateConfig("maxValue", e.target.value)} 
                      placeholder="Max" 
                      className="rounded-xl border-border/40 bg-background/50 text-xs"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* RANDOMIZER - weighted random or round-robin branching */}
          {node.nodeType === "randomizer" && (() => {
            const mode = (node.config.mode as string) || "weighted_random";
            const branches = ((node.config.branches as RandomizerBranch[]) || []).slice().sort((a, b) => a.position - b.position);
            const totalWeight = branches.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);

            const distributeEqually = (list: RandomizerBranch[]): RandomizerBranch[] => {
              const n = list.length;
              if (n === 0) return list;
              const base = Math.floor(100 / n);
              const remainder = 100 % n;
              return list.map((b, idx) => ({
                ...b,
                weight: base + (idx < remainder ? 1 : 0),
              }));
            };

            const updateBranch = (index: number, patch: Partial<RandomizerBranch>) => {
              const updated = branches.map((b, i) => (i === index ? { ...b, ...patch } : b));
              updateConfig("branches", updated);
            };

            return (
              <>
                <div className="space-y-2">
                  <Label>Modo de distribuição</Label>
                  <Select value={mode} onValueChange={v => updateConfig("mode", v)}>
                    <SelectTrigger className="rounded-xl border-border/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weighted_random">Aleatório por porcentagem</SelectItem>
                      <SelectItem value="round_robin">Rodízio sequencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Ramificações (2 a 10)</Label>
                    <div className="flex gap-2">
                      {mode === "weighted_random" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-primary font-semibold hover:bg-slate-100"
                          onClick={() => {
                            const updated = distributeEqually(branches);
                            updateConfig("branches", updated);
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Distribuir igualmente
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs font-semibold"
                        onClick={() => {
                          if (branches.length >= 10) return;
                          const nextLetter = String.fromCharCode(65 + branches.length);
                          const rawList = [
                            ...branches,
                            { id: crypto.randomUUID(), label: nextLetter, weight: 0, position: branches.length },
                          ];
                          const updated = distributeEqually(rawList);
                          updateConfig("branches", updated);
                        }}
                        disabled={branches.length >= 10}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const sliderColors = [
                        { class: "slider-blue", hex: "#3b82f6" },
                        { class: "slider-green", hex: "#22c55e" },
                        { class: "slider-yellow", hex: "#eab308" },
                        { class: "slider-red", hex: "#ef4444" },
                        { class: "slider-purple", hex: "#a855f7" },
                        { class: "slider-orange", hex: "#f97316" },
                        { class: "slider-pink", hex: "#ec4899" },
                        { class: "slider-indigo", hex: "#6366f1" },
                        { class: "slider-cyan", hex: "#06b6d4" },
                        { class: "slider-teal", hex: "#14b8a6" },
                      ];

                      return branches.map((branch, i) => {
                        const colorObj = sliderColors[i % sliderColors.length];
                        return (
                          <div key={branch.id} className="space-y-1.5 p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                            <div className="flex gap-3 items-center">
                              <Input
                                value={branch.label}
                                onChange={e => updateBranch(i, { label: e.target.value })}
                                placeholder={`Ramo ${i + 1}`}
                                className="h-8 text-xs font-bold w-20 shrink-0 bg-white"
                              />

                              {mode === "weighted_random" ? (
                                <div className="flex-1 flex items-center gap-3">
                                  <style>{`
                                    .${colorObj.class}::-webkit-slider-thumb { border: 2px solid ${colorObj.hex} !important; -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: white; cursor: pointer; transition: transform 0.1s; }
                                    .${colorObj.class}::-webkit-slider-thumb:hover { transform: scale(1.1); }
                                    .${colorObj.class}::-moz-range-thumb { border: 2px solid ${colorObj.hex} !important; width: 16px; height: 16px; border-radius: 50%; background: white; cursor: pointer; }
                                  `}</style>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={branch.weight}
                                    onChange={e => {
                                      updateBranch(i, { weight: Math.round(Number(e.target.value)) });
                                    }}
                                    className={cn("w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200/80 accent-transparent", colorObj.class)}
                                    style={{
                                      background: `linear-gradient(to right, ${colorObj.hex} 0%, ${colorObj.hex} ${branch.weight}%, #e2e8f0 ${branch.weight}%, #e2e8f0 100%)`
                                    }}
                                  />
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={branch.weight}
                                      onChange={e => {
                                        const val = Math.min(100, Math.max(0, Math.round(Number(e.target.value))));
                                        updateBranch(i, { weight: val });
                                      }}
                                      className="w-14 h-8 text-center text-xs font-bold bg-white"
                                    />
                                    <span className="text-xs text-muted-foreground font-semibold">%</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 text-xs text-muted-foreground font-medium">
                                  Será selecionado em rodízio sequencial
                                </div>
                              )}

                              {branches.length > 2 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 hover:bg-slate-100"
                                  onClick={() => {
                                    const rawList = branches.filter((_, j) => j !== i);
                                    const updated = distributeEqually(rawList).map((b, j) => ({ ...b, position: j }));
                                    updateConfig("branches", updated);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {mode === "weighted_random" && (
                    <div className="space-y-1 mt-1">
                      <p className={cn(
                        "text-xs font-semibold",
                        totalWeight === 100 ? "text-emerald-600" : totalWeight > 100 ? "text-destructive" : "text-amber-600"
                      )}>
                        Total: {totalWeight}% {totalWeight !== 100 && "— os percentuais precisam totalizar 100% para salvar"}
                      </p>
                      {branches.some(b => Number(b.weight) === 0) && (
                        <p className="text-xs text-amber-600 font-medium">Ramo(s) com 0% nunca serão escolhidos.</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* ACTION - Add/Remove Tag, Move Deal Stage */}
          {(resolvedNodeType === "tag_add" || resolvedNodeType === "tag_remove") && (
            <div className="space-y-2">
              <Label>Nome da Tag / Etiqueta</Label>
              <Input 
                value={(node.config.tag as string) || ""} 
                onChange={e => updateConfig("tag", e.target.value)} 
                placeholder="Ex: VIP, Frio..." 
                className="rounded-xl border-border/40 bg-background/50 text-xs"
              />
            </div>
          )}

          {resolvedNodeType === "deal_move" && (
            <div className="space-y-2">
              <Label>Mover para Etapa do CRM</Label>
              <Select value={(node.config.stageId as string) || ""} onValueChange={v => updateConfig("stageId", v)}>
                <SelectTrigger className="rounded-xl border-border/40"><SelectValue placeholder="Selecione a etapa..." /></SelectTrigger>
                <SelectContent>
                  {pipelineStages.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {resolvedNodeType === "channel_select" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecionar Instância de Envio (WhatsApp)</Label>
                <Select value={(node.config.instanceId as string) || ""} onValueChange={v => updateConfig("instanceId", v)}>
                  <SelectTrigger className="rounded-xl border-border/40"><SelectValue placeholder="Selecione a instância..." /></SelectTrigger>
                  <SelectContent>
                    {activeInstances.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} ({i.phone || "Sem número"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Caso a instância falhe (Fallback)</Label>
                <Select value={(node.config.fallbackType as string) || "last_sender"} onValueChange={v => updateConfig("fallbackType", v)}>
                  <SelectTrigger className="rounded-xl border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_sender">🔄 Usar o último canal que enviou com sucesso</SelectItem>
                    <SelectItem value="default_campaign">🏢 Usar canal padrão da campanha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* FIELD_OP - Mapeamento de Campos */}
          {node.nodeType === "field_op" && (() => {
            const mappings = (node.config.mappings as Array<{
              source: string;
              targetType: string;
              targetField: string;
              transform?: string;
            }>) || [];

            // Upgrade legacy config if any
            const activeMappings = mappings.length > 0 ? mappings : (node.config.field ? [{
              source: (node.config.sourceField as string) || (node.config.value as string) || "",
              targetType: "lead",
              targetField: node.config.field as string,
              transform: node.config.operation === "transform" ? (node.config.transformType as string) : undefined
            }] : []);

            const triggerNode = nodes?.find(n => n.nodeType === "trigger");
            const rawRef = triggerNode?.config?.triggerConfig?.referencePayload || triggerNode?.config?.referencePayload;
            const referencePayload = rawRef ? toCanonicalPayload(rawRef) : null;
            const availablePaths = referencePayload ? extractPaths(referencePayload) : [];

            // State for rapid field creation
            const [isCreateFieldOpen, setIsCreateFieldOpen] = useState(false);
            const [newFieldName, setNewFieldName] = useState("");
            const [newFieldKey, setNewFieldKey] = useState("");
            const [newFieldEntity, setNewFieldEntity] = useState<"lead" | "deal">("lead");
            const [newFieldType, setNewFieldType] = useState<"text" | "number" | "date" | "boolean" | "select">("text");

            const handleCreateField = async () => {
              if (!newFieldName.trim() || !newFieldKey.trim()) {
                toast({ title: "Erro", description: "Nome e chave são obrigatórios.", variant: "destructive" });
                return;
              }
              try {
                const { data, error } = await supabase
                  .from("custom_fields_metadata")
                  .insert({
                    company_id: activeCompanyId,
                    name: newFieldName.trim(),
                    key: newFieldKey.trim().replace(/\s+/g, "_").toLowerCase(),
                    type: newFieldType,
                    category: newFieldEntity,
                  })
                  .select()
                  .single();

                if (error) throw error;
                toast({ title: "Sucesso", description: "Campo personalizado criado." });
                setCustomFieldsMetadata(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                setIsCreateFieldOpen(false);
                setNewFieldName("");
                setNewFieldKey("");
              } catch (err) {
                console.error(err);
                toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro ao criar campo", variant: "destructive" });
              }
            };

            const updateMappings = (newMappings: typeof activeMappings) => {
              onUpdate({
                ...node.config,
                mappings: newMappings
              });
            };

            const addMapping = () => {
              updateMappings([
                ...activeMappings,
                { source: "", targetType: "lead", targetField: "name" }
              ]);
            };

            const removeMapping = (index: number) => {
              updateMappings(activeMappings.filter((_, i) => i !== index));
            };

            const getSimulatedPreview = () => {
              if (!referencePayload) return null;
              const preview: any = { lead: {}, deal: {}, conversation: {}, variables: {} };
              for (const m of activeMappings) {
                if (!m.source || !m.targetField) continue;
                
                // Resolve value
                let rawVal = getValueFromPath(referencePayload, m.source);
                
                // Apply transform
                if (m.transform === "uppercase") rawVal = rawVal.toUpperCase();
                else if (m.transform === "lowercase") rawVal = rawVal.toLowerCase();
                else if (m.transform === "trim") rawVal = rawVal.replace(/\s+/g, " ").trim();
                else if (m.transform === "capitalize") rawVal = rawVal.replace(/\b\w/g, (c) => c.toUpperCase());
                
                if (m.targetField === "phone" || m.targetField.endsWith(".phone")) {
                  rawVal = rawVal.replace(/\D/g, "");
                }

                if (m.targetType === "lead") {
                  if (m.targetField.startsWith("custom_fields.")) {
                    const key = m.targetField.substring("custom_fields.".length);
                    if (!preview.lead.custom_fields) preview.lead.custom_fields = {};
                    preview.lead.custom_fields[key] = rawVal;
                  } else {
                    preview.lead[m.targetField] = rawVal;
                  }
                } else if (m.targetType === "deal") {
                  const key = m.targetField.replace("deal.", "");
                  preview.deal[key] = key === "value" ? (Number(rawVal) || 0) : rawVal;
                } else if (m.targetType === "conversation") {
                  const key = m.targetField.replace("conversation.", "");
                  preview.conversation[key] = rawVal;
                } else if (m.targetType === "variable") {
                  preview.variables[m.targetField] = rawVal;
                }
              }
              return preview;
            };

            const previewData = getSimulatedPreview();

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold">Mapeamento de Múltiplos Campos</h3>
                    <p className="text-[11px] text-muted-foreground">Associe campos do webhook de origem a entidades do sistema.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-xl h-8"
                    onClick={() => setIsCreateFieldOpen(true)}
                  >
                    + Criar Campo
                  </Button>
                </div>

                {/* Reference payload status banner */}
                {referencePayload ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-emerald-800 leading-normal whitespace-pre-line">
                      <strong>Payload de referência ativo.</strong>
                      {"\n"}Recebido em: {referencePayload.received_at && !isNaN(Date.parse(referencePayload.received_at)) ? new Date(referencePayload.received_at).toLocaleString("pt-BR") : "Simulação/Mock"}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-800 leading-normal whitespace-pre-line">
                      Nenhum payload de referência ativo.
                      {"\n"}Envie um POST para o Webhook, abra a execução e clique em “Usar como referência”.
                    </div>
                  </div>
                )}

                {/* Mappings list */}
                <div className="space-y-3">
                  {activeMappings.length === 0 ? (
                    <div className="text-center py-6 border border-dashed rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground italic">Nenhum mapeamento adicionado ainda.</p>
                      <Button type="button" variant="link" size="sm" onClick={addMapping} className="text-xs mt-1">
                        + Adicionar primeiro mapeamento
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeMappings.map((mapping, i) => (
                        <div key={i} className="p-3 border rounded-xl bg-slate-50/50 space-y-2.5 relative">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-7 w-7 text-slate-400 hover:text-destructive rounded-lg"
                            onClick={() => removeMapping(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Source path */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origem (JSON Path)</Label>
                              <div className="relative">
                                <Input
                                  value={mapping.source}
                                  onChange={(e) => {
                                    const next = [...activeMappings];
                                    next[i] = { ...next[i], source: e.target.value };
                                    updateMappings(next);
                                  }}
                                  placeholder="Ex: body.nome"
                                  className="font-mono text-xs pr-7 h-8 rounded-lg"
                                />
                                {availablePaths.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg">
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="max-h-48 overflow-y-auto">
                                      {availablePaths.map((p) => (
                                        <DropdownMenuItem
                                          key={p}
                                          onClick={() => {
                                            const next = [...activeMappings];
                                            next[i] = { ...next[i], source: p };
                                            updateMappings(next);
                                          }}
                                          className="font-mono text-[10px]"
                                        >
                                          {p}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>

                            {/* Target Entity Type */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entidade de Destino</Label>
                              <Select
                                value={mapping.targetType || "lead"}
                                onValueChange={(type) => {
                                  const next = [...activeMappings];
                                  next[i] = { 
                                    ...next[i], 
                                    targetType: type, 
                                    targetField: type === "lead" ? "name" : type === "deal" ? "title" : type === "conversation" ? "phone" : "variavel_nova" 
                                  };
                                  updateMappings(next);
                                }}
                              >
                                <SelectTrigger className="h-8 rounded-lg text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  <SelectItem value="lead">Lead</SelectItem>
                                  <SelectItem value="deal">Negócio (CRM)</SelectItem>
                                  <SelectItem value="conversation">Conversa</SelectItem>
                                  <SelectItem value="variable">Variável Temporária</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Target Field */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campo de Destino</Label>
                              {mapping.targetType === "lead" && (
                                <Select
                                  value={mapping.targetField}
                                  onValueChange={(field) => {
                                    const next = [...activeMappings];
                                    next[i] = { ...next[i], targetField: field };
                                    updateMappings(next);
                                  }}
                                >
                                  <SelectTrigger className="h-8 rounded-lg text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="text-xs">
                                    <SelectItem value="name">Nome</SelectItem>
                                    <SelectItem value="phone">Telefone</SelectItem>
                                    <SelectItem value="email">E-mail</SelectItem>
                                    <SelectItem value="company_name">Empresa</SelectItem>
                                    <SelectItem value="document">Documento</SelectItem>
                                    <SelectItem value="source">Origem</SelectItem>
                                    <SelectItem value="tags">Tags (Separadas por vírgula)</SelectItem>
                                    {customFieldsMetadata.filter(f => f.category === "lead").map(f => (
                                      <SelectItem key={f.id} value={`custom_fields.${f.key}`}>Custom: {f.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              {mapping.targetType === "deal" && (
                                <Select
                                  value={mapping.targetField}
                                  onValueChange={(field) => {
                                    const next = [...activeMappings];
                                    next[i] = { ...next[i], targetField: field };
                                    updateMappings(next);
                                  }}
                                >
                                  <SelectTrigger className="h-8 rounded-lg text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="text-xs">
                                    <SelectItem value="title">Título do Negócio</SelectItem>
                                    <SelectItem value="value">Valor</SelectItem>
                                    <SelectItem value="pipeline_id">Pipeline</SelectItem>
                                    <SelectItem value="stage_id">Etapa</SelectItem>
                                    {customFieldsMetadata.filter(f => f.category === "deal").map(f => (
                                      <SelectItem key={f.id} value={`custom_fields.${f.key}`}>Custom: {f.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              {mapping.targetType === "conversation" && (
                                <Select
                                  value={mapping.targetField}
                                  onValueChange={(field) => {
                                    const next = [...activeMappings];
                                    next[i] = { ...next[i], targetField: field };
                                    updateMappings(next);
                                  }}
                                >
                                  <SelectTrigger className="h-8 rounded-lg text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="text-xs">
                                    <SelectItem value="phone">Telefone</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}

                              {mapping.targetType === "variable" && (
                                <Input
                                  value={mapping.targetField}
                                  onChange={(e) => {
                                    const next = [...activeMappings];
                                    next[i] = { ...next[i], targetField: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") };
                                    updateMappings(next);
                                  }}
                                  placeholder="nome_da_variavel"
                                  className="h-8 rounded-lg text-xs font-mono"
                                />
                              )}
                            </div>

                            {/* Transform selection */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transformar</Label>
                              <Select
                                value={mapping.transform || "none"}
                                onValueChange={(val) => {
                                  const next = [...activeMappings];
                                  next[i] = { ...next[i], transform: val === "none" ? undefined : val };
                                  updateMappings(next);
                                }}
                              >
                                <SelectTrigger className="h-8 rounded-lg text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  <SelectItem value="none">Nenhuma</SelectItem>
                                  <SelectItem value="uppercase">MAIÚSCULAS</SelectItem>
                                  <SelectItem value="lowercase">minúsculas</SelectItem>
                                  <SelectItem value="trim">Remover espaços extras</SelectItem>
                                  <SelectItem value="capitalize">Capitalizar palavras</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs h-9 rounded-xl border-dashed"
                    onClick={addMapping}
                  >
                    + Adicionar novo mapeamento
                  </Button>
                </div>

                {/* Simulated preview collapsible */}
                {previewData && (
                  <div className="pt-2 border-t">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Simulação do Output (Resultado)</Label>
                    <pre className="text-[10px] font-mono bg-slate-50 border p-3 rounded-xl overflow-x-auto max-h-48 mt-2">
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Fast field creation Dialog */}
                <Dialog open={isCreateFieldOpen} onOpenChange={setIsCreateFieldOpen}>
                  <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-semibold">Criar Campo Personalizado</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome do Campo</Label>
                        <Input
                          value={newFieldName}
                          onChange={(e) => {
                            setNewFieldName(e.target.value);
                            // Auto generate key
                            const key = e.target.value
                              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                              .replace(/[^a-zA-Z0-9\s]/g, "")
                              .replace(/\s+/g, "_")
                              .toLowerCase();
                            setNewFieldKey(key);
                          }}
                          placeholder="Ex: CPF do Comprador"
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Chave do Campo (Sem espaços, minúsculas)</Label>
                        <Input
                          value={newFieldKey}
                          onChange={(e) => setNewFieldKey(e.target.value.replace(/[^a-z0-9_]/g, ""))}
                          placeholder="ex: cpf_do_comprador"
                          className="h-9 text-xs font-mono rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Entidade</Label>
                          <Select value={newFieldEntity} onValueChange={(v: any) => setNewFieldEntity(v)}>
                            <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="text-xs">
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="deal">Negócio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo de Dado</Label>
                          <Select value={newFieldType} onValueChange={(v: any) => setNewFieldType(v)}>
                            <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="text-xs">
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="boolean">Booleano</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="mt-4 gap-2">
                      <Button type="button" variant="ghost" onClick={() => setIsCreateFieldOpen(false)} className="rounded-xl text-xs h-9">
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleCreateField} className="rounded-xl text-xs h-9">
                        Criar e Usar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            );
          })()}

          {/* COMING SOON placeholders - API / AI Assistant / legacy js_code */}
          {(node.nodeType === "api_call" || node.nodeType === "ai_agent" || node.nodeType === "js_code") && (
            <div className="p-3 rounded-lg bg-muted/50 border flex gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Este tipo de bloco ainda não está disponível para execução. Você pode mantê-lo no fluxo, mas ele não enviará nada até esta função ser lançada.
              </p>
            </div>
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
          {["group_create", "group_rename", "group_photo", "group_description", "group_add_participant", "group_remove_participant", "group_promote_admin", "group_remove_admin", "group_settings"].includes(node.nodeType) && !isGroup && (
            <div className="p-4 bg-yellow-500/10 text-yellow-600 rounded-xl border border-yellow-500/20 text-sm">
              Este bloco de gestão de grupo está disponível apenas quando a automação está habilitada para grupos. Ative o modo grupo no gatilho principal.
            </div>
          )}
          {node.nodeType === "group_create" && isGroup && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Nome do Grupo</Label>
                  <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.groupName as string) || ""; updateConfig("groupName", current + val); }} />
                </div>
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
              <div className="flex items-center justify-between">
                <Label>Novo Nome do Grupo</Label>
                <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.newName as string) || ""; updateConfig("newName", current + val); }} />
              </div>
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
              <div className="flex items-center justify-between">
                <Label>Nova Descrição</Label>
                <VariablePicker isGroup={isGroup} onSelect={(val) => { const current = (node.config.description as string) || ""; updateConfig("description", current + val); }} />
              </div>
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
                <div className="flex items-center justify-between">
                  <Label>Legenda (opcional)</Label>
                  <VariablePicker
                    isGroup={isGroup}
                    onSelect={(val) => {
                      const current = (node.config.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
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
                <div className="flex items-center justify-between">
                  <Label>Legenda (opcional)</Label>
                  <VariablePicker
                    isGroup={isGroup}
                    onSelect={(val) => {
                      const current = (node.config.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
                <Textarea
                  placeholder="Texto do status..."
                  value={(node.config.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* STATUS */}
          {node.nodeType === "status" && (
            <>
              {/* Select Status Type */}
              <div className="space-y-2">
                <Label>Tipo de Status</Label>
                <Select 
                  value={(node.config.statusType as string) || "text"} 
                  onValueChange={v => {
                    updateConfig("statusType", v);
                    if (v === "text") {
                      updateConfig("url", "");
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl border-border/40">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select Connection/Instance */}
              <div className="space-y-2">
                <Label>Conexão / Instância</Label>
                <Select value={(node.config.instanceId as string) || ""} onValueChange={v => updateConfig("instanceId", v)}>
                  <SelectTrigger className="rounded-xl border-border/40">
                    <SelectValue placeholder="Selecione a instância..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeInstances.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} ({i.phone || "Sem número"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Content Fields */}
              {((node.config.statusType as string) || "text") === "text" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Texto do Status</Label>
                    <VariablePicker
                      isGroup={isGroup}
                      onSelect={(val) => {
                        const current = (node.config.content as string) || "";
                        updateConfig("content", current + val);
                      }}
                    />
                  </div>
                  <Textarea
                    placeholder="Escreva a mensagem do status..."
                    value={(node.config.content as string) || ""}
                    onChange={e => updateConfig("content", e.target.value)}
                    rows={4}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Mídia do Status</Label>
                    {renderMediaField((node.config.statusType as "image" | "video") || "image", "https://exemplo.com/media")}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Legenda (opcional)</Label>
                      <VariablePicker
                        isGroup={isGroup}
                        onSelect={(val) => {
                          const current = (node.config.caption as string) || "";
                          updateConfig("caption", current + val);
                        }}
                      />
                    </div>
                    <Textarea
                      placeholder="Texto da legenda..."
                      value={(node.config.caption as string) || ""}
                      onChange={e => updateConfig("caption", e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}

              {/* Scheduling Options */}
              <div className="space-y-2 pt-3 border-t">
                <Label>Envio / Agendamento</Label>
                <Select 
                  value={(node.config.scheduleType as string) || "now"} 
                  onValueChange={v => updateConfig("scheduleType", v)}
                >
                  <SelectTrigger className="rounded-xl border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Disparar agora</SelectItem>
                    <SelectItem value="schedule">Agendar envio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {((node.config.scheduleType as string) || "now") === "schedule" && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Tipo de agendamento</Label>
                    <Select 
                      value={((node.config.scheduling as any)?.type as string) || "single"} 
                      onValueChange={v => {
                        const sched = (node.config.scheduling as any) || {};
                        updateConfig("scheduling", { ...sched, type: v });
                      }}
                    >
                      <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Único</SelectItem>
                        <SelectItem value="recurrent">Recorrente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {((node.config.scheduling as any)?.type as string) === "recurrent" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-slate-400">Recorrência</Label>
                      <Select 
                        value={((node.config.scheduling as any)?.recount as string) || "daily"} 
                        onValueChange={v => {
                          const sched = (node.config.scheduling as any) || {};
                          updateConfig("scheduling", { ...sched, recount: v });
                        }}
                      >
                        <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diário</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Dia do mês</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Horários</Label>
                    <div className="space-y-1">
                      {(((node.config.scheduling as any)?.times as string[]) || ["12:00"]).map((time, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <Input 
                            type="time" 
                            value={time} 
                            onChange={e => {
                              const sched = (node.config.scheduling as any) || {};
                              const times = [...(sched.times || ["12:00"])];
                              times[idx] = e.target.value;
                              updateConfig("scheduling", { ...sched, times });
                            }}
                            className="h-8 rounded-lg text-xs"
                          />
                          {idx > 0 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                const sched = (node.config.scheduling as any) || {};
                                const times = (sched.times || ["12:00"]).filter((_: any, i: any) => i !== idx);
                                updateConfig("scheduling", { ...sched, times });
                              }}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          const sched = (node.config.scheduling as any) || {};
                          const times = [...(sched.times || ["12:00"]), "12:00"];
                          updateConfig("scheduling", { ...sched, times });
                        }}
                        className="text-[10px] h-6 px-2 hover:bg-slate-100 text-[#8A3CFF] font-semibold"
                      >
                        + Adicionar horário
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
            nodeType={resolvedNodeType}
          />
          </div>
        </div>
    </div>
  );
}
