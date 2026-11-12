function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatRightAscension(degrees: number): string {
  const wrapped = ((degrees % 360) + 360) % 360;
  let totalSeconds = Math.round((wrapped / 15) * 3600);
  if (totalSeconds >= 24 * 3600) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export function formatDeclination(degrees: number): string {
  const sign = degrees < 0 ? "−" : "+";
  const totalSeconds = Math.round(Math.abs(degrees) * 3600);
  const deg = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${sign}${pad(deg)}° ${pad(minutes)}′ ${pad(seconds)}″`;
}

export function formatCatalogueId(id: string): string {
  const match = /^([A-Za-z]+)0*(\d.*)$/.exec(id);
  if (!match?.[1] || !match[2]) return id;
  const prefixes: Record<string, string> = {
    ngc: "NGC",
    ic: "IC",
    ldn: "LDN",
    mel: "Mel",
    b: "B",
    c: "C",
    cr: "Cr",
    sh: "Sh",
  };
  const prefix = prefixes[match[1].toLowerCase()] ?? match[1];
  return `${prefix} ${match[2]}`;
}

export function formatArcmin(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${text}′`;
}

export function formatSignedDegrees(value: number, digits = 1): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}°`;
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  return `${hours.toFixed(1)} h`;
}

export function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
