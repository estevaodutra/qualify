/**
 * Sprint OS — Modelo de domínio (Camada C).
 * Todas as entidades possuem IDs estáveis; títulos são propriedades editáveis.
 * Datas/horas de planejamento são "wall clock" de America/Sao_Paulo no formato
 * "YYYY-MM-DDTHH:mm" (sem offset), o que mantém o motor determinístico.
 */

export type ID = string;
export type LocalDateTime = string; // "2026-10-21T09:00"
export type LocalDate = string; // "2026-10-21"

export type TaskStatus = "pending" | "doing" | "done";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Complexity = "low" | "medium" | "high";
export type ScopeType = "original" | "adjustment" | "additional";
/** Origem de um valor: confirmado pelo usuário, estimativa identificada ou não definido. */
export type ValueSource = "confirmed" | "estimated" | "unset";
export type SchedulingMode = "auto" | "manual" | "hybrid";
export type InteractionMode = "organize" | "execute" | "plan";

export interface Entity {
  id: ID;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  /** Incrementa a cada edição (concorrência / auditoria). */
  rev: number;
}

export interface Project extends Entity {
  name: string;
  client: string;
  description: string;
  contractModel: string;
  timezone: string;
}

export interface Baseline {
  capturedAt: string;
  startAt: LocalDateTime;
  contractEnd: LocalDateTime;
  businessDays: number;
  contractValue: number | null;
  tasks: Record<ID, { title: string; plannedStart: LocalDateTime | null; plannedEnd: LocalDateTime | null; durationMinutes: number | null }>;
}

export interface Sprint extends Entity {
  projectId: ID;
  name: string;
  objective: string;
  deliverables: string[];
  position: number;
  startDate: LocalDate | null;
  startTime: string | null; // "09:00"
  businessDays: number | null;
  calendarId: ID | null;
  managerId: ID | null;
  contractValue: number | null;
  revenueReceived: number | null;
  schedulingMode: SchedulingMode;
  activatedAt: string | null;
  /** Linha de base imutável capturada na ativação. */
  baseline: Baseline | null;
}

export interface Stage extends Entity {
  sprintId: ID;
  title: string;
  position: number;
}

export interface TimeEntry {
  id: ID;
  memberId: ID | null;
  minutes: number;
  at: string;
  note: string;
}

export interface Evidence {
  id: ID;
  name: string;
  kind: "link" | "file";
  url: string;
  mime: string | null;
  authorName: string;
  at: string;
}

export interface Learnings {
  worked: string;
  didntWork: string;
  impediment: string;
  resolution: string;
  timeSpent: string;
  rework: string;
  automatable: string;
  nextImprovement: string;
}

export type ImpactFlag =
  | "financial_low"
  | "financial_high"
  | "schedule_impact"
  | "operational"
  | "infrastructure";

export const IMPACT_FLAG_CONFIG: Record<
  ImpactFlag,
  { label: string; icon: string; description: string; badgeClass: string }
> = {
  financial_low: {
    label: "Financeiro Leve",
    icon: "💸",
    description: "Atividades com influência financeira indireta",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
  financial_high: {
    label: "Financeiro Alto",
    icon: "💰",
    description: "Atividades diretamente relacionadas à receita ou desbloqueio comercial",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  },
  schedule_impact: {
    label: "No Andamento",
    icon: "⏳",
    description: "Atividades que afetam o avanço do cronograma ou bloqueiam outras tarefas",
    badgeClass: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  },
  operational: {
    label: "Operacional",
    icon: "⚙️",
    description: "Atividades necessárias para execução dos processos",
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  },
  infrastructure: {
    label: "Infraestrutura",
    icon: "⚠️",
    description: "Acessos, integrações, sistemas e componentes técnicos",
    badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  },
};

export interface Task extends Entity {
  stageId: ID;
  title: string;
  description: string;
  position: number;
  priority: Priority;
  complexity: Complexity;
  financialImpact: boolean;
  impactFlags?: ImpactFlag[];
  scope: ScopeType;
  /** Classificação de origem 7D: DEFINIDO, DERIVADO ou PROPOSTO */
  origin?: TaskOrigin;
  assigneeId: ID | null;
  validatorId: ID | null;
  participantIds: ID[];
  durationMinutes: number | null;
  durationSource: ValueSource;
  plannedStart: LocalDateTime | null;
  plannedEnd: LocalDateTime | null;
  /** Data fixa: o motor não move a tarefa. */
  pinned: boolean;
  status: TaskStatus;
  actualStart: string | null;
  actualEnd: string | null;
  timeEntries: TimeEntry[];
  blockedReason: string | null;
  /** Detalhes estruturados de bloqueio 7D */
  blockInfo?: TaskBlockInfo;
  /** Critérios verificáveis de conclusão 7D */
  completionCriteria?: CompletionCriterion[];
  /** Entregáveis, versionamento e aprovações 7D */
  deliverableMaterials?: DeliverableMaterial[];
  /** Registro estruturado de Backup Master 7D */
  backupMaster?: BackupMasterInfo;
  /** Demanda executiva do expert 7D */
  expertDemand?: ExpertDemandInfo;
  awaitingApproval: boolean;
  acceptanceCriteria: string;
  acceptedAt: string | null;
  acceptedBy: ID | null;
  notes: string;
  evidence: Evidence[];
  learnings: Learnings;
  /** Incrementa em alterações materiais (escopo, prazo, responsabilidade) — invalida ciência. */
  materialVersion: number;
  /** Sessões reais de execução cronometrada (AJ-022) */
  workSessions?: WorkSession[];
  /** Indica se a tarefa está com execução pausada em "Fazendo" (AJ-022) */
  isPaused?: boolean;
  /** Tempo acumulado total em segundos de todas as sessões finalizadas (AJ-022) */
  totalTimeSeconds?: number;
  /** IDs das etiquetas vinculadas à tarefa (AJ-022) */
  labelIds?: string[];
}

// ==========================================
// SESSOES REAIS DE TRABALHO & CRONOMETRO (AJ-022)
// ==========================================

export interface WorkSession {
  id: ID;
  taskId: ID;
  userId?: ID | null;
  userName?: string | null;
  startedAt: string; // ISO 8601
  endedAt?: string | null; // ISO 8601
  durationSeconds: number; // Segundos calculados entre startedAt e endedAt
  status: "active" | "completed" | "cancelled";
  origin?: "kanban" | "modal" | "manual";
}

// ==========================================
// ETIQUETAS PERSONALIZAVEIS TIPO TRELLO (AJ-022)
// ==========================================

export interface WorkspaceLabel {
  id: string;
  name: string;
  color: string; // HEX ou RGB (#6366f1, #10b981, etc.)
  archived?: boolean;
  createdAt: string;
}

export const DEFAULT_WORKSPACE_LABELS: Omit<WorkspaceLabel, "id" | "createdAt">[] = [
  { name: "Estratégia & Posicionamento", color: "#6366f1" },
  { name: "Grupo de Captação", color: "#10b981" },
  { name: "Copy & Conteúdo", color: "#ec4899" },
  { name: "Tráfego & Anúncios", color: "#f59e0b" },
  { name: "Automação & CRM", color: "#06b6d4" },
  { name: "Validação do Expert", color: "#8b5cf6" },
];

// ==========================================
// ARQUITETURA 7D — MODELO DE OPERAÇÃO
// ==========================================

export type TaskOrigin = "defined" | "derived" | "proposed";

export const TASK_ORIGIN_CONFIG: Record<
  TaskOrigin,
  { label: string; description: string; badgeClass: string }
> = {
  defined: {
    label: "DEFINIDO",
    description: "Orientação expressamente estabelecida no planejamento",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  derived: {
    label: "DERIVADO",
    description: "Atividade necessária para cumprir uma premissa definida",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  proposed: {
    label: "PROPOSTO",
    description: "Sugestão ainda não aprovada (fora do escopo aprovado até confirmação)",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

export type BlockType = "total" | "parcial" | "dependencia" | "financeiro" | "aprovacao";

export const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  total: "Bloqueio Total",
  parcial: "Bloqueio Parcial",
  dependencia: "Dependência Aguardando",
  financeiro: "Bloqueio Financeiro",
  aprovacao: "Bloqueio de Aprovação",
};

export interface TaskBlockInfo {
  active: boolean;
  type: BlockType;
  reason: string;
  resolverResponsible: string;
  requestedAt: string | null;
  agreedDeadline: string | null;
  requiredDeliverable: string;
  impactDescription: string;
  unlockEvidenceUrl?: string;
}

export interface CompletionCriterion {
  id: string;
  text: string;
  done: boolean;
  required: boolean;
}

export type ReviewStatus = "nao_enviado" | "aguardando_revisao" | "ajustes_solicitados" | "aprovado";

export const REVIEW_STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; badgeClass: string }
> = {
  nao_enviado: {
    label: "Não enviado",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  aguardando_revisao: {
    label: "Aguardando revisão",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  ajustes_solicitados: {
    label: "Ajustes solicitados",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  aprovado: {
    label: "Aprovado",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
};

export interface DeliverableMaterial {
  id: string;
  name: string;
  type: string;
  version: string;
  assigneeName?: string;
  url: string;
  reviewStatus: ReviewStatus;
  updatedAt: string;
}

export interface BackupMasterInfo {
  googleDriveUrl: string;
  fileName: string;
  version: string;
  folderPath: string;
  responsibleName: string;
  updatedAt: string;
  approvalStatus: ReviewStatus;
  arquivoSalvo: boolean;
  linkDisponivel: boolean;
  permissoesVerificadas: boolean;
  versaoCorreta: boolean;
  aprovacaoRegistrada: boolean;
}

export type ExpertDemandCategory =
  | "preencher"
  | "revisar"
  | "aprovar"
  | "gravar"
  | "editar"
  | "entregar";

export type ExpertDemandStatus =
  | "nao_solicitado"
  | "solicitado"
  | "em_producao"
  | "entregue_revisao"
  | "ajustes_solicitados"
  | "aprovado"
  | "finalizado_disponivel";

export const EXPERT_DEMAND_CATEGORIES: Record<ExpertDemandCategory, string> = {
  preencher: "Preencher",
  revisar: "Revisar",
  aprovar: "Aprovar",
  gravar: "Gravar",
  editar: "Editar",
  entregar: "Entregar",
};

export const EXPERT_DEMAND_STATUSES: Record<
  ExpertDemandStatus,
  { label: string; badgeClass: string }
> = {
  nao_solicitado: {
    label: "Não solicitado",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  solicitado: {
    label: "Solicitado",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  em_producao: {
    label: "Em produção",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  entregue_revisao: {
    label: "Entregue para revisão",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  ajustes_solicitados: {
    label: "Ajustes solicitados",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  aprovado: {
    label: "Aprovado",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  finalizado_disponivel: {
    label: "Finalizado e disponível",
    badgeClass: "bg-emerald-600 text-white font-bold",
  },
};

export interface ExpertDemandInfo {
  isExpertDemand: boolean;
  category: ExpertDemandCategory;
  status: ExpertDemandStatus;
  requesterName?: string;
  quantity?: number;
  agreedDeadline?: string;
  expectedMaterial?: string;
  referenceLink?: string;
  dependentTaskId?: string;
}

export interface Subtask extends Entity {
  taskId: ID;
  title: string;
  description: string;
  required: boolean;
  assigneeId: ID | null;
  position: number;
  done: boolean;
  doneAt: string | null;
  target: number | null;
  count: number;
  evidenceUrl: string;
  /** Diferenciação visual entre simples checklist e subtarefa estruturada (AJ-022) */
  isChecklistItem?: boolean;
  /** Vinculação de preenchimento ou arquivo (AJ-022) */
  linkedFieldId?: string;
  fileUrl?: string;
}

export interface Dependency {
  id: ID;
  predecessorId: ID;
  successorId: ID;
}

export interface Acknowledgement {
  id: ID;
  taskId: ID;
  memberId: ID;
  at: string;
  materialVersion: number;
}

export interface Member extends Entity {
  name: string;
  /** Usuário do Qualify (company_members.user_id) quando aplicável. */
  userId: string | null;
  role: string;
  calendarId: ID | null;
  active: boolean;
}

export interface WorkBreak { start: string; end: string }

export interface WorkCalendar extends Entity {
  name: string;
  workStart: string; // "09:00"
  workEnd: string; // "18:00"
  breaks: WorkBreak[];
  /** 0=domingo … 6=sábado */
  workDays: number[];
  holidays: LocalDate[];
}

export interface Milestone extends Entity {
  sprintId: ID;
  title: string;
  position: number;
  dueDate: LocalDate | null;
  ownerId: ID | null;
  taskIds: ID[];
  criteria: string[];
  validatedAt: string | null;
}

export interface RoutineDefinition extends Entity {
  sprintId: ID | null;
  title: string;
  description: string;
  frequency: "daily" | "workdays" | "weekly";
  weekday: number | null;
  time: string | null;
  durationMinutes: number | null;
  ownerId: ID | null;
  checklist: { id: ID; title: string }[];
  position: number;
}

export interface RoutineOccurrence {
  id: ID;
  routineId: ID;
  date: LocalDate;
  checkedItemIds: ID[];
  done: boolean;
  doneAt: string | null;
}

export interface FinancialRecord extends Entity {
  sprintId: ID;
  description: string;
  amount: number;
  kind: "planned" | "actual";
  category: "expense" | "rework" | "client_media";
}

export interface FunnelStage {
  id: ID;
  label: string;
  color: string;
  count: number;
  position: number;
  value?: number | null;
  archivedAt?: string | null;
}

export type ContentType = "reels" | "stories" | "carousel" | "post" | "video" | "other";
export type ContentPlatform = "instagram" | "facebook" | "tiktok" | "youtube" | "other";

export interface ContentPublication {
  id: ID;
  title: string;
  type: ContentType;
  platform: ContentPlatform;
  publishedAt: LocalDate;
  url: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  groupEntries: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleRevision {
  id: ID;
  sprintId: ID;
  at: string;
  actorName: string;
  reason: string;
  before: Record<ID, { plannedStart: LocalDateTime | null; plannedEnd: LocalDateTime | null }>;
  after: Record<ID, { plannedStart: LocalDateTime | null; plannedEnd: LocalDateTime | null }>;
  forecastBefore: LocalDateTime | null;
  forecastAfter: LocalDateTime | null;
  undoneAt: string | null;
}

export interface ChangeRequest extends Entity {
  sprintId: ID;
  title: string;
  description: string;
  impactMinutes: number | null;
  impactCost: number | null;
  status: "open" | "approved" | "rejected";
  decidedAt: string | null;
}

export type IndicatorType =
  | "counter"
  | "target"
  | "percentage"
  | "currency"
  | "time"
  | "average"
  | "conversion_rate"
  | "formula"
  | "progress_bar";

export type IndicatorCategory = "geral" | "midia" | "comercial" | "operacao" | "financeiro";

export interface CustomIndicator extends Entity {
  sprintId: ID | null;
  name: string;
  description: string;
  category: IndicatorCategory;
  type: IndicatorType;
  currentValue: number;
  targetValue: number | null;
  unit: string;
  period: "today" | "7d" | "30d" | "sprint" | "custom";
  dataSource: string;
  pinnedToCockpit: boolean;
  position: number;
}

export interface ContentDistributionMetrics {
  postsPublished: number;
  postsPerDay: number;
  reels: number;
  stories: number;
  views: number;
  reach: number;
  clicks: number;
  groupEntries: number;
  groupExits?: number;
  testsCompleted?: number;
  newFollowers?: number;
  followersGainToday?: number;
  followersGain7d?: number;
  followersGain30d?: number;
  leadsCaptured: number;
  adSpend: number;
  period: "today" | "7d" | "30d" | "sprint";
}

export interface OKRKeyResult {
  id: ID;
  title: string;
  current: number;
  target: number;
  unit: string;
  weight: number;
}

export interface OKRGoal extends Entity {
  sprintId: ID | null;
  title: string;
  description: string;
  ownerId: ID | null;
  targetDate: LocalDate | null;
  weight: number;
  keyResults: OKRKeyResult[];
}

export interface HoursCalculatorData {
  taskCount: number;
  avgHoursPerTask: number;
  membersAvailable: number;
  hoursPerDay: number;
  businessDays: number;
  hourlyRate: number;
}

export interface AdsCalculatorData {
  dailyBudget: number;
  campaignDays: number;
  totalSpent: number;
  cpl: number;
  conversionRate: number;
  avgTicket: number;
  attributedRevenue: number;
  otherCosts: number;
}

export interface ActivityLog {
  id: ID;
  at: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: ID | null;
  summary: string;
}

export interface WorkspaceSettings {
  dailyThresholds: { start: number; rhythm: number; strong: number }; // 40, 70, 90
}

export interface MediaUnitMarker {
  id: string;
  metric: "followers" | "posts" | "views" | "reels" | "carrossel" | "stories" | string;
  amount: number;
  date: string;
  note?: string;
  hook?: string;
  corpo?: string;
  cta?: string;
  formato?: string;
  createdAt: string;
}

export interface MediaChannelMetrics {
  followersToday?: number;
  followers7d?: number;
  followers30d?: number;
  postsToday?: number;
  posts7d?: number;
  posts30d?: number;
  viewsToday?: number;
  views7d?: number;
  views30d?: number;
  reelsToday?: number;
  reels7d?: number;
  reels30d?: number;
  carrosselToday?: number;
  carrossel7d?: number;
  carrossel30d?: number;
  storiesToday?: number;
  stories7d?: number;
  stories30d?: number;
  unitMarkers?: MediaUnitMarker[];
}

export interface MediaApiConfig {
  apiKey?: string;
  pageIdOrHandle?: string;
  connected?: boolean;
  lastSyncedAt?: string | null;
}

/** Documento completo de um projeto. */
export interface Workspace {
  schemaVersion: 1;
  project: Project;
  sprints: Record<ID, Sprint>;
  stages: Record<ID, Stage>;
  tasks: Record<ID, Task>;
  subtasks: Record<ID, Subtask>;
  dependencies: Record<ID, Dependency>;
  acknowledgements: Record<ID, Acknowledgement>;
  members: Record<ID, Member>;
  calendars: Record<ID, WorkCalendar>;
  milestones: Record<ID, Milestone>;
  routines: Record<ID, RoutineDefinition>;
  routineOccurrences: Record<ID, RoutineOccurrence>;
  financialRecords: Record<ID, FinancialRecord>;
  changeRequests: Record<ID, ChangeRequest>;
  funnel: Record<ID, FunnelStage>;
  publications?: Record<ID, ContentPublication>;
  indicators?: Record<ID, CustomIndicator>;
  okrs?: Record<ID, OKRGoal>;
  contentMetrics?: ContentDistributionMetrics;
  contentDistributionConfig?: { dailyReelsTarget?: number };
  mediaDistribution?: Record<string, MediaChannelMetrics>;
  mediaApiConfigs?: Record<string, MediaApiConfig>;
  hoursCalculator?: HoursCalculatorData;
  adsCalculator?: AdsCalculatorData;
  /** Configuração modular personalizável da Dashboard (INFRA | DISTRIBUIÇÃO | FUNIL) */
  dashboardLayoutConfig?: DashboardLayoutConfig;
  /** Manual de Marca 7D (AJ-014) — Briefing Inteligente, Modular e Editável */
  brandManual?: BrandManualData;
  /** Scripts e Áudios com Gravação Integrada (AJ-021) */
  audioRequests?: Record<ID, AudioRequest>;
  /** Etiquetas personalizáveis compartilhadas no projeto (AJ-022) */
  labels?: Record<string, WorkspaceLabel>;
  /** Custo/hora por membro — separado para não ser exposto em links públicos. */
  costs: Record<ID, number | null>;
  /** Prompts otimizados por tarefa (chave = taskId). */
  prompts: Record<ID, string>;
  revisions: Record<ID, ScheduleRevision>;
  activity: ActivityLog[];
  settings: WorkspaceSettings;
}

export const PRIORITY_RANK: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export const STATUS_LABEL: Record<TaskStatus, string> = { pending: "Pendente", doing: "Fazendo", done: "Feito" };
export const STATUS_ICON: Record<TaskStatus, string> = { pending: "🔴", doing: "🟡", done: "🟢" };
export const PRIORITY_LABEL: Record<Priority, string> = { P0: "P0 · Crítica", P1: "P1 · Alta", P2: "P2 · Média", P3: "P3 · Baixa" };
export const COMPLEXITY_LABEL: Record<Complexity, string> = { low: "Baixa", medium: "Média", high: "Alta" };
export const SCOPE_LABEL: Record<ScopeType, string> = { original: "Escopo original", adjustment: "Ajuste operacional", additional: "Solicitação adicional" };

export const emptyLearnings = (): Learnings => ({
  worked: "", didntWork: "", impediment: "", resolution: "", timeSpent: "", rework: "", automatable: "", nextImprovement: "",
});

// ==========================================
// DASHBOARD MODULAR E FUNIL VISUAL
// ==========================================

export interface DashboardCardConfig {
  id: string;
  blockId: string;
  title: string;
  order: number;
  archived?: boolean;
  removed?: boolean;
}

export interface DashboardBlockConfig {
  id: string;
  title: string;
  order: number;
  archived?: boolean;
}

export interface DashboardLayoutConfig {
  blocks: DashboardBlockConfig[];
  cards: DashboardCardConfig[];
}

export const DEFAULT_FUNNEL_STAGES: Omit<FunnelStage, "id">[] = [
  { label: "EM ABERTO", color: "#64748B", count: 0, position: 0 },
  { label: "PRÉ-QUALIFICAÇÃO", color: "#3B82F6", count: 0, position: 1 },
  { label: "INTERESSADO", color: "#6366F1", count: 0, position: 2 },
  { label: "NEGOCIAÇÃO", color: "#F59E0B", count: 0, position: 3 },
  { label: "FOLLOW-UP", color: "#EC4899", count: 0, position: 4 },
  { label: "VENDA", color: "#10B981", count: 0, position: 5, value: 0 },
];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutConfig = {
  blocks: [
    { id: "infra", title: "BLOCO 01 — INFRA", order: 0 },
    { id: "dist_midia", title: "DISTRIBUIÇÃO DE MÍDIA", order: 1 },
    { id: "funil", title: "BLOCO 03 — FUNIL", order: 2 },
  ],
  cards: [
    // Bloco 01 — INFRA (6 indicadores)
    { id: "infra_progress", blockId: "infra", title: "Progresso Atual", order: 0 },
    { id: "infra_ad_spend", blockId: "infra", title: "Gasto Ads", order: 1 },
    { id: "infra_sales", blockId: "infra", title: "Vendas", order: 2 },
    { id: "infra_group_entries", blockId: "infra", title: "Entradas no Grupo", order: 3 },
    { id: "infra_group_exits", blockId: "infra", title: "Saídas do Grupo", order: 4 },
    { id: "infra_tests", blockId: "infra", title: "Testes Realizados", order: 5 },

    // Bloco Distribuição de Mídia (4 formatos dinâmicos editáveis)
    { id: "dist_reels", blockId: "dist_midia", title: "▶️ Reels", order: 0 },
    { id: "dist_carrossel", blockId: "dist_midia", title: "🎠 Carrossel", order: 1 },
    { id: "dist_stories", blockId: "dist_midia", title: "👁️ Visualizações Stories", order: 2 },
    { id: "dist_posts", blockId: "dist_midia", title: "📸 Post", order: 3 },

    // Bloco 03 — FUNIL (Esteira visual progressiva conectada)
    { id: "funnel_pipeline", blockId: "funil", title: "Funil Comercial de Conversão", order: 0 },
  ],
};

// ==========================================
// MANUAL DE MARCA 7D (AJ-014)
// Briefing Inteligente, Modular e Editável
// ==========================================

export type BrandManualInputType =
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "select"
  | "audio"
  | "file"
  | "compound";

export type BrandManualFieldStatus = "pending" | "completed" | "approved";

export interface BrandManualFieldHistory {
  timestamp: string;
  response: string;
  author?: string;
  version: number;
}

export interface BrandManualField {
  id: string;
  moduleId: string; // "posicionamento" | "alma_copy" | "raio_x_icp" | "copy_ads" | string
  sectionId?: string;
  title: string;
  context: string;
  preset?: string;
  inputType: BrandManualInputType;
  response?: string;
  audioUrl?: string;
  transcription?: string;
  status?: BrandManualFieldStatus;
  strategicMapping: string[]; // ex: ["produto", "mecanismo", "dor-mãe"]
  order: number;
  required?: boolean;
  archived?: boolean;
  removed?: boolean;
  history?: BrandManualFieldHistory[];
}

export interface CopyAdVariantHistory {
  timestamp: string;
  headline: string;
  subheadline: string;
  version: number;
}

export interface CopyAdVariant {
  id: string;
  variantNumber: number; // 1 a 10
  angle: string; // ex: "Dor Central / Inimigo Comum"
  headline: string;
  subheadline: string;
  status: "draft" | "approved" | "rejected";
  version: number;
  notes?: string;
  archived?: boolean;
  history?: CopyAdVariantHistory[];
}

export interface BrandManualModule {
  id: string;
  title: string;
  description: string;
  order: number;
  collapsed?: boolean;
  archived?: boolean;
  generatedAnalysis?: any;
  analysisStatus?: "idle" | "generating" | "generated" | "approved";
  analysisUpdatedAt?: string;
}

export interface BrandManualData {
  modules: BrandManualModule[];
  fields: BrandManualField[];
  copyAds: CopyAdVariant[];
  masterPrompt?: string;
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
  overallStatus?: "draft" | "in_progress" | "completed" | "approved";
}

export const DEFAULT_BRAND_MANUAL_MODULES: BrandManualModule[] = [
  {
    id: "posicionamento",
    title: "1. POSICIONAMENTO",
    description: "Definição clara do produto, transformação real, mecanismo único e diferenciação de mercado.",
    order: 0,
  },
  {
    id: "alma_copy",
    title: "2. ALMA DA COPY",
    description: "Extração da essência emocional, dor-mãe, desejo-mãe e territórios narrativos autênticos.",
    order: 1,
  },
  {
    id: "raio_x_icp",
    title: "3. RAIO X DO ICP",
    description: "Mapeamento comportamental, rotina concreta, falas reais e 22 saídas analíticas do cliente ideal.",
    order: 2,
  },
  {
    id: "personalidade",
    title: "4. PERSONALIDADE",
    description: "Captura da identidade verbal real do expert: vícios de linguagem, gírias, expressões, humor e intensidade.",
    order: 3,
  },
  {
    id: "copy_ads",
    title: "5. COPY ADS",
    description: "10 Variantes modulares de Headline + Subheadline alimentadas pelo posicionamento e identidade verbal real do expert.",
    order: 4,
  },
];

export const DEFAULT_BRAND_MANUAL_FIELDS: BrandManualField[] = [
  // Módulo 01: POSICIONAMENTO
  {
    id: "pos_01",
    moduleId: "posicionamento",
    title: "O que você vende e como isso melhora, na prática, a vida de quem compra?",
    context: "Explique o que o cliente enfrenta hoje, o que você entrega e qual mudança ocorre depois.",
    preset: "Meu produto é [solução]. Ele atende [público] que enfrenta [situação], utilizando [mecanismo] para chegar a [resultado].",
    inputType: "textarea",
    strategicMapping: ["produto", "público", "problema", "resultado", "transformação"],
    order: 0,
    required: true,
  },
  {
    id: "pos_02",
    moduleId: "posicionamento",
    title: "O que você faz de diferente para produzir esse resultado?",
    context: "Imagine que um cliente pergunte: 'O que acontece depois que eu contrato você?'. Explique a sequência prática, desde o início até a entrega.",
    preset: "Primeiro eu [ação]. Depois [processo]. Por fim, entrego [resultado]. A diferença é que [característica concreta].",
    inputType: "textarea",
    strategicMapping: ["mecanismo", "processo", "diferencial", "brecha de mercado", "mecanismo hero"],
    order: 1,
    required: true,
  },
  {
    id: "pos_03",
    moduleId: "posicionamento",
    title: "O que muda no dia a dia do cliente depois que ele utiliza sua solução?",
    context: "Descreva uma situação antes e depois. Pense em algo que poderia ser observado em sua rotina.",
    preset: "Antes, o cliente precisava [ação antiga]. Depois, consegue [nova ação] sem precisar [esforço eliminado].",
    inputType: "textarea",
    strategicMapping: ["antes", "depois", "mudança observável", "benefício", "promessa"],
    order: 2,
    required: true,
  },
  {
    id: "pos_04",
    moduleId: "posicionamento",
    title: "O que as pessoas costumam fazer para resolver esse problema que você considera errado ou insuficiente?",
    context: "Explique qual caminho comum não resolve completamente a situação e o que você acredita que deveria ser feito de outra maneira.",
    preset: "Muita gente tenta [abordagem comum]. O problema é que [limitação]. Eu acredito que [nova crença] porque [justificativa].",
    inputType: "textarea",
    strategicMapping: ["inimigo", "crença antiga", "nova crença", "tese central", "diferenciação"],
    order: 3,
    required: true,
  },

  // Módulo 02: ALMA DA COPY
  {
    id: "alm_01",
    moduleId: "alma_copy",
    title: "Que situação fez você perceber que essa solução precisava existir?",
    context: "Conte um problema que observou em clientes ou na própria experiência e que motivou a criação do produto.",
    preset: "Percebi que as pessoas precisavam [ação repetitiva ou difícil] e isso provocava [consequência]. Foi por isso que desenvolvi [solução].",
    inputType: "textarea",
    strategicMapping: ["origem", "dor-mãe", "problema central", "inimigo"],
    order: 0,
    required: true,
  },
  {
    id: "alm_02",
    moduleId: "alma_copy",
    title: "O que seu cliente deixa de fazer ou passa a fazer depois de comprar?",
    context: "Pense nas atividades que desaparecem, diminuem ou mudam após a utilização da solução.",
    preset: "Antes precisava [ação]. Agora [novo comportamento]. Isso elimina ou reduz [problema], conforme [condição real].",
    inputType: "textarea",
    strategicMapping: ["antes/depois", "transformação-mãe", "comportamento", "mecanismo"],
    order: 1,
    required: true,
  },
  {
    id: "alm_03",
    moduleId: "alma_copy",
    title: "Além do resultado principal, o que essa mudança permite que o cliente faça ou viva?",
    context: "Imagine como a rotina muda quando o problema deixa de ocupar tanto espaço.",
    preset: "Além de [resultado], ele consegue [nova situação concreta], porque não precisa mais [esforço antigo].",
    inputType: "textarea",
    strategicMapping: ["desejo-mãe", "benefício final", "consequência", "alma do produto"],
    order: 2,
    required: true,
  },

  // Módulo 03: RAIO X DO ICP
  {
    id: "icp_01",
    moduleId: "raio_x_icp",
    title: "Por que seu cliente precisa do seu produto?",
    context: "Conte uma situação real em que o problema aparece na rotina dele.",
    preset: "Quando [acontecimento] acontece, ele precisa [ação] e isso acaba gerando [consequência].",
    inputType: "textarea",
    strategicMapping: ["situação real", "problema", "gatilho de dor"],
    order: 0,
    required: true,
  },
  {
    id: "icp_02",
    moduleId: "raio_x_icp",
    title: "O que muda na prática depois que ele utiliza seu produto?",
    context: "Explique o que ele fazia antes e qual comportamento muda com a sua solução.",
    preset: "Antes ele precisava [ação antiga]. Com meu produto, passa a [nova ação] e não precisa mais [esforço eliminado].",
    inputType: "textarea",
    strategicMapping: ["mudança prática", "transformação", "alívio imediato"],
    order: 1,
    required: true,
  },
  {
    id: "icp_03",
    moduleId: "raio_x_icp",
    title: "Quando esse problema acontece, o que seu cliente faz, pensa ou fala?",
    context: "Descreva a cena como se estivesse observando o cliente naquele momento.",
    preset: 'Quando [situação] acontece, ele normalmente [comportamento] e pensa ou fala: "[frase natural]".',
    inputType: "textarea",
    strategicMapping: ["pensamento e fala", "linguagem real", "expressão espontânea"],
    order: 2,
    required: true,
  },

  // Módulo 04: PERSONALIDADE DO EXPERT (AJ-017)
  {
    id: "per_01",
    moduleId: "personalidade",
    title: "Vícios de linguagem",
    context: "Palavras e repetições involuntárias usadas com frequência na transição de pensamentos.",
    preset: "Costumo repetir com frequência: 'entendeu?', 'veja bem', 'na verdade', 'tipo assim'.",
    inputType: "textarea",
    strategicMapping: ["vicios de linguagem", "cacoetes", "repeticoes"],
    order: 0,
    required: false,
  },
  {
    id: "per_02",
    moduleId: "personalidade",
    title: "Gírias e dialetos",
    context: "Regionalismos, expressões populares ou jargões informais que usa naturalmente.",
    preset: "Uso com frequência: 'trampo', 'massa', 'perrengue', 'virar a chave', 'bicho'.",
    inputType: "textarea",
    strategicMapping: ["girias", "regionalismos", "dialeto", "informalidade"],
    order: 1,
    required: false,
  },
  {
    id: "per_03",
    moduleId: "personalidade",
    title: "Frases e expressões próprias",
    context: "Bordões, analogias recorrentes e máximas que sempre fala em conversas ou aulas.",
    preset: "Frases que sempre digo: 'Execução bate talento', 'O simples bem feito funciona', 'Menos é mais'.",
    inputType: "textarea",
    strategicMapping: ["bordoes", "frases proprias", "analogias"],
    order: 2,
    required: false,
  },
  {
    id: "per_04",
    moduleId: "personalidade",
    title: "Frases quebradas e construção verbal",
    context: "Como constrói raciocínios: frases curtas, pensamentos interrompidos, perguntas retóricas.",
    preset: "Costumo fazer perguntas retóricas e depois responder na lata com frases curtas e diretas.",
    inputType: "textarea",
    strategicMapping: ["construcao verbal", "ritmo", "frases curtas", "cadencia"],
    order: 3,
    required: false,
  },
  {
    id: "per_05",
    moduleId: "personalidade",
    title: "Maneira de explicar",
    context: "Didática e estilo de argumentação: histórias, metáforas, números práticos ou exemplos visuais.",
    preset: "Explico usando analogias práticas do cotidiano e situações reais que vivi na pele no campo de batalha.",
    inputType: "textarea",
    strategicMapping: ["didatica", "metaforas", "estilo de explicacao"],
    order: 4,
    required: false,
  },
  {
    id: "per_06",
    moduleId: "personalidade",
    title: "Humor e intensidade",
    context: "Tom emocional predominante: provocativo, bem-humorado, direto ao ponto, enérgico ou sereno.",
    preset: "Tom provocativo e enérgico, direto ao ponto, um pouco sarcástico com erros bobos, mas extremamente acolhedor com quem executa.",
    inputType: "textarea",
    strategicMapping: ["humor", "intensidade", "tom de voz", "energia"],
    order: 5,
    required: false,
  },
  {
    id: "per_07",
    moduleId: "personalidade",
    title: "Palavras que nunca usaria",
    context: "Termos proibidos que soam falsos, corporativos demais ou fora da sua identidade.",
    preset: "Nunca uso: 'mindset', 'disrupção', 'sinergia corporativa', 'gratidão excessiva', 'holístico'.",
    inputType: "textarea",
    strategicMapping: ["palavras proibidas", "anti-vocabulario", "filtro de tom"],
    order: 6,
    required: false,
  },
  {
    id: "per_08",
    moduleId: "personalidade",
    title: "Exemplos reais de fala",
    context: "Trechos literais de áudios, mensagens ou falas espontâneas gravadas.",
    preset: "Exemplo literal: 'Olha só, para de complicar o que é simples. Você precisa sentar na cadeira e fazer o arroz com feijão primeiro antes de inventar moda.'",
    inputType: "textarea",
    strategicMapping: ["amostras reais", "transcricoes", "fala espontanea"],
    order: 7,
    required: false,
  },
];

export const DEFAULT_COPY_ADS_VARIANTS: CopyAdVariant[] = [
  {
    id: "var_01",
    variantNumber: 1,
    angle: "Dor Central / Inimigo Comum",
    headline: "Cansado de perder tempo com processos manuais que nunca trazem resultado previsível?",
    subheadline: "Descubra como estruturar sua operação comercial com método validado e fechar contratos sem depender de sorte.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_02",
    variantNumber: 2,
    angle: "Mecanismo Único / Método",
    headline: "O método passo a passo que substitui o improviso por tração diária.",
    subheadline: "Uma esteira enxuta que qualifica o lead certo antes mesmo da primeira conversa no WhatsApp.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_03",
    variantNumber: 3,
    angle: "Contradição / Quebra de Padrão",
    headline: "Por que postar todos os dias pode estar sabotando as suas vendas.",
    subheadline: "Menos volume, mais precisão: aprenda a atrair compradores qualificados sem virar escravo do algoritmo.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_04",
    variantNumber: 4,
    angle: "Prova Social / Mudança Observável",
    headline: "De 2 horas de negociação confusa para fechamentos em menos de 15 minutos.",
    subheadline: "Veja como dezenas de especialistas estão usando o Playbook 7D para converter leads frios em clientes pagantes.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_05",
    variantNumber: 5,
    angle: "Pergunta Provocativa / Espelho do ICP",
    headline: "Você realmente sabe o que o seu cliente pensa quando lê a sua oferta?",
    subheadline: "Alinhe sua mensagem exatamente com o que tira o sono de quem tem dinheiro para comprar de você.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_06",
    variantNumber: 6,
    angle: "Antes & Depois Radical",
    headline: "Antes: agenda cheia de curiosos. Depois: pipeline previsível com compradores prontos.",
    subheadline: "A transformação prática na rotina comercial de quem implementa uma máquina de qualificação X1.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_07",
    variantNumber: 7,
    angle: "Alívio Imediato / Sem Esforço Antigo",
    headline: "Chega de reuniões intermináveis com quem não tem orçamento para fechar.",
    subheadline: "Filtre automaticamente quem não é seu perfil ideal e foque 100% da sua energia em quem fecha contrato.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_08",
    variantNumber: 8,
    angle: "Oportunidade Oculta / Brecha de Mercado",
    headline: "A brecha oculta que os maiores players do mercado utilizam para qualificar em escala.",
    subheadline: "Acesse os roteiros e frameworks de condução comercial que ninguém revela abertamente.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_09",
    variantNumber: 9,
    angle: "Consequência de Não Agir (Custo da Inação)",
    headline: "Quanto dinheiro você deixa na mesa a cada lead perdido por falta de follow-up?",
    subheadline: "Recupere o controle da sua esteira e garanta que nenhum lead qualificado fique sem atendimento imediato.",
    status: "draft",
    version: 1.0,
  },
  {
    id: "var_10",
    variantNumber: 10,
    angle: "Convite Direto / Oferta Irrecusável",
    headline: "Implemente a Arquitetura 7D no seu negócio e tenha clareza absoluta da sua comunicação.",
    subheadline: "Clique agora para agendar uma sessão de diagnóstico estratégico e desbloquear seu próximo nível.",
    status: "draft",
    version: 1.0,
  },
];

// ==========================================
// SCRIPTS E ÁUDIOS COM GRAVAÇÃO INTEGRADA (AJ-021)
// ==========================================

export type AudioRequestStatus =
  | "pending" // Aguardando gravação
  | "recorded" // Áudio recebido / gravado
  | "reviewing" // Em revisão
  | "changes_requested" // Ajustes solicitados
  | "approved" // Aprovado
  | "archived"; // Arquivado

export interface AudioRecordingTranscription {
  text: string;
  status: "none" | "transcribing" | "completed" | "edited" | "error";
  editedText?: string;
  completedAt?: string;
}

export interface AudioRecording {
  id: ID;
  requestId: ID;
  projectId: ID;
  authorId?: ID | null;
  authorName: string;
  audioUrl: string; // URL pública ou permanente do arquivo
  storageKey?: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  waveform?: number[]; // Lista de 20-50 amplitudes normalizadas (0.1 a 1.0)
  version: number;
  isApproved?: boolean;
  isPrimary?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  transcription?: AudioRecordingTranscription;
}

export interface AudioRequest extends Entity {
  code: string; // Ex: AUD-001, AUD-GRP-01, etc.
  title: string;
  category: "grupo_captacao" | "manual_marca" | "criativos_ads" | "webinario" | "geral";
  objective?: string;
  context: string;
  script: string;
  preset?: string;
  assigneeId?: ID | null;
  assigneeName?: string;
  status: AudioRequestStatus;
  deadline?: string | null;
  taskId?: ID | null;
  creativeId?: string | null;
  brandManualFieldId?: string | null;
  recordings: AudioRecording[];
  order: number;
}

export const DEFAULT_AUDIO_REQUESTS: Omit<AudioRequest, "id" | "createdAt" | "updatedAt" | "rev" | "archivedAt">[] = [
  {
    code: "AUD-GRP-01",
    title: "Áudio sobre conteúdo da manhã",
    category: "grupo_captacao",
    objective: "Produção de vídeo de destaque da manhã (08h00) para o Grupo VIP",
    context: "Explique, com suas palavras, a principal ideia que deseja transmitir ao grupo logo pela manhã. Traga uma situação real e finalize com uma pergunta ou convite à interação.",
    script: "Bom dia pessoal! Hoje quero falar sobre um ponto fundamental que vejo quase todo mundo errando... [situação real]. E você, como tem lidado com isso?",
    preset: "Comece dizendo: 'Bom dia pessoal! Hoje quero trazer uma reflexão prática...'",
    status: "pending",
    order: 0,
    recordings: [],
  },
  {
    code: "AUD-GRP-02",
    title: "Áudio de prova ou história",
    category: "grupo_captacao",
    objective: "Produção de conteúdo de prova e autoridade do meio do dia",
    context: "Conte uma experiência ou situação real que ajude as pessoas do grupo a entender seu método. Explique o que aconteceu e por que isso importa.",
    script: "Lembro de um caso recente onde o cliente tentava resolver sozinho há meses... A virada de chave aconteceu quando aplicamos [mecanismo]. O resultado prático foi...",
    preset: "Comece dizendo: 'Quero compartilhar uma história real que ilustra perfeitamente isso...'",
    status: "pending",
    order: 1,
    recordings: [],
  },
  {
    code: "AUD-GRP-03",
    title: "Áudio do conteúdo final do dia",
    category: "grupo_captacao",
    objective: "Produção de copy e vídeo de fechamento e levantada de mão",
    context: "Explique uma ideia importante que seu público deveria considerar antes de encerrar o dia. Fale naturalmente e termine com um convite à interação.",
    script: "Para encerrar o dia com foco: se você pudesse mudar apenas uma coisa na sua operação amanhã, qual seria? Responda aqui para alinharmos.",
    preset: "Comece dizendo: 'Antes de encerrarmos o dia, fica essa reflexão importante...'",
    status: "pending",
    order: 2,
    recordings: [],
  },
  {
    code: "AUD-MAR-01",
    title: "Explicar solução na prática",
    category: "manual_marca",
    objective: "Matéria-prima estratégica para a aba Manual de Marca (Posicionamento)",
    context: "Conte o que você vende, qual problema resolve e como isso muda a vida de quem compra.",
    script: "O que eu vendo não é apenas uma consultoria, é um sistema prático que resolve a ineficiência de... Na prática, quem compra deixa de perder tempo e passa a...",
    preset: "Meu método consiste em... O que o cliente ganha é...",
    brandManualFieldId: "pos_01",
    status: "pending",
    order: 3,
    recordings: [],
  },
  {
    code: "AUD-MAR-02",
    title: "Explicar mecanismo único",
    category: "manual_marca",
    objective: "Matéria-prima estratégica para o Mecanismo da Solução",
    context: "Explique o passo a passo do seu método como se estivesse conversando com alguém interessado.",
    script: "O processo acontece em etapas claras: primeiro nós analisamos... depois estruturamos a esteira... e por fim ativamos o fluxo com acompanhamento contínuo.",
    preset: "Primeiro nós fazemos... Em seguida... E a grande diferença é que...",
    brandManualFieldId: "pos_02",
    status: "pending",
    order: 4,
    recordings: [],
  },
  {
    code: "AUD-MAR-03",
    title: "Exemplos de fala natural e dialeto",
    category: "manual_marca",
    objective: "Captura da identidade verbal espontânea para o módulo Personalidade",
    context: "Explique um assunto do seu trabalho sem seguir roteiro. Use as expressões que costuma usar em uma conversa.",
    script: "Sem filtro: fala como se estivesse batendo um papo com um amigo de profissão tomando um café, explicando o que mais te irrita no mercado ou o que você mais valoriza.",
    preset: "Fala solta e natural, com as suas gírias e expressões habituais...",
    brandManualFieldId: "per_08",
    status: "pending",
    order: 5,
    recordings: [],
  },
];
