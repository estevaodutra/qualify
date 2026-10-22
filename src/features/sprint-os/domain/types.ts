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
}

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
  hoursCalculator?: HoursCalculatorData;
  adsCalculator?: AdsCalculatorData;
  /** Configuração modular personalizável da Dashboard (INFRA | DISTRIBUIÇÃO | FUNIL) */
  dashboardLayoutConfig?: DashboardLayoutConfig;
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
    { id: "infra", title: "INFRAESTRUTURA & OPERAÇÃO", order: 0 },
    { id: "distribuicao", title: "DISTRIBUIÇÃO DE CONTEÚDO", order: 1 },
    { id: "funil", title: "FUNIL COMERCIAL X1", order: 2 },
  ],
  cards: [
    // Bloco INFRA
    { id: "infra_setup", blockId: "infra", title: "Setup Técnico & Acessos", order: 0 },
    { id: "infra_blocks", blockId: "infra", title: "Travas & Bloqueios Ativos", order: 1 },
    { id: "infra_deliverables", blockId: "infra", title: "Entregáveis Auditáveis", order: 2 },
    { id: "infra_pace", blockId: "infra", title: "Ritmo de Entrega & Prazos", order: 3 },

    // Bloco DISTRIBUIÇÃO
    { id: "dist_reels", blockId: "distribuicao", title: "Meta Diária de Reels (7D)", order: 0 },
    { id: "dist_posts", blockId: "distribuicao", title: "Publicações & Visualizações", order: 1 },
    { id: "dist_clicks", blockId: "distribuicao", title: "Cliques no Link", order: 2 },
    { id: "dist_groups", blockId: "distribuicao", title: "Entradas no Grupo", order: 3 },

    // Bloco FUNIL
    { id: "funnel_visual", blockId: "funil", title: "Pipeline Visual de Conversão", order: 0 },
    { id: "funnel_kpis", blockId: "funil", title: "Métricas Globais do Funil", order: 1 },
  ],
};
