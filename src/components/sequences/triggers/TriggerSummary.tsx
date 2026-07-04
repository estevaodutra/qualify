import { getTriggerDefinition } from "./triggerDefinitions";
import type { TriggerSummaryResult } from "./types";

export function buildTriggerSummary(
  triggerType: string | undefined,
  triggerConfig: Record<string, unknown> | undefined
): TriggerSummaryResult {
  if (!triggerType) return { title: "Gatilho não configurado" };
  const definition = getTriggerDefinition(triggerType);
  if (!definition) return { title: triggerType };
  return definition.summaryBuilder(triggerConfig || {});
}

interface TriggerSummaryProps {
  triggerType: string | undefined;
  triggerConfig: Record<string, unknown> | undefined;
}

export function TriggerSummary({ triggerType, triggerConfig }: TriggerSummaryProps) {
  const summary = buildTriggerSummary(triggerType, triggerConfig);
  return (
    <div>
      <p className="font-semibold">{summary.title}</p>
      {summary.subtitle && <p className="text-muted-foreground">{summary.subtitle}</p>}
    </div>
  );
}
