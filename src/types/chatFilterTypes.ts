export type ConversationStatusFilter = "open" | "in_progress" | "waiting" | "resolved" | "unread" | "unassigned";

export type DatePreset = 
  | "today"
  | "yesterday"
  | "last_24h"
  | "last_3d"
  | "last_7d"
  | "last_30d"
  | "this_month"
  | "last_month"
  | "more_than_7d"
  | "more_than_30d"
  | "custom";

export interface DateRange {
  from?: string;
  to?: string;
}

export type SortByOption =
  | "last_message_desc"
  | "last_message_asc"
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "lead_created_desc"
  | "lead_created_asc";

export interface AdvancedChatFilters {
  // 1. Status da conversa (Multi-select)
  statuses?: ConversationStatusFilter[];

  // 2. Operadores / Atendentes
  operatorIds?: string[]; // IDs de usuários ou "unassigned" / "has_operator"

  // 3. Conexões / Instâncias
  instanceIds?: string[];

  // 4. Tags
  tags?: string[];
  tagMode?: "any" | "all"; // any = OR, all = AND
  tagPresence?: "any" | "has_tags" | "no_tags";

  // 5. CRM (Pipeline & Etapas)
  pipelineId?: string | null;
  stageIds?: string[];

  // 6. Negócios
  dealPresence?: "all" | "has_deal" | "no_deal";
  dealStatus?: "all" | "open" | "won" | "lost";

  // 7. Atendente Presença
  operatorPresence?: "all" | "has_operator" | "no_operator";

  // 8. Datas de Lead
  leadCreatedAtPreset?: DatePreset;
  leadCreatedAtRange?: DateRange;

  // 9. Datas de Conversa
  conversationCreatedAtPreset?: DatePreset;
  conversationCreatedAtRange?: DateRange;

  // 10. Data da Última Mensagem
  lastMessageAtPreset?: DatePreset;
  lastMessageAtRange?: DateRange;

  // 11. Não lidas
  unreadMode?: "all" | "unread_only" | "read_only";

  // 12. Arquivamento
  archiveMode?: "active_only" | "archived_only" | "all";

  // 13. Ordenação
  sortBy?: SortByOption;

  // 14. Busca por Texto (Preservada)
  search?: string;
}

export const DEFAULT_ADVANCED_CHAT_FILTERS: AdvancedChatFilters = {
  statuses: [],
  operatorIds: [],
  instanceIds: [],
  tags: [],
  tagMode: "any",
  tagPresence: "any",
  pipelineId: null,
  stageIds: [],
  dealPresence: "all",
  dealStatus: "all",
  operatorPresence: "all",
  unreadMode: "all",
  archiveMode: "active_only",
  sortBy: "last_message_desc",
  search: "",
};

export interface SavedChatFilter {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  filters_json: AdvancedChatFilters;
  created_at: string;
  updated_at: string;
  last_used_at: string;
}

// Calculate number of active filter CATEGORIES (excluding default values and text search)
export function getActiveCategoryCount(filters: AdvancedChatFilters): number {
  let count = 0;

  if (filters.statuses && filters.statuses.length > 0) count++;
  if (filters.operatorIds && filters.operatorIds.length > 0) count++;
  if (filters.instanceIds && filters.instanceIds.length > 0) count++;
  if ((filters.tags && filters.tags.length > 0) || (filters.tagPresence && filters.tagPresence !== "any")) count++;
  if (filters.pipelineId || (filters.stageIds && filters.stageIds.length > 0)) count++;
  if ((filters.dealPresence && filters.dealPresence !== "all") || (filters.dealStatus && filters.dealStatus !== "all")) count++;
  if (filters.operatorPresence && filters.operatorPresence !== "all") count++;
  if (filters.leadCreatedAtPreset && filters.leadCreatedAtPreset !== undefined) count++;
  if (filters.conversationCreatedAtPreset && filters.conversationCreatedAtPreset !== undefined) count++;
  if (filters.lastMessageAtPreset && filters.lastMessageAtPreset !== undefined) count++;
  if (filters.unreadMode && filters.unreadMode !== "all") count++;
  if (filters.archiveMode && filters.archiveMode !== "active_only") count++;

  return count;
}

// Normalizes filter object for deterministic query keys & cache comparison
export function normalizeFilters(filters: AdvancedChatFilters): AdvancedChatFilters {
  return {
    ...filters,
    statuses: [...(filters.statuses || [])].sort(),
    operatorIds: [...(filters.operatorIds || [])].sort(),
    instanceIds: [...(filters.instanceIds || [])].sort(),
    tags: [...(filters.tags || [])].sort(),
    stageIds: [...(filters.stageIds || [])].sort(),
    pipelineId: filters.pipelineId || null,
    search: (filters.search || "").trim(),
  };
}
