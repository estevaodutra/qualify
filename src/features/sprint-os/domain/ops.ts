/**
 * Regras de negócio e mutações (Camada C).
 * Todas as funções operam sobre um rascunho (draft) do Workspace e registram histórico.
 * Nenhuma função cria/renomeia/exclui conteúdo sem ser chamada explicitamente pelo usuário.
 */
import type {
  Acknowledgement, Dependency, Entity, ID, Member, Milestone, Priority, RoutineDefinition, Sprint, Stage,
  Subtask, Task, TaskStatus, WorkCalendar, Workspace, FinancialRecord, ChangeRequest, ScheduleRevision,
  CustomIndicator, OKRGoal, OKRKeyResult, ContentDistributionMetrics, HoursCalculatorData, AdsCalculatorData,
  ImpactFlag, ContentPublication, FunnelStage,
  DashboardLayoutConfig, DashboardBlockConfig, DashboardCardConfig,
  BrandManualData, BrandManualModule, BrandManualField, CopyAdVariant,
  AudioRequest, AudioRecording, AudioRequestStatus, AudioRecordingTranscription,
  WorkSession, WorkspaceLabel,
  WebinarData, WebinarEdition, WebinarMetric,
} from "./types";
import {
  emptyLearnings, DEFAULT_DASHBOARD_LAYOUT, DEFAULT_FUNNEL_STAGES,
  DEFAULT_BRAND_MANUAL_MODULES, DEFAULT_BRAND_MANUAL_FIELDS, DEFAULT_COPY_ADS_VARIANTS,
  DEFAULT_AUDIO_REQUESTS, DEFAULT_WORKSPACE_LABELS, DEFAULT_WEBINAR_DATA,
} from "./types";
import { wouldCreateCycle } from "../scheduler/engine";

export class DomainError extends Error {}

export interface Ctx { actorName: string; nowIso: string }

export const newId = (): ID =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const base = (ctx: Ctx): Entity => ({ id: newId(), createdAt: ctx.nowIso, updatedAt: ctx.nowIso, archivedAt: null, rev: 1 });

export function log(ws: Workspace, ctx: Ctx, action: string, entity: string, entityId: ID | null, summary: string) {
  ws.activity.push({ id: newId(), at: ctx.nowIso, actorName: ctx.actorName, action, entity, entityId, summary });
}

const touch = (e: Entity, ctx: Ctx) => { e.updatedAt = ctx.nowIso; e.rev += 1; };

const live = <T extends Entity>(rec: Record<ID, T>) => Object.values(rec).filter((e) => !e.archivedAt);

export const stagesOf = (ws: Workspace, sprintId: ID) =>
  live(ws.stages).filter((s) => s.sprintId === sprintId).sort((a, b) => a.position - b.position);
export const tasksOf = (ws: Workspace, stageId: ID) =>
  live(ws.tasks).filter((t) => t.stageId === stageId).sort((a, b) => a.position - b.position);
export const subtasksOf = (ws: Workspace, taskId: ID) =>
  live(ws.subtasks).filter((s) => s.taskId === taskId).sort((a, b) => a.position - b.position);
export const sprintTasks = (ws: Workspace, sprintId: ID) => stagesOf(ws, sprintId).flatMap((s) => tasksOf(ws, s.id));
export const sprintOfTask = (ws: Workspace, taskId: ID): Sprint | undefined =>
  ws.sprints[ws.stages[ws.tasks[taskId]?.stageId]?.sprintId];

function renumber<T extends { position: number }>(items: T[]) { items.forEach((it, i) => { it.position = i; }); }

function get<T>(rec: Record<ID, T>, id: ID, what: string): T {
  let v = rec[id];
  if (!v && rec) {
    v = Object.values(rec).find((item: any) => item && (item.id === id || String(item.id) === String(id))) as T;
    if (v && (v as any).id) {
      rec[(v as any).id] = v;
    }
  }
  if (!v) throw new DomainError(`${what} não encontrado(a)`);
  return v;
}

// ───────────── Factories ─────────────

export function makeTask(ctx: Ctx, stageId: ID, title: string, position: number, extra: Partial<Task> = {}): Task {
  return {
    ...base(ctx), stageId, title, description: "", position, priority: "P2", complexity: "medium",
    financialImpact: false, impactFlags: [], scope: "original", assigneeId: null, validatorId: null, participantIds: [],
    durationMinutes: null, durationSource: "unset", plannedStart: null, plannedEnd: null, pinned: false,
    status: "pending", actualStart: null, actualEnd: null, timeEntries: [], blockedReason: null,
    awaitingApproval: false, acceptanceCriteria: "", acceptedAt: null, acceptedBy: null, notes: "",
    evidence: [], learnings: emptyLearnings(), materialVersion: 1, ...extra,
  };
}

export function makeSubtask(ctx: Ctx, taskId: ID, title: string, position: number, extra: Partial<Subtask> = {}): Subtask {
  return { ...base(ctx), taskId, title, description: "", required: true, assigneeId: null, position, done: false,
    doneAt: null, target: null, count: 0, evidenceUrl: "", ...extra };
}

export function makeCalendar(ctx: Ctx, extra: Partial<WorkCalendar> = {}): WorkCalendar {
  return { ...base(ctx), name: "Jornada padrão", workStart: "09:00", workEnd: "18:00",
    breaks: [{ start: "12:00", end: "13:00" }], workDays: [1, 2, 3, 4, 5], holidays: [], ...extra };
}

export function makeSprint(ctx: Ctx, projectId: ID, name: string, position: number, extra: Partial<Sprint> = {}): Sprint {
  return { ...base(ctx), projectId, name, objective: "", deliverables: [], position, startDate: null, startTime: null,
    businessDays: null, calendarId: null, managerId: null, contractValue: null, revenueReceived: null,
    schedulingMode: "hybrid", activatedAt: null, baseline: null, ...extra };
}

export function makeStage(ctx: Ctx, sprintId: ID, title: string, position: number, extra: Partial<Stage> = {}): Stage {
  return { ...base(ctx), sprintId, title, position, ...extra };
}

// ───────────── Project / Sprint ─────────────

export function updateProject(ws: Workspace, ctx: Ctx, patch: Partial<Pick<Workspace["project"], "name" | "client" | "description" | "contractModel">>) {
  Object.assign(ws.project, patch);
  touch(ws.project, ctx);
  log(ws, ctx, "update", "project", ws.project.id, `Projeto atualizado (${Object.keys(patch).join(", ")})`);
}

export function createSprint(ws: Workspace, ctx: Ctx, name: string): ID {
  const pos = live(ws.sprints).length;
  const s = makeSprint(ctx, ws.project.id, name, pos, { calendarId: Object.keys(ws.calendars)[0] ?? null });
  ws.sprints[s.id] = s;
  log(ws, ctx, "create", "sprint", s.id, `Sprint criada: ${name}`);
  return s.id;
}

const SPRINT_LOCKED_AFTER_ACTIVATION: (keyof Sprint)[] = ["baseline", "activatedAt"];
export function updateSprint(ws: Workspace, ctx: Ctx, id: ID, patch: Partial<Sprint>) {
  const s = get(ws.sprints, id, "Sprint");
  for (const k of SPRINT_LOCKED_AFTER_ACTIVATION) if (k in patch) throw new DomainError("Linha de base é imutável");
  Object.assign(s, patch);
  touch(s, ctx);
  log(ws, ctx, "update", "sprint", id, `Sprint "${s.name}" atualizada (${Object.keys(patch).join(", ")})`);
}

export function archiveSprint(ws: Workspace, ctx: Ctx, id: ID) {
  const s = get(ws.sprints, id, "Sprint");
  s.archivedAt = ctx.nowIso; touch(s, ctx);
  log(ws, ctx, "archive", "sprint", id, `Sprint arquivada: ${s.name}`);
}

// ───────────── Stages ─────────────

export function createStage(ws: Workspace, ctx: Ctx, sprintId: ID, title: string): ID {
  get(ws.sprints, sprintId, "Sprint");
  const st: Stage = { ...base(ctx), sprintId, title, position: stagesOf(ws, sprintId).length };
  ws.stages[st.id] = st;
  log(ws, ctx, "create", "stage", st.id, `Etapa criada: ${title}`);
  return st.id;
}

export function renameStage(ws: Workspace, ctx: Ctx, id: ID, title: string) {
  const st = get(ws.stages, id, "Etapa");
  if (!title.trim()) throw new DomainError("Título obrigatório");
  const old = st.title; st.title = title.trim(); touch(st, ctx);
  log(ws, ctx, "rename", "stage", id, `Etapa renomeada: "${old}" → "${st.title}"`);
}

export function reorderStages(ws: Workspace, ctx: Ctx, sprintId: ID, orderedIds: ID[]) {
  const current = stagesOf(ws, sprintId);
  if (orderedIds.length !== current.length || !current.every((s) => orderedIds.includes(s.id))) {
    throw new DomainError("Reordenação inválida: conjunto de etapas divergente");
  }
  orderedIds.forEach((id, i) => { ws.stages[id].position = i; touch(ws.stages[id], ctx); });
  log(ws, ctx, "reorder", "stage", null, "Etapas reordenadas");
}

export function duplicateStage(ws: Workspace, ctx: Ctx, id: ID): ID {
  const st = get(ws.stages, id, "Etapa");
  const newStageId = createStage(ws, ctx, st.sprintId, `${st.title} (cópia)`);
  tasksOf(ws, id).forEach((t) => duplicateTask(ws, ctx, t.id, newStageId, false));
  return newStageId;
}

export function archiveStage(ws: Workspace, ctx: Ctx, id: ID) {
  const st = get(ws.stages, id, "Etapa");
  st.archivedAt = ctx.nowIso; touch(st, ctx);
  tasksOf(ws, id).forEach((t) => { t.archivedAt = ctx.nowIso; touch(t, ctx); });
  renumber(stagesOf(ws, st.sprintId));
  log(ws, ctx, "archive", "stage", id, `Etapa arquivada (com suas tarefas): ${st.title}`);
}

// ───────────── Tasks ─────────────

export function createTask(ws: Workspace, ctx: Ctx, stageId: ID, title: string): ID {
  get(ws.stages, stageId, "Etapa");
  const t = makeTask(ctx, stageId, title, tasksOf(ws, stageId).length);
  ws.tasks[t.id] = t;
  log(ws, ctx, "create", "task", t.id, `Tarefa criada: ${title}`);
  return t.id;
}

/** Campos cuja alteração é material (invalida ciência). */
const MATERIAL_FIELDS: (keyof Task)[] = ["description", "assigneeId", "plannedStart", "plannedEnd", "durationMinutes", "acceptanceCriteria", "scope"];
/** Campos que não podem ser alterados por esta via (têm fluxo próprio). */
const GUARDED_FIELDS: (keyof Task)[] = ["id", "status", "actualStart", "actualEnd", "stageId", "position", "acceptedAt", "acceptedBy", "materialVersion", "createdAt"];

export function updateTask(ws: Workspace, ctx: Ctx, id: ID, patch: Partial<Task>) {
  const t = get(ws.tasks, id, "Tarefa");
  for (const k of GUARDED_FIELDS) if (k in patch) throw new DomainError(`Campo "${String(k)}" possui fluxo próprio`);
  if (patch.title !== undefined && !patch.title.trim()) throw new DomainError("Título obrigatório");
  if (patch.durationMinutes != null && (patch.durationMinutes < 0 || !Number.isFinite(patch.durationMinutes))) {
    throw new DomainError("Duração inválida");
  }
  if (patch.plannedStart && patch.plannedEnd && patch.plannedEnd < patch.plannedStart) throw new DomainError("Término anterior ao início");
  const changed = (Object.keys(patch) as (keyof Task)[]).filter((k) => JSON.stringify(t[k]) !== JSON.stringify(patch[k]));
  if (!changed.length) return;
  const material = changed.some((k) => MATERIAL_FIELDS.includes(k));
  Object.assign(t, patch);
  if (patch.durationMinutes !== undefined && patch.durationSource === undefined) {
    t.durationSource = patch.durationMinutes == null ? "unset" : "confirmed";
  }
  if (material) t.materialVersion += 1;
  touch(t, ctx);
  log(ws, ctx, "update", "task", id, `Tarefa "${t.title}": ${changed.join(", ")} alterado(s)${material ? " · ciência anterior desatualizada" : ""}`);
}

export function duplicateTask(ws: Workspace, ctx: Ctx, id: ID, targetStageId?: ID, withLog = true): ID {
  const src = get(ws.tasks, id, "Tarefa");
  const stageId = targetStageId ?? src.stageId;
  const copy = makeTask(ctx, stageId, targetStageId ? src.title : `${src.title} (cópia)`, tasksOf(ws, stageId).length, {
    description: src.description, priority: src.priority, complexity: src.complexity, financialImpact: src.financialImpact,
    scope: src.scope, assigneeId: src.assigneeId, validatorId: src.validatorId, participantIds: [...src.participantIds],
    durationMinutes: src.durationMinutes, durationSource: src.durationSource, acceptanceCriteria: src.acceptanceCriteria,
  });
  ws.tasks[copy.id] = copy;
  subtasksOf(ws, id).forEach((s, i) => {
    const ns = makeSubtask(ctx, copy.id, s.title, i, { description: s.description, required: s.required, target: s.target, assigneeId: s.assigneeId });
    ws.subtasks[ns.id] = ns;
  });
  if (ws.prompts[id]) ws.prompts[copy.id] = ws.prompts[id];
  if (withLog) log(ws, ctx, "duplicate", "task", copy.id, `Tarefa duplicada: ${src.title}`);
  return copy.id;
}

export function archiveTask(ws: Workspace, ctx: Ctx, id: ID) {
  const t = get(ws.tasks, id, "Tarefa");
  t.archivedAt = ctx.nowIso; touch(t, ctx);
  renumber(tasksOf(ws, t.stageId));
  log(ws, ctx, "archive", "task", id, `Tarefa arquivada: ${t.title}`);
}

export function deleteTask(ws: Workspace, ctx: Ctx, id: ID) {
  archiveTask(ws, ctx, id);
}

export function restoreTask(ws: Workspace, ctx: Ctx, id: ID) {
  const t = get(ws.tasks, id, "Tarefa");
  t.archivedAt = null; t.position = tasksOf(ws, t.stageId).length; touch(t, ctx);
  log(ws, ctx, "restore", "task", id, `Tarefa restaurada: ${t.title}`);
}

export interface MoveCheck { ok: boolean; requiresConfirmation: boolean; warnings: string[] }

/** Valida a movimentação de tarefa (reordenar / reclassificar), sem alterar horários. */
export function checkMoveTask(ws: Workspace, id: ID, toStageId: ID): MoveCheck {
  const t = get(ws.tasks, id, "Tarefa");
  const to = get(ws.stages, toStageId, "Etapa");
  const from = ws.stages[t.stageId];
  const warnings: string[] = [];
  if (to.archivedAt) return { ok: false, requiresConfirmation: false, warnings: ["Etapa de destino arquivada"] };
  if (from.sprintId !== to.sprintId) {
    warnings.push(`A tarefa mudará da sprint "${ws.sprints[from.sprintId]?.name}" para "${ws.sprints[to.sprintId]?.name}".`);
    const deps = Object.values(ws.dependencies).filter((d) => d.predecessorId === id || d.successorId === id);
    if (deps.length) warnings.push(`${deps.length} dependência(s) cruzarão sprints.`);
  }
  return { ok: true, requiresConfirmation: warnings.length > 0, warnings };
}

export function moveTask(ws: Workspace, ctx: Ctx, id: ID, toStageId: ID, toIndex: number) {
  const check = checkMoveTask(ws, id, toStageId);
  if (!check.ok) throw new DomainError(check.warnings.join(" "));
  const t = ws.tasks[id];
  const fromStageId = t.stageId;
  const fromList = tasksOf(ws, fromStageId).filter((x) => x.id !== id);
  renumber(fromList);
  const toList = fromStageId === toStageId ? fromList : tasksOf(ws, toStageId).filter((x) => x.id !== id);
  const idx = Math.max(0, Math.min(toIndex, toList.length));
  toList.splice(idx, 0, t);
  t.stageId = toStageId;
  renumber(toList);
  touch(t, ctx);
  log(ws, ctx, fromStageId === toStageId ? "reorder" : "reclassify", "task", id,
    fromStageId === toStageId ? `Tarefa reordenada: ${t.title}` : `Tarefa "${t.title}" movida para etapa "${ws.stages[toStageId].title}"`);
}

/** Transição de status principal com regras de validação. */
export function setTaskStatus(ws: Workspace, ctx: Ctx, id: ID, to: TaskStatus) {
  const t = get(ws.tasks, id, "Tarefa");
  const from = t.status;
  if (from === to) return;
  if (to === "done") {
    const missing = subtasksOf(ws, id).filter((s) => s.required && !s.done);
    if (missing.length) throw new DomainError(`Conclua ${missing.length} subtarefa(s) obrigatória(s) antes de marcar como Feito`);
    if (t.blockedReason || t.blockInfo?.active) throw new DomainError("Tarefa possui bloqueio ativo");
    if (t.completionCriteria && t.completionCriteria.length > 0) {
      const pendingCriteria = t.completionCriteria.filter((c) => c.required && !c.done);
      if (pendingCriteria.length > 0) {
        throw new DomainError(`Critério de conclusão obrigatório pendente: "${pendingCriteria[0].text}"`);
      }
    }
    t.actualStart ??= ctx.nowIso;
    t.actualEnd = ctx.nowIso;
  } else if (to === "doing") {
    if (from === "done") t.actualEnd = null;
    t.actualStart ??= ctx.nowIso;
  } else {
    if (from === "done") t.actualEnd = null;
  }
  t.status = to;
  touch(t, ctx);
  const verb = from === "done" ? "reaberta" : "atualizada";
  log(ws, ctx, "status", "task", id, `Tarefa "${t.title}" ${verb}: ${from} → ${to}`);
}

export function acceptTask(ws: Workspace, ctx: Ctx, id: ID, memberId: ID | null) {
  const t = get(ws.tasks, id, "Tarefa");
  if (t.status !== "done") throw new DomainError("Somente tarefas concluídas podem ser aceitas");
  t.acceptedAt = ctx.nowIso; t.acceptedBy = memberId; t.awaitingApproval = false; touch(t, ctx);
  log(ws, ctx, "accept", "task", id, `Aceite registrado: ${t.title}`);
}

export function addTimeEntry(ws: Workspace, ctx: Ctx, id: ID, minutes: number, memberId: ID | null, note: string) {
  const t = get(ws.tasks, id, "Tarefa");
  if (!(minutes > 0)) throw new DomainError("Informe minutos > 0");
  t.timeEntries.push({ id: newId(), memberId, minutes, at: ctx.nowIso, note });
  touch(t, ctx);
  log(ws, ctx, "time", "task", id, `${minutes} min registrados em "${t.title}"`);
}

export function acknowledge(ws: Workspace, ctx: Ctx, taskId: ID, memberId: ID) {
  const t = get(ws.tasks, taskId, "Tarefa");
  const ack: Acknowledgement = { id: newId(), taskId, memberId, at: ctx.nowIso, materialVersion: t.materialVersion };
  ws.acknowledgements[ack.id] = ack;
  log(ws, ctx, "acknowledge", "task", taskId, `Ciência confirmada por ${ws.members[memberId]?.name ?? "?"} (v${t.materialVersion})`);
}

export type AckState = "none" | "current" | "outdated";
export function ackState(ws: Workspace, taskId: ID, memberId: ID | null): AckState {
  if (!memberId) return "none";
  const t = ws.tasks[taskId];
  const acks = Object.values(ws.acknowledgements).filter((a) => a.taskId === taskId && a.memberId === memberId);
  if (!acks.length) return "none";
  const latest = Math.max(...acks.map((a) => a.materialVersion));
  return latest >= t.materialVersion ? "current" : "outdated";
}

// ───────────── Subtasks ─────────────

export function createSubtask(ws: Workspace, ctx: Ctx, taskId: ID, title: string, target: number | null = null): ID {
  const task = get(ws.tasks, taskId, "Tarefa");
  const s = makeSubtask(ctx, task.id, title, subtasksOf(ws, task.id).length, { target });
  ws.subtasks[s.id] = s;
  log(ws, ctx, "create", "subtask", s.id, `Subtarefa criada: ${title}`);
  return s.id;
}

export function updateSubtask(ws: Workspace, ctx: Ctx, id: ID, patch: Partial<Pick<Subtask, "title" | "description" | "required" | "assigneeId" | "target" | "evidenceUrl">>) {
  const s = get(ws.subtasks, id, "Subtarefa");
  if (patch.title !== undefined && !patch.title.trim()) throw new DomainError("Título obrigatório");
  if (patch.target != null && patch.target < 1) throw new DomainError("Meta deve ser ≥ 1");
  Object.assign(s, patch); touch(s, ctx);
  log(ws, ctx, "update", "subtask", id, `Subtarefa atualizada: ${s.title}`);
}

export function toggleSubtask(ws: Workspace, ctx: Ctx, id: ID, done: boolean) {
  const s = get(ws.subtasks, id, "Subtarefa");
  s.done = done; s.doneAt = done ? ctx.nowIso : null;
  if (s.target != null) s.count = done ? Math.max(s.count, s.target) : Math.min(s.count, s.target - 1);
  touch(s, ctx);
  log(ws, ctx, done ? "check" : "uncheck", "subtask", id, `Subtarefa ${done ? "concluída" : "reaberta"}: ${s.title}`);
}

export function stepSubtaskCount(ws: Workspace, ctx: Ctx, id: ID, delta: 1 | -1) {
  const s = get(ws.subtasks, id, "Subtarefa");
  if (s.target == null) throw new DomainError("Subtarefa sem meta quantitativa");
  s.count = Math.max(0, Math.min(s.target, s.count + delta));
  s.done = s.count >= s.target; s.doneAt = s.done ? (s.doneAt ?? ctx.nowIso) : null;
  touch(s, ctx);
  log(ws, ctx, "count", "subtask", id, `${s.title}: ${s.count}/${s.target}`);
}

export function moveSubtask(ws: Workspace, ctx: Ctx, id: ID, toTaskId: ID, toIndex: number) {
  const s = get(ws.subtasks, id, "Subtarefa");
  get(ws.tasks, toTaskId, "Tarefa");
  const from = s.taskId;
  const fromList = subtasksOf(ws, from).filter((x) => x.id !== id);
  renumber(fromList);
  const toList = from === toTaskId ? fromList : subtasksOf(ws, toTaskId).filter((x) => x.id !== id);
  toList.splice(Math.max(0, Math.min(toIndex, toList.length)), 0, s);
  s.taskId = toTaskId;
  renumber(toList); touch(s, ctx);
  log(ws, ctx, from === toTaskId ? "reorder" : "reclassify", "subtask", id,
    from === toTaskId ? `Subtarefa reordenada: ${s.title}` : `Subtarefa "${s.title}" movida para "${ws.tasks[toTaskId].title}"`);
}

export function duplicateSubtask(ws: Workspace, ctx: Ctx, id: ID): ID {
  const s = get(ws.subtasks, id, "Subtarefa");
  const n = makeSubtask(ctx, s.taskId, `${s.title} (cópia)`, s.position + 1, { description: s.description, required: s.required, target: s.target });
  const list = subtasksOf(ws, s.taskId);
  list.splice(s.position + 1, 0, n);
  ws.subtasks[n.id] = n;
  renumber(list);
  log(ws, ctx, "duplicate", "subtask", n.id, `Subtarefa duplicada: ${s.title}`);
  return n.id;
}

export function deleteSubtask(ws: Workspace, ctx: Ctx, id: ID) {
  const s = get(ws.subtasks, id, "Subtarefa");
  s.archivedAt = ctx.nowIso; touch(s, ctx);
  renumber(subtasksOf(ws, s.taskId));
  log(ws, ctx, "archive", "subtask", id, `Subtarefa arquivada: ${s.title}`);
}

export function restoreSubtask(ws: Workspace, ctx: Ctx, id: ID) {
  const s = get(ws.subtasks, id, "Subtarefa");
  s.archivedAt = null; touch(s, ctx);
  renumber(subtasksOf(ws, s.taskId));
  log(ws, ctx, "restore", "subtask", id, `Subtarefa restaurada: ${s.title}`);
}

export function deleteSubtaskPermanently(ws: Workspace, ctx: Ctx, id: ID) {
  const s = get(ws.subtasks, id, "Subtarefa");
  const taskId = s.taskId;
  delete ws.subtasks[id];
  renumber(subtasksOf(ws, taskId));
  touch(ws.project, ctx);
  log(ws, ctx, "delete", "subtask", id, `Subtarefa excluída definitivamente: ${s.title}`);
}

export function reorderSubtasks(ws: Workspace, ctx: Ctx, taskId: ID, orderedIds: ID[]) {
  get(ws.tasks, taskId, "Tarefa");
  orderedIds.forEach((id, idx) => {
    if (ws.subtasks[id]) {
      ws.subtasks[id].position = idx;
      touch(ws.subtasks[id], ctx);
    }
  });
  log(ws, ctx, "reorder", "subtask", taskId, `Itens do checklist reordenados`);
}

// ───────────── Dependencies ─────────────

export function addDependency(ws: Workspace, ctx: Ctx, predecessorId: ID, successorId: ID): ID {
  get(ws.tasks, predecessorId, "Tarefa"); get(ws.tasks, successorId, "Tarefa");
  const deps = Object.values(ws.dependencies);
  if (deps.some((d) => d.predecessorId === predecessorId && d.successorId === successorId)) throw new DomainError("Dependência já existe");
  if (wouldCreateCycle(deps, predecessorId, successorId)) throw new DomainError("Dependência circular não permitida");
  const d: Dependency = { id: newId(), predecessorId, successorId };
  ws.dependencies[d.id] = d;
  log(ws, ctx, "create", "dependency", d.id, `"${ws.tasks[successorId].title}" depende de "${ws.tasks[predecessorId].title}"`);
  return d.id;
}

export function removeDependency(ws: Workspace, ctx: Ctx, id: ID) {
  const d = get(ws.dependencies, id, "Dependência");
  delete ws.dependencies[id];
  log(ws, ctx, "delete", "dependency", id, `Dependência removida: ${ws.tasks[d.successorId]?.title} ← ${ws.tasks[d.predecessorId]?.title}`);
}

// ───────────── Members / Calendars / Costs ─────────────

export function upsertMember(ws: Workspace, ctx: Ctx, data: Partial<Member> & { name: string }): ID {
  if (data.id && ws.members[data.id]) {
    Object.assign(ws.members[data.id], data); touch(ws.members[data.id], ctx);
    log(ws, ctx, "update", "member", data.id, `Responsável atualizado: ${data.name}`);
    return data.id;
  }
  const m: Member = { ...base(ctx), userId: null, role: "", calendarId: null, active: true, ...data, id: newId() };
  ws.members[m.id] = m;
  log(ws, ctx, "create", "member", m.id, `Responsável adicionado: ${m.name}`);
  return m.id;
}

export function setMemberCost(ws: Workspace, ctx: Ctx, memberId: ID, cost: number | null) {
  if (cost != null && cost < 0) throw new DomainError("Custo inválido");
  ws.costs[memberId] = cost;
  log(ws, ctx, "update", "cost", memberId, `Custo/hora de ${ws.members[memberId]?.name}: ${cost ?? "não definido"}`);
}

export function updateCalendar(ws: Workspace, ctx: Ctx, id: ID, patch: Partial<WorkCalendar>) {
  const c = get(ws.calendars, id, "Calendário");
  Object.assign(c, patch); touch(c, ctx);
  log(ws, ctx, "update", "calendar", id, `Calendário "${c.name}" atualizado`);
}

// ───────────── Milestones / Routines / Financial / Change requests ─────────────

export function upsertMilestone(ws: Workspace, ctx: Ctx, data: Partial<Milestone> & { sprintId: ID; title: string }): ID {
  if (data.id && ws.milestones[data.id]) {
    Object.assign(ws.milestones[data.id], data); touch(ws.milestones[data.id], ctx);
    log(ws, ctx, "update", "milestone", data.id, `Marco atualizado: ${data.title}`);
    return data.id;
  }
  const pos = live(ws.milestones).filter((m) => m.sprintId === data.sprintId).length;
  const m: Milestone = { ...base(ctx), position: pos, dueDate: null, ownerId: null, taskIds: [], criteria: [], validatedAt: null, ...data, id: newId() };
  ws.milestones[m.id] = m;
  log(ws, ctx, "create", "milestone", m.id, `Marco criado: ${m.title}`);
  return m.id;
}

export function validateMilestone(ws: Workspace, ctx: Ctx, id: ID, valid: boolean) {
  const m = get(ws.milestones, id, "Marco");
  if (valid) {
    const open = m.taskIds.filter((t) => ws.tasks[t] && !ws.tasks[t].archivedAt && ws.tasks[t].status !== "done");
    if (open.length) throw new DomainError(`${open.length} tarefa(s) vinculada(s) ainda não concluída(s)`);
  }
  m.validatedAt = valid ? ctx.nowIso : null; touch(m, ctx);
  log(ws, ctx, valid ? "validate" : "invalidate", "milestone", id, `Marco ${valid ? "validado" : "reaberto"}: ${m.title}`);
}

export function archiveEntity(ws: Workspace, ctx: Ctx, coll: "milestones" | "routines" | "financialRecords" | "changeRequests" | "members", id: ID) {
  const e = get(ws[coll] as Record<ID, Entity & { title?: string; name?: string; description?: string }>, id, "Registro");
  e.archivedAt = ctx.nowIso; touch(e, ctx);
  log(ws, ctx, "archive", coll, id, `Arquivado: ${e.title ?? e.name ?? e.description ?? id}`);
}

export function upsertRoutine(ws: Workspace, ctx: Ctx, data: Partial<RoutineDefinition> & { title: string }): ID {
  if (data.id && ws.routines[data.id]) {
    Object.assign(ws.routines[data.id], data); touch(ws.routines[data.id], ctx);
    log(ws, ctx, "update", "routine", data.id, `Rotina atualizada: ${data.title}`);
    return data.id;
  }
  const r: RoutineDefinition = { ...base(ctx), sprintId: null, description: "", frequency: "workdays", weekday: null, time: null,
    durationMinutes: null, ownerId: null, checklist: [], position: live(ws.routines).length, ...data, id: newId() };
  ws.routines[r.id] = r;
  log(ws, ctx, "create", "routine", r.id, `Rotina criada: ${r.title}`);
  return r.id;
}

export function toggleRoutineOccurrence(ws: Workspace, ctx: Ctx, routineId: ID, date: string, done: boolean) {
  const r = get(ws.routines, routineId, "Rotina");
  let occ = Object.values(ws.routineOccurrences).find((o) => o.routineId === routineId && o.date === date);
  if (!occ) { occ = { id: newId(), routineId, date, checkedItemIds: [], done: false, doneAt: null }; ws.routineOccurrences[occ.id] = occ; }
  occ.done = done; occ.doneAt = done ? ctx.nowIso : null;
  log(ws, ctx, done ? "check" : "uncheck", "routine", routineId, `Rotina "${r.title}" ${done ? "feita" : "desmarcada"} em ${date}`);
}

export function upsertFinancial(ws: Workspace, ctx: Ctx, data: Partial<FinancialRecord> & { sprintId: ID; description: string; amount: number }): ID {
  if (!Number.isFinite(data.amount) || data.amount < 0) throw new DomainError("Valor inválido");
  if (data.id && ws.financialRecords[data.id]) {
    Object.assign(ws.financialRecords[data.id], data); touch(ws.financialRecords[data.id], ctx);
    log(ws, ctx, "update", "financial", data.id, `Lançamento atualizado: ${data.description}`);
    return data.id;
  }
  const f: FinancialRecord = { ...base(ctx), kind: "actual", category: "expense", ...data, id: newId() };
  ws.financialRecords[f.id] = f;
  log(ws, ctx, "create", "financial", f.id, `Lançamento: ${f.description} (${f.amount})`);
  return f.id;
}

export function upsertChangeRequest(ws: Workspace, ctx: Ctx, data: Partial<ChangeRequest> & { sprintId: ID; title: string }): ID {
  if (data.id && ws.changeRequests[data.id]) {
    const cr = ws.changeRequests[data.id];
    if (data.status && data.status !== cr.status) cr.decidedAt = data.status === "open" ? null : ctx.nowIso;
    Object.assign(cr, data); touch(cr, ctx);
    log(ws, ctx, "update", "change_request", cr.id, `Solicitação "${cr.title}": ${cr.status}`);
    return cr.id;
  }
  const cr: ChangeRequest = { ...base(ctx), description: "", impactMinutes: null, impactCost: null, status: "open", decidedAt: null, ...data, id: newId() };
  ws.changeRequests[cr.id] = cr;
  log(ws, ctx, "create", "change_request", cr.id, `Solicitação adicional registrada: ${cr.title}`);
  return cr.id;
}

export function setFunnelCount(ws: Workspace, ctx: Ctx, stageId: ID, count: number, value?: number | null) {
  const f = get(ws.funnel, stageId, "Etapa do funil");
  f.count = Math.max(0, Math.floor(count));
  if (value !== undefined) f.value = value;
  log(ws, ctx, "count", "funnel", stageId, `Funil "${f.label}": ${f.count}`);
}

export function createFunnelStage(ws: Workspace, ctx: Ctx, label: string, color = "#6366F1", value?: number | null): ID {
  ws.funnel ??= {};
  const id = newId();
  const position = Object.values(ws.funnel).length;
  ws.funnel[id] = { id, label, color, count: 0, position, value: value || 0 };
  log(ws, ctx, "create", "funnel", id, `Etapa do funil criada: ${label}`);
  return id;
}

export function updateFunnelStage(ws: Workspace, ctx: Ctx, id: ID, patch: Partial<FunnelStage>) {
  const f = get(ws.funnel, id, "Etapa do funil");
  Object.assign(f, patch);
  log(ws, ctx, "update", "funnel", id, `Etapa do funil atualizada: ${f.label}`);
}

export function deleteFunnelStage(ws: Workspace, ctx: Ctx, id: ID, targetStageId?: ID | null) {
  const f = get(ws.funnel, id, "Etapa do funil");
  if (targetStageId && ws.funnel[targetStageId]) {
    ws.funnel[targetStageId].count += f.count;
    if (f.value && ws.funnel[targetStageId].value !== undefined) {
      ws.funnel[targetStageId].value = (ws.funnel[targetStageId].value || 0) + (f.value || 0);
    }
  }
  delete ws.funnel[id];
  // Reordena
  Object.values(ws.funnel)
    .sort((a, b) => a.position - b.position)
    .forEach((s, idx) => { s.position = idx; });
  log(ws, ctx, "delete", "funnel", id, `Etapa do funil removida: ${f.label}`);
}

export function reorderFunnelStages(ws: Workspace, ctx: Ctx, orderedIds: ID[]) {
  orderedIds.forEach((id, idx) => {
    if (ws.funnel[id]) ws.funnel[id].position = idx;
  });
  log(ws, ctx, "reorder", "funnel", null, "Etapas do funil reordenadas");
}

export function ensureDefaultFunnelStages(ws: Workspace, ctx: Ctx) {
  ws.funnel ??= {};
  if (Object.keys(ws.funnel).length === 0) {
    DEFAULT_FUNNEL_STAGES.forEach((st, idx) => {
      const id = `fn-${idx + 1}`;
      ws.funnel[id] = { id, ...st, position: idx };
    });
    log(ws, ctx, "init", "funnel", null, "Etapas iniciais do funil configuradas");
  }
}

// ───────────── Dashboard Modular Personalizável (INFRA | DISTRIBUIÇÃO | FUNIL) ─────────────

export function getDashboardLayout(ws: Workspace): DashboardLayoutConfig {
  if (!ws.dashboardLayoutConfig || !ws.dashboardLayoutConfig.blocks || ws.dashboardLayoutConfig.blocks.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
  }
  const layout = ws.dashboardLayoutConfig;
  // Migra blocos antigos separados para o bloco unificado com filtro integrado 'dist_midia'
  const oldDistBlocks = ["dist_instagram", "dist_tiktok", "dist_youtube", "distribuicao"];
  if (layout.blocks.some((b) => oldDistBlocks.includes(b.id))) {
    layout.blocks = layout.blocks.filter((b) => !oldDistBlocks.includes(b.id));
  }

  // Migra cards de dist_midia para os 4 formatos editáveis solicitados (Reels, Carrossel, Stories, Post)
  const hasFormatCards = layout.cards.some((c) =>
    ["dist_reels", "dist_carrossel", "dist_stories"].includes(c.id)
  );
  if (!hasFormatCards) {
    // Remove seguidores e views antigos de dist_midia
    layout.cards = layout.cards.filter(
      (c) => c.blockId !== "dist_midia" || (c.id !== "dist_followers" && c.id !== "dist_views")
    );
    const targetCards = [
      { id: "dist_reels", blockId: "dist_midia", title: "▶️ Reels", order: 0 },
      { id: "dist_carrossel", blockId: "dist_midia", title: "🎠 Carrossel", order: 1 },
      { id: "dist_stories", blockId: "dist_midia", title: "👁️ Visualizações Stories", order: 2 },
      { id: "dist_posts", blockId: "dist_midia", title: "📸 Post", order: 3 },
    ];
    targetCards.forEach((tc) => {
      const existing = layout.cards.find((c) => c.id === tc.id);
      if (existing) {
        existing.blockId = "dist_midia";
        existing.order = tc.order;
        if (tc.id === "dist_posts" && (!existing.title || existing.title === "Posts Realizados")) {
          existing.title = "📸 Post";
        }
      } else {
        layout.cards.push(tc);
      }
    });
  }

  // Garante que os novos blocos e cards padrão existam na configuração sem perder os customizados
  DEFAULT_DASHBOARD_LAYOUT.blocks.forEach((db) => {
    if (!layout.blocks.some((b) => b.id === db.id)) {
      layout.blocks.push({ ...db });
    }
  });
  DEFAULT_DASHBOARD_LAYOUT.cards.forEach((dc) => {
    if (!layout.cards.some((c) => c.id === dc.id)) {
      layout.cards.push({ ...dc });
    }
  });
  return layout;
}

export function saveDashboardLayout(ws: Workspace, ctx: Ctx, layout: DashboardLayoutConfig) {
  ws.dashboardLayoutConfig = JSON.parse(JSON.stringify(layout));
  log(ws, ctx, "update", "dashboard_layout", null, "Layout do dashboard atualizado");
}

export function reorderDashboardBlocks(ws: Workspace, ctx: Ctx, orderedBlockIds: string[]) {
  const layout = getDashboardLayout(ws);
  orderedBlockIds.forEach((id, idx) => {
    const block = layout.blocks.find((b) => b.id === id);
    if (block) block.order = idx;
  });
  saveDashboardLayout(ws, ctx, layout);
}

export function reorderDashboardCards(ws: Workspace, ctx: Ctx, orderedCardIds: string[], targetBlockId?: string) {
  const layout = getDashboardLayout(ws);
  orderedCardIds.forEach((id, idx) => {
    const card = layout.cards.find((c) => c.id === id);
    if (card) {
      card.order = idx;
      if (targetBlockId) card.blockId = targetBlockId;
    }
  });
  saveDashboardLayout(ws, ctx, layout);
}

export function updateDashboardCard(ws: Workspace, ctx: Ctx, cardId: string, patch: Partial<DashboardCardConfig>) {
  const layout = getDashboardLayout(ws);
  const card = layout.cards.find((c) => c.id === cardId);
  if (card) {
    Object.assign(card, patch);
    saveDashboardLayout(ws, ctx, layout);
  }
}

export function updateDashboardBlock(ws: Workspace, ctx: Ctx, blockId: string, patch: Partial<DashboardBlockConfig>) {
  const layout = getDashboardLayout(ws);
  const block = layout.blocks.find((b) => b.id === blockId);
  if (block) {
    Object.assign(block, patch);
    saveDashboardLayout(ws, ctx, layout);
  }
}

export function resetDashboardLayout(ws: Workspace, ctx: Ctx) {
  saveDashboardLayout(ws, ctx, JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT)));
}

// ───────────── Publicações Individuais (Distribuição de Conteúdo) ─────────────

export function upsertPublication(ws: Workspace, ctx: Ctx, data: Partial<ContentPublication> & { title: string }): ID {
  ws.publications ??= {};
  if (data.id && ws.publications[data.id]) {
    const pub = ws.publications[data.id];
    Object.assign(pub, data, { updatedAt: ctx.nowIso });
    log(ws, ctx, "update", "publication", pub.id, `Publicação atualizada: ${pub.title}`);
    return pub.id;
  }
  const id = newId();
  const pub: ContentPublication = {
    id,
    title: data.title,
    type: data.type || "post",
    platform: data.platform || "instagram",
    publishedAt: data.publishedAt || ctx.nowIso.slice(0, 10),
    url: data.url || "",
    views: data.views || 0,
    reach: data.reach || 0,
    likes: data.likes || 0,
    comments: data.comments || 0,
    shares: data.shares || 0,
    saves: data.saves || 0,
    clicks: data.clicks || 0,
    groupEntries: data.groupEntries || 0,
    notes: data.notes || "",
    createdAt: ctx.nowIso,
    updatedAt: ctx.nowIso,
    ...data,
  };
  ws.publications[id] = pub;
  log(ws, ctx, "create", "publication", id, `Publicação cadastrada: ${pub.title}`);
  return id;
}

export function deletePublication(ws: Workspace, ctx: Ctx, id: ID) {
  if (ws.publications && ws.publications[id]) {
    const title = ws.publications[id].title;
    delete ws.publications[id];
    log(ws, ctx, "delete", "publication", id, `Publicação excluída: ${title}`);
  }
}

export function duplicatePublication(ws: Workspace, ctx: Ctx, id: ID): ID {
  const orig = get(ws.publications || {}, id, "Publicação");
  const newIdVal = newId();
  const pub: ContentPublication = {
    ...orig,
    id: newIdVal,
    title: `${orig.title} (Cópia)`,
    createdAt: ctx.nowIso,
    updatedAt: ctx.nowIso,
  };
  ws.publications ??= {};
  ws.publications[newIdVal] = pub;
  log(ws, ctx, "duplicate", "publication", newIdVal, `Publicação duplicada: ${pub.title}`);
  return newIdVal;
}

export function setTaskImpactFlags(ws: Workspace, ctx: Ctx, taskId: ID, flags: ImpactFlag[]) {
  const t = get(ws.tasks, taskId, "Tarefa");
  t.impactFlags = flags.slice(0, 3); // máximo de 3 flags
  touch(t, ctx);
  log(ws, ctx, "flags", "task", taskId, `Flags de impacto atualizadas: ${flags.join(", ")}`);
}

export function logPomodoroTime(ws: Workspace, ctx: Ctx, taskId: ID, minutes: number, note = "Sessão de Foco Pomodoro") {
  const t = get(ws.tasks, taskId, "Tarefa");
  const entry = {
    id: newId(),
    memberId: t.assigneeId,
    minutes: Math.max(1, Math.round(minutes)),
    at: ctx.nowIso,
    note,
  };
  t.timeEntries.push(entry);
  touch(t, ctx);
  log(ws, ctx, "time", "task", taskId, `Tempo registrado: ${entry.minutes}m via cronômetro`);
}

export function setPrompt(ws: Workspace, ctx: Ctx, taskId: ID, prompt: string) {
  get(ws.tasks, taskId, "Tarefa");
  ws.prompts[taskId] = prompt;
  log(ws, ctx, "update", "prompt", taskId, `Prompt otimizado salvo: ${ws.tasks[taskId].title}`);
}

export function setPriority(ws: Workspace, ctx: Ctx, id: ID, p: Priority) { updateTask(ws, ctx, id, { priority: p }); }

// ───────────── Indicadores Dinâmicos (KPI Builder) ─────────────

export function upsertIndicator(
  ws: Workspace,
  ctx: Ctx,
  data: Partial<CustomIndicator> & { name: string; type: CustomIndicator["type"] }
): ID {
  ws.indicators ??= {};
  if (data.id && ws.indicators[data.id]) {
    const ind = ws.indicators[data.id];
    Object.assign(ind, data);
    touch(ind, ctx);
    log(ws, ctx, "update", "indicator", ind.id, `Indicador atualizado: ${ind.name}`);
    return ind.id;
  }
  const pos = Object.values(ws.indicators).length;
  const ind: CustomIndicator = {
    ...base(ctx),
    sprintId: null,
    name: data.name,
    description: data.description || "",
    category: data.category || "geral",
    type: data.type,
    currentValue: data.currentValue ?? 0,
    targetValue: data.targetValue ?? null,
    unit: data.unit || "",
    period: data.period || "sprint",
    dataSource: data.dataSource || "manual",
    pinnedToCockpit: data.pinnedToCockpit ?? false,
    position: pos,
    ...data,
    id: newId(),
  };
  ws.indicators[ind.id] = ind;
  log(ws, ctx, "create", "indicator", ind.id, `Indicador criado: ${ind.name}`);
  return ind.id;
}

export function deleteIndicator(ws: Workspace, ctx: Ctx, id: ID) {
  if (ws.indicators && ws.indicators[id]) {
    const name = ws.indicators[id].name;
    delete ws.indicators[id];
    log(ws, ctx, "delete", "indicator", id, `Indicador removido: ${name}`);
  }
}

export function togglePinIndicator(ws: Workspace, ctx: Ctx, id: ID) {
  if (ws.indicators && ws.indicators[id]) {
    const ind = ws.indicators[id];
    ind.pinnedToCockpit = !ind.pinnedToCockpit;
    touch(ind, ctx);
    log(ws, ctx, "pin", "indicator", id, `Indicador ${ind.pinnedToCockpit ? "fixado no cockpit" : "desafixado"}: ${ind.name}`);
  }
}

// ───────────── OKRs ─────────────

export function upsertOKRGoal(
  ws: Workspace,
  ctx: Ctx,
  data: Partial<OKRGoal> & { title: string }
): ID {
  ws.okrs ??= {};
  if (data.id && ws.okrs[data.id]) {
    const g = ws.okrs[data.id];
    Object.assign(g, data);
    touch(g, ctx);
    log(ws, ctx, "update", "okr", g.id, `Objetivo OKR atualizado: ${g.title}`);
    return g.id;
  }
  const g: OKRGoal = {
    ...base(ctx),
    sprintId: null,
    title: data.title,
    description: data.description || "",
    ownerId: data.ownerId || null,
    targetDate: data.targetDate || null,
    weight: data.weight ?? 1,
    keyResults: data.keyResults || [],
    ...data,
    id: newId(),
  };
  ws.okrs[g.id] = g;
  log(ws, ctx, "create", "okr", g.id, `Objetivo OKR criado: ${g.title}`);
  return g.id;
}

export function deleteOKRGoal(ws: Workspace, ctx: Ctx, id: ID) {
  if (ws.okrs && ws.okrs[id]) {
    const title = ws.okrs[id].title;
    delete ws.okrs[id];
    log(ws, ctx, "delete", "okr", id, `Objetivo OKR removido: ${title}`);
  }
}

// ───────────── Calculadoras & Métricas de Conteúdo ─────────────

export function updateContentMetrics(ws: Workspace, ctx: Ctx, patch: Partial<ContentDistributionMetrics>) {
  ws.contentMetrics = {
    postsPublished: 0,
    postsPerDay: 0,
    reels: 0,
    stories: 0,
    views: 0,
    reach: 0,
    clicks: 0,
    groupEntries: 0,
    leadsCaptured: 0,
    adSpend: 0,
    period: "sprint",
    ...(ws.contentMetrics || {}),
    ...patch,
  };
  log(ws, ctx, "update", "content_metrics", null, "Métricas de distribuição de conteúdo atualizadas");
}

export function updateHoursCalculator(ws: Workspace, ctx: Ctx, patch: Partial<HoursCalculatorData>) {
  ws.hoursCalculator = {
    taskCount: 0,
    avgHoursPerTask: 2.5,
    membersAvailable: 1,
    hoursPerDay: 8,
    businessDays: 10,
    hourlyRate: 50,
    ...(ws.hoursCalculator || {}),
    ...patch,
  };
  log(ws, ctx, "update", "hours_calc", null, "Calculadora de horas atualizada");
}

export function updateAdsCalculator(ws: Workspace, ctx: Ctx, patch: Partial<AdsCalculatorData>) {
  ws.adsCalculator = {
    dailyBudget: 50,
    campaignDays: 10,
    totalSpent: 500,
    cpl: 5,
    conversionRate: 5,
    avgTicket: 500,
    attributedRevenue: 2500,
    otherCosts: 0,
    ...(ws.adsCalculator || {}),
    ...patch,
  };
  log(ws, ctx, "update", "ads_calc", null, "Calculadora de anúncios atualizada");
}

// ───────────── Criar Workspace em Branco ─────────────

export function createBlankWorkspace(name = "Novo Cronograma", client = "Cliente"): Workspace {
  const now = new Date().toISOString();
  const projectId = newId();
  const sprintId = newId();
  const calendarId = newId();

  return {
    schemaVersion: 1,
    project: {
      id: projectId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      rev: 1,
      name,
      client,
      description: "Implementação operacional",
      contractModel: "Empreitada",
      timezone: "America/Sao_Paulo",
    },
    sprints: {
      [sprintId]: {
        id: sprintId,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        rev: 1,
        projectId,
        name: "Sprint 01",
        objective: "Execução operacional",
        deliverables: [],
        position: 0,
        startDate: null,
        startTime: null,
        businessDays: null,
        calendarId,
        managerId: null,
        contractValue: null,
        revenueReceived: null,
        schedulingMode: "hybrid",
        activatedAt: null,
        baseline: null,
      },
    },
    stages: {},
    tasks: {},
    subtasks: {},
    dependencies: {},
    acknowledgements: {},
    members: {},
    calendars: {
      [calendarId]: {
        id: calendarId,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        rev: 1,
        name: "Jornada padrão (SP)",
        workStart: "09:00",
        workEnd: "18:00",
        breaks: [{ start: "12:00", end: "13:00" }],
        workDays: [1, 2, 3, 4, 5],
        holidays: [],
      },
    },
    milestones: {},
    routines: {},
    routineOccurrences: {},
    financialRecords: {},
    changeRequests: {},
    funnel: {},
    costs: {},
    prompts: {},
    revisions: {},
    activity: [
      {
        id: newId(),
        at: now,
        actorName: "Sistema",
        action: "create",
        entity: "workspace",
        entityId: projectId,
        summary: `Cronograma em branco criado: "${name}"`,
      },
    ],
    settings: {
      dailyThresholds: { start: 40, rhythm: 70, strong: 90 },
    },
    indicators: {},
    okrs: {},
    contentMetrics: {
      postsPublished: 0,
      postsPerDay: 0,
      reels: 0,
      stories: 0,
      views: 0,
      reach: 0,
      clicks: 0,
      groupEntries: 0,
      leadsCaptured: 0,
      adSpend: 0,
      period: "sprint",
    },
    hoursCalculator: {
      taskCount: 0,
      avgHoursPerTask: 2.5,
      membersAvailable: 1,
      hoursPerDay: 8,
      businessDays: 10,
      hourlyRate: 50,
    },
    adsCalculator: {
      dailyBudget: 50,
      campaignDays: 10,
      totalSpent: 0,
      cpl: 0,
      conversionRate: 0,
      avgTicket: 0,
      attributedRevenue: 0,
      otherCosts: 0,
    },
  };
}

// ==========================================
// BRAND MANUAL 7D (AJ-014) OPERATIONS
// ==========================================

export function getBrandManualData(ws: Workspace): BrandManualData {
  if (!ws.brandManual) {
    ws.brandManual = {
      modules: JSON.parse(JSON.stringify(DEFAULT_BRAND_MANUAL_MODULES)),
      fields: JSON.parse(JSON.stringify(DEFAULT_BRAND_MANUAL_FIELDS)),
      copyAds: JSON.parse(JSON.stringify(DEFAULT_COPY_ADS_VARIANTS)),
      lastUpdatedAt: new Date().toISOString(),
      overallStatus: "draft",
    };
  } else {
    if (!ws.brandManual.modules || ws.brandManual.modules.length === 0) {
      ws.brandManual.modules = JSON.parse(JSON.stringify(DEFAULT_BRAND_MANUAL_MODULES));
    } else {
      // Garante presença do módulo de Personalidade (AJ-017)
      if (!ws.brandManual.modules.some((m) => m.id === "personalidade")) {
        const copyAdsMod = ws.brandManual.modules.find((m) => m.id === "copy_ads");
        if (copyAdsMod) {
          copyAdsMod.title = "5. COPY ADS";
          copyAdsMod.order = 4;
        }
        ws.brandManual.modules.push({
          id: "personalidade",
          title: "4. PERSONALIDADE",
          description: "Captura da identidade verbal real do expert: vícios de linguagem, gírias, expressões, humor e intensidade.",
          order: 3,
        });
        ws.brandManual.modules.sort((a, b) => a.order - b.order);
      } else {
        const copyAdsMod = ws.brandManual.modules.find((m) => m.id === "copy_ads");
        if (copyAdsMod && copyAdsMod.title.startsWith("4.")) {
          copyAdsMod.title = "5. COPY ADS";
          copyAdsMod.order = 4;
        }
      }
    }

    if (!ws.brandManual.fields || ws.brandManual.fields.length === 0) {
      ws.brandManual.fields = JSON.parse(JSON.stringify(DEFAULT_BRAND_MANUAL_FIELDS));
    } else {
      // Garante presença de todos os campos obrigatórios da etapa Personalidade (per_01 a per_08)
      DEFAULT_BRAND_MANUAL_FIELDS.forEach((df) => {
        if (!ws.brandManual!.fields.some((f) => f.id === df.id)) {
          ws.brandManual!.fields.push(JSON.parse(JSON.stringify(df)));
        }
      });
    }

    if (!ws.brandManual.copyAds || ws.brandManual.copyAds.length === 0) {
      ws.brandManual.copyAds = JSON.parse(JSON.stringify(DEFAULT_COPY_ADS_VARIANTS));
    }
  }
  return ws.brandManual;
}

export function updateBrandManualField(
  ws: Workspace,
  ctx: Ctx,
  fieldId: string,
  updates: Partial<BrandManualField>
) {
  const bm = getBrandManualData(ws);
  const idx = bm.fields.findIndex((f) => f.id === fieldId);
  if (idx === -1) return;

  const current = bm.fields[idx];
  const oldResponse = current.response;

  if (updates.response !== undefined && updates.response !== oldResponse && updates.response.trim().length > 0) {
    const historyList = current.history ? [...current.history] : [];
    historyList.unshift({
      timestamp: ctx.nowIso,
      response: updates.response,
      author: ctx.actorName,
      version: historyList.length + 1,
    });
    current.history = historyList;
    current.status = "completed";
  }

  bm.fields[idx] = {
    ...current,
    ...updates,
  };
  bm.lastUpdatedAt = ctx.nowIso;
  bm.lastUpdatedBy = ctx.actorName;
  touch(ws.project, ctx);
  log(ws, ctx, "update", "BrandManualField", fieldId, `Campo "${current.title}" atualizado`);
}

export function addBrandManualField(
  ws: Workspace,
  ctx: Ctx,
  field: Omit<BrandManualField, "id">
): string {
  const bm = getBrandManualData(ws);
  const id = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const moduleFields = bm.fields.filter((f) => f.moduleId === field.moduleId && !f.removed);
  const order = field.order !== undefined ? field.order : moduleFields.length;

  const newField: BrandManualField = {
    ...field,
    id,
    order,
    status: "pending",
  };

  bm.fields.push(newField);
  bm.lastUpdatedAt = ctx.nowIso;
  bm.lastUpdatedBy = ctx.actorName;
  touch(ws.project, ctx);
  log(ws, ctx, "create", "BrandManualField", id, `Pergunta "${field.title}" adicionada ao módulo ${field.moduleId}`);
  return id;
}

export function archiveBrandManualField(ws: Workspace, ctx: Ctx, fieldId: string) {
  const bm = getBrandManualData(ws);
  const field = bm.fields.find((f) => f.id === fieldId);
  if (!field) return;
  field.archived = true;
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "archive", "BrandManualField", fieldId, `Campo "${field.title}" arquivado`);
}

export function restoreBrandManualField(ws: Workspace, ctx: Ctx, fieldId: string) {
  const bm = getBrandManualData(ws);
  const field = bm.fields.find((f) => f.id === fieldId);
  if (!field) return;
  field.archived = false;
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "restore", "BrandManualField", fieldId, `Campo "${field.title}" restaurado`);
}

export function removeBrandManualField(ws: Workspace, ctx: Ctx, fieldId: string) {
  const bm = getBrandManualData(ws);
  const field = bm.fields.find((f) => f.id === fieldId);
  if (!field) return;
  field.removed = true;
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "delete", "BrandManualField", fieldId, `Campo "${field.title}" removido da estrutura`);
}

export function duplicateBrandManualField(ws: Workspace, ctx: Ctx, fieldId: string): string | null {
  const bm = getBrandManualData(ws);
  const source = bm.fields.find((f) => f.id === fieldId);
  if (!source) return null;

  const id = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const clone: BrandManualField = {
    ...source,
    id,
    title: `${source.title} (Cópia)`,
    response: "", // Nunca duplica respostas pessoais (Section 2.6)
    transcription: undefined,
    audioUrl: undefined,
    history: [],
    status: "pending",
    order: source.order + 1,
  };

  bm.fields.push(clone);
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "duplicate", "BrandManualField", id, `Campo "${source.title}" duplicado`);
  return id;
}

export function reorderBrandManualFields(
  ws: Workspace,
  ctx: Ctx,
  moduleId: string,
  orderedFieldIds: string[]
) {
  const bm = getBrandManualData(ws);
  orderedFieldIds.forEach((id, index) => {
    const f = bm.fields.find((item) => item.id === id);
    if (f) {
      f.order = index;
      f.moduleId = moduleId;
    }
  });
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "reorder", "BrandManualField", null, `Campos do módulo ${moduleId} reordenados`);
}

export function updateBrandManualModule(
  ws: Workspace,
  ctx: Ctx,
  moduleId: string,
  updates: Partial<BrandManualModule>
) {
  const bm = getBrandManualData(ws);
  const mod = bm.modules.find((m) => m.id === moduleId);
  if (!mod) return;
  Object.assign(mod, updates);
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "update", "BrandManualModule", moduleId, `Módulo "${mod.title}" atualizado`);
}

export function reorderBrandManualModules(ws: Workspace, ctx: Ctx, orderedModuleIds: string[]) {
  const bm = getBrandManualData(ws);
  orderedModuleIds.forEach((id, index) => {
    const m = bm.modules.find((mod) => mod.id === id);
    if (m) m.order = index;
  });
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "reorder", "BrandManualModule", null, "Módulos do Manual de Marca reordenados");
}

export function updateCopyAdVariant(
  ws: Workspace,
  ctx: Ctx,
  variantId: string,
  updates: Partial<CopyAdVariant>
) {
  const bm = getBrandManualData(ws);
  const v = bm.copyAds.find((item) => item.id === variantId);
  if (!v) return;

  if (
    (updates.headline && updates.headline !== v.headline) ||
    (updates.subheadline && updates.subheadline !== v.subheadline)
  ) {
    const historyList = v.history ? [...v.history] : [];
    historyList.unshift({
      timestamp: ctx.nowIso,
      headline: v.headline,
      subheadline: v.subheadline,
      version: v.version,
    });
    v.history = historyList;
    v.version = Math.round((v.version + 0.1) * 10) / 10;
  }

  Object.assign(v, updates);
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "update", "CopyAdVariant", variantId, `Variante ${v.variantNumber} atualizada`);
}

export function saveBrandManualAnalysis(
  ws: Workspace,
  ctx: Ctx,
  moduleId: string,
  analysis: any
) {
  const bm = getBrandManualData(ws);
  const mod = bm.modules.find((m) => m.id === moduleId);
  if (!mod) return;
  mod.generatedAnalysis = analysis;
  mod.analysisStatus = "generated";
  mod.analysisUpdatedAt = ctx.nowIso;
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "generate", "BrandManualModule", moduleId, `Análise de IA salva para o módulo ${mod.title}`);
}

export function saveMasterPrompt(ws: Workspace, ctx: Ctx, promptText: string) {
  const bm = getBrandManualData(ws);
  bm.masterPrompt = promptText;
  bm.lastUpdatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "update", "MasterPrompt", null, "Master Prompt Consolidado salvo");
}

/**
 * AJ-019: Sincronização e Reconciliação do Kanban com o Manual de Marca 7D e Automações Operacionais
 * Preserva o histórico, tempos acumulados e tarefas existentes, injetando as frentes reais do PVD:
 * 1. ETAPA 01 — INTELIGÊNCIA DO EXPERT (IM-01 a IM-05 com subtasks individuais POS/ALM/ICP)
 * 2. GRUPO DE CAPTAÇÃO & AUTOMAÇÕES (GRP-01 a GRP-04, AUTO-01 a AUTO-06, TEST-01)
 * 3. Sincronização dinâmica entre respostas do Manual de Marca e subtarefas operacionais
 */
export function reconcileWorkspaceWithAJ019(ws: Workspace, ctx: Ctx): boolean {
  if (!ws || !ws.stages || !ws.tasks) return false;

  const liveTasks = Object.values(ws.tasks).filter((t) => !t.archivedAt);
  const hasIM01 = liveTasks.some(
    (t) => t.title.includes("IM-01") || t.title.includes("PREENCHER POSICIONAMENTO")
  );
  const hasGRP01 = liveTasks.some(
    (t) => t.title.includes("GRP-01") || t.title.includes("AUTO-01")
  );

  const sprintId = ws.activeSprintId || Object.keys(ws.sprints || {})[0];
  if (!sprintId) return false;

  let changed = false;

  // 0. Auto-correção e reconciliação de integridade de chaves em ws.tasks e ws.subtasks
  if (ws.tasks) {
    for (const [key, t] of Object.entries(ws.tasks)) {
      if (t && t.id && key !== t.id) {
        delete ws.tasks[key];
        ws.tasks[t.id] = t;
        changed = true;
      }
    }
  }
  if (ws.subtasks) {
    for (const [key, st] of Object.entries(ws.subtasks)) {
      if (st && st.id && key !== st.id) {
        delete ws.subtasks[key];
        ws.subtasks[st.id] = st;
        changed = true;
      }
    }
  }

  // 1. Inserir ETAPA 01 — INTELIGÊNCIA DO EXPERT se não existir IM-01
  if (!hasIM01) {
    // Deslocar posições dos estágios existentes
    const existingStages = Object.values(ws.stages).filter(
      (s) => !s.archivedAt && s.sprintId === sprintId
    );
    existingStages.forEach((st) => {
      st.position += 1;
    });

    const intelStageId = newId();
    const intelStage: Stage = {
      ...base(ctx),
      id: intelStageId,
      sprintId,
      title: "ETAPA 01 — INTELIGÊNCIA DO EXPERT",
      position: 0,
    };
    ws.stages[intelStageId] = intelStage;

    const intelTasks = [
      {
        code: "IM-01",
        title: "TAREFA IM-01 — ⏳ PREENCHER POSICIONAMENTO",
        priority: "P1" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ POS-01 — Responder: O que você vende e como isso melhora, na prática, a vida de quem compra?",
          "⏳ POS-02 — Responder: O que você faz de diferente para produzir esse resultado?",
          "⏳ POS-03 — Responder: O que muda no dia a dia do cliente depois que ele utiliza sua solução?",
          "⏳ POS-04 — Responder: O que as pessoas costumam fazer para resolver esse problema que você considera errado ou insuficiente?",
          "Revisar respostas e transcrições.",
          "Executar análise estratégica de Posicionamento.",
          "Verificar lacunas relevantes.",
          "⏳ Solicitar complementações, quando necessárias.",
          "Revisar posicionamento extraído.",
          "⏳ Aprovar versão.",
          "Registrar versão final.",
        ],
      },
      {
        code: "IM-02",
        title: "TAREFA IM-02 — ⏳ PREENCHER ALMA DA COPY",
        priority: "P1" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ ALM-01 — Responder: Que situação fez você perceber que essa solução precisava existir?",
          "⏳ ALM-02 — Responder: O que seu cliente deixa de fazer ou passa a fazer depois de comprar?",
          "⏳ ALM-03 — Responder: Além do resultado principal, o que essa mudança permite que o cliente faça ou viva?",
          "Revisar respostas.",
          "Confirmar transcrições.",
          "Executar análise da Alma do Produto.",
          "Verificar dor-mãe e desejo-mãe.",
          "Verificar inimigo e brecha.",
          "Verificar mecanismo e transformação.",
          "Validar coerência da narrativa.",
          "⏳ Solicitar complementações, quando necessárias.",
          "Aprovar a análise.",
          "Salvar versão.",
        ],
      },
      {
        code: "IM-03",
        title: "TAREFA IM-03 — ⏳ PREENCHER RAIO X DO ICP",
        priority: "P1" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ ICP-01 — Responder: Por que seu cliente precisa do seu produto?",
          "⏳ ICP-02 — Responder: O que muda na prática depois que ele utiliza seu produto?",
          "⏳ ICP-03 — Responder: Quando o problema acontece, o que seu cliente faz, pensa ou fala?",
          "Confirmar respostas e transcrições.",
          "Executar motor de Raio X do ICP.",
          "Gerar perfil comportamental.",
          "Identificar dor visível e oculta.",
          "Extrair pensamentos e falas.",
          "Organizar fragmentos da rotina.",
          "Gerar hooks e headlines.",
          "Gerar cenas para criativos.",
          "Revisar hipóteses não confirmadas.",
          "Aprovar análise.",
          "Salvar versão.",
        ],
      },
      {
        code: "IM-04",
        title: "TAREFA IM-04 — GERAR DEZ VARIANTES DE COPY ADS",
        priority: "P1" as const,
        complexity: "high" as const,
        financialImpact: true,
        durationMinutes: 180,
        subtasks: [
          "Verificar dados disponíveis nos três módulos.",
          "Verificar promessa, mecanismo e evidências.",
          "Confirmar o CTA da campanha.",
          "Gerar Copy ADS 01 — Rotina do ICP.",
          "Gerar Copy ADS 02 — Dor concreta.",
          "Gerar Copy ADS 03 — Pensamento oculto.",
          "Gerar Copy ADS 04 — Desejo e transformação.",
          "Gerar Copy ADS 05 — Contraste antes/depois.",
          "Gerar Copy ADS 06 — Erro ou crença antiga.",
          "Gerar Copy ADS 07 — Mecanismo da solução.",
          "Gerar Copy ADS 08 — Prova e autoridade.",
          "Gerar Copy ADS 09 — Objeção principal.",
          "Gerar Copy ADS 10 — Convite e oportunidade.",
          "Revisar as dez headlines.",
          "Revisar as dez subheadlines.",
          "Corrigir repetições e afirmações sem comprovação.",
          "⏳ Obter aprovação das variantes selecionadas.",
          "Registrar versões aprovadas.",
          "Vincular à produção de criativos.",
        ],
      },
      {
        code: "IM-05",
        title: "TAREFA IM-05 — CONSOLIDAR MASTER PROMPT",
        priority: "P1" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 90,
        subtasks: [
          "Recuperar Posicionamento.",
          "Recuperar Alma da Copy.",
          "Recuperar Raio X do ICP.",
          "Recuperar Copy ADS.",
          "Verificar versões aprovadas.",
          "Separar fatos de hipóteses.",
          "Consolidar identidade do Expert.",
          "Consolidar narrativa.",
          "Consolidar mecanismo.",
          "Consolidar persona.",
          "Consolidar tom de voz.",
          "Consolidar regras de copy.",
          "Gerar arquivo Markdown.",
          "⏳ Revisar e aprovar.",
          "Salvar e vincular ao Backup Master.",
        ],
      },
    ];

    intelTasks.forEach((it, taskIdx) => {
      const task = makeTask(ctx, intelStageId, it.title, taskIdx, {
        priority: it.priority,
        complexity: it.complexity,
        financialImpact: it.financialImpact,
        durationMinutes: it.durationMinutes,
        durationSource: "fixed",
        status: "pending",
      });
      ws.tasks[task.id] = task;

      it.subtasks.forEach((stTitle, stIdx) => {
        const sub = makeSubtask(ctx, task.id, stTitle, stIdx);
        ws.subtasks[sub.id] = sub;
      });
    });

    log(ws, ctx, "reconcile", "stage", intelStageId, "Etapa 01 — Inteligência do Expert reconciliada");
    changed = true;
  }

  // 2. Inserir entregáveis do Grupo de Captação e fluxos de Automação (GRP-01 a GRP-04, AUTO-01 a AUTO-06, TEST-01)
  if (!hasGRP01) {
    let autoStage = Object.values(ws.stages).find(
      (s) =>
        !s.archivedAt &&
        s.sprintId === sprintId &&
        (s.title.toUpperCase().includes("AUTOMAÇÕES") ||
          s.title.toUpperCase().includes("CAPTAÇÃO"))
    );

    if (!autoStage) {
      const autoStageId = newId();
      const maxPos = Math.max(
        0,
        ...Object.values(ws.stages)
          .filter((s) => !s.archivedAt && s.sprintId === sprintId)
          .map((s) => s.position)
      );
      autoStage = {
        ...base(ctx),
        id: autoStageId,
        sprintId,
        title: "ETAPA 04 — GRUPO DE CAPTAÇÃO & AUTOMAÇÕES",
        position: maxPos + 1,
      };
      ws.stages[autoStageId] = autoStage;
    } else {
      if (!autoStage.title.includes("GRUPO DE CAPTAÇÃO")) {
        autoStage.title = autoStage.title.replace(
          "AUTOMAÇÕES",
          "GRUPO DE CAPTAÇÃO & AUTOMAÇÕES"
        );
      }
    }

    const startTaskPos = Object.values(ws.tasks).filter(
      (t) => !t.archivedAt && t.stageId === autoStage.id
    ).length;

    const groupAndAutoTasks = [
      {
        title: "GRP-01 — CAPA DO GRUPO",
        priority: "P1" as const,
        complexity: "low" as const,
        financialImpact: false,
        durationMinutes: 90,
        subtasks: [
          "Definir briefing da capa.",
          "⏳ Atribuir produção.",
          "⏳ Receber arte.",
          "Conferir legibilidade.",
          "Revisar identidade.",
          "⏳ Aprovar capa.",
          "Aplicar imagem no grupo.",
        ],
      },
      {
        title: "GRP-02 — DESCRIÇÃO DO GRUPO",
        priority: "P1" as const,
        complexity: "low" as const,
        financialImpact: false,
        durationMinutes: 60,
        subtasks: [
          "Definir objetivo do grupo.",
          "Criar descrição.",
          "Criar orientação inicial.",
          "Revisar CTA.",
          "⏳ Aprovar descrição.",
          "Inserir descrição.",
          "Conferir exibição.",
        ],
      },
      {
        title: "GRP-03 — SEQUÊNCIA DE COPIES",
        priority: "P0" as const,
        complexity: "high" as const,
        financialImpact: true,
        durationMinutes: 240,
        subtasks: [
          "Criar copy de boas-vindas.",
          "Criar copy de contextualização.",
          "Criar copy da manhã — 08h00.",
          "Criar levantada de mão da manhã.",
          "Criar copy de prova do meio do dia.",
          "Criar levantada de mão do meio do dia.",
          "Criar copy do final do dia.",
          "Criar levantada de mão do final do dia.",
          "Revisar sequência.",
          "⏳ Aprovar copies.",
          "Salvar textos.",
        ],
      },
      {
        title: "GRP-04 — SEQUÊNCIA DE VÍDEOS",
        priority: "P0" as const,
        complexity: "high" as const,
        financialImpact: true,
        durationMinutes: 300,
        subtasks: [
          "Criar script GRP-VID-01 — destaque da manhã.",
          "Criar script GRP-VID-02 — prova/conteúdo do meio do dia.",
          "Criar script GRP-VID-03 — conteúdo do final do dia.",
          "Criar hook, corpo e CTA de cada vídeo.",
          "⏳ Aprovar os três scripts.",
          "⏳ Gravar vídeo 01.",
          "⏳ Gravar vídeo 02.",
          "⏳ Gravar vídeo 03.",
          "⏳ Providenciar edição.",
          "Conferir materiais.",
          "⏳ Aprovar os arquivos.",
          "Salvar links.",
        ],
      },
      {
        title: "AUTO-01 — ENTRADA NO GRUPO",
        priority: "P0" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "Selecionar grupo.",
          "Vincular copy de boas-vindas.",
          "Configurar gatilho de entrada, quando suportado.",
          "Vincular mensagem inicial.",
          "Testar entrada.",
          "Verificar recebimento.",
          "Registrar resultado.",
        ],
      },
      {
        title: "AUTO-02 — MANHÃ: 08h00",
        priority: "P0" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 150,
        subtasks: [
          "Vincular copy da manhã.",
          "Vincular vídeo de destaque GRP-VID-01.",
          "Vincular CTA de interação.",
          "Programar início para 08h00.",
          "Configurar ordem dos três materiais conforme sequência aprovada.",
          "Confirmar intervalos entre mensagens.",
          "Testar recebimento da copy.",
          "Testar recebimento do vídeo.",
          "Testar reprodução.",
          "Testar CTA.",
          "Registrar aprovação do fluxo.",
        ],
      },
      {
        title: "AUTO-03 — MEIO DO DIA",
        priority: "P1" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ Confirmar horário.",
          "Registrar horário na tarefa.",
          "Vincular copy de prova.",
          "Vincular GRP-VID-02.",
          "Vincular levantada de mão.",
          "Configurar sequência aprovada.",
          "Confirmar intervalos.",
          "Programar envio.",
          "Testar mensagem.",
          "Testar vídeo.",
          "Testar CTA.",
          "Aprovar fluxo.",
        ],
      },
      {
        title: "AUTO-04 — FINAL DO DIA",
        priority: "P1" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ Confirmar horário.",
          "Registrar horário na tarefa.",
          "Vincular copy final.",
          "Vincular GRP-VID-03.",
          "Vincular levantada de mão.",
          "Configurar sequência aprovada.",
          "Confirmar intervalos.",
          "Programar envio.",
          "Testar mensagem.",
          "Testar vídeo.",
          "Testar CTA.",
          "Aprovar fluxo.",
        ],
      },
      {
        title: "AUTO-05 — PALAVRAS-CHAVE E INTERAÇÕES",
        priority: "P1" as const,
        complexity: "medium" as const,
        financialImpact: true,
        durationMinutes: 150,
        subtasks: [
          "Cadastrar palavra-chave.",
          "Vincular resposta correspondente.",
          "Definir condição de acionamento.",
          "Configurar próximo passo comercial.",
          "Configurar destino.",
          "Testar gatilho.",
          "Testar resposta.",
          "Testar encaminhamento.",
          "Aprovar fluxo.",
        ],
      },
      {
        title: "AUTO-06 — SAÍDA DO GRUPO",
        priority: "P2" as const,
        complexity: "low" as const,
        financialImpact: false,
        durationMinutes: 60,
        subtasks: [
          "Verificar suporte ao evento.",
          "Configurar atualização de estado.",
          "Vincular tratamento correspondente.",
          "Evitar disparos indevidos.",
          "Testar saída.",
          "Validar estado final.",
        ],
      },
      {
        title: "TEST-01 — VALIDAR A OPERAÇÃO DO GRUPO",
        priority: "P0" as const,
        complexity: "high" as const,
        financialImpact: true,
        durationMinutes: 240,
        subtasks: [
          "Testar entrada.",
          "Testar capa e descrição.",
          "Testar copy de boas-vindas.",
          "Testar fluxo 08h00.",
          "Testar fluxo do meio do dia.",
          "Testar fluxo do final do dia.",
          "Testar os três vídeos.",
          "Testar os três levantamentos de mão.",
          "Testar palavras-chave.",
          "Testar saída, quando suportada.",
          "Registrar falhas.",
          "Corrigir falhas.",
          "Reexecutar testes afetados.",
          "⏳ Obter aprovação final.",
          "Liberar operação.",
        ],
      },
    ];

    groupAndAutoTasks.forEach((gt, idx) => {
      const task = makeTask(ctx, autoStage!.id, gt.title, startTaskPos + idx, {
        priority: gt.priority,
        complexity: gt.complexity,
        financialImpact: gt.financialImpact,
        durationMinutes: gt.durationMinutes,
        durationSource: "fixed",
        status: "pending",
      });
      ws.tasks[task.id] = task;

      gt.subtasks.forEach((stTitle, stIdx) => {
        const sub = makeSubtask(ctx, task.id, stTitle, stIdx);
        ws.subtasks[sub.id] = sub;
      });
    });

    log(
      ws,
      ctx,
      "reconcile",
      "stage",
      autoStage.id,
      "Entregáveis GRP-01..04 e fluxos AUTO-01..06 reconciliados"
    );
    changed = true;
  }

  // 3. Sincronizar status de preenchimento das subtarefas do Manual de Marca
  if (ws.brandManual && ws.brandManual.fields) {
    const fields = ws.brandManual.fields;
    const subtasks = Object.values(ws.subtasks).filter((s) => !s.archivedAt);

    subtasks.forEach((st) => {
      const match = st.title.match(/(POS|ALM|ICP)-0(\d)/i);
      if (match) {
        const prefix = match[1].toLowerCase();
        const num = match[2];
        const fieldId = `${prefix}_0${num}`;
        const field = fields.find((f) => f.id === fieldId);
        if (field && (field.response || "").trim().length > 0) {
          if (!st.done) {
            st.done = true;
            st.doneAt = ctx.nowIso;
            changed = true;
          }
        }
      }
    });
  }

  // 4. Inicializar solicitações de áudio se não existirem
  const audioChanged = reconcileAudioRequests(ws, ctx);
  if (audioChanged) {
    changed = true;
  }

  // 5. Inicializar etiquetas compartilhadas do projeto se não existirem (AJ-022)
  const labelsChanged = reconcileWorkspaceLabels(ws, ctx);
  if (labelsChanged) {
    changed = true;
  }

  // 6. Inicializar dados do Webinário se não existirem (AJ-023)
  const webinarChanged = reconcileWebinarData(ws, ctx);
  if (webinarChanged) {
    changed = true;
  }

  if (changed) {
    touch(ws.project, ctx);
  }

  return changed;
}

// ==========================================
// OPERAÇÕES DE SCRIPTS E ÁUDIOS (AJ-021)
// ==========================================

export function getAudioRequests(ws: Workspace): AudioRequest[] {
  if (!ws.audioRequests) {
    ws.audioRequests = {};
  }
  return Object.values(ws.audioRequests)
    .filter((r) => !r.archivedAt && !r.archived)
    .sort((a, b) => a.order - b.order);
}

export function createAudioRequest(
  ws: Workspace,
  ctx: Ctx,
  data: Partial<AudioRequest>
): AudioRequest {
  if (!ws.audioRequests) ws.audioRequests = {};
  const id = newId();
  const existingCount = Object.keys(ws.audioRequests).length;
  const code = data.code || `AUD-${String(existingCount + 1).padStart(3, "0")}`;

  const req: AudioRequest = {
    ...base(ctx),
    id,
    projectId: ws.project.id,
    code,
    title: data.title || "Nova Solicitação de Áudio",
    category: data.category || "geral",
    objective: data.objective || "",
    context: data.context || "",
    script: data.script || "",
    preset: data.preset || "",
    assigneeId: data.assigneeId || null,
    assigneeName: data.assigneeName || "",
    status: data.status || "pending",
    deadline: data.deadline || null,
    taskId: data.taskId || null,
    creativeId: data.creativeId || null,
    brandManualFieldId: data.brandManualFieldId || null,
    recordings: data.recordings || [],
    order: data.order ?? existingCount,
  };

  ws.audioRequests[id] = req;
  touch(ws.project, ctx);
  log(ws, ctx, "create", "AudioRequest", id, `Solicitação de áudio criada: ${req.code} — ${req.title}`);
  return req;
}

export function updateAudioRequest(
  ws: Workspace,
  ctx: Ctx,
  requestId: string,
  patch: Partial<AudioRequest>
): void {
  if (!ws.audioRequests || !ws.audioRequests[requestId]) return;
  const req = ws.audioRequests[requestId];
  Object.assign(req, patch);
  touch(req, ctx);
  touch(ws.project, ctx);
  log(ws, ctx, "update", "AudioRequest", requestId, `Solicitação de áudio atualizada: ${req.code}`);
}

export function deleteAudioRequest(
  ws: Workspace,
  ctx: Ctx,
  requestId: string
): void {
  if (!ws.audioRequests || !ws.audioRequests[requestId]) return;
  const req = ws.audioRequests[requestId];
  req.archivedAt = ctx.nowIso;
  req.archived = true;
  touch(ws.project, ctx);
  log(ws, ctx, "delete", "AudioRequest", requestId, `Solicitação de áudio arquivada: ${req.code}`);
}

export function duplicateAudioRequest(
  ws: Workspace,
  ctx: Ctx,
  requestId: string
): AudioRequest {
  if (!ws.audioRequests || !ws.audioRequests[requestId]) throw new Error("Solicitação não encontrada");
  const orig = ws.audioRequests[requestId];
  return createAudioRequest(ws, ctx, {
    ...orig,
    id: undefined,
    code: `${orig.code}-COPIA`,
    title: `${orig.title} (Cópia)`,
    recordings: [],
    status: "pending",
  });
}

export function addAudioRecording(
  ws: Workspace,
  ctx: Ctx,
  requestId: string,
  recordingData: Omit<AudioRecording, "id" | "createdAt" | "updatedAt">
): AudioRecording {
  if (!ws.audioRequests || !ws.audioRequests[requestId]) throw new Error("Solicitação não encontrada");
  const req = ws.audioRequests[requestId];
  const recId = newId();
  const recording: AudioRecording = {
    ...recordingData,
    id: recId,
    createdAt: ctx.nowIso,
    updatedAt: ctx.nowIso,
  };

  req.recordings = [...(req.recordings || []), recording];
  if (req.status === "pending") {
    req.status = "recorded";
  }
  touch(req, ctx);
  touch(ws.project, ctx);
  log(ws, ctx, "create", "AudioRecording", recId, `Gravação adicionada à solicitação ${req.code}`);
  return recording;
}

export function deleteAudioRecording(
  ws: Workspace,
  ctx: Ctx,
  requestId: string,
  recordingId: string
): void {
  if (!ws.audioRequests || !ws.audioRequests[requestId]) return;
  const req = ws.audioRequests[requestId];
  req.recordings = (req.recordings || []).filter((r) => r.id !== recordingId);
  if (req.recordings.length === 0 && req.status === "recorded") {
    req.status = "pending";
  }
  touch(req, ctx);
  touch(ws.project, ctx);
  log(ws, ctx, "delete", "AudioRecording", recordingId, `Gravação removida da solicitação ${req.code}`);
}

export function setPrimaryAudioRecording(
  ws: Workspace,
  ctx: Ctx,
  requestId: string,
  recordingId: string
): void {
  if (!ws.audioRequests || !ws.audioRequests[requestId]) return;
  const req = ws.audioRequests[requestId];
  req.recordings = (req.recordings || []).map((r) => ({
    ...r,
    isPrimary: r.id === recordingId,
  }));
  touch(req, ctx);
  touch(ws.project, ctx);
}

export function updateAudioRecordingTranscription(
  ws: Workspace,
  ctx: Ctx,
  requestId: string,
  recordingId: string,
  text: string,
  status: AudioRecordingTranscription["status"] = "completed"
): void {
  if (!ws.audioRequests || !ws.audioRequests[requestId]) return;
  const req = ws.audioRequests[requestId];
  req.recordings = (req.recordings || []).map((r) => {
    if (r.id === recordingId) {
      return {
        ...r,
        updatedAt: ctx.nowIso,
        transcription: {
          text,
          status,
          completedAt: ctx.nowIso,
        },
      };
    }
    return r;
  });
  touch(req, ctx);
  touch(ws.project, ctx);
}

export function reconcileAudioRequests(ws: Workspace, ctx: Ctx): boolean {
  if (!ws) return false;
  if (!ws.audioRequests) ws.audioRequests = {};

  const currentCount = Object.keys(ws.audioRequests).length;
  if (currentCount > 0) return false;

  DEFAULT_AUDIO_REQUESTS.forEach((def, idx) => {
    const id = newId();
    ws.audioRequests![id] = {
      ...base(ctx),
      id,
      projectId: ws.project.id,
      ...def,
      order: idx,
    };
  });

  touch(ws.project, ctx);
  log(ws, ctx, "reconcile", "AudioRequest", null, "Solicitações padrão de áudio PVD inicializadas");
  return true;
}

// ==========================================
// SESSOES REAIS DE TRABALHO & CRONÔMETRO (AJ-022)
// ==========================================

export function startTaskSession(
  ws: Workspace,
  ctx: Ctx,
  taskId: ID,
  userId?: ID | null,
  userName?: string
): WorkSession {
  const task = get(ws.tasks, taskId, "Tarefa");
  if (!task.workSessions) task.workSessions = [];

  // Proteção contra concorrência e cliques múltiplos: se já houver sessão ativa, retoma ela
  const existingActive = task.workSessions.find((s) => s.status === "active");
  if (existingActive) {
    if (task.status === "pending") task.status = "doing";
    task.isPaused = false;
    touch(task, ctx);
    return existingActive;
  }

  // Se tarefa estiver em Pendente, move automaticamente para Fazendo
  if (task.status === "pending") {
    task.status = "doing";
    task.actualStart ??= ctx.nowIso;
  }
  task.isPaused = false;

  const session: WorkSession = {
    id: newId(),
    taskId,
    userId: userId ?? null,
    userName: userName ?? "Operador",
    startedAt: ctx.nowIso,
    endedAt: null,
    durationSeconds: 0,
    status: "active",
    origin: "kanban",
  };

  task.workSessions.push(session);
  touch(task, ctx);
  touch(ws.project, ctx);
  log(ws, ctx, "status", "task", taskId, `Sessão iniciada na tarefa "${task.title}"`);
  return session;
}

export function pauseTaskSession(ws: Workspace, ctx: Ctx, taskId: ID) {
  const task = get(ws.tasks, taskId, "Tarefa");
  if (!task.workSessions) task.workSessions = [];

  const active = task.workSessions.find((s) => s.status === "active");
  if (active) {
    active.endedAt = ctx.nowIso;
    const diffSec = Math.max(
      1,
      Math.round((new Date(active.endedAt).getTime() - new Date(active.startedAt).getTime()) / 1000)
    );
    active.durationSeconds = diffSec;
    active.status = "completed";
  }

  task.isPaused = true;
  // Mantém a tarefa em "Fazendo", com estado secundário Pausada
  if (task.status !== "doing") {
    task.status = "doing";
  }

  task.totalTimeSeconds = task.workSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.durationSeconds, 0);

  touch(task, ctx);
  touch(ws.project, ctx);
  log(ws, ctx, "status", "task", taskId, `Tarefa pausada (${fmtStopwatch(task.totalTimeSeconds || 0)} acumulados): "${task.title}"`);
}

export function concludeTaskWithSession(ws: Workspace, ctx: Ctx, taskId: ID) {
  const task = get(ws.tasks, taskId, "Tarefa");
  if (!task.workSessions) task.workSessions = [];

  // Se houver sessão ativa, encerra
  const active = task.workSessions.find((s) => s.status === "active");
  if (active) {
    active.endedAt = ctx.nowIso;
    const diffSec = Math.max(
      1,
      Math.round((new Date(active.endedAt).getTime() - new Date(active.startedAt).getTime()) / 1000)
    );
    active.durationSeconds = diffSec;
    active.status = "completed";
  }

  task.isPaused = false;
  task.totalTimeSeconds = task.workSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.durationSeconds, 0);

  // Validação e transição de status usando a regra de domínio
  setTaskStatus(ws, ctx, taskId, "done");
  task.actualEnd = ctx.nowIso;

  touch(task, ctx);
  touch(ws.project, ctx);
  log(ws, ctx, "status", "task", taskId, `Tarefa concluída com ${fmtStopwatch(task.totalTimeSeconds || 0)}: "${task.title}"`);
}

export function getTaskActiveSession(task: Task): WorkSession | undefined {
  return (task.workSessions || []).find((s) => s.status === "active");
}

export function getTaskAccumulatedSeconds(task: Task, nowMs: number = Date.now()): number {
  const sessions = task.workSessions || [];
  let total = 0;
  for (const s of sessions) {
    if (s.status === "completed") {
      total += s.durationSeconds;
    } else if (s.status === "active") {
      const elapsed = Math.max(0, Math.floor((nowMs - new Date(s.startedAt).getTime()) / 1000));
      total += elapsed;
    }
  }
  return total;
}

export function fmtStopwatch(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `00:${pad(mins)}:${pad(secs)}`;
}

export function fmtDurationSummary(totalSeconds: number, sessionCount: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const sessText = sessionCount === 1 ? "1 sessão" : `${sessionCount} sessões`;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}min ${secs.toString().padStart(2, "0")}s · ${sessText}`;
  }
  if (mins > 0) {
    return `${mins}min${secs.toString().padStart(2, "0")}s · ${sessText}`;
  }
  return `${secs}s · ${sessText}`;
}

// ==========================================
// GERENCIAMENTO DE ETIQUETAS DO PROJETO (AJ-022)
// ==========================================

export function createWorkspaceLabel(
  ws: Workspace,
  ctx: Ctx,
  name: string,
  color: string
): WorkspaceLabel {
  if (!ws.labels) ws.labels = {};
  const id = `lbl_${newId()}`;
  const label: WorkspaceLabel = {
    id,
    name: name.trim() || "Nova Etiqueta",
    color: color || "#6366f1",
    createdAt: ctx.nowIso,
  };
  ws.labels[id] = label;
  touch(ws.project, ctx);
  log(ws, ctx, "create", "label", id, `Etiqueta criada: ${label.name}`);
  return label;
}

export function updateWorkspaceLabel(
  ws: Workspace,
  ctx: Ctx,
  id: string,
  patch: Partial<Pick<WorkspaceLabel, "name" | "color" | "archived">>
) {
  if (!ws.labels || !ws.labels[id]) return;
  const lbl = ws.labels[id];
  Object.assign(lbl, patch);
  touch(ws.project, ctx);
  log(ws, ctx, "update", "label", id, `Etiqueta atualizada: ${lbl.name}`);
}

export function archiveWorkspaceLabel(
  ws: Workspace,
  ctx: Ctx,
  id: string,
  archived: boolean = true
) {
  if (!ws.labels || !ws.labels[id]) return;
  ws.labels[id].archived = archived;
  touch(ws.project, ctx);
  log(ws, ctx, "archive", "label", id, `Etiqueta ${archived ? "arquivada" : "restaurada"}: ${ws.labels[id].name}`);
}

export function toggleTaskLabel(
  ws: Workspace,
  ctx: Ctx,
  taskId: ID,
  labelId: string
) {
  const task = get(ws.tasks, taskId, "Tarefa");
  if (!task.labelIds) task.labelIds = [];
  const exists = task.labelIds.includes(labelId);
  if (exists) {
    task.labelIds = task.labelIds.filter((id) => id !== labelId);
  } else {
    task.labelIds.push(labelId);
  }
  touch(task, ctx);
  touch(ws.project, ctx);
  log(ws, ctx, exists ? "remove_tag" : "add_tag", "task", taskId, `Etiqueta alterada na tarefa "${task.title}"`);
}

export function reconcileWorkspaceLabels(ws: Workspace, ctx: Ctx): boolean {
  if (!ws.labels) ws.labels = {};
  let changed = false;
  const existingNames = new Set(Object.values(ws.labels).map((l) => l.name.toLowerCase()));

  for (const def of DEFAULT_WORKSPACE_LABELS) {
    if (!existingNames.has(def.name.toLowerCase())) {
      const id = `lbl_${newId()}`;
      ws.labels[id] = {
        id,
        name: def.name,
        color: def.color,
        createdAt: ctx.nowIso,
      };
      changed = true;
    }
  }
  return changed;
}

// ==========================================
// BLOCO 02 — WEBINÁRIO (AJ-023)
// ==========================================

export function getWebinarData(ws: Workspace): WebinarData {
  if (!ws.webinarData || !ws.webinarData.editions || Object.keys(ws.webinarData.editions).length === 0) {
    ws.webinarData = JSON.parse(JSON.stringify(DEFAULT_WEBINAR_DATA));
  }
  return ws.webinarData;
}

export function updateWebinarMetric(
  ws: Workspace,
  ctx: Ctx,
  editionId: string,
  metricKey: keyof WebinarEdition["metrics"],
  value: number,
  source: WebinarMetric["source"] = "manual"
) {
  const data = getWebinarData(ws);
  if (!data.editions[editionId]) {
    data.editions[editionId] = {
      id: editionId,
      projectId: ws.project.id,
      title: "Webinário PVD #1 — Ao Vivo",
      eventDate: new Date().toISOString().slice(0, 10),
      period: "all",
      metrics: {
        invites: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
        confirmed: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
        liveAttendance: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
        retention: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
        buyers: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
      },
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
    };
  }
  const edition = data.editions[editionId];
  const safeVal = Math.max(0, Math.round(Number(value) || 0));
  edition.metrics[metricKey] = {
    value: safeVal,
    source,
    updatedAt: ctx.nowIso,
    updatedBy: ctx.actorName,
  };
  edition.updatedAt = ctx.nowIso;
  touch(ws.project, ctx);
  log(ws, ctx, "update", "webinar_metric", editionId, `Métrica de webinário (${metricKey}) atualizada para ${safeVal}`);
}

export function selectWebinarEdition(ws: Workspace, ctx: Ctx, editionId: string) {
  const data = getWebinarData(ws);
  data.selectedEditionId = editionId;
  touch(ws.project, ctx);
  log(ws, ctx, "select", "webinar_edition", editionId, `Edição de webinário selecionada: ${editionId}`);
}

export function createWebinarEdition(
  ws: Workspace,
  ctx: Ctx,
  title: string,
  eventDate: string
): WebinarEdition {
  const data = getWebinarData(ws);
  const id = `webinar_${newId().slice(0, 8)}`;
  const edition: WebinarEdition = {
    id,
    projectId: ws.project.id,
    title: title.trim() || `Webinário PVD #${Object.keys(data.editions).length + 1}`,
    eventDate: eventDate || new Date().toISOString().slice(0, 10),
    period: "all",
    metrics: {
      invites: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
      confirmed: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
      liveAttendance: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
      retention: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
      buyers: { value: 0, source: "manual", updatedAt: ctx.nowIso, updatedBy: ctx.actorName },
    },
    createdAt: ctx.nowIso,
    updatedAt: ctx.nowIso,
  };
  data.editions[id] = edition;
  data.selectedEditionId = id;
  touch(ws.project, ctx);
  log(ws, ctx, "create", "webinar_edition", id, `Nova edição de webinário criada: ${edition.title}`);
  return edition;
}

export function reconcileWebinarData(ws: Workspace, ctx: Ctx): boolean {
  if (!ws.webinarData || !ws.webinarData.editions || Object.keys(ws.webinarData.editions).length === 0) {
    ws.webinarData = JSON.parse(JSON.stringify(DEFAULT_WEBINAR_DATA));
    return true;
  }
  return false;
}

export type { ScheduleRevision };
