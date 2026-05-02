export function formatDateBR(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export function formatTimeBR(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function combineDateAndTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export function getLabelForDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return "HOJE";
  if (dd.getTime() === tomorrow.getTime()) return "AMANHÃ";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).toUpperCase();
}

export function sessionKey(slug: string) {
  return `booking:${slug}`;
}

export function loadBookingState(slug: string): any {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey(slug)) || "{}");
  } catch {
    return {};
  }
}

export function saveBookingState(slug: string, patch: Record<string, unknown>) {
  const cur = loadBookingState(slug);
  sessionStorage.setItem(sessionKey(slug), JSON.stringify({ ...cur, ...patch }));
}

export function clearBookingState(slug: string) {
  sessionStorage.removeItem(sessionKey(slug));
}
