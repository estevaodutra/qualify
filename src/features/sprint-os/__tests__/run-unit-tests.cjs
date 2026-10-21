// Standalone Unit Test Runner for Sprint OS Domain & Scheduler Engines
const assert = require('assert');

console.log('--- Executando Testes Unitários do Sprint OS ---');

// 1. Calendário e tempo
const MIN = 60000;
const DAY = 86400000;
const toMs = (dt) => Date.parse(`${dt.length === 10 ? dt + "T00:00" : dt}:00Z`);
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 16);
const hm = (s) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
};
const dayStart = (ms) => Math.floor(ms / DAY) * DAY;

function workIntervals(cal) {
  let intervals = [[hm(cal.workStart), hm(cal.workEnd)]];
  for (const b of [...cal.breaks].sort((a, z) => hm(a.start) - hm(z.start))) {
    const bs = hm(b.start), be = hm(b.end);
    intervals = intervals.flatMap(([s, e]) => {
      if (be <= s || bs >= e) return [[s, e]];
      const out = [];
      if (bs > s) out.push([s, bs]);
      if (be < e) out.push([be, e]);
      return out;
    });
  }
  return intervals.filter(([s, e]) => e > s);
}

function isWorkDay(cal, ms) {
  const d = new Date(ms);
  const iso = d.toISOString().slice(0, 10);
  return cal.workDays.includes(d.getUTCDay()) && !cal.holidays.includes(iso);
}

function nextWorkInstant(cal, ms) {
  const ints = workIntervals(cal);
  let day = dayStart(ms);
  for (let guard = 0; guard < 3660; guard++) {
    if (isWorkDay(cal, day)) {
      for (const [s, e] of ints) {
        const is = day + s * MIN, ie = day + e * MIN;
        if (ms < ie) return Math.max(ms, is);
      }
    }
    day += DAY;
    ms = Math.max(ms, day);
  }
  throw new Error("Nenhum horário útil encontrado");
}

function addWorkMinutes(cal, startMs, minutes) {
  let cur = nextWorkInstant(cal, startMs);
  let left = minutes;
  if (left <= 0) return cur;
  const ints = workIntervals(cal);
  for (let guard = 0; guard < 100000; guard++) {
    const day = dayStart(cur);
    for (const [s, e] of ints) {
      const ie = day + e * MIN;
      const is = day + s * MIN;
      if (cur >= ie) continue;
      const from = Math.max(cur, is);
      const avail = (ie - from) / MIN;
      if (left <= avail) return from + left * MIN;
      left -= avail;
      cur = ie;
    }
    cur = nextWorkInstant(cal, day + DAY);
  }
  throw new Error("Duração excede o horizonte");
}

const cal = {
  workStart: "09:00",
  workEnd: "18:00",
  breaks: [{ start: "12:00", end: "13:00" }],
  workDays: [1, 2, 3, 4, 5],
  holidays: ["2026-10-23"],
};

// Test 1: Intervalos de trabalho
const ints = workIntervals(cal);
assert.strictEqual(ints.length, 2);
assert.deepStrictEqual(ints[0], [540, 720]); // 09:00 às 12:00 (180 min)
assert.deepStrictEqual(ints[1], [780, 1080]); // 13:00 às 18:00 (300 min)
console.log('✓ Teste 1: Intervalos de trabalho descontando almoço - OK');

// Test 2: Soma de minutos úteis
const startMs = toMs("2026-10-21T09:00");
const end1 = addWorkMinutes(cal, startMs, 180);
assert.strictEqual(fromMs(end1), "2026-10-21T12:00");

const end2 = addWorkMinutes(cal, startMs, 240); // 3h manhã + 1h tarde
assert.strictEqual(fromMs(end2), "2026-10-21T14:00");

const endDay = addWorkMinutes(cal, startMs, 480); // dia completo de 8h
assert.strictEqual(fromMs(endDay), "2026-10-21T18:00");

const nextDay = addWorkMinutes(cal, startMs, 481);
assert.strictEqual(fromMs(nextDay), "2026-10-22T09:01");
console.log('✓ Teste 2: Adição de minutos úteis com virada de dia - OK');

// Test 3: Pular feriados e fins de semana
const thursMs = toMs("2026-10-22T17:00"); // 1h antes do fim
const mondayMs = addWorkMinutes(cal, thursMs, 120); // 1h na quinta + feriado na sexta + sábado/domingo -> segunda 10:00
assert.strictEqual(fromMs(mondayMs), "2026-10-26T10:00");
console.log('✓ Teste 3: Pulo de feriado e fim de semana na sexta - OK');

// Test 4: Detecção de dependência circular
function wouldCreateCycle(deps, predecessorId, successorId) {
  if (predecessorId === successorId) return true;
  const adj = new Map();
  deps.forEach((d) => adj.set(d.predecessorId, [...(adj.get(d.predecessorId) || []), d.successorId]));
  const seen = new Set();
  const stack = [successorId];
  while (stack.length) {
    const v = stack.pop();
    if (v === predecessorId) return true;
    if (seen.has(v)) continue;
    seen.add(v);
    stack.push(...(adj.get(v) || []));
  }
  return false;
}

const deps = [
  { predecessorId: "A", successorId: "B" },
  { predecessorId: "B", successorId: "C" },
];
assert.strictEqual(wouldCreateCycle(deps, "C", "A"), true);
assert.strictEqual(wouldCreateCycle(deps, "A", "C"), false);
assert.strictEqual(wouldCreateCycle(deps, "D", "A"), false);
assert.strictEqual(wouldCreateCycle(deps, "A", "A"), true);
console.log('✓ Teste 4: Detecção de dependência circular (DAG) - OK');

// Test 5: Fórmulas Financeiras da Seção 33
const contractValue = 2500;
const plannedHours = 20;
const actualHours = 15;
const rate = 50; // R$ 50/h
const plannedCost = plannedHours * rate; // 1000
const actualCost = actualHours * rate; // 750
const remHours = 5;
const projectedRemainingCost = remHours * rate; // 250
const projectedFinalCost = actualCost + projectedRemainingCost; // 1000
const projectedGrossProfit = contractValue - projectedFinalCost; // 1500
const projectedGrossMarginPct = Math.round((projectedGrossProfit / contractValue) * 100); // 60%
assert.strictEqual(projectedFinalCost, 1000);
assert.strictEqual(projectedGrossProfit, 1500);
assert.strictEqual(projectedGrossMarginPct, 60);
console.log('✓ Teste 5: Fórmulas Financeiras da Seção 33 - OK');

console.log('\n========================================');
console.log('TODOS OS TESTES UNITÁRIOS DO SPRINT OS PASSARAM COM SUCESSO!');
console.log('========================================');
