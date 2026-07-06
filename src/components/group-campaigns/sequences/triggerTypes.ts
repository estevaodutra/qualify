import type { FieldMapping } from "./WebhookFieldMappings";

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
  instanceId?: string;
  groupScope?: "all" | "selected";
  selectedGroupJids?: string[];
}
