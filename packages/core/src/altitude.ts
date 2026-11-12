import * as Astronomy from "astronomy-engine";
import {
  ASTRONOMICAL_SUN_ALTITUDE_DEG,
  USABLE_MIN_ALTITUDE_DEG,
  type Site,
} from "./types";
import { nightInstants, parseIsoDate, zonedDateTimeToUtc } from "./time";

export type TrackSample = {
  time: Date;
  targetAltitude: number;
  moonAltitude: number;
  sunAltitude: number;
  usable: boolean;
};

export type TimeInterval = {
  start: Date;
  end: Date;
};

export type NightTrack = {
  samples: TrackSample[];
  usableIntervals: TimeInterval[];
  usableHours: number;
  maxTargetAltitude: number;
  maxTargetTime: Date | null;
  moonPhaseAngle: number;
  moonIlluminatedFraction: number;
  moonPhaseName: string;
};

const DEG = 180 / Math.PI;

export function moonPhaseName(angleDeg: number): string {
  const angle = ((angleDeg % 360) + 360) % 360;
  if (angle < 22.5 || angle >= 337.5) return "New";
  if (angle < 67.5) return "Waxing crescent";
  if (angle < 112.5) return "First quarter";
  if (angle < 157.5) return "Waxing gibbous";
  if (angle < 202.5) return "Full";
  if (angle < 247.5) return "Waning gibbous";
  if (angle < 292.5) return "Last quarter";
  return "Waning crescent";
}

function observerFor(site: Site): Astronomy.Observer {
  return new Astronomy.Observer(site.latitude, site.longitude, 0);
}

function unitVector(raDeg: number, decDeg: number, time: Astronomy.AstroTime): Astronomy.Vector {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return new Astronomy.Vector(cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec), time);
}

export function apparentAltitude(
  raDeg: number,
  decDeg: number,
  time: Date,
  observer: Astronomy.Observer,
): number {
  const astroTime = Astronomy.MakeTime(time);
  const rotation = Astronomy.Rotation_EQJ_HOR(astroTime, observer);
  const horizontal = Astronomy.RotateVector(rotation, unitVector(raDeg, decDeg, astroTime));
  return Astronomy.HorizonFromVector(horizontal, "normal").lat;
}

function bodyAltitude(body: Astronomy.Body, time: Date, observer: Astronomy.Observer): number {
  const astroTime = Astronomy.MakeTime(time);
  const equatorial = Astronomy.Equator(body, astroTime, observer, true, true);
  return Astronomy.Horizon(astroTime, observer, equatorial.ra, equatorial.dec, "normal").altitude;
}

function localMidnight(dateIso: string, timeZone: string): Date {
  const next = parseIsoDate(dateIso);
  if (!next) return new Date();
  const noon = zonedDateTimeToUtc(next.year, next.month, next.day, 12, 0, timeZone);
  return new Date(noon.getTime() + 12 * 60 * 60 * 1000);
}

export function buildNightTrack(input: {
  raDeg: number;
  decDeg: number;
  site: Site;
  dateIso: string;
  stepMinutes?: number;
}): NightTrack {
  const step = input.stepMinutes ?? 5;
  const instants = nightInstants(input.dateIso, input.site.timezone, step);
  const observer = observerFor(input.site);
  const samples: TrackSample[] = [];
  let maxTargetAltitude = -90;
  let maxTargetTime: Date | null = null;

  for (const time of instants) {
    const targetAltitude = apparentAltitude(input.raDeg, input.decDeg, time, observer);
    const moonAltitude = bodyAltitude(Astronomy.Body.Moon, time, observer);
    const sunAltitude = bodyAltitude(Astronomy.Body.Sun, time, observer);
    const usable =
      targetAltitude >= USABLE_MIN_ALTITUDE_DEG && sunAltitude <= ASTRONOMICAL_SUN_ALTITUDE_DEG;
    samples.push({ time, targetAltitude, moonAltitude, sunAltitude, usable });
    if (targetAltitude > maxTargetAltitude) {
      maxTargetAltitude = targetAltitude;
      maxTargetTime = time;
    }
  }

  const usableIntervals = mergeUsable(samples, step);
  const usableHours = usableIntervals.reduce(
    (sum, interval) => sum + (interval.end.getTime() - interval.start.getTime()) / 3_600_000,
    0,
  );
  const midnight = localMidnight(input.dateIso, input.site.timezone);
  const phaseAngle = Astronomy.MoonPhase(midnight);
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, midnight);

  return {
    samples,
    usableIntervals,
    usableHours,
    maxTargetAltitude,
    maxTargetTime,
    moonPhaseAngle: phaseAngle,
    moonIlluminatedFraction: illumination.phase_fraction,
    moonPhaseName: moonPhaseName(phaseAngle),
  };
}

function mergeUsable(samples: TrackSample[], stepMinutes: number): TimeInterval[] {
  const intervals: TimeInterval[] = [];
  let start: Date | null = null;
  let last: Date | null = null;
  const stepMs = stepMinutes * 60_000;
  for (const sample of samples) {
    if (sample.usable) {
      if (!start) start = sample.time;
      last = sample.time;
    } else if (start && last) {
      intervals.push({ start, end: new Date(last.getTime() + stepMs) });
      start = null;
      last = null;
    }
  }
  if (start && last) intervals.push({ start, end: new Date(last.getTime() + stepMs) });
  return intervals;
}

export type HorizonRotation = {
  time: Date;
  sunAltitude: number;
  matrix: number[][];
};

/** Shared sun altitudes and EQJ→horizon matrices for scoring many targets. */
export function nightHorizonGrid(site: Site, dateIso: string, stepMinutes: number): HorizonRotation[] {
  const observer = observerFor(site);
  return nightInstants(dateIso, site.timezone, stepMinutes).map((time) => {
    const astroTime = Astronomy.MakeTime(time);
    const sun = Astronomy.Equator(Astronomy.Body.Sun, astroTime, observer, true, true);
    const sunAltitude = Astronomy.Horizon(astroTime, observer, sun.ra, sun.dec, "normal").altitude;
    return {
      time,
      sunAltitude,
      matrix: Astronomy.Rotation_EQJ_HOR(astroTime, observer).rot.map((row) => [...row]),
    };
  });
}

export function geometricAltitude(vector: { x: number; y: number; z: number }, matrix: number[][]): number {
  // astronomy-engine stores rot such that the zenith axis is column 2, matching RotateVector.
  const z =
    (matrix[0]?.[2] ?? 0) * vector.x +
    (matrix[1]?.[2] ?? 0) * vector.y +
    (matrix[2]?.[2] ?? 0) * vector.z;
  return Math.asin(Math.min(1, Math.max(-1, z))) * DEG;
}

export function equatorialUnit(raDeg: number, decDeg: number): { x: number; y: number; z: number } {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return { x: cosDec * Math.cos(ra), y: cosDec * Math.sin(ra), z: Math.sin(dec) };
}
