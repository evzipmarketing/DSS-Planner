import { buildNightTrack, type NightTrack, type TimeInterval } from "./altitude";
import { objectTitle } from "./catalogue";
import { roundHours } from "./format";
import { intervalHours, mergeIntervals, subtractIntervals, takeHoursFromIntervals } from "./multi-target";
import {
  bandAdviceForObject,
  bandAdviceFromFilter,
  frameFillPercent,
  frameFit,
  type BandAdvice,
  type FrameFit,
} from "./planning";
import type { DeepSkyObject, FilterKind, Site } from "./types";

/** Soft cap for MVP UI clarity (one column per rig). */
export const MULTI_RIG_MAX = 6;

/** Soft cap for targets assigned to a single rig in one night. */
export const MULTI_RIG_TARGETS_PER_RIG = 4;

export type MultiRigOpticsField = {
  widthArcmin: number;
  heightArcmin: number;
};

/** User-editable session assignment before planning. */
export type MultiRigAssignmentDraft = {
  rigId: string;
  objectId: string | null;
  filterIds: string[];
  plannedHours: number;
};

export type MultiRigSession = {
  night: string;
  assignments: MultiRigAssignmentDraft[];
};

export type MultiRigAssignmentInput = {
  rigId: string;
  rigName: string;
  object: DeepSkyObject;
  filterIds: string[];
  /** Band for the night track (from filters or object advice). */
  band: BandAdvice;
  plannedHours: number;
  field: MultiRigOpticsField | null;
};

export type MultiRigAssignmentResult = {
  rigId: string;
  rigName: string;
  objectId: string;
  objectName: string;
  filterIds: string[];
  band: BandAdvice;
  plannedHours: number;
  allocatedHours: number;
  usableHours: number;
  assignedIntervals: TimeInterval[];
  usableIntervals: TimeInterval[];
  frameFillPercent: number | null;
  frameFit: FrameFit;
  maxAltitudeDeg: number;
  peakTime: Date | null;
  track: NightTrack;
};

export type MultiRigConflictKind = "overlapping-schedule" | "shared-peak-shortage";

export type MultiRigConflict = {
  objectId: string;
  objectName: string;
  rigIds: string[];
  kind: MultiRigConflictKind;
  message: string;
};

export type MultiRigPlan = {
  dateIso: string;
  assignments: MultiRigAssignmentResult[];
  conflicts: MultiRigConflict[];
};

/**
 * Prefer filter kinds when present; mix of narrow + broad → "both".
 * Empty filter list falls back to object advice (or broadband).
 */
export function bandAdviceForRigFilters(
  filterKinds: FilterKind[],
  object?: DeepSkyObject | null,
): BandAdvice {
  if (filterKinds.length === 0) {
    return object ? bandAdviceForObject(object) : "broadband";
  }
  let hasNarrow = false;
  let hasBroad = false;
  for (const kind of filterKinds) {
    const advice = bandAdviceFromFilter(kind);
    if (advice === "narrowband") hasNarrow = true;
    else hasBroad = true;
  }
  if (hasNarrow && hasBroad) return "both";
  if (hasNarrow) return "narrowband";
  return "broadband";
}

/** Default planned hours: half the usable window, capped at 3 h. */
export function defaultPlannedHoursForUsable(usableHours: number): number {
  if (usableHours <= 0) return 0;
  return roundHours(Math.min(3, Math.max(0.5, usableHours * 0.5)));
}

/**
 * Equal-split defaults for several targets on one rig, each capped by usable hours.
 */
export function defaultPlannedHoursForRigTargets(usableHoursByObjectId: Record<string, number>): Record<string, number> {
  const ids = Object.keys(usableHoursByObjectId);
  if (ids.length === 0) return {};
  const totalUsable = ids.reduce((sum, id) => sum + Math.max(0, usableHoursByObjectId[id] ?? 0), 0);
  const equal = totalUsable / ids.length;
  const out: Record<string, number> = {};
  for (const id of ids) {
    const usable = Math.max(0, usableHoursByObjectId[id] ?? 0);
    out[id] = roundHours(Math.min(usable, equal, 3));
  }
  return out;
}

/**
 * Plan one night across several rigs. Different rigs run in parallel. Multiple
 * targets on the same rig share that mount exclusively (no overlapping slots).
 * Conflicts fire when the same object is over-subscribed across rigs.
 */
export function planMultiRigs(input: {
  site: Site;
  dateIso: string;
  assignments: MultiRigAssignmentInput[];
  stepMinutes?: number;
}): MultiRigPlan {
  const capped = capAssignments(input.assignments);
  const built = capped.map((item) => {
    const plannedHours = Math.max(0, item.plannedHours);
    const track = buildNightTrack({
      raDeg: item.object.raDeg,
      decDeg: item.object.decDeg,
      site: input.site,
      dateIso: input.dateIso,
      stepMinutes: input.stepMinutes,
      band: item.band,
    });
    const fill = frameFillPercent(item.object.majorArcmin, item.field);
    return {
      input: item,
      plannedHours: roundHours(plannedHours),
      track,
      fill,
    };
  });

  const byRig = new Map<string, typeof built>();
  for (const item of built) {
    const list = byRig.get(item.input.rigId) ?? [];
    list.push(item);
    byRig.set(item.input.rigId, list);
  }

  const assignments: MultiRigAssignmentResult[] = [];
  for (const group of byRig.values()) {
    let booked: TimeInterval[] = [];
    for (const item of group) {
      const available = subtractIntervals(item.track.usableIntervals, booked);
      const assignedIntervals = takeHoursFromIntervals(available, item.plannedHours);
      const allocatedHours = roundHours(intervalHours(assignedIntervals));
      booked = mergeIntervals([...booked, ...assignedIntervals]);
      assignments.push({
        rigId: item.input.rigId,
        rigName: item.input.rigName,
        objectId: item.input.object.id,
        objectName: objectTitle(item.input.object),
        filterIds: [...item.input.filterIds],
        band: item.input.band,
        plannedHours: item.plannedHours,
        allocatedHours,
        usableHours: roundHours(item.track.usableHours),
        assignedIntervals,
        usableIntervals: item.track.usableIntervals,
        frameFillPercent: item.fill == null ? null : round1(item.fill),
        frameFit: frameFit(item.fill),
        maxAltitudeDeg: item.track.maxTargetAltitude,
        peakTime: item.track.maxTargetTime,
        track: item.track,
      });
    }
  }

  return {
    dateIso: input.dateIso,
    assignments,
    conflicts: detectMultiRigConflicts(assignments),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Keep at most MULTI_RIG_MAX rigs and MULTI_RIG_TARGETS_PER_RIG targets per rig (input order). */
function capAssignments(assignments: MultiRigAssignmentInput[]): MultiRigAssignmentInput[] {
  const seenRigs: string[] = [];
  const countByRig = new Map<string, number>();
  const out: MultiRigAssignmentInput[] = [];
  for (const item of assignments) {
    if (!seenRigs.includes(item.rigId)) {
      if (seenRigs.length >= MULTI_RIG_MAX) continue;
      seenRigs.push(item.rigId);
    }
    const count = countByRig.get(item.rigId) ?? 0;
    if (count >= MULTI_RIG_TARGETS_PER_RIG) continue;
    countByRig.set(item.rigId, count + 1);
    out.push(item);
  }
  return out;
}

/** Same-object conflicts across different rigs: overlapping planned windows and/or combined hours vs usable. */
export function detectMultiRigConflicts(assignments: MultiRigAssignmentResult[]): MultiRigConflict[] {
  const byObject = new Map<string, MultiRigAssignmentResult[]>();
  for (const item of assignments) {
    const list = byObject.get(item.objectId) ?? [];
    list.push(item);
    byObject.set(item.objectId, list);
  }

  const conflicts: MultiRigConflict[] = [];
  for (const [objectId, group] of byObject) {
    const acrossRigs = uniqueByRig(group);
    if (acrossRigs.length < 2) continue;
    const objectName = acrossRigs[0]!.objectName;
    const rigIds = acrossRigs.map((item) => item.rigId);
    const combinedPlanned = roundHours(acrossRigs.reduce((sum, item) => sum + item.plannedHours, 0));
    const maxUsable = Math.max(...acrossRigs.map((item) => item.usableHours));
    const intervalsOverlap = groupHasOverlappingIntervals(acrossRigs);

    if (combinedPlanned > maxUsable + 1e-9) {
      conflicts.push({
        objectId,
        objectName,
        rigIds,
        kind: "shared-peak-shortage",
        message: `${objectName} on ${formatRigNames(acrossRigs)} needs ${combinedPlanned.toFixed(1)} h combined but only ${maxUsable.toFixed(1)} h is imageable tonight.`,
      });
    } else if (intervalsOverlap) {
      conflicts.push({
        objectId,
        objectName,
        rigIds,
        kind: "overlapping-schedule",
        message: `${objectName} is scheduled on overlapping windows for ${formatRigNames(acrossRigs)}. Parallel imaging is fine if both rigs can run together.`,
      });
    }
  }
  return conflicts;
}

function uniqueByRig(group: MultiRigAssignmentResult[]): MultiRigAssignmentResult[] {
  const seen = new Set<string>();
  const out: MultiRigAssignmentResult[] = [];
  for (const item of group) {
    if (seen.has(item.rigId)) continue;
    seen.add(item.rigId);
    out.push(item);
  }
  return out;
}

function groupHasOverlappingIntervals(group: MultiRigAssignmentResult[]): boolean {
  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      if (intervalsOverlap(group[i]!.assignedIntervals, group[j]!.assignedIntervals)) return true;
    }
  }
  return false;
}

function intervalsOverlap(a: TimeInterval[], b: TimeInterval[]): boolean {
  for (const left of a) {
    for (const right of b) {
      if (left.start.getTime() < right.end.getTime() && right.start.getTime() < left.end.getTime()) {
        return true;
      }
    }
  }
  return false;
}

function formatRigNames(group: MultiRigAssignmentResult[]): string {
  return group.map((item) => item.rigName).join(" & ");
}
