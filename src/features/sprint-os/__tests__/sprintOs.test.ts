import { describe, it, expect } from "vitest";
import {
  addWorkMinutes,
  businessDaysBetween,
  nowInSaoPaulo,
  toMs,
  fromMs,
  workIntervals,
} from "../scheduler/time";
import { findCycles, scheduleTasks, wouldCreateCycle } from "../scheduler/engine";
import { makeCalendar, makeTask, makeSprint } from "../domain/ops";
import { createPercursoDaVidaSeed } from "../seed/percursoDaVidaSeed";
import {
  computeProgressMetrics,
  computeSprintFinancials,
  computeMissionNow,
  computeOperationalCompass,
} from "../metrics/calculations";
import { runSchedule, proposeDeadlineUpdate } from "../scheduler/planning";

describe("Sprint OS — Time & Calendar Engine", () => {
  const ctx = { actorName: "Test", nowIso: "2026-10-21T09:00:00.000Z" };
  const cal = makeCalendar(ctx, {
    workStart: "09:00",
    workEnd: "18:00",
    breaks: [{ start: "12:00", end: "13:00" }],
    workDays: [1, 2, 3, 4, 5], // Seg a Sex (8h úteis / dia = 480 min)
    holidays: ["2026-10-23"], // Feriado na sexta-feira
  });

  it("calcula intervalos de trabalho descontando intervalos de almoço", () => {
    const intervals = workIntervals(cal);
    expect(intervals).toEqual([
      [540, 720], // 09:00 (540m) às 12:00 (720m) = 180 min
      [780, 1080], // 13:00 (780m) às 18:00 (1080m) = 300 min (total 480m)
    ]);
  });

  it("adiciona minutos úteis pulando intervalos e fins de semana", () => {
    // 2026-10-21 é quarta-feira às 09:00
    const startMs = toMs("2026-10-21T09:00");
    // Adicionar 3 horas (180 min) -> deve chegar a 12:00
    const end1 = addWorkMinutes(cal, startMs, 180);
    expect(fromMs(end1)).toBe("2026-10-21T12:00");

    // Adicionar 4 horas (240 min) -> 3h de manhã + 1h de almoço pulado + 1h à tarde = 14:00
    const end2 = addWorkMinutes(cal, startMs, 240);
    expect(fromMs(end2)).toBe("2026-10-21T14:00");

    // Adicionar 1 dia útil completo (480 min) -> deve terminar às 18:00 do mesmo dia
    const endDay = addWorkMinutes(cal, startMs, 480);
    expect(fromMs(endDay)).toBe("2026-10-21T18:00");

    // Adicionar 481 min -> deve pular a noite e ir para o início do dia seguinte (quinta 09:01)
    const nextDay = addWorkMinutes(cal, startMs, 481);
    expect(fromMs(nextDay)).toBe("2026-10-22T09:01");
  });

  it("pula feriados configurados corretamente", () => {
    // Quinta-feira 2026-10-22 às 17:00 (falta 1h para acabar o dia)
    const startMs = toMs("2026-10-22T17:00");
    // Sexta-feira 2026-10-23 é feriado, sábado e domingo não são úteis
    // Adicionar 120 minutos (2h): 1h na quinta (17h-18h) + 1h na segunda-feira 2026-10-26 (09h-10h)
    const endMs = addWorkMinutes(cal, startMs, 120);
    expect(fromMs(endMs)).toBe("2026-10-26T10:00");
  });
});

describe("Sprint OS — Dependências e Detecção de Ciclos", () => {
  it("detecta dependências circulares", () => {
    const deps = [
      { id: "1", predecessorId: "A", successorId: "B" },
      { id: "2", predecessorId: "B", successorId: "C" },
    ];

    expect(wouldCreateCycle(deps, "C", "A")).toBe(true);
    expect(wouldCreateCycle(deps, "A", "C")).toBe(false);
    expect(wouldCreateCycle(deps, "D", "A")).toBe(false);

    // Auto-dependência
    expect(wouldCreateCycle(deps, "A", "A")).toBe(true);
  });
});

describe("Sprint OS — Seed Matriz Percurso da Vida", () => {
  const seed = createPercursoDaVidaSeed();

  it("inicializa com exatamente 8 etapas e 26 tarefas canônicas", () => {
    expect(Object.keys(seed.stages).length).toBe(8);
    expect(Object.keys(seed.tasks).length).toBe(26);
    expect(Object.keys(seed.milestones).length).toBe(5);
    expect(Object.keys(seed.routines).length).toBe(8);
    expect(Object.keys(seed.funnel).length).toBe(11);
  });

  it("calcula métricas de progresso com 3 medidas distintas", () => {
    const progress = computeProgressMetrics(seed, "sprint-01");
    expect(progress.tasksTotal).toBe(26);
    expect(progress.tasksDone).toBe(0);
    expect(progress.taskProgressPct).toBe(0);
    expect(progress.effortTotalMinutes).toBeGreaterThan(0);
    expect(progress.effortProgressPct).toBe(0);
    expect(progress.milestonesTotal).toBe(5);
    expect(progress.milestonesDone).toBe(0);
  });

  it("calcula a rentabilidade inicial da empreitada (Seção 33)", () => {
    const fin = computeSprintFinancials(seed, "sprint-01");
    expect(fin.contractValue).toBe(2500);
    expect(fin.revenueReceived).toBe(2500);
    expect(fin.plannedHours).toBeGreaterThan(0);
  });

  it("identifica a Missão Agora e o estado inicial da Bússola", () => {
    const mission = computeMissionNow(seed, "sprint-01");
    // Tarefa 01 deve ser a primeira executável (desbloqueada, sem preds)
    expect(mission.task).not.toBeNull();
    expect(mission.task?.id).toBe("task-01");

    const compass = computeOperationalCompass(seed, "sprint-01");
    // Estado inicial antes de homologar acessos e CRM é ESTRUTURAR
    expect(compass.diagnostic).toBe("ESTRUTURAR");
  });
});
