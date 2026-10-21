/**
 * Utilitários de tempo e calendário (Camada D). Puro e determinístico.
 * Representa instantes "wall clock" de São Paulo como milissegundos em uma
 * linha do tempo UTC fictícia (Date.UTC das partes locais).
 */
import type { LocalDate, LocalDateTime, WorkCalendar } from "../domain/types";

export const SAO_PAULO_TZ = "America/Sao_Paulo";
const MIN = 60_000;
const DAY = 86_400_000;

export const toMs = (dt: LocalDateTime): number => Date.parse(`${dt.length === 10 ? dt + "T00:00" : dt}:00Z`);
export const fromMs = (ms: number): LocalDateTime => new Date(ms).toISOString().slice(0, 16);
export const dateOf = (dt: LocalDateTime): LocalDate => dt.slice(0, 10);
const hm = (s: string): number => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
};
const dayStart = (ms: number) => Math.floor(ms / DAY) * DAY;

/** Data/hora atual em America/Sao_Paulo, a partir do relógio do sistema via Intl (IANA). */
export function nowInSaoPaulo(date: Date = new Date()): LocalDateTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export function isWorkDay(cal: WorkCalendar, ms: number): boolean {
  const d = new Date(ms);
  const iso = d.toISOString().slice(0, 10);
  return cal.workDays.includes(d.getUTCDay()) && !cal.holidays.includes(iso);
}

/** Intervalos de trabalho [início, fim) em minutos do dia, já descontando pausas. */
export function workIntervals(cal: WorkCalendar): [number, number][] {
  let intervals: [number, number][] = [[hm(cal.workStart), hm(cal.workEnd)]];
  for (const b of [...cal.breaks].sort((a, z) => hm(a.start) - hm(z.start))) {
    const bs = hm(b.start), be = hm(b.end);
    intervals = intervals.flatMap(([s, e]) => {
      if (be <= s || bs >= e) return [[s, e] as [number, number]];
      const out: [number, number][] = [];
      if (bs > s) out.push([s, bs]);
      if (be < e) out.push([be, e]);
      return out;
    });
  }
  return intervals.filter(([s, e]) => e > s);
}

export function dailyWorkMinutes(cal: WorkCalendar): number {
  return workIntervals(cal).reduce((a, [s, e]) => a + (e - s), 0);
}

/** Próximo instante útil >= ms. */
export function nextWorkInstant(cal: WorkCalendar, ms: number): number {
  const ints = workIntervals(cal);
  if (ints.length === 0 || cal.workDays.length === 0) throw new Error("Calendário sem horário de trabalho");
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
  throw new Error("Nenhum horário útil encontrado em 10 anos");
}

/** Soma minutos de trabalho a partir de um instante, respeitando jornada, pausas, fins de semana e feriados. */
export function addWorkMinutes(cal: WorkCalendar, startMs: number, minutes: number): number {
  let cur = nextWorkInstant(cal, startMs);
  let left = minutes;
  if (left <= 0) return cur;
  const ints = workIntervals(cal);
  for (let guard = 0; guard < 100_000; guard++) {
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
  throw new Error("Duração excede o horizonte de agendamento");
}

/** Minutos úteis entre dois instantes (a <= b). */
export function workMinutesBetween(cal: WorkCalendar, a: number, b: number): number {
  if (b <= a) return 0;
  const ints = workIntervals(cal);
  let total = 0;
  for (let day = dayStart(a); day < b; day += DAY) {
    if (!isWorkDay(cal, day)) continue;
    for (const [s, e] of ints) {
      const is = Math.max(day + s * MIN, a), ie = Math.min(day + e * MIN, b);
      if (ie > is) total += (ie - is) / MIN;
    }
  }
  return total;
}

/** Conta dias úteis no intervalo de datas [from, to] inclusivo. */
export function businessDaysBetween(cal: WorkCalendar, from: LocalDate, to: LocalDate): number {
  let n = 0;
  for (let d = toMs(from); d <= toMs(to); d += DAY) if (isWorkDay(cal, d)) n++;
  return n;
}

/** Retorna a data do N-ésimo dia útil começando em `from` (1 = primeiro dia útil >= from). */
export function nthBusinessDay(cal: WorkCalendar, from: LocalDate, n: number): LocalDate {
  let count = 0;
  for (let d = toMs(from), g = 0; g < 3660; d += DAY, g++) {
    if (isWorkDay(cal, d)) {
      count++;
      if (count >= n) return fromMs(d).slice(0, 10);
    }
  }
  throw new Error("Horizonte excedido");
}

/** Fim do expediente de uma data. */
export function endOfWorkDay(cal: WorkCalendar, date: LocalDate): LocalDateTime {
  return `${date}T${cal.workEnd}`;
}

/** Diferença em dias úteis entre duas datas (b - a), assinada. */
export function businessDayDelta(cal: WorkCalendar, a: LocalDateTime, b: LocalDateTime): number {
  const da = dateOf(a), db = dateOf(b);
  if (da === db) return 0;
  return db > da ? businessDaysBetween(cal, da, db) - (isWorkDay(cal, toMs(da)) ? 1 : 0)
    : -(businessDaysBetween(cal, db, da) - (isWorkDay(cal, toMs(db)) ? 1 : 0));
}

export const fmtDateTime = (dt: LocalDateTime | null | undefined): string => {
  if (!dt) return "—";
  const [d, t] = dt.split("T");
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}${t ? " " + t : ""}`;
};

export const fmtMinutes = (m: number | null | undefined): string => {
  if (m == null) return "—";
  const sign = m < 0 ? "-" : "";
  const a = Math.abs(Math.round(m));
  const h = Math.floor(a / 60), mm = a % 60;
  return `${sign}${h}h${mm ? String(mm).padStart(2, "0") : ""}`;
};
