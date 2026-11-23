import { buildNightTrack, type NightTrack, type TimeInterval } from "./altitude";
import { takeHoursFromIntervals } from "./multi-target";
import { bandAdviceForObject, moonPlan, nightSuitableForBand, type BandAdvice } from "./planning";
import { addDaysIso } from "./time";
import type { DeepSkyObject, Site } from "./types";

/** Safety cap while searching forward for enough imageable hours. */
export const SINGLE_TARGET_MAX_NIGHTS = 45;

/** @deprecated Prefer goal-first planning; kept for callers that still pass a search window. */
export const SINGLE_TARGET_DEFAULT_NIGHTS = 14;

export type SingleTargetNight = {
  dateIso: string;
  usableHours: number;
  usableIntervals: TimeInterval[];
  plannedHours: number;
  plannedIntervals: TimeInterval[];
  maxAltitudeDeg: number;
  moonIlluminatedFraction: number;
  moonPhaseName: string;
  minMoonSeparationDeg: number | null;
  moonUpDuringWindow: boolean;
  moonScore: number;
  moonHint: string | null;
  cumulativeHoursAfter: number;
};

export type SingleTargetPlan = {
  objectId: string;
  band: BandAdvice;
  goalHours: number;
  startDateIso: string;
  /** Nights that contribute imaging time toward the goal, in order. */
  nights: SingleTargetNight[];
  cumulativeHours: number;
  nightsNeeded: number | null;
  remainingHours: number;
  /** True when cumulativeHours meets or exceeds goalHours. */
  goalMet: boolean;
  /** How many civil nights were scanned before stopping (including empty nights). */
  nightsScanned: number;
};

export function enumerateNightDates(startIso: string, nightCount: number): string[] {
  const count = Math.max(0, Math.min(SINGLE_TARGET_MAX_NIGHTS, Math.floor(nightCount)));
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    dates.push(addDaysIso(startIso, i));
  }
  return dates;
}

/**
 * From a start date, find successive nights whose imageable windows add up to `goalHours`.
 * Returns only nights that contribute planned time, with usable and scheduled intervals.
 */
export function planSingleTarget(input: {
  object: DeepSkyObject;
  site: Site;
  startDateIso: string;
  goalHours: number;
  /** Stop searching after this many civil nights (default SINGLE_TARGET_MAX_NIGHTS). */
  maxNights?: number;
  /** @deprecated Use maxNights. */
  nightCount?: number;
  stepMinutes?: number;
  band?: BandAdvice;
}): SingleTargetPlan {
  const band = input.band ?? bandAdviceForObject(input.object);
  const goalHours = Math.max(0, input.goalHours);
  const maxNights = Math.max(
    1,
    Math.min(SINGLE_TARGET_MAX_NIGHTS, Math.floor(input.maxNights ?? input.nightCount ?? SINGLE_TARGET_MAX_NIGHTS)),
  );

  const nights: SingleTargetNight[] = [];
  let cumulative = 0;
  let nightsScanned = 0;

  for (let offset = 0; offset < maxNights; offset += 1) {
    if (goalHours > 0 && cumulative + 1e-9 >= goalHours) break;

    const dateIso = addDaysIso(input.startDateIso, offset);
    nightsScanned += 1;
    const track = buildNightTrack({
      raDeg: input.object.raDeg,
      decDeg: input.object.decDeg,
      site: input.site,
      dateIso,
      stepMinutes: input.stepMinutes,
      band,
    });

    const remaining = Math.max(0, goalHours - cumulative);
    if (track.usableHours <= 0 || remaining <= 0) continue;

    const plannedIntervals = takeHoursFromIntervals(track.usableIntervals, remaining);
    const plannedHours = round1(
      plannedIntervals.reduce(
        (sum, interval) => sum + (interval.end.getTime() - interval.start.getTime()) / 3_600_000,
        0,
      ),
    );
    if (plannedHours <= 0) continue;

    const minMoonSeparationDeg = minMoonSeparation(track);
    const moonUpDuringWindow = track.samples.some((sample) => sample.usable && sample.moonAltitude > 0);
    const moon = moonPlan({
      band,
      illuminatedFraction: track.moonIlluminatedFraction,
      moonUp: moonUpDuringWindow,
      minSeparationDeg: minMoonSeparationDeg,
    });

    if (
      !nightSuitableForBand({
        band,
        illuminatedFraction: track.moonIlluminatedFraction,
        moonScore: moon.score,
      })
    ) {
      continue;
    }

    cumulative = round1(cumulative + plannedHours);
    nights.push({
      dateIso,
      usableHours: track.usableHours,
      usableIntervals: track.usableIntervals,
      plannedHours,
      plannedIntervals,
      maxAltitudeDeg: track.maxTargetAltitude,
      moonIlluminatedFraction: track.moonIlluminatedFraction,
      moonPhaseName: track.moonPhaseName,
      minMoonSeparationDeg,
      moonUpDuringWindow,
      moonScore: moon.score,
      moonHint: moon.hint,
      cumulativeHoursAfter: cumulative,
    });
  }

  const goalMet = goalHours <= 0 || cumulative + 1e-9 >= goalHours;

  return {
    objectId: input.object.id,
    band,
    goalHours,
    startDateIso: input.startDateIso,
    nights,
    cumulativeHours: cumulative,
    nightsNeeded: goalMet && nights.length > 0 ? nights.length : null,
    remainingHours: round1(Math.max(0, goalHours - cumulative)),
    goalMet,
    nightsScanned,
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
