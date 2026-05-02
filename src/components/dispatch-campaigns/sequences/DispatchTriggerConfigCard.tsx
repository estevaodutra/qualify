import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Zap, Rocket, Calendar, Plug, UserPlus, ChevronDown, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DispatchTriggerType = "manual" | "scheduled" | "api" | "on_add" | "action";

export interface DispatchTriggerConfig {
  scheduledDate?: string;
  scheduledTime?: string;
  [key: string]: unknown;
}

interface DispatchTriggerConfigCardProps {
  triggerType: DispatchTriggerType;
  triggerConfig: DispatchTriggerConfig;
  onTriggerTypeChange: (type: DispatchTriggerType) => void;
  onTriggerConfigChange: (config: DispatchTriggerConfig) => void;
  sequenceId?: string;
}

const TRIGGER_TYPES = [
  { value: "manual" as DispatchTriggerType, label: "Manual", icon: Rocket, color: "bg-slate-500" },
  { value: "scheduled" as DispatchTriggerType, label: "Agendado", icon: Calendar, color: "bg-orange-500" },
  { value: "api" as DispatchTriggerType, label: "Via API", icon: Plug, color: "bg-blue-500" },
  { value: "on_add" as DispatchTriggerType, label: "Ao adicionar contato", icon: UserPlus, color: "bg-green-500" },
  { value: "action" as DispatchTriggerType, label: "Acionador por Ação", icon: Zap, color: "bg-purple-500" },
];

export function DispatchTriggerConfigCard({
  triggerType,
  triggerConfig,
  onTriggerTypeChange,
  onTriggerConfigChange,
  sequenceId,
}: DispatchTriggerConfigCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const triggerInfo = TRIGGER_TYPES.find(t => t.value === triggerType) || TRIGGER_TYPES[0];
  const TriggerIcon = triggerInfo.icon;

  const webhookUrl = sequenceId
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-sequence/${sequenceId}`
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

            {triggerType === "scheduled" && (
              <div className="space-y-3 p-3 rounded-lg bg-background border">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={triggerConfig.scheduledDate || ""}
                      onChange={e => onTriggerConfigChange({ ...triggerConfig, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hora</Label>
                    <Input
                      type="time"
                      value={triggerConfig.scheduledTime || ""}
                      onChange={e => onTriggerConfigChange({ ...triggerConfig, scheduledTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {triggerType === "api" && (
              <div className="space-y-3 p-3 rounded-lg bg-background border">
                <div className="space-y-2">
                  <Label className="text-sm">URL do Webhook</Label>
                  <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                  <p className="text-xs text-muted-foreground">
                    Envie um POST para esta URL para disparar a sequência.
                  </p>
                </div>
              </div>
            )}

            {triggerType === "on_add" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  A sequência será iniciada automaticamente quando um novo contato for adicionado à campanha.
                </p>
              </div>
            )}

            {triggerType === "action" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  A sequência será iniciada quando uma ação específica for executada pelo sistema ou pelo usuário.
                </p>
              </div>
            )}

            {triggerType === "manual" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  A sequência será disparada manualmente pelo administrador.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
