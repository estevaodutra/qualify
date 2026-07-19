export type DelayUnit = "seconds" | "minutes" | "hours" | "days";

export function toDelayMs(value: number, unit: string): number {
  switch (unit) {
    case "seconds": return value * 1000;
    case "minutes": return value * 60 * 1000;
    case "hours": return value * 60 * 60 * 1000;
    case "days": return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

export function fromDelayMs(delayMs: number): { value: number; unit: DelayUnit } {
  if (delayMs <= 0) {
    return { value: 0, unit: "seconds" };
  }

  const msInDay = 24 * 60 * 60 * 1000;
  const msInHour = 60 * 60 * 1000;
  const msInMinute = 60 * 1000;
  const msInSecond = 1000;

  if (delayMs % msInDay === 0) {
    return { value: delayMs / msInDay, unit: "days" };
  }
  if (delayMs % msInHour === 0) {
    return { value: delayMs / msInHour, unit: "hours" };
  }
  if (delayMs % msInMinute === 0) {
    return { value: delayMs / msInMinute, unit: "minutes" };
  }
  
  const secondsValue = Math.floor(delayMs / msInSecond);
  if (secondsValue * msInSecond === delayMs) {
    return { value: secondsValue, unit: "seconds" };
  }

  return { value: Number((delayMs / 1000).toFixed(1)), unit: "seconds" };
}

export function formatDelayLabel(delayMs: number): string {
  const { value, unit } = fromDelayMs(delayMs);
  
  const translations: Record<DelayUnit, { singular: string; plural: string }> = {
    seconds: { singular: "segundo", plural: "segundos" },
    minutes: { singular: "minuto", plural: "minutos" },
    hours: { singular: "hora", plural: "horas" },
    days: { singular: "dia", plural: "dias" },
  };

  const unitText = value === 1 ? translations[unit].singular : translations[unit].plural;
  return `${value} ${unitText}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeDelayConfig(config: Record<string, any>): {
  delayMs: number;
  value: number;
  unit: DelayUnit;
} {
  if (!config) {
    return {
      delayMs: 300000,
      value: 5,
      unit: "minutes"
    };
  }

  if (typeof config.value === "number" && config.unit) {
    const unit = config.unit as DelayUnit;
    const value = config.value;
    const delayMs = typeof config.delayMs === "number" ? config.delayMs : toDelayMs(value, unit);
    return { delayMs, value, unit };
  }

  if (typeof config.delayMs === "number") {
    const { value, unit } = fromDelayMs(config.delayMs);
    return { delayMs: config.delayMs, value, unit };
  }

  if (
    typeof config.seconds === "number" ||
    typeof config.minutes === "number" ||
    typeof config.hours === "number" ||
    typeof config.days === "number"
  ) {
    const seconds = config.seconds || 0;
    const minutes = config.minutes || 0;
    const hours = config.hours || 0;
    const days = config.days || 0;

    const totalMs = 
      seconds * 1000 + 
      minutes * 60 * 1000 + 
      hours * 60 * 60 * 1000 + 
      days * 24 * 60 * 60 * 1000;

    const { value, unit } = fromDelayMs(totalMs);
    return { delayMs: totalMs, value, unit };
  }

  return {
    delayMs: 300000,
    value: 5,
    unit: "minutes"
  };
}
