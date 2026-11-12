import { formatCatalogueId } from "./format";
import { assertNever } from "./never";
import {
  CATALOGUE_IDS,
  DEEP_SKY_TYPES,
  type CatalogueId,
  type DeepSkyObject,
  type DeepSkyType,
} from "./types";

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
    case "ClG":
      return "Galaxy cluster";
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
    case "Ast":
      return "Asterism";
    case "StCl":
      return "Star cloud";
    case "*Ass":
      return "Association";
    case "**":
      return "Double star";
    case "*":
      return "Star";
    case "NonEx":
      return "Nonexistent";
    case "Nova":
      return "Nova";
    case "Other":
      return "Other";
    case "Dup":
      return "Duplicate entry";
    default:
      return assertNever(type, "object type");
  }
}

export function catalogueLabel(catalogue: CatalogueId): string {
  switch (catalogue) {
    case "messier":
      return "Messier";
    case "ngc":
      return "NGC";
    case "ic":
      return "IC";
    case "caldwell":
      return "Caldwell";
    case "sharpless":
      return "Sharpless";
    case "barnard":
      return "Barnard";
    case "ldn":
      return "Lynds dark";
    case "lbn":
      return "Lynds bright";
    case "vdb":
      return "van den Bergh";
    case "abell-pn":
      return "Abell planetary";
    case "abell-gc":
      return "Abell cluster";
    case "collinder":
      return "Collinder";
    case "melotte":
      return "Melotte";
    case "trumpler":
      return "Trumpler";
    case "stock":
      return "Stock";
    case "arp":
      return "Arp";
    case "herschel":
      return "Herschel 400";
    case "rcw":
      return "RCW";
    case "cederblad":
      return "Cederblad";
    case "gum":
      return "Gum";
    case "ugc":
      return "UGC";
    case "pgc":
      return "PGC";
    default:
      return assertNever(catalogue, "catalogue");
  }
}

export function objectTitle(object: DeepSkyObject): string {
  return object.names[0] ?? primaryDesignation(object);
}

const DESIGNATION_ORDER: Array<[RegExp, number]> = [
  [/^M\d+$/, 0],
  [/^C\d+$/, 1],
  [/^NGC\d/, 2],
  [/^IC\d/, 3],
  [/^Sh2-\d/, 4],
  [/^B\d/, 5],
  [/^LDN\d/, 6],
  [/^LBN\d/, 7],
  [/^vdB\d/, 8],
  [/^Abell\d/, 9],
  [/^ACO\d/, 9],
  [/^Cr\d/, 10],
  [/^Mel\d/, 11],
  [/^Tr\d/, 12],
  [/^St\d/, 13],
  [/^Arp\d/, 14],
  [/^RCW\d/, 15],
  [/^Ced\d/, 16],
  [/^UGC\d/, 17],
  [/^PGC\d/, 18],
];

function designationRank(id: string): number | null {
  for (const [pattern, rank] of DESIGNATION_ORDER) {
    if (pattern.test(id)) return rank;
  }
  return null;
}

/** Messier, then Caldwell, NGC, IC, and the other catalogues in that order. */
export function primaryDesignation(object: DeepSkyObject): string {
  const ids = [object.id, ...object.aliases];
  if (object.messier != null) ids.push(`M${object.messier}`);
  let best: { id: string; rank: number } | null = null;
  for (const id of ids) {
    const rank = designationRank(id);
    if (rank == null) continue;
    if (!best || rank < best.rank) best = { id, rank };
  }
  return formatCatalogueId(best?.id ?? object.id);
}

export function normaliseQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/van\s+den\s+bergh/g, "vdb")
    .replace(/herschel\s*400/g, "h400")
    .replace(/sharpless/g, "sh2")
    .replace(/caldwell/g, "c")
    .replace(/collinder/g, "cr")
    .replace(/melotte/g, "mel")
    .replace(/trumpler/g, "tr")
    .replace(/cederblad/g, "ced")
    .replace(/barnard/g, "b")
    .replace(/messier/g, "m")
    .replace(/stock/g, "st")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^([a-z]+?)0+(\d)/, "$1$2");
}

function queryKeys(query: string): string[] {
  const base = normaliseQuery(query);
  const keys = new Set<string>([base]);
  const abell = /^abell(\d+)$/.exec(base);
  if (abell?.[1]) keys.add(`aco${abell[1]}`);
  return [...keys];
}

export function searchCatalogue(objects: DeepSkyObject[], query: string, limit = 20): DeepSkyObject[] {
  const needles = queryKeys(query).filter((key) => key.length > 0);
  if (needles.length === 0) return [];
  const ranked: { object: DeepSkyObject; score: number }[] = [];
  for (const object of objects) {
    const score = Math.max(...needles.map((needle) => matchScore(object, needle)));
    if (score > 0) ranked.push({ object, score });
  }
  ranked.sort((a, b) => b.score - a.score || a.object.id.localeCompare(b.object.id));
  return ranked.slice(0, limit).map((item) => item.object);
}

function matchScore(object: DeepSkyObject, needle: string): number {
  let best = 0;
  for (const alias of object.aliases) {
    const compact = normaliseQuery(alias);
    if (compact === needle) best = Math.max(best, 100);
    else if (needle.length >= 2 && compact.startsWith(needle)) best = Math.max(best, 74);
    else if (needle.length >= 3 && compact.includes(needle)) best = Math.max(best, 36);
  }
  for (const name of object.names) {
    const compact = normaliseQuery(name);
    if (compact === needle) best = Math.max(best, 92);
    else if (needle.length >= 3 && compact.startsWith(needle)) best = Math.max(best, 66);
    else if (needle.length >= 3 && compact.includes(needle)) best = Math.max(best, 48);
  }
  return best;
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
  if (!Array.isArray(row) || row.length < 12) return null;
  const [id, type, ra, dec, constellation, major, minor, pa, mag, names, opacity, aliases, note] = row;
  if (typeof id !== "string" || typeof type !== "string" || !TYPE_SET.has(type)) return null;
  if (typeof ra !== "number" || typeof dec !== "number" || typeof aliases !== "string") return null;
  const aliasList = aliases.split("|").filter(Boolean);
  const messierAlias = aliasList.find((item) => /^M\d+$/.test(item));
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
    messier: messierAlias ? Number(messierAlias.slice(1)) : null,
    names: typeof names === "string" ? names.split("|").filter(Boolean) : [],
    opacity: typeof opacity === "number" ? opacity : null,
    aliases: aliasList,
    catalogues: cataloguesFor(aliasList),
    note: typeof note === "string" ? note : null,
  };
}

export function cataloguesFor(aliases: string[]): CatalogueId[] {
  const found = new Set<CatalogueId>();
  for (const alias of aliases) {
    const catalogue = catalogueOfAlias(alias);
    if (catalogue) found.add(catalogue);
  }
  return CATALOGUE_IDS.filter((id) => found.has(id));
}

function catalogueOfAlias(alias: string): CatalogueId | null {
  if (/^M\d+$/.test(alias)) return "messier";
  if (/^NGC\d/.test(alias)) return "ngc";
  if (/^IC\d/.test(alias)) return "ic";
  if (/^C\d+$/.test(alias)) return "caldwell";
  if (/^Sh2-\d+$/.test(alias)) return "sharpless";
  if (/^B\d/.test(alias)) return "barnard";
  if (/^LDN\d/.test(alias)) return "ldn";
  if (/^LBN\d/.test(alias)) return "lbn";
  if (/^vdB\d/.test(alias)) return "vdb";
  if (/^Abell\d/.test(alias)) return "abell-pn";
  if (/^ACO\d/.test(alias)) return "abell-gc";
  if (/^Cr\d/.test(alias)) return "collinder";
  if (/^Mel\d/.test(alias)) return "melotte";
  if (/^Tr\d/.test(alias)) return "trumpler";
  if (/^St\d/.test(alias)) return "stock";
  if (/^Arp\d/.test(alias)) return "arp";
  if (alias === "H400") return "herschel";
  if (/^RCW\d/.test(alias)) return "rcw";
  if (/^Ced\d/.test(alias)) return "cederblad";
  if (/^Gum\d/.test(alias)) return "gum";
  if (/^UGC\d/.test(alias)) return "ugc";
  if (/^PGC\d/.test(alias)) return "pgc";
  return null;
}
