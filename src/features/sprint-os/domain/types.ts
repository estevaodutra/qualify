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

export interface Task extends Entity {
  stageId: ID;
  title: string;
  description: string;
  position: number;
  priority: Priority;
  complexity: Complexity;
  financialImpact: boolean;
  scope: ScopeType;
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

export interface FunnelStage { id: ID; label: string; color: string; count: number; position: number }

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
