import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Zap, Users, LogOut, Clock, Keyboard, Webhook, Play,
  ChevronDown, CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WebhookFieldMappings, FieldMapping } from "./WebhookFieldMappings";

export type TriggerType = "member_join" | "member_leave" | "scheduled" | "scheduled_recurring" | "scheduled_once" | "keyword" | "webhook" | "manual";

export interface TriggerConfig {
  sendPrivate?: boolean;
  days?: number[];
  times?: string[];
  mode?: "manual" | "interval";
  intervalConfig?: {
    start: string;
    end: string;
    minutes: number;
  };
  date?: string;
  time?: string;
  keyword?: string;
  matchType?: "exact" | "contains" | "startsWith";
  caseSensitive?: boolean;
  webhookId?: string;
  fieldMappings?: FieldMapping[];
}

interface TriggerConfigCardProps {
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  onTriggerTypeChange: (type: TriggerType) => void;
  onTriggerConfigChange: (config: TriggerConfig) => void;
  sequenceId?: string;
}

const TRIGGER_TYPES = [
  { value: "member_join" as TriggerType, label: "Membro entrar", icon: Users, color: "bg-green-500" },
  { value: "member_leave" as TriggerType, label: "Membro sair", icon: LogOut, color: "bg-red-500" },
  { value: "scheduled_recurring" as TriggerType, label: "Agendado recorrente", icon: Clock, color: "bg-orange-500" },
  { value: "scheduled_once" as TriggerType, label: "Agendado pontual", icon: CalendarDays, color: "bg-yellow-500" },
  { value: "keyword" as TriggerType, label: "Palavra-chave", icon: Keyboard, color: "bg-purple-500" },
  { value: "webhook" as TriggerType, label: "Webhook externo", icon: Webhook, color: "bg-blue-500" },
  { value: "manual" as TriggerType, label: "Manual", icon: Play, color: "bg-slate-500" },
];


const MATCH_TYPES = [
  { value: "exact", label: "Exato" },
  { value: "contains", label: "Contém" },
  { value: "startsWith", label: "Começa com" },
];

export function TriggerConfigCard({
  triggerType,
  triggerConfig,
  onTriggerTypeChange,
  onTriggerConfigChange,
  sequenceId,
}: TriggerConfigCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Map legacy "scheduled" to "scheduled_recurring" for display
  const effectiveTriggerType = triggerType === "scheduled" ? "scheduled_recurring" : triggerType;
  const triggerInfo = TRIGGER_TYPES.find(t => t.value === effectiveTriggerType) || TRIGGER_TYPES[6];
  const TriggerIcon = triggerInfo.icon;

  // Generate webhook URL pointing to the actual Edge Function
  const webhookUrl = sequenceId 
    ? `https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1/trigger-sequence/${sequenceId}`
    : "";


  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", triggerInfo.color)}>
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    Gatilho
                    <Badge variant="secondary" className="font-normal">
                      <TriggerIcon className="h-3 w-3 mr-1" />
                      {triggerInfo.label}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define quando esta sequência será executada
                  </p>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Trigger Type Selector */}
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TRIGGER_TYPES.map(trigger => {
                  const Icon = trigger.icon;
                  const isSelected = triggerType === trigger.value;
                  return (
                    <button
                      key={trigger.value}
                      type="button"
                      onClick={() => onTriggerTypeChange(trigger.value)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn("p-1.5 rounded", trigger.color)}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium">{trigger.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Member Join/Leave Config */}
            {(triggerType === "member_join" || triggerType === "member_leave") && (
              <div className="space-y-3 p-3 rounded-lg bg-background border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Enviar no privado</Label>
                    <p className="text-xs text-muted-foreground">
                      Envia a mensagem diretamente para o membro
                    </p>
                  </div>
                  <Switch
                    checked={triggerConfig.sendPrivate || false}
                    onCheckedChange={(checked) => 
                      onTriggerConfigChange({ ...triggerConfig, sendPrivate: checked })
                    }
                  />
                </div>
              </div>
            )}

            {/* Scheduled Once Config */}
            {effectiveTriggerType === "scheduled_once" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  Cada mensagem define sua própria data e horário de execução.
                </p>
              </div>
            )}

            {/* Scheduled Recurring Config */}
            {effectiveTriggerType === "scheduled_recurring" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  Cada mensagem define seus próprios dias e horários de execução.
                </p>
              </div>
            )}

            {/* Keyword Config */}
            {triggerType === "keyword" && (
              <div className="space-y-3 p-3 rounded-lg bg-background border">
                <div className="space-y-2">
                  <Label className="text-sm">Palavra-chave</Label>
                  <Input
                    placeholder="Ex: !ajuda, #info, menu"
                    value={triggerConfig.keyword || ""}
                    onChange={(e) => 
                      onTriggerConfigChange({ ...triggerConfig, keyword: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de match</Label>
                    <Select
                      value={triggerConfig.matchType || "contains"}
                      onValueChange={(value) => 
                        onTriggerConfigChange({ ...triggerConfig, matchType: value as "exact" | "contains" | "startsWith" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATCH_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="caseSensitive"
                        checked={triggerConfig.caseSensitive || false}
                        onCheckedChange={(checked) => 
                          onTriggerConfigChange({ ...triggerConfig, caseSensitive: checked })
                        }
                      />
                      <Label htmlFor="caseSensitive" className="text-xs">
                        Case sensitive
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook Config */}
            {triggerType === "webhook" && (
              <WebhookFieldMappings
                fieldMappings={triggerConfig.fieldMappings || []}
                onFieldMappingsChange={(mappings) =>
                  onTriggerConfigChange({ ...triggerConfig, fieldMappings: mappings })
                }
                webhookUrl={webhookUrl}
              />
            )}

            {/* Manual Config */}
            {triggerType === "manual" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  Esta sequência só será executada quando você clicar no botão "Enviar" manualmente.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
