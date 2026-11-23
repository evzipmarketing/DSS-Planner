import { buildNightTrack, type NightTrack, type TimeInterval } from "./altitude";
import { objectTitle } from "./catalogue";
import {
  MOON_BRIGHT_FRACTION,
  bandAdviceForObject,
  moonPlan,
  type BandAdvice,
} from "./planning";
import type { DeepSkyObject, Site } from "./types";

/** Soft cap for MVP UI and chart clarity. */
export const MULTI_TARGET_MAX = 6;

export type MultiTargetStrategy = "peak-first" | "rise-order" | "shortest-window-first";

export type MultiTargetTrack = {
  object: DeepSkyObject;
  track: NightTrack;
  band: BandAdvice;
};

export type MultiTargetMoonAdvice = {
  illuminatedFraction: number;
  phaseName: string;
  score: number;
  hint: string | null;
  minSeparationDeg: number | null;
  moonUpDuringWindow: boolean;
};

export type TargetAssignment = {
  objectId: string;
  name: string;
  requestedHours: number;
  allocatedHours: number;
  assignedIntervals: TimeInterval[];
  usableHours: number;
  maxAltitudeDeg: number;
  peakTime: Date | null;
};

export type MultiTargetPlan = {
  tracks: MultiTargetTrack[];
  ordered: TargetAssignment[];
  unallocatedGaps: TimeInterval[];
};

export function intervalHours(intervals: TimeInterval[]): number {
  return intervals.reduce(
    (sum, interval) => sum + (interval.end.getTime() - interval.start.getTime()) / 3_600_000,
    0,
  );
}

/** Normalize and merge overlapping/adjacent intervals. */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: TimeInterval[] = [];
  let current = { start: sorted[0]!.start, end: sorted[0]!.end };
  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i]!;
    if (next.start.getTime() <= current.end.getTime()) {
      if (next.end.getTime() > current.end.getTime()) current = { start: current.start, end: next.end };
    } else {
      out.push(current);
      current = { start: next.start, end: next.end };
    }
  }
  out.push(current);
  return out;
}

/** Remove blocked ranges from source intervals. */
export function subtractIntervals(source: TimeInterval[], blocked: TimeInterval[]): TimeInterval[] {
  const blocks = mergeIntervals(blocked);
  let remaining = mergeIntervals(source);
  for (const block of blocks) {
    const next: TimeInterval[] = [];
    for (const interval of remaining) {
      if (block.end.getTime() <= interval.start.getTime() || block.start.getTime() >= interval.end.getTime()) {
        next.push(interval);
        continue;
      }
      if (block.start.getTime() > interval.start.getTime()) {
        next.push({ start: interval.start, end: block.start });
      }
      if (block.end.getTime() < interval.end.getTime()) {
        next.push({ start: block.end, end: interval.end });
      }
    }
    remaining = next;
  }
  return remaining.filter((interval) => interval.end.getTime() > interval.start.getTime());
}

/** Take contiguous time from the start of intervals until `hours` is filled. */
export function takeHoursFromIntervals(intervals: TimeInterval[], hours: number): TimeInterval[] {
  if (hours <= 0) return [];
  const needMs = hours * 3_600_000;
  let taken = 0;
  const out: TimeInterval[] = [];
  for (const interval of mergeIntervals(intervals)) {
    if (taken >= needMs) break;
    const span = interval.end.getTime() - interval.start.getTime();
    if (span <= 0) continue;
    const use = Math.min(span, needMs - taken);
    out.push({
      start: interval.start,
      end: new Date(interval.start.getTime() + use),
    });
    taken += use;
  }
  return out;
}

export function buildMultiTargetTracks(input: {
  objects: DeepSkyObject[];
  site: Site;
  dateIso: string;
  stepMinutes?: number;
}): MultiTargetTrack[] {
  const objects = input.objects.slice(0, MULTI_TARGET_MAX);
  return objects.map((object) => {
    const band = bandAdviceForObject(object);
    const track = buildNightTrack({
      raDeg: object.raDeg,
      decDeg: object.decDeg,
      site: input.site,
      dateIso: input.dateIso,
      stepMinutes: input.stepMinutes,
      band,
    });
    return { object, track, band };
  });
}

/**
 * Moon status for a multi-target track. Broadband (and "both") always warn on bright-Moon
 * nights even when usable hours already exclude moonlit time.
 */
export function multiTargetMoonAdvice(item: MultiTargetTrack): MultiTargetMoonAdvice {
  const illuminatedFraction = item.track.moonIlluminatedFraction;
  const phaseName = item.track.moonPhaseName;
  const minSeparationDeg = minMoonSeparation(item.track);
  const moonUpDuringWindow = item.track.samples.some(
    (sample) => sample.usable && sample.moonAltitude >= 0,
  );
  const moon = moonPlan({
    band: item.band,
    illuminatedFraction,
    moonUp: moonUpDuringWindow,
    minSeparationDeg,
  });

  const bright = illuminatedFraction >= MOON_BRIGHT_FRACTION;
  if (bright && item.band === "broadband") {
    return {
      illuminatedFraction,
      phaseName,
      minSeparationDeg,
      moonUpDuringWindow,
      score: Math.min(moon.score, 0.3),
      hint: moon.hint ?? "Moon bright — broadband not recommended",
    };
  }
  if (bright && item.band === "both") {
    return {
      illuminatedFraction,
      phaseName,
      minSeparationDeg,
      moonUpDuringWindow,
      score: Math.min(moon.score, 0.72),
      hint: moon.hint ?? "The Moon is bright. Prefer a narrowband filter for this target.",
    };
  }

  return {
    illuminatedFraction,
    phaseName,
    minSeparationDeg,
    moonUpDuringWindow,
    score: moon.score,
    hint: moon.hint,
  };
}

function minMoonSeparation(track: NightTrack): number | null {
  let min: number | null = null;
  for (const sample of track.samples) {
    if (!sample.usable) continue;
    if (min == null || sample.moonSeparationDeg < min) min = sample.moonSeparationDeg;
  }
  return min;
}

export function planMultiTargetNight(input: {
  tracks: MultiTargetTrack[];
  requestedHoursById: Record<string, number>;
  /** When set, shoot order follows these ids (missing ids append in track order). */
  orderIds?: string[];
  strategy?: MultiTargetStrategy;
}): MultiTargetPlan {
  const strategy = input.strategy ?? "peak-first";
  const tracks = input.tracks.slice(0, MULTI_TARGET_MAX);
  const sorted =
    input.orderIds && input.orderIds.length > 0
      ? orderTracksByIds(tracks, input.orderIds)
      : [...tracks].sort((a, b) => compareTracks(a, b, strategy));

  let booked: TimeInterval[] = [];
  const ordered: TargetAssignment[] = [];

  for (const item of sorted) {
    const requested = Math.max(0, input.requestedHoursById[item.object.id] ?? 0);
    const available = subtractIntervals(item.track.usableIntervals, booked);
    const assignedIntervals = takeHoursFromIntervals(available, requested);
    const allocatedHours = intervalHours(assignedIntervals);
    booked = mergeIntervals([...booked, ...assignedIntervals]);
    ordered.push({
      objectId: item.object.id,
      name: objectTitle(item.object),
      requestedHours: requested,
      allocatedHours,
      assignedIntervals,
      usableHours: item.track.usableHours,
      maxAltitudeDeg: item.track.maxTargetAltitude,
      peakTime: item.track.maxTargetTime,
    });
  }

  const allUsable = mergeIntervals(tracks.flatMap((item) => item.track.usableIntervals));
  const unallocatedGaps = subtractIntervals(allUsable, booked);

  return { tracks, ordered, unallocatedGaps };
}

/** Equal-split default budgets capped by each target’s usable hours. */
export function defaultRequestedHours(tracks: MultiTargetTrack[]): Record<string, number> {
  if (tracks.length === 0) return {};
  const totalUsable = tracks.reduce((sum, item) => sum + item.track.usableHours, 0);
  const equal = totalUsable / tracks.length;
  const out: Record<string, number> = {};
  for (const item of tracks) {
    out[item.object.id] = round1(Math.min(item.track.usableHours, equal));
  }
  return out;
}

/** Reorder track ids with a strategy (for UI “sort” actions). */
export function sortTrackIdsByStrategy(tracks: MultiTargetTrack[], strategy: MultiTargetStrategy): string[] {
  return [...tracks].sort((a, b) => compareTracks(a, b, strategy)).map((item) => item.object.id);
}

function orderTracksByIds(tracks: MultiTargetTrack[], orderIds: string[]): MultiTargetTrack[] {
  const byId = new Map(tracks.map((item) => [item.object.id, item]));
  const ordered: MultiTargetTrack[] = [];
  for (const id of orderIds) {
    const item = byId.get(id);
    if (!item) continue;
    ordered.push(item);
    byId.delete(id);
  }
  for (const item of tracks) {
    if (byId.has(item.object.id)) ordered.push(item);
  }
  return ordered;
}

function compareTracks(a: MultiTargetTrack, b: MultiTargetTrack, strategy: MultiTargetStrategy): number {
  switch (strategy) {
    case "peak-first": {
      const aPeak = a.track.maxTargetTime?.getTime() ?? Number.POSITIVE_INFINITY;
      const bPeak = b.track.maxTargetTime?.getTime() ?? Number.POSITIVE_INFINITY;
      return aPeak - bPeak || a.object.id.localeCompare(b.object.id);
    }
    case "rise-order": {
      const aRise = a.track.usableIntervals[0]?.start.getTime() ?? Number.POSITIVE_INFINITY;
      const bRise = b.track.usableIntervals[0]?.start.getTime() ?? Number.POSITIVE_INFINITY;
      return aRise - bRise || a.object.id.localeCompare(b.object.id);
    }
    case "shortest-window-first": {
      return a.track.usableHours - b.track.usableHours || a.object.id.localeCompare(b.object.id);
    }
    default: {
      const unexpected: never = strategy;
      return unexpected;
    }
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
