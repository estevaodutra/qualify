import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export type TriggerEngine = "dispatch_sequence" | "group_sequence";
export type TriggerStatus = "available" | "coming_soon";

export type TriggerCategory =
  | "entrada" | "leads_crm" | "prospeccao" | "mensagens" | "tempo" | "sistema";

export const TRIGGER_CATEGORY_LABELS: Record<TriggerCategory, string> = {
  entrada: "Entrada",
  leads_crm: "Leads e CRM",
  prospeccao: "Prospecção",
  mensagens: "Mensagens",
  tempo: "Tempo",
  sistema: "Sistema",
};

export const TRIGGER_CATEGORY_ORDER: TriggerCategory[] = [
  "entrada", "leads_crm", "prospeccao", "mensagens", "tempo", "sistema",
];

export interface TriggerConfigComponentProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  sequenceId?: string;
}

export interface TriggerSummaryResult {
  title: string;
  subtitle?: string;
}

export interface TriggerDefinition {
  type: string;
  label: string;
  description: string;
  category: TriggerCategory;
  icon: LucideIcon;
  color: string;
  status: TriggerStatus;
  supportedBy: TriggerEngine[];
  defaultConfig: Record<string, unknown>;
  summaryBuilder: (config: Record<string, unknown>) => TriggerSummaryResult;
  validate: (config: Record<string, unknown>) => string[];
  configComponent?: ComponentType<TriggerConfigComponentProps>;
}
