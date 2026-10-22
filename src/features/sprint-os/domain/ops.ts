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
} from "./types";
import { emptyLearnings } from "./types";
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
  const v = rec[id];
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
  get(ws.tasks, taskId, "Tarefa");
  const s = makeSubtask(ctx, taskId, title, subtasksOf(ws, taskId).length, { target });
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
  log(ws, ctx, "archive", "subtask", id, `Subtarefa removida: ${s.title}`);
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

export type { ScheduleRevision };
