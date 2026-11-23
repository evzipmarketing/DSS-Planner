import {
  bandAdviceForObject,
  compareTargetPriority,
  frameFillPercent,
  brightnessHint,
  frameFit,
  horizonStory,
  imageableCrossing,
  isDarkObject,
  isImageableSample,
  moonPlan,
  DEFAULT_CUSTOM_LIST_RANGES,
  passesCustomListRanges,
  passesListFilter,
  visibilityScore,
  type BandAdvice,
  type BrightnessHint,
  type CustomListRanges,
  type FrameFit,
  type TargetListFilter,
} from "./planning";
import { cataloguePopularityRank, isObscureCatalogueOnly } from "./catalogue";
import { angularSeparationDeg, equatorialUnit, geometricAltitude, imageableWindowHours, nightHorizonGrid, type HorizonRotation } from "./altitude";
import {
  EMPTY_TARGET_QUERY,
  IMAGEABLE_SAMPLE_MINUTES,
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
  catalogueRank: number;
};

export function isShortlistCandidate(object: DeepSkyObject): boolean {
  if (object.type === "NonEx" || object.type === "Nova" || object.type === "Dup" || object.type === "*") return false;
  if (isObscureCatalogueOnly(object)) return false;
  // Ced / LDN / Barnard patches without a common name — faint fluff around clusters, not tonight leads.
  if (isDarkObject(object) && object.names.length === 0) return false;
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
  // Size alone is not enough when magnitude is unknown — giant null-mag IC patches flooded the list.
  if (
    object.magnitude != null &&
    object.magnitude <= 12 &&
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
  let aboveSteps = 0;
  let minSeparation: number | null = null;
  let moonUp = false;
  const band = bandAdviceForObject(object);
  const altitudes: { time: Date; altitude: number; sunAltitude: number }[] = [];
  const usableSamples: { time: Date; usable: boolean }[] = [];
  for (const cell of grid) {
    const altitude = geometricAltitude(vector, cell.matrix);
    altitudes.push({ time: cell.time, altitude, sunAltitude: cell.sunAltitude });
    if (altitude > maxAltitude) maxAltitude = altitude;
    const separation = angularSeparationDeg(vector, cell.moonVector);
    const usable = isImageableSample({
      band,
      targetAltitudeDeg: altitude,
      sunAltitudeDeg: cell.sunAltitude,
      moonAltitudeDeg: cell.moonAltitude,
      illuminatedFraction: cell.moonIlluminatedFraction,
      moonSeparationDeg: separation,
    });
    usableSamples.push({ time: cell.time, usable });
    if (altitude >= 0) {
      aboveSteps += 1;
      if (cell.moonAltitude >= 0) {
        moonUp = true;
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
  const usableHours = imageableWindowHours(usableSamples, stepHours * 60);
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
    catalogueRank: cataloguePopularityRank(object),
  };
}

/**
 * True when two catalogue entries describe essentially the same patch of sky
 * (e.g. Fish Head Nebula / IC 1795 vs LBN 647), or share a common name.
 */
export function isSameSkyPatch(a: DeepSkyObject, b: DeepSkyObject): boolean {
  if (sharesCommonName(a, b)) return true;
  const sep = angularSeparationDeg(equatorialUnit(a.raDeg, a.decDeg), equatorialUnit(b.raDeg, b.decDeg));
  const radiusA = halfSizeDeg(a.majorArcmin);
  const radiusB = halfSizeDeg(b.majorArcmin);
  if (sep <= (radiusA + radiusB) * 0.75) return true;
  if (sep + Math.min(radiusA, radiusB) <= Math.max(radiusA, radiusB) * 1.05) return true;
  return false;
}

function halfSizeDeg(majorArcmin: number | null): number {
  return Math.max(majorArcmin ?? 8, 4) / 120;
}

function sharesCommonName(a: DeepSkyObject, b: DeepSkyObject): boolean {
  const names = new Set(a.names.map((name) => name.trim().toLowerCase()).filter((name) => name.length >= 4));
  if (names.size === 0) return false;
  return b.names.some((name) => names.has(name.trim().toLowerCase()));
}

/** Prefer Messier (then named) hosts when two rows cover the same patch of sky. */
function preferCanonicalHost(candidate: DeepSkyObject, incumbent: DeepSkyObject): boolean {
  const candidateMessier = candidate.messier != null;
  const incumbentMessier = incumbent.messier != null;
  if (candidateMessier !== incumbentMessier) return candidateMessier;
  const candidateNamed = candidate.names.length > 0;
  const incumbentNamed = incumbent.names.length > 0;
  if (candidateNamed !== incumbentNamed) return candidateNamed;
  return false;
}

/**
 * Keep one row per sky patch. Items are expected best-score-first; a later Messier
 * or named host still replaces an anonymous neighbour (e.g. NGC 1980 vs M42).
 */
export function dedupeOverlappingTargets(items: RankedTarget[]): RankedTarget[] {
  const kept: RankedTarget[] = [];
  for (const item of items) {
    const overlapAt = kept.findIndex((prior) => isSameSkyPatch(prior.object, item.object));
    if (overlapAt < 0) {
      kept.push(item);
      continue;
    }
    const prior = kept[overlapAt]!;
    if (preferCanonicalHost(item.object, prior.object)) {
      kept[overlapAt] = item;
    }
  }
  return kept;
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
  customRanges: CustomListRanges = DEFAULT_CUSTOM_LIST_RANGES,
): RankedTarget[] {
  const grid = nightHorizonGrid(site, dateIso, IMAGEABLE_SAMPLE_MINUTES);
  const stepHours = IMAGEABLE_SAMPLE_MINUTES / 60;
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
    .filter((item) => listFilter !== "custom" || passesCustomListRanges(item, customRanges))
    .sort(compareTargetPriority);
  return dedupeOverlappingTargets(scored).slice(0, limit);
}
