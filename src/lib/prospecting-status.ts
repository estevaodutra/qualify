import type { ProspectingStatus } from "@/hooks/useProspectingCampaigns";

export const STATUS_LABELS: Record<ProspectingStatus, string> = {
  draft: "Rascunho",
  queued: "Na fila",
  extracting: "Extraindo dados",
  validating: "Validando contatos",
  enriching: "Enriquecendo dados",
  awaiting_approval: "Aguardando aprovação",
  preparing_queue: "Preparando automação",
  dispatching: "Automação em andamento",
  paused: "Pausada",
  completed: "Concluída",
  partially_completed: "Concluída parcialmente",
  failed: "Erro",
  cancelled: "Cancelada",
};

export const STATUS_COLORS: Record<ProspectingStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  queued: "bg-info/10 text-info border-info/30",
  extracting: "bg-info/10 text-info border-info/30",
  validating: "bg-info/10 text-info border-info/30",
  enriching: "bg-info/10 text-info border-info/30",
  awaiting_approval: "bg-warning/10 text-warning border-warning/30",
  preparing_queue: "bg-info/10 text-info border-info/30",
  dispatching: "bg-primary/10 text-primary border-primary/30",
  paused: "bg-warning/10 text-warning border-warning/30",
  completed: "bg-success/10 text-success border-success/30",
  partially_completed: "bg-warning/10 text-warning border-warning/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground",
};

export const LIVE_STATUSES: ProspectingStatus[] = [
  "extracting", "validating", "enriching", "preparing_queue", "dispatching",
];

export type StageKey = "extraction" | "validation" | "enrichment" | "queue" | "automation";

export const STAGES: { key: StageKey; label: string }[] = [
  { key: "extraction", label: "Extração" },
  { key: "validation", label: "Validação" },
  { key: "enrichment", label: "Enriquecimento" },
  { key: "queue", label: "Fila" },
  { key: "automation", label: "Automação" },
];

const STATUS_TO_STAGE_INDEX: Record<ProspectingStatus, number> = {
  draft: -1,
  queued: 0,
  extracting: 0,
  validating: 1,
  enriching: 2,
  awaiting_approval: 3,
  preparing_queue: 3,
  dispatching: 4,
  paused: -1, // resolved relative to last known stage by caller
  completed: 4,
  partially_completed: 4,
  failed: -1,
  cancelled: -1,
};

export function getStageIndex(status: ProspectingStatus): number {
  return STATUS_TO_STAGE_INDEX[status];
}

export const QUALIFICATION_LABELS: Record<string, string> = {
  sem_analise: "Sem análise",
  baixa: "Baixa aderência",
  media: "Média aderência",
  alta: "Alta aderência",
};

export const QUALIFICATION_COLORS: Record<string, string> = {
  sem_analise: "bg-muted text-muted-foreground",
  baixa: "bg-destructive/10 text-destructive",
  media: "bg-warning/10 text-warning",
  alta: "bg-success/10 text-success",
};

export const QUEUE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  scheduled: "Agendado",
  processing: "Processando",
  paused: "Pausado",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
  skipped: "Ignorado",
  replied: "Respondeu",
};
