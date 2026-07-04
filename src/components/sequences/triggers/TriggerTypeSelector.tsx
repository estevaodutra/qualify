import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TriggerDefinition, TriggerEngine } from "./types";
import { TRIGGER_CATEGORY_LABELS, TRIGGER_CATEGORY_ORDER } from "./types";
import { getTriggerDefinitionsForEngine } from "./triggerDefinitions";

interface TriggerTypeSelectorProps {
  engine: TriggerEngine;
  value: string;
  onChange: (type: string) => void;
  /** Extra definitions to show even if not registered for this engine (e.g. a
   * legacy trigger type already saved on an old sequence that predates this
   * registry) -- keeps old data selectable/visible instead of disappearing. */
  extraDefinitions?: TriggerDefinition[];
}

export function TriggerTypeSelector({ engine, value, onChange, extraDefinitions = [] }: TriggerTypeSelectorProps) {
  const definitions = [...getTriggerDefinitionsForEngine(engine), ...extraDefinitions];
  const byCategory = TRIGGER_CATEGORY_ORDER.map((category) => ({
    category,
    items: definitions.filter((d) => d.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      {byCategory.map(({ category, items }) => (
        <div key={category} className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {TRIGGER_CATEGORY_LABELS[category]}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((def) => {
              const Icon = def.icon;
              const isSelected = value === def.type;
              const isAvailable = def.status === "available";
              return (
                <button
                  key={def.type}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => isAvailable && onChange(def.type)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                    isAvailable ? "hover:border-primary/50" : "opacity-50 cursor-not-allowed",
                    isSelected && isAvailable ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border"
                  )}
                >
                  <div className={cn("p-1.5 rounded shrink-0", def.color)}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{def.label}</span>
                  {!isAvailable && (
                    <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider shrink-0">
                      Em breve
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
