import { assertNever } from "./never";
import {
  equatorialUnit,
  geometricAltitude,
  nightHorizonGrid,
  type HorizonRotation,
} from "./altitude";
import {
  ASTRONOMICAL_SUN_ALTITUDE_DEG,
  USABLE_MIN_ALTITUDE_DEG,
  type DeepSkyObject,
  type DeepSkyType,
  type Site,
} from "./types";

export type RankedTarget = {
  object: DeepSkyObject;
  maxAltitudeDeg: number;
  usableHours: number;
};

export function isShortlistCandidate(object: DeepSkyObject): boolean {
  if (object.source === "lynds") return false;
  if (object.type === "DrkN" && object.names.length === 0) return false;
  if (object.messier != null) return true;
  if (object.names.length > 0 && (object.magnitude == null || object.magnitude <= 12.5)) return true;
  if (object.magnitude != null && object.magnitude <= 10) return true;
  if (object.type !== "G" && object.majorArcmin != null && object.majorArcmin >= 8) return true;
  return false;
}

function typeWeight(type: DeepSkyType): number {
  switch (type) {
    case "Neb":
    case "EmN":
    case "RfN":
    case "HII":
    case "Cl+N":
    case "PN":
    case "SNR":
      return 1.25;
    case "OCl":
    case "GCl":
      return 1.12;
    case "G":
    case "GPair":
    case "GTrpl":
    case "GGroup":
      return 1;
    case "DrkN":
      return 0.85;
    default:
      return assertNever(type, "object type");
  }
}

type Scored = RankedTarget & { score: number };

function scoreObject(
  object: DeepSkyObject,
  vector: { x: number; y: number; z: number },
  grid: HorizonRotation[],
  stepHours: number,
): Scored {
  let maxAltitude = -90;
  let usableHours = 0;
  for (const cell of grid) {
    const altitude = geometricAltitude(vector, cell.matrix);
    if (altitude > maxAltitude) maxAltitude = altitude;
    if (cell.sunAltitude <= ASTRONOMICAL_SUN_ALTITUDE_DEG && altitude >= USABLE_MIN_ALTITUDE_DEG) {
      usableHours += stepHours;
    }
  }
  const brightness =
    object.magnitude == null ? 0.65 : clamp((12.5 - object.magnitude) / 10, 0.25, 1.35);
  let score = usableHours * brightness * typeWeight(object.type) * clamp(maxAltitude / 75, 0.35, 1.25);
  if (object.messier != null) score *= 1.12;
  if (object.names.length > 0) score *= 1.08;
  return { object, maxAltitudeDeg: maxAltitude, usableHours, score };
}

export function rankTargets(
  objects: DeepSkyObject[],
  site: Site,
  dateIso: string,
  limit = 12,
): RankedTarget[] {
  const grid = nightHorizonGrid(site, dateIso, 15);
  const stepHours = 0.25;
  const scored = objects
    .filter(isShortlistCandidate)
    .map((object) => scoreObject(object, equatorialUnit(object.raDeg, object.decDeg), grid, stepHours));

  const primary = scored
    .filter((item) => item.usableHours >= 0.5 && item.maxAltitudeDeg >= USABLE_MIN_ALTITUDE_DEG)
    .sort((a, b) => b.score - a.score);

  const picked = primary.slice(0, limit);
  if (picked.length >= 8) return picked.map(strip);

  const seen = new Set(picked.map((item) => item.object.id));
  const fillers = scored
    .filter((item) => !seen.has(item.object.id) && item.maxAltitudeDeg >= 20)
    .sort((a, b) => b.maxAltitudeDeg - a.maxAltitudeDeg);
  for (const item of fillers) {
    if (picked.length >= limit) break;
    picked.push(item);
  }
  return picked.map(strip);
}

function strip(item: Scored): RankedTarget {
  return {
    object: item.object,
    maxAltitudeDeg: item.maxAltitudeDeg,
    usableHours: item.usableHours,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
