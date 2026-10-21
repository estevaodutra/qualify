/**
 * Motor de agendamento (Camada D). Determinístico e testável.
 * - ordenação topológica com detecção de ciclos
 * - list scheduling por prioridade técnica (não pela ordem visual)
 * - capacidade por responsável (1 tarefa por vez) com paralelismo entre responsáveis
 * - preserva concluídas, fixadas e registros reais
 * - nunca inventa duração ou responsável ausente
 */
import type { Dependency, ID, LocalDateTime, Milestone, Task, WorkCalendar } from "../domain/types";
import { PRIORITY_RANK } from "../domain/types";
import { addWorkMinutes, fromMs, nextWorkInstant, toMs } from "./time";

export interface ScheduleInput {
  tasks: Task[];
  dependencies: Dependency[];
  milestones: Milestone[];
  /** calendário por memberId; `default` usado quando o membro não possui calendário próprio */
  calendarFor: (memberId: ID | null) => WorkCalendar;
  now: LocalDateTime;
  /** posição global (etapa, tarefa) apenas como último critério de desempate */
  orderKey: (t: Task) => number;
}

export interface ScheduledSlot { plannedStart: LocalDateTime; plannedEnd: LocalDateTime }

export interface ScheduleResult {
  slots: Record<ID, ScheduledSlot>;
  unschedulable: { taskId: ID; reason: string }[];
  cycles: ID[][];
  criticalPath: ID[];
  forecastEnd: LocalDateTime | null;
  conflicts: { taskId: ID; message: string }[];
}

export function loggedMinutes(t: Task): number {
  return t.timeEntries.reduce((a, e) => a + e.minutes, 0);
}

export function remainingMinutes(t: Task): number | null {
  if (t.status === "done") return 0;
  if (t.durationMinutes == null) return null;
  return Math.max(0, t.durationMinutes - loggedMinutes(t));
}

/** Detecta ciclos (Tarjan simplificado via DFS). Retorna componentes com ciclo. */
export function findCycles(taskIds: ID[], deps: Dependency[]): ID[][] {
  const adj = new Map<ID, ID[]>(taskIds.map((id) => [id, []]));
  deps.forEach((d) => adj.get(d.predecessorId)?.push(d.successorId));
  let index = 0;
  const idx = new Map<ID, number>(), low = new Map<ID, number>(), on = new Set<ID>(), stack: ID[] = [];
  const out: ID[][] = [];
  const strong = (v: ID) => {
    idx.set(v, index); low.set(v, index); index++; stack.push(v); on.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!idx.has(w)) { strong(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const comp: ID[] = [];
      let w: ID;
      do { w = stack.pop()!; on.delete(w); comp.push(w); } while (w !== v);
      const selfLoop = deps.some((d) => d.predecessorId === v && d.successorId === v);
      if (comp.length > 1 || selfLoop) out.push(comp);
    }
  };
  taskIds.forEach((id) => { if (!idx.has(id)) strong(id); });
  return out;
}

/** Verdadeiro se adicionar predecessor→successor criaria ciclo. */
export function wouldCreateCycle(deps: Dependency[], predecessorId: ID, successorId: ID): boolean {
  if (predecessorId === successorId) return true;
  const adj = new Map<ID, ID[]>();
  deps.forEach((d) => adj.set(d.predecessorId, [...(adj.get(d.predecessorId) ?? []), d.successorId]));
  const seen = new Set<ID>();
  const stack = [successorId];
  while (stack.length) {
    const v = stack.pop()!;
    if (v === predecessorId) return true;
    if (seen.has(v)) continue;
    seen.add(v);
    stack.push(...(adj.get(v) ?? []));
  }
  return false;
}

export function scheduleTasks(input: ScheduleInput): ScheduleResult {
  const { tasks, dependencies, milestones, calendarFor, now } = input;
  const active = tasks.filter((t) => !t.archivedAt);
  const byId = new Map(active.map((t) => [t.id, t]));
  const deps = dependencies.filter((d) => byId.has(d.predecessorId) && byId.has(d.successorId));
  const cycles = findCycles(active.map((t) => t.id), deps);
  const inCycle = new Set(cycles.flat());

  const preds = new Map<ID, ID[]>(active.map((t) => [t.id, []]));
  deps.forEach((d) => preds.get(d.successorId)!.push(d.predecessorId));

  // Prioridade de agendamento: marco crítico mais próximo, prioridade, impacto financeiro, ordem.
  const milestoneDue = new Map<ID, number>();
  milestones.filter((m) => !m.archivedAt && m.dueDate).forEach((m) =>
    m.taskIds.forEach((id) => {
      const due = toMs(m.dueDate!);
      milestoneDue.set(id, Math.min(milestoneDue.get(id) ?? Infinity, due));
    }));
  const rank = (t: Task): (number)[] => [
    milestoneDue.get(t.id) ?? Infinity,
    PRIORITY_RANK[t.priority],
    t.financialImpact ? 0 : 1,
    input.orderKey(t),
  ];
  const cmp = (a: Task, b: Task) => {
    const ra = rank(a), rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return a.id.localeCompare(b.id);
  };

  const nowMs = toMs(now);
  const slots: Record<ID, ScheduledSlot> = {};
  const endMs = new Map<ID, number>();
  const unschedulable: ScheduleResult["unschedulable"] = [];
  const conflicts: ScheduleResult["conflicts"] = [];
  const resourceFree = new Map<ID, number>();
  const blockedBy = new Map<ID, ID | null>(); // para caminho crítico: quem determinou o início

  // 1) fixas: concluídas e fixadas (pinned) mantêm horário e ocupam o recurso
  for (const t of active) {
    if (t.status === "done") {
      const end = t.actualEnd ? t.actualEnd.slice(0, 16) : t.plannedEnd;
      if (end) endMs.set(t.id, toMs(end));
      else endMs.set(t.id, -Infinity);
      continue;
    }
    if (t.pinned && t.plannedStart && t.plannedEnd) {
      slots[t.id] = { plannedStart: t.plannedStart, plannedEnd: t.plannedEnd };
      endMs.set(t.id, toMs(t.plannedEnd));
      if (t.assigneeId) resourceFree.set(t.assigneeId, Math.max(resourceFree.get(t.assigneeId) ?? -Infinity, toMs(t.plannedEnd)));
    }
  }

  // 2) Kahn sobre pendentes/em andamento
  const pending = active.filter((t) => t.status !== "done" && !endMs.has(t.id));
  const indeg = new Map<ID, number>();
  pending.forEach((t) => indeg.set(t.id, preds.get(t.id)!.filter((p) => !endMs.has(p)).length));
  const ready: Task[] = pending.filter((t) => indeg.get(t.id) === 0 && !inCycle.has(t.id));
  const failed = new Set<ID>();

  const release = (id: ID) => {
    for (const d of deps.filter((x) => x.predecessorId === id)) {
      if (!indeg.has(d.successorId)) continue;
      const n = indeg.get(d.successorId)! - 1;
      indeg.set(d.successorId, n);
      if (n === 0 && !inCycle.has(d.successorId)) ready.push(byId.get(d.successorId)!);
    }
  };

  while (ready.length) {
    ready.sort(cmp);
    const t = ready.shift()!;
    const predList = preds.get(t.id)!;
    const failedPred = predList.find((p) => failed.has(p));
    const rem = remainingMinutes(t);
    let reason: string | null = null;
    if (failedPred) reason = `Depende de "${byId.get(failedPred)?.title}", que não pôde ser agendada`;
    else if (rem == null) reason = "Duração estimada não definida";
    else if (!t.assigneeId) reason = "Sem responsável atribuído";
    if (reason) {
      unschedulable.push({ taskId: t.id, reason });
      failed.add(t.id);
      release(t.id);
      continue;
    }
    const cal = calendarFor(t.assigneeId);
    let earliest = nowMs;
    let driver: ID | null = null;
    for (const p of predList) {
      const pe = endMs.get(p) ?? -Infinity;
      if (pe > earliest) { earliest = pe; driver = p; }
    }
    const rf = resourceFree.get(t.assigneeId!) ?? -Infinity;
    if (rf > earliest) { earliest = rf; driver = null; }
    try {
      const start = nextWorkInstant(cal, earliest);
      const end = addWorkMinutes(cal, start, rem!);
      const startStr = t.status === "doing" && t.actualStart ? t.actualStart.slice(0, 16) : fromMs(start);
      slots[t.id] = { plannedStart: startStr, plannedEnd: fromMs(end) };
      endMs.set(t.id, end);
      resourceFree.set(t.assigneeId!, end);
      blockedBy.set(t.id, driver);
    } catch (e) {
      unschedulable.push({ taskId: t.id, reason: (e as Error).message });
      failed.add(t.id);
    }
    release(t.id);
  }

  for (const id of inCycle) unschedulable.push({ taskId: id, reason: "Dependência circular" });
  for (const t of pending) {
    if (!slots[t.id] && !failed.has(t.id) && !inCycle.has(t.id)) {
      unschedulable.push({ taskId: t.id, reason: "Depende de tarefa em dependência circular" });
    }
  }

  // conflitos de dependência com tarefas fixadas
  for (const d of deps) {
    const s = slots[d.successorId], pe = endMs.get(d.predecessorId);
    if (s && pe != null && isFinite(pe) && toMs(s.plannedStart) < pe && byId.get(d.successorId)?.pinned) {
      conflicts.push({ taskId: d.successorId, message: `Início fixado antes do término de "${byId.get(d.predecessorId)?.title}"` });
    }
  }

  // previsão de término e caminho crítico
  let lastId: ID | null = null, last = -Infinity;
  for (const [id, s] of Object.entries(slots)) {
    const e = toMs(s.plannedEnd);
    if (e > last) { last = e; lastId = id; }
  }
  const criticalPath: ID[] = [];
  let cur = lastId;
  const guard = new Set<ID>();
  while (cur && !guard.has(cur)) { guard.add(cur); criticalPath.unshift(cur); cur = blockedBy.get(cur) ?? null; }

  return { slots, unschedulable, cycles, criticalPath, forecastEnd: lastId ? fromMs(last) : null, conflicts };
}
