/**
 * Planejamento de sprint: ativação (linha de base), "Atualizar Prazos" (prévia → confirmação → revisão),
 * desfazer revisão e reagendamento manual. Camada D + registro em histórico.
 */
import type { ID, LocalDateTime, Sprint, Task, WorkCalendar, Workspace } from "../domain/types";
import { DomainError, log, newId, sprintTasks, stagesOf, tasksOf, makeCalendar, type Ctx } from "../domain/ops";
import { scheduleTasks, type ScheduleResult } from "./engine";
import { addWorkMinutes, businessDayDelta, endOfWorkDay, fromMs, nextWorkInstant, nthBusinessDay, toMs, workMinutesBetween } from "./time";

export function sprintCalendar(ws: Workspace, sprint: Sprint): WorkCalendar {
  return (sprint.calendarId && ws.calendars[sprint.calendarId]) || Object.values(ws.calendars)[0] ||
    makeCalendar({ actorName: "system", nowIso: new Date(0).toISOString() });
}

export function calendarResolver(ws: Workspace, sprint: Sprint) {
  const def = sprintCalendar(ws, sprint);
  return (memberId: ID | null) => {
    const m = memberId ? ws.members[memberId] : null;
    return (m?.calendarId && ws.calendars[m.calendarId]) || def;
  };
}

/** Término contratual: fim do expediente do N-ésimo dia útil a partir da data inicial. */
export function contractEnd(ws: Workspace, sprint: Sprint): LocalDateTime | null {
  if (!sprint.startDate || !sprint.businessDays) return null;
  const cal = sprintCalendar(ws, sprint);
  return endOfWorkDay(cal, nthBusinessDay(cal, sprint.startDate, sprint.businessDays));
}

export function runSchedule(ws: Workspace, sprintId: ID, now: LocalDateTime): ScheduleResult {
  const sprint = ws.sprints[sprintId];
  const stages = stagesOf(ws, sprintId);
  const order = new Map<ID, number>();
  stages.forEach((s, si) => tasksOf(ws, s.id).forEach((t, ti) => order.set(t.id, si * 10_000 + ti)));
  const tasks = sprintTasks(ws, sprintId);
  const ids = new Set(tasks.map((t) => t.id));
  // início não pode anteceder o início da sprint
  const sprintStart = sprint.startDate ? `${sprint.startDate}T${sprint.startTime ?? sprintCalendar(ws, sprint).workStart}` : now;
  const effectiveNow = toMs(sprintStart) > toMs(now) ? sprintStart : now;
  return scheduleTasks({
    tasks,
    dependencies: Object.values(ws.dependencies).filter((d) => ids.has(d.predecessorId) && ids.has(d.successorId)),
    milestones: Object.values(ws.milestones).filter((m) => m.sprintId === sprintId),
    calendarFor: calendarResolver(ws, sprint),
    now: effectiveNow,
    orderKey: (t) => order.get(t.id) ?? 0,
  });
}

export function currentForecast(tasks: Task[]): LocalDateTime | null {
  const ends = tasks.filter((t) => !t.archivedAt).map((t) => (t.status === "done" ? t.actualEnd?.slice(0, 16) ?? t.plannedEnd : t.plannedEnd)).filter(Boolean) as string[];
  return ends.length ? ends.sort().at(-1)! : null;
}

export interface ActivationInput {
  name: string; startDate: string; startTime: string; businessDays: number; contractValue: number | null; managerId: ID | null;
}

export function activateSprint(ws: Workspace, ctx: Ctx, sprintId: ID, input: ActivationInput, now: LocalDateTime) {
  const s = ws.sprints[sprintId];
  if (!s) throw new DomainError("Sprint não encontrada");
  if (s.activatedAt) throw new DomainError("Sprint já ativada — a linha de base é imutável");
  if (!input.startDate || !input.startTime || !(input.businessDays > 0)) throw new DomainError("Data, hora e dias úteis são obrigatórios");
  Object.assign(s, { name: input.name, startDate: input.startDate, startTime: input.startTime, businessDays: input.businessDays,
    contractValue: input.contractValue, managerId: input.managerId });
  const result = runSchedule(ws, sprintId, now);
  const tasks = sprintTasks(ws, sprintId);
  // agenda inicial proposta apenas para tarefas sem horário (modo automático/híbrido); manual preserva tudo
  if (s.schedulingMode !== "manual") {
    for (const t of tasks) {
      const slot = result.slots[t.id];
      if (slot && !t.plannedStart && !t.pinned) { t.plannedStart = slot.plannedStart; t.plannedEnd = slot.plannedEnd; }
    }
  }
  const end = contractEnd(ws, s)!;
  s.activatedAt = ctx.nowIso;
  s.baseline = {
    capturedAt: ctx.nowIso, startAt: `${input.startDate}T${input.startTime}`, contractEnd: end, businessDays: input.businessDays,
    contractValue: input.contractValue,
    tasks: Object.fromEntries(tasks.map((t) => [t.id, { title: t.title, plannedStart: t.plannedStart, plannedEnd: t.plannedEnd, durationMinutes: t.durationMinutes }])),
  };
  s.updatedAt = ctx.nowIso; s.rev += 1;
  log(ws, ctx, "activate", "sprint", sprintId, `🚀 Sprint ativada: ${s.name} · ${input.businessDays} dias úteis · prazo contratual ${end}`);
}

export interface DeadlineChange { taskId: ID; before: { plannedStart: string | null; plannedEnd: string | null }; after: { plannedStart: string; plannedEnd: string } }

export interface DeadlineProposal {
  sprintId: ID;
  now: LocalDateTime;
  changes: DeadlineChange[];
  forecastBefore: LocalDateTime | null;
  forecastAfter: LocalDateTime | null;
  deltaWorkMinutes: number | null;
  deltaBusinessDays: number | null;
  contractEnd: LocalDateTime | null;
  lateRisk: boolean;
  affectedMemberIds: ID[];
  result: ScheduleResult;
}

export function proposeDeadlineUpdate(ws: Workspace, sprintId: ID, now: LocalDateTime): DeadlineProposal {
  const sprint = ws.sprints[sprintId];
  const tasks = sprintTasks(ws, sprintId);
  const result = runSchedule(ws, sprintId, now);
  const changes: DeadlineChange[] = [];
  for (const t of tasks) {
    const slot = result.slots[t.id];
    if (!slot || t.status === "done" || t.pinned) continue;
    if (slot.plannedStart !== t.plannedStart || slot.plannedEnd !== t.plannedEnd) {
      changes.push({ taskId: t.id, before: { plannedStart: t.plannedStart, plannedEnd: t.plannedEnd }, after: slot });
    }
  }
  const forecastBefore = currentForecast(tasks);
  const doneEnds = tasks.filter((t) => t.status === "done").map((t) => t.actualEnd?.slice(0, 16) ?? t.plannedEnd).filter(Boolean) as string[];
  const allEnds = [...doneEnds, ...Object.values(result.slots).map((s) => s.plannedEnd)].sort();
  const forecastAfter = allEnds.length ? allEnds[allEnds.length - 1] : null;
  const cal = sprintCalendar(ws, sprint);
  let deltaWorkMinutes: number | null = null, deltaBusinessDays: number | null = null;
  if (forecastBefore && forecastAfter) {
    const a = toMs(forecastBefore), b = toMs(forecastAfter);
    deltaWorkMinutes = b >= a ? workMinutesBetween(cal, a, b) : -workMinutesBetween(cal, b, a);
    deltaBusinessDays = businessDayDelta(cal, forecastBefore, forecastAfter);
  }
  const end = sprint.baseline?.contractEnd ?? contractEnd(ws, sprint);
  return {
    sprintId, now, changes, forecastBefore, forecastAfter, deltaWorkMinutes, deltaBusinessDays, contractEnd: end,
    lateRisk: !!(end && forecastAfter && forecastAfter > end) || result.unschedulable.length > 0,
    affectedMemberIds: [...new Set(changes.map((c) => ws.tasks[c.taskId].assigneeId).filter(Boolean) as ID[])],
    result,
  };
}

/** Aplica SOMENTE plannedStart/plannedEnd. Nunca altera título, subtarefas, prioridade, responsável, status ou prazo contratual. */
export function applyDeadlineProposal(ws: Workspace, ctx: Ctx, p: DeadlineProposal): ID {
  const rev = {
    id: newId(), sprintId: p.sprintId, at: ctx.nowIso, actorName: ctx.actorName, reason: `Atualizar Prazos (${p.now} SP)`,
    before: {} as Record<ID, { plannedStart: string | null; plannedEnd: string | null }>,
    after: {} as Record<ID, { plannedStart: string | null; plannedEnd: string | null }>,
    forecastBefore: p.forecastBefore, forecastAfter: p.forecastAfter, undoneAt: null,
  };
  for (const c of p.changes) {
    const t = ws.tasks[c.taskId];
    if (!t || t.status === "done") continue;
    if (t.plannedStart !== c.before.plannedStart || t.plannedEnd !== c.before.plannedEnd) {
      throw new DomainError(`"${t.title}" foi alterada após a prévia — gere uma nova prévia`);
    }
    rev.before[t.id] = { ...c.before };
    rev.after[t.id] = { ...c.after };
    t.plannedStart = c.after.plannedStart; t.plannedEnd = c.after.plannedEnd;
    t.materialVersion += 1; t.updatedAt = ctx.nowIso; t.rev += 1;
  }
  ws.revisions[rev.id] = rev;
  log(ws, ctx, "reschedule", "sprint", p.sprintId, `🔃 Prazos atualizados: ${p.changes.length} tarefa(s) · previsão ${p.forecastBefore ?? "—"} → ${p.forecastAfter ?? "—"}`);
  return rev.id;
}

/** Desfaz revisão se nenhuma tarefa envolvida foi alterada depois dela e ela for a mais recente ativa. */
export function canUndoRevision(ws: Workspace, revId: ID): { ok: boolean; reason?: string } {
  const r = ws.revisions[revId];
  if (!r || r.undoneAt) return { ok: false, reason: "Revisão inexistente ou já desfeita" };
  const later = Object.values(ws.revisions).some((x) => x.sprintId === r.sprintId && !x.undoneAt && x.at > r.at);
  if (later) return { ok: false, reason: "Existe revisão posterior" };
  for (const [id, a] of Object.entries(r.after)) {
    const t = ws.tasks[id];
    if (!t || t.plannedStart !== a.plannedStart || t.plannedEnd !== a.plannedEnd) return { ok: false, reason: `"${t?.title ?? id}" foi alterada depois` };
  }
  return { ok: true };
}

export function undoRevision(ws: Workspace, ctx: Ctx, revId: ID) {
  const chk = canUndoRevision(ws, revId);
  if (!chk.ok) throw new DomainError(chk.reason);
  const r = ws.revisions[revId];
  for (const [id, b] of Object.entries(r.before)) {
    const t = ws.tasks[id];
    t.plannedStart = b.plannedStart; t.plannedEnd = b.plannedEnd; t.materialVersion += 1; t.updatedAt = ctx.nowIso; t.rev += 1;
  }
  r.undoneAt = ctx.nowIso;
  log(ws, ctx, "undo", "sprint", r.sprintId, `Revisão de cronograma desfeita (${Object.keys(r.before).length} tarefa(s))`);
}

/** Reagendamento manual (Gantt/calendário): altera somente datas, preservando duração útil. */
export function rescheduleTask(ws: Workspace, ctx: Ctx, taskId: ID, newStart: LocalDateTime, opts: { pin?: boolean } = {}) {
  const t = ws.tasks[taskId];
  if (!t) throw new DomainError("Tarefa não encontrada");
  if (t.status === "done") throw new DomainError("Tarefa concluída preserva seus horários reais");
  const sprint = ws.sprints[ws.stages[t.stageId].sprintId];
  const cal = calendarResolver(ws, sprint)(t.assigneeId);
  const minutes = t.durationMinutes ?? (t.plannedStart && t.plannedEnd ? workMinutesBetween(cal, toMs(t.plannedStart), toMs(t.plannedEnd)) : null);
  if (minutes == null) throw new DomainError("Defina a duração estimada antes de reagendar");
  const startMs = nextWorkInstant(cal, toMs(newStart));
  const before = `${t.plannedStart ?? "—"}`;
  t.plannedStart = fromMs(startMs);
  t.plannedEnd = fromMs(addWorkMinutes(cal, startMs, minutes));
  if (opts.pin !== undefined) t.pinned = opts.pin;
  t.materialVersion += 1; t.updatedAt = ctx.nowIso; t.rev += 1;
  log(ws, ctx, "reschedule", "task", taskId, `Tarefa "${t.title}" reagendada: ${before} → ${t.plannedStart}`);
}

