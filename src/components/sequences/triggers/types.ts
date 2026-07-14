import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export type TriggerEngine = "dispatch_sequence" | "group_sequence";
export type TriggerStatus = "available" | "coming_soon";

export type TriggerCategory =
  | "leads" | "mensagens" | "negocios" | "instagram" | "facebook" | "campos" | "http" | "sistema" | "atividades";

export const TRIGGER_CATEGORY_LABELS: Record<TriggerCategory, string> = {
  negocios: "Negócios",
  leads: "Leads",
  mensagens: "Mensagens",
  instagram: "Instagram",
  facebook: "Facebook",
  campos: "Campos",
  http: "HTTP",
  sistema: "Sistema",
  atividades: "Atividades"
};

export const TRIGGER_CATEGORY_ORDER: TriggerCategory[] = [
  "negocios", "leads", "mensagens", "instagram", "facebook", "campos", "http", "sistema", "atividades"
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
