import { Play } from "lucide-react";
import type { TriggerDefinition } from "./types";

interface TriggerConfigPanelProps {
  definition: TriggerDefinition;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  sequenceId?: string;
}

export function TriggerConfigPanel({ definition, config, onChange, sequenceId }: TriggerConfigPanelProps) {
  if (definition.configComponent) {
    const ConfigComponent = definition.configComponent;
    return <ConfigComponent config={config} onChange={onChange} sequenceId={sequenceId} />;
  }

  return (
    <div className="p-3 rounded-lg bg-background border">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        {definition.type === "manual" && <Play className="h-4 w-4" />}
        {definition.description}
      </p>
    </div>
  );
}
