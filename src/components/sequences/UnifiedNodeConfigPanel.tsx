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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Plus, Trash2, Zap, Play, Send,
  MessageSquare, Clock, GitBranch, Bell, Link2,
  Image, Video, Music, FileText, Smile,
  BarChart3, MousePointerClick, List, MapPin, Contact, Calendar,
  Pencil, ImageIcon, UserPlus, UserMinus, ShieldAlert, ShieldCheck, ShieldPlus, ShieldMinus, Settings, CircleDot,
  Shuffle, Tag, Award, Sliders, Sparkles, Info, RefreshCw, HelpCircle,
  ChevronDown, CheckCircle2, ArrowUp, ArrowDown, Copy, PhoneCall
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNodeBlockDefinition, getDefaultConfigForSubType } from "./nodeDefinitions";
import { VariablePicker } from "./VariablePicker";
import { normalizeDelayConfig, toDelayMs, formatDelayLabel } from "@/lib/workflows/delay";
import { useCallOperators } from "@/hooks/useCallOperators";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";

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
  { label: "15s", value: 15, unit: "seconds" },
  { label: "30s", value: 30, unit: "seconds" },
  { label: "1min", value: 1, unit: "minutes" },
  { label: "5min", value: 5, unit: "minutes" },
  { label: "15min", value: 15, unit: "minutes" },
  { label: "30min", value: 30, unit: "minutes" },
  { label: "1h", value: 1, unit: "hours" },
  { label: "2h", value: 2, unit: "hours" },
  { label: "1d", value: 1, unit: "days" },
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

  const [isPopupOpen, setIsPopupOpen] = useState(open);
  useEffect(() => {
    setIsPopupOpen(open);
  }, [open, node.id]);

  const { activeCompanyId } = useCompany();
  const { operators = [] } = useCallOperators();
  const { campaigns = [] } = useCallCampaigns();

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

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const editingMessage = editingMessageId && Array.isArray(node.config.messages)
    ? node.config.messages.find((m: any) => m.id === editingMessageId)
    : null;

  // "content"/"action" nodes carry their real sub-type inside config
  // (contentType/actionType) — resolvedNodeType lets every existing per-type
  // block below key off the sub-type transparently, whether the node arrived
  // here as a lifted "content"/"action" node (new canvas) or as a raw legacy
  // node_type (dispatch builder, timeline builder, or an already-saved node
  // predating the consolidation).
  const resolvedNodeType = node.nodeType === "content"
    ? "content"
    : node.nodeType === "action"
    ? ((node.config.actionType as string) || "tag_add")
    : node.nodeType;

  const nodeInfo = NODE_TITLES[resolvedNodeType] || NODE_TITLES[node.nodeType] || NODE_TITLES.message;
  const Icon = nodeInfo.icon;

  const currentConfig = node.config;

  const updateMultipleConfigs = (updates: Record<string, unknown>) => {
    onUpdate({ ...node.config, ...updates });
  };

  const updateConfig = (key: string, value: unknown) => {
    updateMultipleConfigs({ [key]: value });
  };

  const isGroup = isGroupProp !== undefined ? isGroupProp : mode === "group";

  if (resolvedNodeType === "phone_call") {
    const script = currentConfig.script || { enabled: true, title: "Roteiro da ligação", content: "", showLeadVariables: true, type: "simple", quiz: [] };
    const assignment = currentConfig.assignment || { mode: "queue", queueId: null, operatorId: null, departmentId: null, distributionStrategy: "round-robin" };
    const attempts = currentConfig.attempts || { enabled: true, maxAttempts: 3, retryDelayMs: 3600000, retryOn: ["no_answer", "busy", "failed"], businessHoursOnly: true };
    const actions = currentConfig.actions || [
      { id: "success", label: "Sucesso", type: "success", color: "green", output: "success", requiresNote: false, finalizesCall: true, scheduleRetry: false },
      { id: "no_success", label: "Sem Sucesso", type: "no_success", color: "red", output: "no_success", requiresNote: true, finalizesCall: true, scheduleRetry: false }
    ];
    const quiz = script.quiz || [];

    const updateScript = (key: string, val: any) => {
      updateConfig("script", { ...script, [key]: val });
    };
    const updateAssignment = (key: string, val: any) => {
      updateConfig("assignment", { ...assignment, [key]: val });
    };
    const updateAttempts = (key: string, val: any) => {
      updateConfig("attempts", { ...attempts, [key]: val });
    };
    const addCustomAction = () => {
      const newId = Math.random().toString(36).substring(2, 9);
      const newAction = {
        id: newId,
        label: "Nova Ação",
        type: "other",
        color: "blue",
        output: newId,
        requiresNote: false,
        finalizesCall: true,
        scheduleRetry: false
      };
      updateConfig("actions", [...actions, newAction]);
    };
    const removeAction = (index: number) => {
      const updated = actions.filter((_: any, idx: number) => idx !== index);
      updateConfig("actions", updated);
    };
    const updateActionField = (index: number, key: string, val: any) => {
      const updated = actions.map((act: any, idx: number) => {
        if (idx === index) {
          const u = { ...act, [key]: val };
          if (key === "id") {
            u.output = val;
          }
          return u;
        }
        return act;
      });
      updateConfig("actions", updated);
    };

    // Quiz Helper functions
    const updateQuiz = (newQuiz: any[]) => {
      updateScript("quiz", newQuiz);
    };
    const addQuestion = () => {
      const newQuestion = {
        id: Math.random().toString(36).substring(2, 9),
        questionText: "Nova Pergunta",
        alternatives: []
      };
      updateQuiz([...quiz, newQuestion]);
    };
    const removeQuestion = (qId: string) => {
      const updated = quiz.filter((q: any) => q.id !== qId);
      updateQuiz(updated);
    };
    const updateQuestionText = (qId: string, text: string) => {
      const updated = quiz.map((q: any) => 
        q.id === qId ? { ...q, questionText: text } : q
      );
      updateQuiz(updated);
    };
    const addAlternative = (qId: string) => {
      const newAlt = {
        id: Math.random().toString(36).substring(2, 9),
        text: "Opção",
        nextQuestionId: "end"
      };
      const updated = quiz.map((q: any) => 
        q.id === qId ? { ...q, alternatives: [...(q.alternatives || []), newAlt] } : q
      );
      updateQuiz(updated);
    };
    const removeAlternative = (qId: string, altId: string) => {
      const updated = quiz.map((q: any) => 
        q.id === qId ? { ...q, alternatives: (q.alternatives || []).filter((a: any) => a.id !== altId) } : q
      );
      updateQuiz(updated);
    };
    const updateAlternativeField = (qId: string, altId: string, key: string, val: any) => {
      const updated = quiz.map((q: any) => 
        q.id === qId ? {
          ...q,
          alternatives: (q.alternatives || []).map((a: any) => 
            a.id === altId ? { ...a, [key]: val } : a
          )
        } : q
      );
      updateQuiz(updated);
    };

    return (
      <>
        {/* Placeholder in sidebar */}
        <div className="flex flex-col p-5 text-center space-y-4">
          <div className="mx-auto p-3 rounded-full bg-pink-50 border border-pink-100 text-pink-600">
            <PhoneCall className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Parâmetros de Ligação</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O nó de ligação possui configurações avançadas de Roteiro Quiz e Ações.
            </p>
          </div>
          <Button
            type="button"
            className="w-full text-xs h-9 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            onClick={() => setIsPopupOpen(true)}
          >
            <Sliders className="h-3.5 w-3.5" /> Configurar no Pop-up
          </Button>
        </div>

        {/* Dialog Pop-up */}
        <Dialog open={isPopupOpen} onOpenChange={(v) => { if (!v) { setIsPopupOpen(false); onClose(); } }}>
          <DialogContent className="max-w-4xl w-[90vw] p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader className="border-b pb-4 mb-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-600 text-white shadow-sm">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-800">Configurar Bloco de Ligação (Call Panel)</DialogTitle>
                  <p className="text-xs text-muted-foreground">Configure o roteiro interativo (quiz), distribuição de fila, retentativas e caminhos de desfecho do workflow.</p>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Column: Basic Node details */}
              <div className="md:col-span-1 space-y-4 border-r pr-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identificação do Nó</Label>
                  <Input
                    placeholder="Ligação"
                    value={(currentConfig.label as string) || ""}
                    onChange={e => updateConfig("label", e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resumo Visual</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Ações (Outputs):</span>
                    <span className="font-semibold text-slate-800">{actions.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Perguntas no Quiz:</span>
                    <span className="font-semibold text-slate-800">{script.type === "quiz" ? quiz.length : "0 (Texto simples)"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Retentativas:</span>
                    <span className="font-semibold text-slate-800">{attempts.enabled !== false ? `${attempts.maxAttempts}x` : "Desativado"}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Tab Panels */}
              <div className="md:col-span-3">
                <Tabs defaultValue="script" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full mb-6 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <TabsTrigger value="script" className="rounded-lg py-1.5 text-xs font-semibold">Roteiro</TabsTrigger>
                    <TabsTrigger value="dist" className="rounded-lg py-1.5 text-xs font-semibold">Distribuição</TabsTrigger>
                    <TabsTrigger value="attempts" className="rounded-lg py-1.5 text-xs font-semibold">Retentativas</TabsTrigger>
                    <TabsTrigger value="actions" className="rounded-lg py-1.5 text-xs font-semibold">Ações</TabsTrigger>
                  </TabsList>

                  {/* SCRIPT TAB */}
                  <TabsContent value="script" className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 mb-2">
                      <div>
                        <Label className="text-sm font-bold text-slate-800 block">Roteiro para o Operador</Label>
                        <p className="text-xs text-muted-foreground">Escolha o formato do roteiro que o operador seguirá durante a chamada.</p>
                      </div>
                      <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <Button
                          type="button"
                          size="sm"
                          variant={script.type === "quiz" ? "secondary" : "ghost"}
                          onClick={() => updateScript("type", "quiz")}
                          className="text-xs h-7 rounded-lg"
                        >
                          Quiz Interativo
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={script.type !== "quiz" ? "secondary" : "ghost"}
                          onClick={() => updateScript("type", "simple")}
                          className="text-xs h-7 rounded-lg"
                        >
                          Texto Simples
                        </Button>
                      </div>
                    </div>

                    {script.type !== "quiz" ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500">Título do roteiro</Label>
                          <Input
                            value={script.title || ""}
                            onChange={e => updateScript("title", e.target.value)}
                            placeholder="Ex: Roteiro de apresentação"
                            className="rounded-xl h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-500">Conteúdo do Roteiro</Label>
                            <VariablePicker
                              isGroup={isGroup}
                              onSelect={(val) => {
                                updateScript("content", (script.content || "") + val);
                              }}
                            />
                          </div>
                          <Textarea
                            value={script.content || ""}
                            onChange={e => updateScript("content", e.target.value)}
                            placeholder="Olá {{lead.name}}, tudo bem? Vi que você se cadastrou na nossa página..."
                            rows={8}
                            className="rounded-xl font-sans text-xs leading-relaxed"
                          />
                        </div>
                      </div>
                    ) : (
                      // QUIZ BUILDER
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perguntas do Quiz</Label>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold gap-1"
                            onClick={addQuestion}
                          >
                            <Plus className="h-3.5 w-3.5" /> Adicionar Pergunta
                          </Button>
                        </div>

                        {quiz.length === 0 ? (
                          <div className="p-8 text-center border border-dashed border-slate-200 bg-slate-50 rounded-2xl space-y-2">
                            <Sliders className="h-8 w-8 text-slate-300 mx-auto" />
                            <p className="text-xs text-muted-foreground">Nenhuma pergunta criada ainda. Adicione a primeira pergunta do quiz.</p>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                            {quiz.map((q: any, qIdx: number) => (
                              <div key={q.id || qIdx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 relative">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeQuestion(q.id)}
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 absolute top-2 right-2 rounded-lg"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>

                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">Pergunta #{qIdx + 1}</span>
                                  <Input
                                    value={q.questionText || ""}
                                    onChange={e => updateQuestionText(q.id, e.target.value)}
                                    placeholder="Ex: Você trabalha com o quê?"
                                    className="h-9 text-xs rounded-xl bg-white"
                                  />
                                </div>

                                <div className="space-y-3 pl-4 border-l-2 border-slate-200/80">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alternativas de Resposta</span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] rounded-lg gap-1 border-slate-200"
                                      onClick={() => addAlternative(q.id)}
                                    >
                                      <Plus className="h-2.5 w-2.5" /> Add Opção
                                    </Button>
                                  </div>

                                  {(q.alternatives || []).length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground italic">Nenhuma opção de resposta adicionada.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {(q.alternatives || []).map((alt: any, altIdx: number) => (
                                        <div key={alt.id || altIdx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
                                          <div className="flex-1">
                                            <Input
                                              value={alt.text || ""}
                                              onChange={e => updateAlternativeField(q.id, alt.id, "text", e.target.value)}
                                              placeholder="Texto da opção"
                                              className="h-8 text-xs rounded-lg"
                                            />
                                          </div>
                                          <div className="w-[180px]">
                                            <Select
                                              value={alt.nextQuestionId || "end"}
                                              onValueChange={v => updateAlternativeField(q.id, alt.id, "nextQuestionId", v)}
                                            >
                                              <SelectTrigger className="h-8 text-xs rounded-lg">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="rounded-xl">
                                                <SelectItem value="end">Finalizar Quiz</SelectItem>
                                                {quiz
                                                  .filter((otherQ: any) => otherQ.id !== q.id)
                                                  .map((otherQ: any, otherIdx: number) => (
                                                    <SelectItem key={otherQ.id} value={otherQ.id}>
                                                      Ir para Pág. {quiz.findIndex((qq: any) => qq.id === otherQ.id) + 1}
                                                    </SelectItem>
                                                  ))
                                                }
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeAlternative(q.id, alt.id)}
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* DISTRIBUTION TAB */}
                  <TabsContent value="dist" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500">Atribuir chamada para</Label>
                      <Select
                        value={assignment.mode || "queue"}
                        onValueChange={v => {
                          updateAssignment("mode", v);
                          updateAssignment("queueId", null);
                          updateAssignment("operatorId", null);
                          updateAssignment("departmentId", null);
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl">
                          <SelectValue placeholder="Selecione o destino..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="queue">Campanha / Fila</SelectItem>
                          <SelectItem value="operator">Operador específico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {assignment.mode === "queue" && (
                      <div className="space-y-2 animate-in fade-in duration-100">
                        <Label className="text-xs font-semibold text-slate-500">Campanha / Fila de destino</Label>
                        <Select
                          value={assignment.queueId || "none"}
                          onValueChange={v => updateAssignment("queueId", v === "none" ? null : v)}
                        >
                          <SelectTrigger className="w-full rounded-xl">
                            <SelectValue placeholder="Selecione a campanha..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="none">Selecione uma campanha...</SelectItem>
                            {campaigns.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          A chamada será colocada na fila da campanha escolhida, e os operadores associados a ela poderão atendê-la.
                        </p>
                      </div>
                    )}

                    {assignment.mode === "operator" && (
                      <div className="space-y-2 animate-in fade-in duration-100">
                        <Label className="text-xs font-semibold text-slate-500">Operador específico</Label>
                        <Select
                          value={assignment.operatorId || "none"}
                          onValueChange={v => updateAssignment("operatorId", v === "none" ? null : v)}
                        >
                          <SelectTrigger className="w-full rounded-xl">
                            <SelectValue placeholder="Selecione o operador..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="none">Selecione um operador...</SelectItem>
                            {operators.map((op: any) => (
                              <SelectItem key={op.id} value={op.id}>
                                {op.operatorName} ({op.extension || "sem ramal"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          A chamada será direcionada diretamente para a fila particular do operador selecionado.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ATTEMPTS TAB */}
                  <TabsContent value="attempts" className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-slate-800">Habilitar Retentativas</Label>
                        <p className="text-xs text-muted-foreground">Repetir chamadas sem resposta automaticamente</p>
                      </div>
                      <Switch
                        checked={attempts.enabled !== false}
                        onCheckedChange={checked => updateAttempts("enabled", checked)}
                      />
                    </div>

                    {attempts.enabled !== false && (
                      <div className="space-y-4 animate-in fade-in duration-100">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500">Quantidade máxima de tentativas</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={attempts.maxAttempts || 3}
                            onChange={e => updateAttempts("maxAttempts", parseInt(e.target.value) || 1)}
                            className="rounded-xl h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500">Intervalo entre tentativas</Label>
                          <Select
                            value={String(attempts.retryDelayMs || 3600000)}
                            onValueChange={v => updateAttempts("retryDelayMs", parseInt(v))}
                          >
                            <SelectTrigger className="w-full rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="300000">5 minutos</SelectItem>
                              <SelectItem value="1800000">30 minutos</SelectItem>
                              <SelectItem value="3600000">1 hora</SelectItem>
                              <SelectItem value="14400000">4 horas</SelectItem>
                              <SelectItem value="86400000">1 dia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-semibold text-slate-800">Apenas horário comercial</Label>
                            <p className="text-[10px] text-muted-foreground">Evita agendamentos fora do horário comercial (08h às 18h)</p>
                          </div>
                          <Switch
                            checked={attempts.businessHoursOnly !== false}
                            onCheckedChange={checked => updateAttempts("businessHoursOnly", checked)}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ACTIONS TAB */}
                  <TabsContent value="actions" className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <Label className="text-sm font-bold text-slate-800 block">Botões do Operador</Label>
                        <p className="text-xs text-muted-foreground">Defina os botões de ação que o operador terá para finalizar o atendimento.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addCustomAction}
                        className="h-8 text-xs rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar Ação
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                      {actions.map((act: any, idx: number) => (
                        <div key={act.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 relative">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAction(idx)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 absolute top-2 right-2 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-500">Nome do Botão</Label>
                              <Input
                                value={act.label || ""}
                                onChange={e => updateActionField(idx, "label", e.target.value)}
                                className="h-9 text-xs rounded-xl bg-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-500">Cor do Botão</Label>
                              <Select
                                value={act.color || "blue"}
                                onValueChange={v => updateActionField(idx, "color", v)}
                              >
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="blue">Azul</SelectItem>
                                  <SelectItem value="green">Verde</SelectItem>
                                  <SelectItem value="red">Vermelho</SelectItem>
                                  <SelectItem value="amber">Amarelo</SelectItem>
                                  <SelectItem value="indigo">Roxo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/55">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-medium text-slate-700">Exigir observação</Label>
                              <p className="text-[10px] text-muted-foreground">O operador é obrigado a preencher anotações de texto ao clicar</p>
                            </div>
                            <Switch
                              id={`note-${act.id}`}
                              checked={act.requiresNote === true}
                              onCheckedChange={checked => updateActionField(idx, "requiresNote", checked)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPopupOpen(false);
                  onClose();
                }}
                className="h-9 rounded-xl text-xs"
              >
                Fechar e Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-6 pb-3 shrink-0 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{nodeInfo.title}</h2>
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="space-y-4">
            {/* Node Label/Name */}
            {node.nodeType !== "content" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Nome do componente</Label>
                  <Input
                    placeholder={nodeInfo.title}
                    value={(currentConfig.label as string) || ""}
                    onChange={e => updateConfig("label", e.target.value)}
                  />
                </div>
              </>
            )}

            <NodeScheduleSection
              nodeType={resolvedNodeType}
              config={currentConfig}
              onUpdateConfig={updateConfig}
              onManualSend={onManualSend}
              isSendingManual={isSendingManual}
            />

            {renderMessageSpecificFields(
              resolvedNodeType,
              currentConfig,
              updateConfig,
              updateMultipleConfigs
            )}
        </div>
      </div>
    </div>
  );
}

const renderMessageSpecificFields = (
    type: string,
    currentConfig: any,
    updateConfig: (key: string, value: unknown) => void,
    updateMultipleConfigs: (updates: Record<string, unknown>) => void
  ) => {
    return (
      <>
          {/* MESSAGE */}
          {type === "message" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Conteúdo da Mensagem</Label>
                  <VariablePicker
                    isGroup={false}
                    onSelect={(val) => {
                      const current = (currentConfig.content as string) || "";
                      updateConfig("content", current + val);
                    }}
                  />
                </div>
                <Textarea value={(currentConfig.content as string) || ""} onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight + 2}px`; updateConfig("content", e.target.value); }} onFocus={(e) => { e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight + 2}px`; }} placeholder="Digite a mensagem (Use *negrito*, _itálico_, ~riscado~)..." className="resize-none font-mono text-sm overflow-hidden" rows={8} />
              </div>
            </>
          )}

          {/* IMAGE */}
          {type === "image" && (
            <>
              <div className="space-y-2">
                <Label>URL da Mídia</Label>
                <Input placeholder="https://exemplo.com/imagem.jpg" value={(currentConfig.url as string) || ""} onChange={e => updateConfig("url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Legenda / Mensagem</Label>
                  <VariablePicker
                    isGroup={false}
                    onSelect={(val) => {
                      const current = (currentConfig.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
                <Textarea
                  placeholder="Texto que acompanha a mídia..."
                  value={(currentConfig.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* VIDEO */}
          {type === "video" && (
            <>
              <div className="space-y-2">
                <Label>URL da Mídia</Label>
                <Input placeholder="https://exemplo.com/video.mp4" value={(currentConfig.url as string) || ""} onChange={e => updateConfig("url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Legenda / Mensagem</Label>
                  <VariablePicker
                    isGroup={false}
                    onSelect={(val) => {
                      const current = (currentConfig.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
                <Textarea
                  placeholder="Texto que acompanha a mídia..."
                  value={(currentConfig.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* AUDIO */}
          {type === "audio" && (
            <>
              <div className="space-y-2">
                <Label>URL da Mídia</Label>
                <Input placeholder="https://exemplo.com/audio.ogg" value={(currentConfig.url as string) || ""} onChange={e => updateConfig("url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Legenda / Mensagem</Label>
                  <VariablePicker
                    isGroup={false}
                    onSelect={(val) => {
                      const current = (currentConfig.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
                <Textarea
                  placeholder="Texto que acompanha a mídia..."
                  value={(currentConfig.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* DOCUMENT */}
          {type === "document" && (
            <>
              <div className="space-y-2">
                <Label>URL da Mídia</Label>
                <Input placeholder="https://exemplo.com/documento.pdf" value={(currentConfig.url as string) || ""} onChange={e => updateConfig("url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nome do Arquivo</Label>
                <Input
                  placeholder="contrato.pdf"
                  value={(currentConfig.filename as string) || ""}
                  onChange={e => updateConfig("filename", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Legenda / Mensagem</Label>
                  <VariablePicker
                    isGroup={false}
                    onSelect={(val) => {
                      const current = (currentConfig.caption as string) || "";
                      updateConfig("caption", current + val);
                    }}
                  />
                </div>
                <Textarea
                  placeholder="Texto que acompanha a mídia..."
                  value={(currentConfig.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* STICKER */}
          {type === "sticker" && (
            <>
              <div className="space-y-2">
                <Label>Sticker</Label>
                <Input placeholder="https://exemplo.com/sticker.webp" value={(currentConfig.url as string) || ""} onChange={e => updateConfig("url", e.target.value)} />
                <p className="text-xs text-muted-foreground">WebP 512x512px recomendado</p>
              </div>
            </>
          )}

          {/* POLL */}
          {type === "poll" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pergunta</Label>
                  <VariablePicker isGroup={false} onSelect={(val) => { const current = (currentConfig.question as string) || ""; updateConfig("question", current + val); }} />
                </div>
                <Textarea
                  placeholder="Qual sua preferência?"
                  value={(currentConfig.question as string) || ""}
                  onChange={e => updateConfig("question", e.target.value)}
                  maxLength={255}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Opções (até 12)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6"
                    onClick={() => {
                      const options = [...((currentConfig.options as string[]) || [])];
                      if (options.length < 12) {
                        options.push("");
                        updateConfig("options", options);
                      }
                    }}
                    disabled={((currentConfig.options as string[]) || []).length >= 12}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {((currentConfig.options as string[]) || ["", "", ""]).map((opt, i) => {
                  return (
                    <div key={i} className="flex gap-1">
                      <Input
                        placeholder={`Opção ${i + 1}`}
                        value={opt}
                        onChange={e => {
                          const options = [...((currentConfig.options as string[]) || [])];
                          options[i] = e.target.value;
                          updateConfig("options", options);
                        }}
                        className="flex-1"
                      />
                      {((currentConfig.options as string[]) || []).length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            );
          })()}

          {/* WEBHOOK FORWARD */}
          {node.nodeType === "webhook_forward" && (
            <>
              <div className="space-y-2">
                <Label>URL do Webhook *</Label>
                <Input
                  type="url"
                  placeholder="https://n8n.exemplo.com/webhook/..."
                  value={(currentConfig.url as string) || ""}
                  onChange={e => updateConfig("url", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  O sistema enviará automaticamente todos os dados do lead e da campanha para esta URL
                </p>
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={(currentConfig.method as string) || "POST"} onValueChange={v => updateConfig("method", v)}>
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
                      const headers = ((currentConfig.headers as Array<{key: string; value: string}>) || []);
                      updateConfig("headers", [...headers, { key: "", value: "" }]);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Header
                  </Button>
                </div>
                {((currentConfig.headers as Array<{key: string; value: string}>) || []).map((header, idx) => (
                  <div key={idx} className="flex gap-1">
                    <Input
                      placeholder="Chave"
                      value={header.key}
                      onChange={e => {
                        const headers = [...((currentConfig.headers as Array<{key: string; value: string}>) || [])];
                        headers[idx] = { ...headers[idx], key: e.target.value };
                        updateConfig("headers", headers);
                      }}
                      className="flex-1 h-8 text-xs"
                    />
                    <Input
                      placeholder="Valor"
                      value={header.value}
                      onChange={e => {
                        const headers = [...((currentConfig.headers as Array<{key: string; value: string}>) || [])];
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
                        const headers = ((currentConfig.headers as Array<{key: string; value: string}>) || []).filter((_, i) => i !== idx);
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
                  checked={(currentConfig.includeInstance as boolean) ?? true}
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
                    checked={(currentConfig.includeGroups as boolean) ?? true}
                    onCheckedChange={checked => updateConfig("includeGroups", checked)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Payload adicional (JSON, opcional)</Label>
                <Textarea
                  placeholder={'{"chave": "valor"}'}
                  value={(currentConfig.customPayload as string) || ""}
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

      </>
    );
  };

  const openActionDialog = (index: number) => {
    setEditingOptionIndex(index);
    setActionDialogOpen(true);
  };

  const renderMediaField = (
    mediaType: string,
    placeholder: string,
    currConf: any = currentConfig,
    updConf: (key: string, value: unknown) => void = updateConfig,
    updMultConf: (updates: Record<string, unknown>) => void = updateMultipleConfigs
  ) => {
    if (renderMediaUploader) {
      return renderMediaUploader({
        mediaType,
        currentUrl: (currConf.url as string) || "",
        onUpload: (url, filename) => {
          const updates: Record<string, unknown> = { url };
          if (filename) updates.filename = filename;
          updMultConf(updates);
        },
        onUrlChange: (url) => updConf("url", url),
        placeholder,
      });
    }
    return (
      <Input
        placeholder={placeholder}
        value={(currConf.url as string) || ""}
        onChange={e => updConf("url", e.target.value)}
      />
    );
  };

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-6 pb-3 shrink-0 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{nodeInfo.title}</h2>
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="space-y-4">
            {/* Node Label/Name */}
            {node.nodeType !== "content" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Nome do componente</Label>
                  <Input
                    placeholder={nodeInfo.title}
                    value={(currentConfig.label as string) || ""}
                    onChange={e => updateConfig("label", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Separator />
              </>
            )}


            {/* CONTENT / ACTION sub-type selector */}
            {/* CONTENT / ACTION sub-type selector */}
            {resolvedNodeType === "content" && (() => {
              const block = getNodeBlockDefinition(node.nodeType)!;
              const messages = (node.config.messages as any[]) || [];
              const hasUserInput = messages.some(m => m.type === "user_input");
              
              const handleAddAction = (subType: string) => {
                const messageId = Math.random().toString(36).substring(2, 9);
                const newAction = {
                  id: messageId,
                  type: subType,
                  ...getDefaultConfigForSubType("content", subType)
                };
                onUpdate({ ...node.config, messages: [...messages, newAction] });
                setEditingMessageId(messageId);
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              };

              const handleDeleteAction = (e: React.MouseEvent, id: string) => {
                e.stopPropagation();
                onUpdate({ ...node.config, messages: messages.filter(m => m.id !== id) });
              };

              const handleDuplicateAction = (e: React.MouseEvent, msg: any) => {
                e.stopPropagation();
                const newId = Math.random().toString(36).substring(2, 9);
                onUpdate({ ...node.config, messages: [...messages, { ...msg, id: newId }] });
              };

              const moveAction = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
                e.stopPropagation();
                const newMessages = [...messages];
                if (direction === 'up' && index > 0) {
                  const temp = newMessages[index - 1];
                  newMessages[index - 1] = newMessages[index];
                  newMessages[index] = temp;
                } else if (direction === 'down' && index < messages.length - 1) {
                  const temp = newMessages[index + 1];
                  newMessages[index + 1] = newMessages[index];
                  newMessages[index] = temp;
                }
                onUpdate({ ...node.config, messages: newMessages });
              };

              const primaryTypes = ["message", "user_input", "delay", "audio", "document", "dynamic_url"];

              return (
                <>
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
                      value={(currentConfig.instanceId as string) || "default"}
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
                  </div>

                  <div className="space-y-3 mb-6 bg-slate-50/50 border border-slate-200 rounded-xl p-3">
                     {messages.length === 0 ? (
                       <div className="text-xs text-center text-muted-foreground py-4">
                         Nenhuma mensagem adicionada.
                       </div>
                     ) : (
                       <Accordion type="single" collapsible value={editingMessageId || ""} onValueChange={(val) => setEditingMessageId(val || null)} className="space-y-2 flex flex-col">
                         {messages.map((msg, idx) => {
                           const subInfo = block.subTypes?.find(s => s.subType === msg.type);
                           const MsgIcon = subInfo?.icon || MessageSquare;
                           return (
                             <AccordionItem key={msg.id} value={msg.id} className="relative flex flex-col border-none">
                               <AccordionTrigger
                                 className="group flex flex-col p-3 border border-slate-200 rounded-lg hover:border-[#8A3CFF]/50 bg-white hover:bg-slate-50 transition-colors shadow-sm [&[data-state=open]]:border-[#8A3CFF] hover:no-underline"
                               >
                                 <div className="flex items-center justify-between w-full">
                                   <div className="flex items-center gap-3">
                                     <div className={cn("p-1.5 rounded-md text-white shrink-0", subInfo?.color || "bg-slate-500")}>
                                       <MsgIcon className="h-4 w-4" />
                                     </div>
                                     <div className="flex flex-col min-w-0 text-left">
                                       <span className="text-[11px] font-bold text-slate-800">
                                          {msg.type === "delay"
                                            ? `${subInfo?.label || "Atraso de tempo"} — ${msg.delayMs ? formatDelayLabel(msg.delayMs) : "Configurar..."}`
                                            : (subInfo?.label || "Desconhecido")}
                                        </span>
                                        <span className="text-[9px] text-slate-500 truncate max-w-[130px] font-normal">
                                          {msg.type === "delay"
                                            ? `Espera de ${msg.delayMs ? formatDelayLabel(msg.delayMs) : "tempo"}`
                                            : (msg.content || msg.question || msg.url || "Configurar...")}
                                        </span>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-800" onClick={(e) => { e.stopPropagation(); moveAction(e, idx, 'up'); }} disabled={idx === 0}>
                                       <ArrowUp className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-800" onClick={(e) => { e.stopPropagation(); moveAction(e, idx, 'down'); }} disabled={idx === messages.length - 1}>
                                       <ArrowDown className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={(e) => { e.stopPropagation(); handleDuplicateAction(e, msg); }}>
                                       <Copy className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteAction(e, msg.id); }}>
                                       <Trash2 className="h-3 w-3" />
                                     </Button>
                                   </div>
                                 </div>
                               </AccordionTrigger>
                               <AccordionContent className="pt-4 pb-2 px-1">
                                 {editingMessageId === msg.id && renderMessageSpecificFields(
                                   msg.type,
                                   msg,
                                   (key, val) => {
                                     const newMsgs = messages.map(m => m.id === msg.id ? { ...m, [key]: val } : m);
                                     onUpdate({ ...node.config, messages: newMsgs });
                                   },
                                   (updates) => {
                                     const newMsgs = messages.map(m => m.id === msg.id ? { ...m, ...updates } : m);
                                     onUpdate({ ...node.config, messages: newMsgs });
                                   }
                                 )}
                               </AccordionContent>
                             </AccordionItem>
                           );
                         })}
                         {hasUserInput && (
                           <div className="flex flex-col items-center justify-center mt-1 p-2.5 border border-dashed border-[#8A3CFF]/40 bg-[#8A3CFF]/5 rounded-lg">
                             <div className="text-[10px] font-semibold text-[#8A3CFF] mb-1.5 flex items-center gap-1.5">
                               <MessageSquare className="h-3 w-3" /> Resposta do usuário
                             </div>
                             <Button variant="outline" size="sm" className="h-6 text-[9px] bg-white text-[#8A3CFF] border-[#8A3CFF]/20 hover:bg-[#8A3CFF]/10 rounded-md">
                               <Plus className="h-3 w-3 mr-1"/> Adicionar botão
                             </Button>
                           </div>
                         )}
                       </Accordion>
                     )}
                  </div>

                  <div className="space-y-3 pb-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full flex items-center gap-2 border-dashed border-slate-300 hover:border-[#8A3CFF]/50 hover:bg-[#8A3CFF]/5 text-slate-600 hover:text-[#8A3CFF] transition-all">
                          <Plus className="h-4 w-4" />
                          Adicionar ação
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0" align="center">
                        <Command>
                          <CommandInput placeholder="Buscar ação..." className="h-9 text-xs" />
                          <CommandList className="max-h-[300px]">
                            <CommandEmpty className="py-6 text-center text-xs text-slate-500">
                              Nenhuma ação encontrada.
                            </CommandEmpty>
                            
                            <CommandGroup heading="Principais" className="text-xs text-slate-500">
                              {block.subTypes!
                                .filter(sub => primaryTypes.includes(sub.subType))
                                .map((sub) => {
                                  const SubIcon = sub.icon;
                                  return (
                                    <CommandItem
                                      key={sub.subType}
                                      value={sub.label}
                                      onSelect={() => handleAddAction(sub.subType)}
                                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAddAction(sub.subType); }}
                                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                                    >
                                      <div className={cn("p-1.5 rounded-md shrink-0 text-white shadow-sm", sub.color)}>
                                        <SubIcon className="h-3.5 w-3.5" />
                                      </div>
                                      <span className="text-sm font-semibold text-slate-700">{sub.label}</span>
                                    </CommandItem>
                                  );
                              })}
                            </CommandGroup>

                            <CommandGroup heading="Avançados" className="text-xs text-slate-500 mt-1 border-t border-slate-100">
                              {block.subTypes!
                                .filter(sub => !primaryTypes.includes(sub.subType))
                                .map((sub) => {
                                  const SubIcon = sub.icon;
                                  return (
                                    <CommandItem
                                      key={sub.subType}
                                      value={sub.label}
                                      onSelect={() => handleAddAction(sub.subType)}
                                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                                    >
                                      <div className={cn("p-1.5 rounded-md shrink-0 text-white shadow-sm", sub.color)}>
                                        <SubIcon className="h-3.5 w-3.5" />
                                      </div>
                                      <span className="text-sm font-semibold text-slate-700">{sub.label}</span>
                                    </CommandItem>
                                  );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Separator className="mt-4" />
                </>
              );
            })()}

            {resolvedNodeType === "group_management" && (() => {
              const actions = (node.config.actions as any[]) || [];
              const groupActionsDef = [
                { type: "group_create", label: "Criar Grupo", icon: Plus, category: "Criação" },
                { type: "group_rename", label: "Renomear Grupo", icon: Pencil, category: "Edição" },
                { type: "group_photo", label: "Alterar Foto", icon: Image, category: "Edição" },
                { type: "group_description", label: "Alterar Descrição", icon: FileText, category: "Edição" },
                { type: "group_add_participant", label: "Adicionar Membro", icon: UserPlus, category: "Moderação" },
                { type: "group_remove_participant", label: "Remover Membro", icon: UserMinus, category: "Moderação" },
                { type: "group_promote_admin", label: "Promover Admin", icon: ShieldAlert, category: "Moderação" },
                { type: "group_remove_admin", label: "Remover Admin", icon: ShieldCheck, category: "Moderação" },
                { type: "group_settings", label: "Configurações", icon: Settings, category: "Moderação" },
                { type: "delay", label: "Delay", icon: Clock, category: "Moderação" },
              ];

              const handleAddAction = (actionType: string) => {
                const actionId = Math.random().toString(36).substring(2, 9);
                const newAction = {
                  id: actionId,
                  type: actionType,
                  ...getDefaultConfigForSubType("group", actionType)
                };
                onUpdate({ ...node.config, actions: [...actions, newAction] });
                setEditingMessageId(actionId);
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              };

              const handleDeleteAction = (e: React.MouseEvent, id: string) => {
                e.stopPropagation();
                onUpdate({ ...node.config, actions: actions.filter(m => m.id !== id) });
              };

              const handleDuplicateAction = (e: React.MouseEvent, msg: any) => {
                e.stopPropagation();
                const newId = Math.random().toString(36).substring(2, 9);
                onUpdate({ ...node.config, actions: [...actions, { ...msg, id: newId }] });
              };

              const moveAction = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
                e.stopPropagation();
                const newActions = [...actions];
                if (direction === 'up' && index > 0) {
                  const temp = newActions[index - 1];
                  newActions[index - 1] = newActions[index];
                  newActions[index] = temp;
                } else if (direction === 'down' && index < actions.length - 1) {
                  const temp = newActions[index + 1];
                  newActions[index + 1] = newActions[index];
                  newActions[index] = temp;
                }
                onUpdate({ ...node.config, actions: newActions });
              };

              return (
                <>

                  <div className="space-y-3 pb-2">
                    <Label className="text-xs font-medium text-slate-800">Ações configuradas</Label>
                     {actions.length === 0 ? (
                       <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                         <p className="text-xs text-slate-500 mb-2">Nenhuma ação configurada.</p>
                       </div>
                     ) : (
                       <Accordion type="single" collapsible value={editingMessageId || ""} onValueChange={(val) => setEditingMessageId(val)}>
                         {actions.map((msg, idx) => {
                           const def = groupActionsDef.find(d => d.type === msg.type);
                           const MsgIcon = def?.icon || Tag;
                           return (
                             <AccordionItem key={msg.id} value={msg.id} className="border border-slate-200 rounded-lg bg-white shadow-sm mb-2 px-1">
                               <AccordionTrigger className="hover:no-underline py-2.5 px-2 [&[data-state=open]]:border-b [&[data-state=open]]:border-slate-100">
                                 <div className="flex items-center justify-between w-full pr-2">
                                   <div className="flex items-center gap-2">
                                     <div className="h-6 w-6 rounded flex items-center justify-center bg-indigo-50 text-indigo-600">
                                       <MsgIcon className="h-3.5 w-3.5" />
                                     </div>
                                     <div className="text-left">
                                       <p className="text-xs font-semibold text-slate-700">{def?.label || msg.type}</p>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-0">
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-800" onClick={(e) => { e.stopPropagation(); moveAction(e, idx, 'up'); }} disabled={idx === 0}>
                                       <ArrowUp className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-800" onClick={(e) => { e.stopPropagation(); moveAction(e, idx, 'down'); }} disabled={idx === actions.length - 1}>
                                       <ArrowDown className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={(e) => { e.stopPropagation(); handleDuplicateAction(e, msg); }}>
                                       <Copy className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteAction(e, msg.id); }}>
                                       <Trash2 className="h-3 w-3" />
                                     </Button>
                                   </div>
                                 </div>
                               </AccordionTrigger>
                               <AccordionContent className="pt-4 pb-2 px-1">
                                 {editingMessageId === msg.id && renderMessageSpecificFields(
                                   msg.type,
                                   msg,
                                   (key, val) => {
                                     const newMsgs = actions.map(m => m.id === msg.id ? { ...m, [key]: val } : m);
                                     onUpdate({ ...node.config, actions: newMsgs });
                                   },
                                   (updates) => {
                                     const newMsgs = actions.map(m => m.id === msg.id ? { ...m, ...updates } : m);
                                     onUpdate({ ...node.config, actions: newMsgs });
                                   }
                                 )}
                               </AccordionContent>
                             </AccordionItem>
                           );
                         })}
                       </Accordion>
                     )}
                  </div>

                  <div className="space-y-3 pb-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full flex items-center gap-2 border-dashed border-slate-300 hover:border-[#8A3CFF]/50 hover:bg-[#8A3CFF]/5 text-slate-600 hover:text-[#8A3CFF] transition-all">
                          <Plus className="h-4 w-4" />
                          Adicionar ação de grupo
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0" align="center">
                        <Command>
                          <CommandInput placeholder="Buscar ação..." className="h-9 text-xs" />
                          <CommandList className="max-h-[300px]">
                            <CommandEmpty className="py-6 text-center text-xs text-slate-500">
                              Nenhuma ação encontrada.
                            </CommandEmpty>
                            
                            {["Criação", "Edição", "Moderação"].map(category => (
                              <CommandGroup key={category} heading={category} className="text-xs text-slate-500 mt-1 border-t border-slate-100">
                                {groupActionsDef
                                  .filter(sub => sub.category === category)
                                  .map((sub) => {
                                    const SubIcon = sub.icon;
                                    return (
                                      <CommandItem
                                        key={sub.type}
                                        value={sub.label}
                                        onSelect={() => handleAddAction(sub.type)}
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAddAction(sub.type); }}
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                                      >
                                        <div className="p-1.5 rounded-md shrink-0 text-indigo-600 bg-indigo-50 shadow-sm">
                                          <SubIcon className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">{sub.label}</span>
                                      </CommandItem>
                                    );
                                })}
                              </CommandGroup>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Separator className="mt-4" />
                </>
              );
            })()}


          {renderMessageSpecificFields(resolvedNodeType, currentConfig, updateConfig, updateMultipleConfigs)}

          {/* Schedule & Manual Send Section */}
          {!editingMessageId && (
            <NodeScheduleSection
              config={node.config}
              onUpdateConfig={updateConfig}
              onManualSend={onManualSend}
              isSendingManual={isSendingManual}
              nodeType={resolvedNodeType}
            />
          )}
          </div>
        </div>
    </div>
  );
}
