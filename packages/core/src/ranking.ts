import {
  bandAdvice,
  compareTargetPriority,
  frameFillPercent,
  brightnessHint,
  frameFit,
  horizonStory,
  imageableCrossing,
  moonPlan,
  passesListFilter,
  visibilityScore,
  type BandAdvice,
  type BrightnessHint,
  type FrameFit,
  type TargetListFilter,
} from "./planning";
import { angularSeparationDeg, equatorialUnit, geometricAltitude, nightHorizonGrid, type HorizonRotation } from "./altitude";
import {
  ASTRONOMICAL_SUN_ALTITUDE_DEG,
  EMPTY_TARGET_QUERY,
  IMAGEABLE_MIN_ALTITUDE_DEG,
  type DeepSkyObject,
  type Site,
  type TargetQuery,
} from "./types";

export type RankedTarget = {
  object: DeepSkyObject;
  maxAltitudeDeg: number;
  usableHours: number;
  hoursAboveHorizon: number;
  rise: Date | null;
  set: Date | null;
  upAtStart: boolean;
  alwaysUp: boolean;
  imageableAtDusk: boolean;
  imageableRise: Date | null;
  frameFillPercent: number | null;
  frameFit: FrameFit;
  band: BandAdvice;
  moonScore: number;
  moonHint: string | null;
  minMoonSeparationDeg: number | null;
  visibility: number;
  brightness: BrightnessHint;
};

export function isShortlistCandidate(object: DeepSkyObject): boolean {
  if (object.type === "NonEx" || object.type === "Nova" || object.type === "Dup" || object.type === "*") return false;
  if (
    (object.type === "DrkN" || object.type === "**" || object.type === "ClG") &&
    object.names.length === 0 &&
    object.messier == null
  ) {
    return false;
  }
  if (object.messier != null) return true;
  if (object.names.length > 0 && (object.magnitude == null || object.magnitude <= 12.5)) return true;
  if (object.magnitude != null && object.magnitude <= 10 && object.type !== "ClG") return true;
  if (
    object.type !== "G" &&
    object.type !== "GPair" &&
    object.type !== "GTrpl" &&
    object.type !== "GGroup" &&
    object.type !== "ClG" &&
    object.type !== "DrkN" &&
    object.majorArcmin != null &&
    object.majorArcmin >= 8
  ) {
    return true;
  }
  return false;
}

export function passesTargetQuery(object: DeepSkyObject, query: TargetQuery): boolean {
  const narrowed =
    query.types.length > 0 || query.catalogues.length > 0 || query.maxMagnitude != null || query.minSizeArcmin != null;
  if (!narrowed) return isShortlistCandidate(object);
  if (query.types.length > 0 && !query.types.includes(object.type)) return false;
  if (query.catalogues.length > 0 && !query.catalogues.some((catalogue) => object.catalogues.includes(catalogue))) {
    return false;
  }
  if (query.maxMagnitude != null && (object.magnitude == null || object.magnitude > query.maxMagnitude)) return false;
  if (query.minSizeArcmin != null && (object.majorArcmin == null || object.majorArcmin < query.minSizeArcmin)) {
    return false;
  }
  if (query.types.length === 0 && (object.type === "NonEx" || object.type === "Dup")) return false;
  return true;
}

type Scored = RankedTarget;

function scoreObject(
  object: DeepSkyObject,
  vector: { x: number; y: number; z: number },
  grid: HorizonRotation[],
  stepHours: number,
  field: { widthArcmin: number; heightArcmin: number } | null,
  bortle: number,
): Scored {
  let maxAltitude = -90;
  let usableHours = 0;
  let aboveSteps = 0;
  let minSeparation: number | null = null;
  let moonUp = false;
  const band = bandAdvice(object.type);
  const altitudes: { time: Date; altitude: number; sunAltitude: number }[] = [];
  for (const cell of grid) {
    const altitude = geometricAltitude(vector, cell.matrix);
    altitudes.push({ time: cell.time, altitude, sunAltitude: cell.sunAltitude });
    if (altitude > maxAltitude) maxAltitude = altitude;
    const usable = cell.sunAltitude <= ASTRONOMICAL_SUN_ALTITUDE_DEG && altitude >= IMAGEABLE_MIN_ALTITUDE_DEG;
    if (usable) usableHours += stepHours;
    if (altitude >= 0) {
      aboveSteps += 1;
      if (cell.moonAltitude >= 0) {
        moonUp = true;
        const separation = angularSeparationDeg(vector, cell.moonVector);
        if (minSeparation == null || separation < minSeparation) minSeparation = separation;
      }
    }
  }
  const horizon = horizonStory(altitudes);
  const crossing = imageableCrossing(altitudes);
  const illuminated = grid[0]?.moonIlluminatedFraction ?? 0;
  const moon = moonPlan({ band, illuminatedFraction: illuminated, moonUp, minSeparationDeg: minSeparation });
  const fill = frameFillPercent(object.majorArcmin, field);
  const visibility = visibilityScore(object, bortle);
  return {
    object,
    maxAltitudeDeg: maxAltitude,
    usableHours,
    hoursAboveHorizon: aboveSteps * stepHours,
    rise: horizon.rise,
    set: horizon.set,
    upAtStart: horizon.upAtStart,
    alwaysUp: horizon.circumpolar,
    imageableAtDusk: crossing.atDusk,
    imageableRise: crossing.rise,
    frameFillPercent: fill,
    frameFit: frameFit(fill),
    band,
    moonScore: moon.score,
    moonHint: moon.hint,
    minMoonSeparationDeg: minSeparation,
    visibility,
    brightness: brightnessHint(visibility),
  };
}

export function rankTargets(
  objects: DeepSkyObject[],
  site: Site,
  dateIso: string,
  limit = 100,
  query: TargetQuery = EMPTY_TARGET_QUERY,
  field: { widthArcmin: number; heightArcmin: number } | null = null,
  listFilter: TargetListFilter = "all",
  bortle = 5,
): RankedTarget[] {
  const grid = nightHorizonGrid(site, dateIso, 15);
  const stepHours = 0.25;
  const scored = objects
    .filter((object) => passesTargetQuery(object, query))
    .map((object) => scoreObject(object, equatorialUnit(object.raDeg, object.decDeg), grid, stepHours, field, bortle))
    .filter((item) => item.hoursAboveHorizon >= 0.25 && item.maxAltitudeDeg >= 0)
    .filter((item) =>
      passesListFilter(
        { band: item.band, frameFit: item.frameFit, moonHint: item.moonHint, moonScore: item.moonScore, objectType: item.object.type },
        listFilter,
      ),
    )
    .sort(compareTargetPriority);
  return scored.slice(0, limit);
}
