function partsInZone(instant: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const part of formatted) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = partsInZone(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - instant.getTime();
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const first = zoneOffsetMs(guess, timeZone);
  let utc = new Date(guess.getTime() - first);
  const second = zoneOffsetMs(utc, timeZone);
  if (second !== first) utc = new Date(guess.getTime() - second);
  return utc;
}

export function civilDate(timeZone: string, now = new Date()): string {
  const parts = partsInZone(now, timeZone);
  const month = parts.month.toString().padStart(2, "0");
  const day = parts.day.toString().padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function addDaysIso(iso: string, days: number): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) throw new Error(`Invalid date: ${iso}`);
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return utc.toISOString().slice(0, 10);
}

/** Instants from local noon on `dateIso` through local noon the next day. */
export function nightInstants(dateIso: string, timeZone: string, stepMinutes: number): Date[] {
  const startDate = parseIsoDate(dateIso);
  const endIso = addDaysIso(dateIso, 1);
  const endDate = parseIsoDate(endIso);
  if (!startDate || !endDate) return [];
  const start = zonedDateTimeToUtc(startDate.year, startDate.month, startDate.day, 12, 0, timeZone);
  const end = zonedDateTimeToUtc(endDate.year, endDate.month, endDate.day, 12, 0, timeZone);
  const step = Math.max(1, stepMinutes) * 60_000;
  const instants: Date[] = [];
  for (let time = start.getTime(); time <= end.getTime() + 1; time += step) {
    instants.push(new Date(time));
  }
  return instants;
}
