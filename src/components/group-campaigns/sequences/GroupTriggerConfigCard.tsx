import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Zap, ChevronDown, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { TriggerTypeSelector } from "@/components/sequences/triggers/TriggerTypeSelector";
import { getTriggerDefinition } from "@/components/sequences/triggers/triggerDefinitions";
import { WebhookGroupScopeConfig } from "@/components/sequences/triggers/configs/WebhookGroupScopeConfig";
import { WebhookFieldMappings } from "./WebhookFieldMappings";
import type { TriggerType, TriggerConfig } from "./triggerTypes";

interface GroupTriggerConfigCardProps {
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  onTriggerTypeChange: (type: TriggerType) => void;
  onTriggerConfigChange: (config: TriggerConfig) => void;
  sequenceId?: string;
  campaignId: string;
}

// Registry-driven replacement for the legacy TriggerConfigCard: every trigger
// type now honestly shows "Em breve" when it has no real backend support
// (member_join/member_leave/keyword), matching the pattern already proven on
// DispatchTriggerConfigCard for dispatch sequences. All previously-persisted
// fields (sendPrivate, keyword/matchType/caseSensitive, fieldMappings) are
// preserved unchanged for sequences saved under the old card.
export function GroupTriggerConfigCard({
  triggerType,
  triggerConfig,
  onTriggerTypeChange,
  onTriggerConfigChange,
  sequenceId,
  campaignId,
}: GroupTriggerConfigCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Legacy "scheduled_recurring"/"scheduled_once" collapse to the registry's
  // single "scheduled" entry for selection purposes -- group sequences have
  // always scheduled per-message (NodeScheduleSection), never at the trigger
  // level, so the three legacy variants were never meaningfully different.
  const selectorValue = triggerType === "scheduled_recurring" || triggerType === "scheduled_once" ? "scheduled" : triggerType;
  const triggerInfo = getTriggerDefinition(selectorValue);
  const TriggerIcon = triggerInfo?.icon || Zap;

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
                <div className={cn("p-2 rounded-lg", triggerInfo?.color || "bg-slate-500")}>
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    Gatilho
                    <Badge variant="secondary" className="font-normal">
                      <TriggerIcon className="h-3 w-3 mr-1" />
                      {triggerInfo?.label || triggerType}
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
              <label className="text-sm font-medium">Tipo de Gatilho</label>
              <TriggerTypeSelector
                engine="group_sequence"
                value={selectorValue}
                onChange={(type) => onTriggerTypeChange(type as TriggerType)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="space-y-0.5">
                <label className="text-sm font-medium" htmlFor="group-mode-toggle">Habilitar para Grupo</label>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, envia para os grupos do WhatsApp configurados. Desative para enviar em conversas individuais.
                </p>
              </div>
              <Switch
                id="group-mode-toggle"
                checked={triggerConfig.isGroup ?? true}
                onCheckedChange={(checked) => onTriggerConfigChange({ ...triggerConfig, isGroup: checked })}
              />
            </div>

            {(triggerType === "member_join" || triggerType === "member_leave") && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  Gatilho acionado por eventos de membros no grupo.
                </p>
              </div>
            )}

            {triggerType === "keyword" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  Palavra-chave: <span className="font-mono">{triggerConfig.keyword || "(não definida)"}</span>.
                </p>
              </div>
            )}

            {selectorValue === "scheduled" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  Cada mensagem define seus próprios dias e horários de execução.
                </p>
              </div>
            )}

            {triggerType === "webhook" && (
              <WebhookFieldMappings
                fieldMappings={triggerConfig.fieldMappings || []}
                onFieldMappingsChange={(mappings) =>
                  onTriggerConfigChange({ ...triggerConfig, fieldMappings: mappings })
                }
                webhookUrl={webhookUrl}
              />
            )}

            {(triggerConfig.isGroup ?? true) && (
              <WebhookGroupScopeConfig
                campaignId={campaignId}
                config={triggerConfig}
                onChange={(scope) => onTriggerConfigChange({ ...triggerConfig, ...scope })}
              />
            )}

            {triggerType === "manual" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Play className="h-4 w-4" />
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
