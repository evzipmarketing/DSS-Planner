import { assertNever } from "./never";
import { DEEP_SKY_TYPES, type CatalogueSource, type DeepSkyObject, type DeepSkyType } from "./types";

const TYPE_SET = new Set<string>(DEEP_SKY_TYPES);

export function objectTypeLabel(type: DeepSkyType): string {
  switch (type) {
    case "G":
      return "Galaxy";
    case "GPair":
      return "Galaxy pair";
    case "GTrpl":
      return "Galaxy trio";
    case "GGroup":
      return "Galaxy group";
    case "OCl":
      return "Open cluster";
    case "GCl":
      return "Globular cluster";
    case "Cl+N":
      return "Cluster with nebulosity";
    case "PN":
      return "Planetary nebula";
    case "HII":
      return "H II region";
    case "EmN":
      return "Emission nebula";
    case "Neb":
      return "Nebula";
    case "RfN":
      return "Reflection nebula";
    case "SNR":
      return "Supernova remnant";
    case "DrkN":
      return "Dark nebula";
    default:
      return assertNever(type, "object type");
  }
}

export function objectTitle(object: DeepSkyObject): string {
  return object.names[0] ?? object.id;
}

export function normaliseQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/messier/g, "m")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^([a-z]+?)0+(\d)/, "$1$2");
}

function compactId(id: string): string {
  return normaliseQuery(id);
}

export function searchCatalogue(objects: DeepSkyObject[], query: string, limit = 20): DeepSkyObject[] {
  const needle = normaliseQuery(query);
  if (!needle) return [];
  const messierNumber = /^m(\d{1,3})$/.exec(needle);
  const ranked: { object: DeepSkyObject; score: number }[] = [];
  for (const object of objects) {
    const score = matchScore(object, needle, messierNumber?.[1] ?? null);
    if (score > 0) ranked.push({ object, score });
  }
  ranked.sort((a, b) => b.score - a.score || a.object.id.localeCompare(b.object.id));
  return ranked.slice(0, limit).map((item) => item.object);
}

function matchScore(object: DeepSkyObject, needle: string, messier: string | null): number {
  const id = compactId(object.id);
  if (id === needle) return 100;
  if (messier && object.messier === Number(messier)) return 100;
  if (object.names.some((name) => normaliseQuery(name) === needle)) return 92;
  if (id.startsWith(needle) && needle.length >= 2) return 74;
  if (object.names.some((name) => normaliseQuery(name).startsWith(needle) && needle.length >= 3)) return 66;
  if (needle.length >= 3 && object.names.some((name) => normaliseQuery(name).includes(needle))) return 48;
  if (needle.length >= 3 && id.includes(needle)) return 36;
  return 0;
}

export function parseCatalogue(value: unknown): DeepSkyObject[] {
  if (!Array.isArray(value)) return [];
  const objects: DeepSkyObject[] = [];
  for (const row of value) {
    const parsed = parseRow(row);
    if (parsed) objects.push(parsed);
  }
  return objects;
}

function parseRow(row: unknown): DeepSkyObject | null {
  if (!Array.isArray(row) || row.length < 13) return null;
  const [id, type, ra, dec, constellation, major, minor, pa, mag, messier, names, opacity, source] = row;
  if (typeof id !== "string" || typeof type !== "string" || !TYPE_SET.has(type)) return null;
  if (typeof ra !== "number" || typeof dec !== "number") return null;
  return {
    id,
    type: type as DeepSkyType,
    raDeg: ra,
    decDeg: dec,
    constellation: typeof constellation === "string" ? constellation : null,
    majorArcmin: typeof major === "number" ? major : null,
    minorArcmin: typeof minor === "number" ? minor : null,
    positionAngleDeg: typeof pa === "number" ? pa : null,
    magnitude: typeof mag === "number" ? mag : null,
    messier: typeof messier === "number" ? messier : null,
    names: typeof names === "string" ? names.split("|").filter(Boolean) : [],
    opacity: typeof opacity === "number" ? opacity : null,
    source: sourceCode(source),
  };
}

function sourceCode(value: unknown): CatalogueSource {
  return value === 1 ? "lynds" : "openngc";
}
