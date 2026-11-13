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

function designationNumber(match: RegExpMatchArray): string {
  return (match[1] ?? "").replace(/^0+(?=\d)/, "");
}

export function formatCatalogueId(id: string): string {
  const rules: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^NGC(\d+[A-Z]?)$/, (match) => `NGC ${designationNumber(match)}`],
    [/^IC(\d+[A-Z]?)$/, (match) => `IC ${designationNumber(match)}`],
    [/^M(\d+)$/, (match) => `M${designationNumber(match)}`],
    [/^C(\d+)$/, (match) => `C${designationNumber(match)}`],
    [/^Sh2-(\d+)$/, (match) => `Sh2-${designationNumber(match)}`],
    [/^LBN(\d+)$/, (match) => `LBN ${designationNumber(match)}`],
    [/^LDN(\d+)$/, (match) => `LDN ${designationNumber(match)}`],
    [/^vdB(\d+)$/, (match) => `vdB ${designationNumber(match)}`],
    [/^B(\d+[a-z]?)$/, (match) => `B${designationNumber(match)}`],
    [/^Cr(\d+[A-Za-z]?)$/, (match) => `Cr ${designationNumber(match)}`],
    [/^Mel(\d+[A-Za-z]?)$/, (match) => `Mel ${designationNumber(match)}`],
    [/^Tr(\d+[A-Za-z]?)$/, (match) => `Tr ${designationNumber(match)}`],
    [/^St(\d+[A-Za-z]?)$/, (match) => `St ${designationNumber(match)}`],
    [/^Arp(\d+)$/, (match) => `Arp ${designationNumber(match)}`],
    [/^RCW(\d+)$/, (match) => `RCW ${designationNumber(match)}`],
    [/^Ced(\d+[a-z]?)$/, (match) => `Ced ${designationNumber(match)}`],
    [/^Gum(\d+)$/, (match) => `Gum ${designationNumber(match)}`],
    [/^Abell(\d+)$/, (match) => `Abell ${designationNumber(match)}`],
    [/^ACO(\d+)$/, (match) => `ACO ${designationNumber(match)}`],
    [/^UGC(\d+)$/, (match) => `UGC ${designationNumber(match)}`],
    [/^PGC(\d+)$/, (match) => `PGC ${designationNumber(match)}`],
    [/^H400$/, () => "Herschel 400"],
  ];
  for (const [pattern, format] of rules) {
    const match = pattern.exec(id);
    if (match) return format(match);
  }
  return id;
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

/** One decimal, rounded once. Imageable hours are shown and sorted with this value. */
export function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

export function formatImageableHours(hours: number): string {
  return `${roundHours(hours).toFixed(1)} h`;
}

export function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
