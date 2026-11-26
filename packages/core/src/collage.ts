import { angularSeparationDeg, equatorialUnit } from "./altitude";
import { offsetToEquatorial, type MosaicRaDec } from "./mosaic";
import type { FieldOfView } from "./optics";
import {
  DEFAULT_CUSTOM_LIST_RANGES,
  bandAdviceForObject,
  frameFillPercent,
  frameFit,
  passesCustomListRanges,
  passesListFilter,
  type CustomListRanges,
  type TargetListFilter,
} from "./planning";
import { passesTargetQuery } from "./ranking";
import { EMPTY_TARGET_QUERY, type DeepSkyObject, type TargetQuery } from "./types";

/** Soft cap for MVP UI and chart clarity. */
export const COLLAGE_MAX_TARGETS = 8;

/** Cap candidate pool when searching for FOV-fitting groups. */
export const COLLAGE_SUGGEST_CANDIDATE_CAP = 80;

/** Max groups returned by `suggestCollageGroups`. */
export const COLLAGE_SUGGEST_MAX_GROUPS = 12;

export type CollageTargetInput = {
  id: string;
  name: string;
  raDeg: number;
  decDeg: number;
  /** Object major axis; expands the target’s footprint when computing the span. */
  majorArcmin?: number | null;
};

export type CollageFitStatus = "inside" | "tight" | "outside";

export type CollageTargetFit = {
  id: string;
  name: string;
  raDeg: number;
  decDeg: number;
  status: CollageFitStatus;
  /** Margin to nearest frame edge as a fraction of half-size (−ve = outside). */
  marginFraction: number;
};

export type CollageFov = Pick<FieldOfView, "widthDeg" | "heightDeg">;

export type PlanCollageInput = {
  targets: CollageTargetInput[];
  fov: CollageFov;
  /** Extra margin around the bounding box (0–40). Default 10. */
  paddingPercent?: number;
  /** When set, skip auto rotation search. */
  rotationDeg?: number | null;
};

export type CollagePlan = {
  center: MosaicRaDec;
  rotationDeg: number;
  paddingPercent: number;
  /** Tight bounding span before padding. */
  spanWidthDeg: number;
  spanHeightDeg: number;
  /** Required FOV after padding. */
  requiredWidthDeg: number;
  requiredHeightDeg: number;
  frameWidthDeg: number;
  frameHeightDeg: number;
  /** True when every target is inside or tight. */
  fits: boolean;
  targets: CollageTargetFit[];
  insideCount: number;
  outsideCount: number;
  hint: string;
  /** Current FOV footprint at the collage center/rotation. */
  framePolygon: MosaicRaDec[];
  /** Required bounding rectangle (with padding). */
  requiredPolygon: MosaicRaDec[];
};

/**
 * Slightly wider than the sensor so DSS framing shows context around the FOV.
 * Zooms out more when the required span fills most of the frame, and covers the
 * rotated box diagonal so corners are not clipped by the square plate.
 */
export function collagePlateFovDeg(
  plan: Pick<CollagePlan, "frameWidthDeg" | "frameHeightDeg" | "requiredWidthDeg" | "requiredHeightDeg">,
): number {
  const boxW = Math.max(plan.frameWidthDeg, plan.requiredWidthDeg, 0.15);
  const boxH = Math.max(plan.frameHeightDeg, plan.requiredHeightDeg, 0.15);
  const span = Math.max(boxW, boxH);
  const fill = Math.max(
    plan.requiredWidthDeg / Math.max(plan.frameWidthDeg, 1e-6),
    plan.requiredHeightDeg / Math.max(plan.frameHeightDeg, 1e-6),
  );
  // Tight / near-full frames need more breathing room in the preview.
  const margin = fill >= 0.92 ? 1.95 : fill >= 0.78 ? 1.78 : 1.55;
  const diag = Math.hypot(boxW, boxH);
  return Math.min(20, Math.max(0.2, Math.max(span * margin, diag * 1.22)));
}

/**
 * Date/moon-agnostic candidate pool for creative collage framing.
 * Prefers Messier / named / reasonably bright objects that can fit the FOV.
 */
export function selectCollageCatalogueCandidates(
  catalogue: DeepSkyObject[],
  fov: CollageFov,
  cap = COLLAGE_SUGGEST_CANDIDATE_CAP,
): DeepSkyObject[] {
  const limit = Math.max(2, Math.min(COLLAGE_SUGGEST_CANDIDATE_CAP, cap));
  const maxArcmin = Math.min(fov.widthDeg, fov.heightDeg) * 60 * 1.15;
  const scored = catalogue.map((object) => {
    const major = object.majorArcmin;
    let score = 0;
    if (object.messier != null) score += 1200 - object.messier;
    if (object.names.length > 0) score += 80;
    if (object.magnitude != null) score += Math.max(0, 22 - object.magnitude) * 12;
    if (major != null && major > 0 && major <= maxArcmin) score += 40;
    else if (major != null && major > maxArcmin) score -= 60;
    return { object, score };
  });
  scored.sort((a, b) => b.score - a.score || a.object.id.localeCompare(b.object.id));
  return scored.slice(0, limit).map((item) => item.object);
}

export type FilterCatalogueIgnoringDateInput = {
  catalogue: DeepSkyObject[];
  fov: CollageFov;
  field?: { widthArcmin: number; heightArcmin: number } | null;
  listFilter?: TargetListFilter;
  customRanges?: CustomListRanges;
  query?: TargetQuery;
  cap?: number;
};

/**
 * Apply Tonight list filters (narrowband, galaxies, good-fit, …) without altitude or moon.
 * Useful for creative collage browsing when the night date is ignored.
 */
export function filterCatalogueIgnoringDate(input: FilterCatalogueIgnoringDateInput): DeepSkyObject[] {
  const listFilter = input.listFilter ?? "all";
  const customRanges = input.customRanges ?? DEFAULT_CUSTOM_LIST_RANGES;
  const query = input.query ?? EMPTY_TARGET_QUERY;
  const field =
    input.field ??
    ({
      widthArcmin: input.fov.widthDeg * 60,
      heightArcmin: input.fov.heightDeg * 60,
    } as const);

  const filtered = input.catalogue
    .filter((object) => passesTargetQuery(object, query))
    .map((object) => {
      const fill = frameFillPercent(object.majorArcmin, field);
      return {
        object,
        frameFillPercent: fill,
        frameFit: frameFit(fill),
        band: bandAdviceForObject(object),
        // Date ignored: do not block on imageable hours / moon.
        usableHours: 12,
        moonHint: null as string | null,
        moonScore: 1,
      };
    })
    .filter((item) =>
      passesListFilter(
        {
          band: item.band,
          frameFit: item.frameFit,
          moonHint: item.moonHint,
          moonScore: item.moonScore,
          objectType: item.object.type,
        },
        listFilter,
      ),
    )
    .filter((item) => listFilter !== "custom" || passesCustomListRanges(item, customRanges))
    .map((item) => item.object);

  return selectCollageCatalogueCandidates(filtered, input.fov, input.cap ?? COLLAGE_SUGGEST_CANDIDATE_CAP);
}

const DEG = Math.PI / 180;
const TIGHT_MARGIN = 0.08;

function clampPadding(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 10;
  return Math.min(40, Math.max(0, value));
}

function wrapRaDeg(raDeg: number): number {
  let next = raDeg % 360;
  if (next < 0) next += 360;
  return next;
}

function meanCenter(targets: CollageTargetInput[]): MosaicRaDec {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const target of targets) {
    const ra = target.raDeg * DEG;
    const dec = target.decDeg * DEG;
    x += Math.cos(dec) * Math.cos(ra);
    y += Math.cos(dec) * Math.sin(ra);
    z += Math.sin(dec);
  }
  const n = targets.length || 1;
  x /= n;
  y /= n;
  z /= n;
  const hyp = Math.hypot(x, y);
  return {
    raDeg: wrapRaDeg((Math.atan2(y, x) / DEG + 360) % 360),
    decDeg: Math.atan2(z, hyp) / DEG,
  };
}

/** Inverse of `offsetToEquatorial` for small-to-moderate fields (gnomonic). */
export function equatorialToOffset(
  center: MosaicRaDec,
  point: MosaicRaDec,
): { eastDeg: number; northDeg: number } {
  const ra0 = center.raDeg * DEG;
  const dec0 = center.decDeg * DEG;
  const ra = point.raDeg * DEG;
  const dec = point.decDeg * DEG;
  const cosC =
    Math.sin(dec0) * Math.sin(dec) + Math.cos(dec0) * Math.cos(dec) * Math.cos(ra - ra0);
  if (cosC <= 1e-12) {
    return { eastDeg: 0, northDeg: 0 };
  }
  const xi = (Math.cos(dec) * Math.sin(ra - ra0)) / cosC;
  const eta =
    (Math.cos(dec0) * Math.sin(dec) - Math.sin(dec0) * Math.cos(dec) * Math.cos(ra - ra0)) / cosC;
  return { eastDeg: xi / DEG, northDeg: eta / DEG };
}

function rotateOffset(
  eastDeg: number,
  northDeg: number,
  rotationDeg: number,
): { eastDeg: number; northDeg: number } {
  const rad = rotationDeg * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    eastDeg: eastDeg * cos + northDeg * sin,
    northDeg: -eastDeg * sin + northDeg * cos,
  };
}

function rotatedBoxPolygon(
  center: MosaicRaDec,
  widthDeg: number,
  heightDeg: number,
  rotationDeg: number,
): MosaicRaDec[] {
  const halfW = widthDeg / 2;
  const halfH = heightDeg / 2;
  const corners: Array<[number, number]> = [
    [-halfW, halfH],
    [halfW, halfH],
    [halfW, -halfH],
    [-halfW, -halfH],
  ];
  return corners.map(([east, north]) => {
    const rotated = rotateOffset(east, north, rotationDeg);
    return offsetToEquatorial(center, rotated.eastDeg, rotated.northDeg);
  });
}

type LocalPoint = {
  id: string;
  name: string;
  raDeg: number;
  decDeg: number;
  eastDeg: number;
  northDeg: number;
  radiusDeg: number;
};

function toLocalPoints(center: MosaicRaDec, targets: CollageTargetInput[]): LocalPoint[] {
  return targets.map((target) => {
    const offset = equatorialToOffset(center, { raDeg: target.raDeg, decDeg: target.decDeg });
    const radiusDeg =
      target.majorArcmin != null && Number.isFinite(target.majorArcmin) && target.majorArcmin > 0
        ? target.majorArcmin / 120
        : 0;
    return {
      id: target.id,
      name: target.name,
      raDeg: target.raDeg,
      decDeg: target.decDeg,
      eastDeg: offset.eastDeg,
      northDeg: offset.northDeg,
      radiusDeg,
    };
  });
}

function boundsForRotation(
  points: LocalPoint[],
  rotationDeg: number,
): { widthDeg: number; heightDeg: number; minE: number; maxE: number; minN: number; maxN: number } {
  let minE = Infinity;
  let maxE = -Infinity;
  let minN = Infinity;
  let maxN = -Infinity;
  for (const point of points) {
    const rotated = rotateOffset(point.eastDeg, point.northDeg, rotationDeg);
    minE = Math.min(minE, rotated.eastDeg - point.radiusDeg);
    maxE = Math.max(maxE, rotated.eastDeg + point.radiusDeg);
    minN = Math.min(minN, rotated.northDeg - point.radiusDeg);
    maxN = Math.max(maxN, rotated.northDeg + point.radiusDeg);
  }
  if (!Number.isFinite(minE)) {
    return { widthDeg: 0, heightDeg: 0, minE: 0, maxE: 0, minN: 0, maxN: 0 };
  }
  return {
    widthDeg: Math.max(0, maxE - minE),
    heightDeg: Math.max(0, maxN - minN),
    minE,
    maxE,
    minN,
    maxN,
  };
}

function pickAutoRotation(points: LocalPoint[]): number {
  let bestAngle = 0;
  let bestArea = Infinity;
  for (let angle = 0; angle < 180; angle += 5) {
    const bounds = boundsForRotation(points, angle);
    const area = Math.max(bounds.widthDeg, 1e-6) * Math.max(bounds.heightDeg, 1e-6);
    if (area < bestArea - 1e-9 || (Math.abs(area - bestArea) < 1e-9 && angle < bestAngle)) {
      bestArea = area;
      bestAngle = angle;
    }
  }
  return bestAngle;
}

function classifyMargin(marginFraction: number): CollageFitStatus {
  if (marginFraction < 0) return "outside";
  if (marginFraction < TIGHT_MARGIN) return "tight";
  return "inside";
}

function collageHint(fits: boolean, outsideCount: number, requiredW: number, requiredH: number, frameW: number, frameH: number): string {
  if (fits) {
    if (requiredW <= frameW * 0.7 && requiredH <= frameH * 0.7) {
      return "All selected targets fit comfortably in the current FOV.";
    }
    return "All selected targets fit in the current FOV (some near the edge).";
  }
  if (outsideCount > 0) {
    return `Need about ${requiredW.toFixed(2)}° × ${requiredH.toFixed(2)}° (current ${frameW.toFixed(2)}° × ${frameH.toFixed(2)}°). ${outsideCount} target${outsideCount === 1 ? "" : "s"} fall outside.`;
  }
  return `Need about ${requiredW.toFixed(2)}° × ${requiredH.toFixed(2)}° to frame this collage with padding.`;
}

/**
 * Plan a single creative frame that includes several chosen targets.
 * Computes bounding center, optional auto rotation, required FOV vs current, and per-target fit.
 */
export function planCollage(input: PlanCollageInput): CollagePlan | null {
  if (input.targets.length === 0) return null;

  const targets = input.targets.slice(0, COLLAGE_MAX_TARGETS);
  const paddingPercent = clampPadding(input.paddingPercent);
  const center = meanCenter(targets);
  const points = toLocalPoints(center, targets);
  const rotationDeg =
    input.rotationDeg != null && Number.isFinite(input.rotationDeg)
      ? ((input.rotationDeg % 180) + 180) % 180
      : pickAutoRotation(points);

  const bounds = boundsForRotation(points, rotationDeg);
  const spanWidthDeg = bounds.widthDeg;
  const spanHeightDeg = bounds.heightDeg;
  const pad = 1 + paddingPercent / 100;
  const requiredWidthDeg = spanWidthDeg * pad;
  const requiredHeightDeg = spanHeightDeg * pad;

  const frameWidthDeg = Math.max(1e-6, input.fov.widthDeg);
  const frameHeightDeg = Math.max(1e-6, input.fov.heightDeg);
  const halfW = frameWidthDeg / 2;
  const halfH = frameHeightDeg / 2;

  const fitsList: CollageTargetFit[] = points.map((point) => {
    const rotated = rotateOffset(point.eastDeg, point.northDeg, rotationDeg);
    const edgeE = halfW - (Math.abs(rotated.eastDeg) + point.radiusDeg);
    const edgeN = halfH - (Math.abs(rotated.northDeg) + point.radiusDeg);
    const marginDeg = Math.min(edgeE, edgeN);
    const marginFraction = marginDeg / Math.min(halfW, halfH);
    return {
      id: point.id,
      name: point.name,
      raDeg: point.raDeg,
      decDeg: point.decDeg,
      status: classifyMargin(marginFraction),
      marginFraction,
    };
  });

  const outsideCount = fitsList.filter((item) => item.status === "outside").length;
  const insideCount = fitsList.filter((item) => item.status !== "outside").length;
  const fits = outsideCount === 0;

  return {
    center,
    rotationDeg,
    paddingPercent,
    spanWidthDeg,
    spanHeightDeg,
    requiredWidthDeg,
    requiredHeightDeg,
    frameWidthDeg,
    frameHeightDeg,
    fits,
    targets: fitsList,
    insideCount,
    outsideCount,
    hint: collageHint(fits, outsideCount, requiredWidthDeg, requiredHeightDeg, frameWidthDeg, frameHeightDeg),
    framePolygon: rotatedBoxPolygon(center, frameWidthDeg, frameHeightDeg, rotationDeg),
    requiredPolygon: rotatedBoxPolygon(center, requiredWidthDeg, requiredHeightDeg, rotationDeg),
  };
}

/** True when a candidate FOV can cover the required collage span (either orientation). */
export function fovCoversCollage(
  fov: CollageFov,
  requiredWidthDeg: number,
  requiredHeightDeg: number,
): boolean {
  const w = fov.widthDeg;
  const h = fov.heightDeg;
  return (
    (w + 1e-9 >= requiredWidthDeg && h + 1e-9 >= requiredHeightDeg) ||
    (w + 1e-9 >= requiredHeightDeg && h + 1e-9 >= requiredWidthDeg)
  );
}

export type CollageGroupSuggestion = {
  id: string;
  targetIds: string[];
  plan: CollagePlan;
  /** Higher is better: more targets, then fuller frame use without overflowing. */
  score: number;
};

export type SuggestCollageGroupsInput = {
  targets: CollageTargetInput[];
  fov: CollageFov;
  paddingPercent?: number;
  maxGroups?: number;
  maxTargetsPerGroup?: number;
  /** Prefer groups with at least this many targets (default 2). */
  minTargets?: number;
};

/**
 * Suggest multi-target groups that fit in the current FOV.
 * Greedy growth from each seed using nearby candidates, then dedupe and rank.
 */
export function suggestCollageGroups(input: SuggestCollageGroupsInput): CollageGroupSuggestion[] {
  const paddingPercent = clampPadding(input.paddingPercent);
  const maxGroups = Math.max(1, input.maxGroups ?? COLLAGE_SUGGEST_MAX_GROUPS);
  const maxTargetsPerGroup = Math.min(
    COLLAGE_MAX_TARGETS,
    Math.max(2, input.maxTargetsPerGroup ?? COLLAGE_MAX_TARGETS),
  );
  const minTargets = Math.max(2, input.minTargets ?? 2);
  const candidates = input.targets.slice(0, COLLAGE_SUGGEST_CANDIDATE_CAP);
  if (candidates.length < minTargets) return [];

  const fov = input.fov;
  const searchRadiusDeg = Math.hypot(fov.widthDeg, fov.heightDeg) * 1.05;
  const vectors = candidates.map((target) => equatorialUnit(target.raDeg, target.decDeg));
  const byId = new Map(candidates.map((target) => [target.id, target]));

  const seen = new Set<string>();
  const suggestions: CollageGroupSuggestion[] = [];

  for (let seedIndex = 0; seedIndex < candidates.length; seedIndex++) {
    const seed = candidates[seedIndex]!;
    const neighbors: { index: number; sep: number }[] = [];
    for (let j = 0; j < candidates.length; j++) {
      if (j === seedIndex) continue;
      const sep = angularSeparationDeg(vectors[seedIndex]!, vectors[j]!);
      if (sep <= searchRadiusDeg) neighbors.push({ index: j, sep });
    }
    neighbors.sort((a, b) => a.sep - b.sep);

    const group: CollageTargetInput[] = [seed];
    let bestPlan = planCollage({ targets: group, fov, paddingPercent });
    if (!bestPlan?.fits) continue;

    for (const neighbor of neighbors) {
      if (group.length >= maxTargetsPerGroup) break;
      const next = candidates[neighbor.index]!;
      if (group.some((item) => item.id === next.id)) continue;
      const trial = [...group, next];
      const trialPlan = planCollage({ targets: trial, fov, paddingPercent });
      if (!trialPlan?.fits) continue;
      group.push(next);
      bestPlan = trialPlan;
    }

    if (group.length < minTargets || !bestPlan?.fits) continue;

    const targetIds = group.map((item) => item.id).sort();
    const id = targetIds.join("|");
    if (seen.has(id)) continue;
    seen.add(id);

    // Prefer denser groups that still use a good fraction of the frame.
    const fill =
      Math.min(bestPlan.requiredWidthDeg / bestPlan.frameWidthDeg, 1) *
      Math.min(bestPlan.requiredHeightDeg / bestPlan.frameHeightDeg, 1);
    const score = group.length * 10 + fill * 3;

    suggestions.push({
      id,
      targetIds,
      plan: bestPlan,
      score,
    });
  }

  // Drop subsets when a larger group already contains the same members.
  const ranked = suggestions.sort((a, b) => b.score - a.score || b.targetIds.length - a.targetIds.length);
  const kept: CollageGroupSuggestion[] = [];
  for (const suggestion of ranked) {
    const isSubset = kept.some(
      (larger) =>
        larger.targetIds.length > suggestion.targetIds.length &&
        suggestion.targetIds.every((id) => larger.targetIds.includes(id)),
    );
    if (isSubset) continue;
    // Rebuild plan names from current candidate map (stable order by id).
    const targets = suggestion.targetIds
      .map((id) => byId.get(id))
      .filter((item): item is CollageTargetInput => Boolean(item));
    const plan = planCollage({ targets, fov, paddingPercent });
    if (!plan?.fits) continue;
    kept.push({ ...suggestion, plan });
    if (kept.length >= maxGroups) break;
  }

  return kept;
}
