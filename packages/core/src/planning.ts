import { assertNever } from "./never";
import type { DeepSkyType } from "./types";

export type BandAdvice = "narrowband" | "broadband" | "both";

export type FrameFit = "good" | "tight" | "small" | "large" | "unknown";

export const TARGET_LIST_FILTERS = [
  "all",
  "narrowband",
  "broadband",
  "galaxies",
  "nebulae",
  "clusters",
  "good-fit",
  "moon-safe",
] as const;

export type TargetListFilter = (typeof TARGET_LIST_FILTERS)[number];

const MOON_BRIGHT = 0.35;
const MOON_NEAR_DEG = 35;

export function bandAdvice(type: DeepSkyType): BandAdvice {
  switch (type) {
    case "PN":
      return "both";
    case "HII":
    case "EmN":
    case "Neb":
    case "SNR":
    case "Cl+N":
      return "narrowband";
    case "RfN":
    case "DrkN":
    case "G":
    case "GPair":
    case "GTrpl":
    case "GGroup":
    case "ClG":
    case "OCl":
    case "GCl":
    case "Ast":
    case "StCl":
    case "*Ass":
    case "**":
    case "*":
    case "NonEx":
    case "Nova":
    case "Other":
    case "Dup":
      return "broadband";
    default:
      return assertNever(type, "object type");
  }
}

export function bandLabel(band: BandAdvice): string {
  switch (band) {
    case "narrowband":
      return "Narrowband";
    case "broadband":
      return "Broadband";
    case "both":
      return "Both";
    default:
      return assertNever(band, "band");
  }
}

/** Major axis as a percentage of the shorter side of the sensor field. */
export function frameFillPercent(
  majorArcmin: number | null,
  field: { widthArcmin: number; heightArcmin: number } | null,
): number | null {
  if (majorArcmin == null || majorArcmin <= 0 || !field) return null;
  const span = Math.min(field.widthArcmin, field.heightArcmin);
  if (span <= 0) return null;
  return (majorArcmin / span) * 100;
}

export function frameFit(percent: number | null): FrameFit {
  if (percent == null) return "unknown";
  if (percent < 10) return "small";
  if (percent > 90) return "large";
  if (percent > 80) return "tight";
  return "good";
}

export function frameFitLabel(fit: FrameFit): string {
  switch (fit) {
    case "good":
      return "Good fit";
    case "tight":
      return "Tight fit";
    case "small":
      return "Too small";
    case "large":
      return "Too large";
    case "unknown":
      return "Size unknown";
    default:
      return assertNever(fit, "frame fit");
  }
}

export function frameFitRank(fit: FrameFit): number {
  switch (fit) {
    case "good":
      return 0;
    case "tight":
      return 1;
    case "small":
      return 2;
    case "large":
      return 3;
    case "unknown":
      return 4;
    default:
      return assertNever(fit, "frame fit");
  }
}

export function frameFitHint(fit: FrameFit): string {
  switch (fit) {
    case "good":
      return "The object fills a useful part of the frame.";
    case "tight":
      return "It nearly fills the frame. Leave a margin for framing.";
    case "small":
      return "Below about 10% of the frame. A longer focal length would show it larger.";
    case "large":
      return "Above about 90% of the frame. It needs a mosaic or a wider field.";
    case "unknown":
      return "The catalogue has no major-axis size, so the fit is unknown.";
    default:
      return assertNever(fit, "frame fit");
  }
}

export function moonPlan(input: {
  band: BandAdvice;
  illuminatedFraction: number;
  moonUp: boolean;
  minSeparationDeg: number | null;
}): { score: number; hint: string | null } {
  const bright = input.illuminatedFraction >= MOON_BRIGHT;
  const near =
    input.moonUp && bright && input.minSeparationDeg != null && input.minSeparationDeg < MOON_NEAR_DEG;
  if (!input.moonUp || !bright) return { score: 1, hint: null };
  if (near) {
    return { score: 0.05, hint: "The Moon is bright and close to this target. A poor night for it." };
  }
  if (input.band === "broadband") {
    return { score: 0.3, hint: "Moon bright — broadband not recommended" };
  }
  if (input.band === "both") {
    return { score: 0.72, hint: "The Moon is up. Prefer a narrowband filter on this planetary." };
  }
  return { score: 0.9, hint: null };
}

export const MIN_USABLE_HOURS = 1;

export type BrightnessHint = "bright" | "moderate" | "faint";

export type PriorityFields = {
  frameFit: FrameFit;
  usableHours: number;
  moonScore: number;
  visibility: number;
};

/** Mag per square arcsecond. Missing surface brightness is estimated from magnitude and size. */
export function surfaceBrightness(object: {
  magnitude: number | null;
  majorArcmin: number | null;
  minorArcmin: number | null;
}): number | null {
  if (object.magnitude == null || object.majorArcmin == null || object.majorArcmin <= 0) return null;
  const minor = object.minorArcmin != null && object.minorArcmin > 0 ? object.minorArcmin : object.majorArcmin * 0.6;
  const area = (Math.PI / 4) * object.majorArcmin * 60 * minor * 60;
  return object.magnitude + 2.5 * Math.log10(Math.max(area, 1));
}

function isDarkObject(object: { type: DeepSkyType; id: string; aliases: string[]; magnitude: number | null; messier: number | null }): boolean {
  if (object.messier != null) return false;
  if (object.magnitude != null && object.magnitude <= 6) return false;
  if (object.type === "DrkN") return true;
  const ids = [object.id, ...object.aliases];
  if (ids.some((id) => /^LDN\d/.test(id) || /^B\d/.test(id))) return true;
  return ids.some((id) => /^Ced/i.test(id)) && (object.type === "RfN" || object.magnitude == null);
}

/**
 * 0–1 visibility. Faint and low-surface-brightness objects fall faster as Bortle rises.
 * Narrowband emission nebulae keep some of that back under a bright sky. Dark nebulae
 * and objects with no magnitude are pushed down, hard from Bortle 6 upward.
 */
export function visibilityScore(
  object: {
    type: DeepSkyType;
    id: string;
    aliases: string[];
    magnitude: number | null;
    majorArcmin: number | null;
    minorArcmin: number | null;
    messier: number | null;
  },
  bortle: number,
): number {
  const sky = clamp((bortle - 3) / 6, 0, 1);
  const integrated = object.magnitude == null ? 0.15 : clamp((13.5 - object.magnitude) / 11, 0, 1);
  const surface = surfaceBrightness(object);
  const surfaceScore = surface == null ? 0.35 : clamp((25.5 - surface) / 8, 0, 1);
  let score = 0.7 * integrated + 0.3 * surfaceScore;
  score *= 1 - 0.62 * sky * (1 - integrated);
  const emission = bandAdvice(object.type) === "narrowband" || bandAdvice(object.type) === "both";
  if (emission && !isDarkObject(object)) score += 0.22 * sky;
  if (object.magnitude == null) score *= bortle >= 6 ? 0.22 : 0.45;
  if (isDarkObject(object)) score *= bortle >= 6 ? 0.12 : 0.35;
  return clamp(score, 0, 1.25);
}

export function brightnessHint(visibility: number): BrightnessHint {
  if (visibility >= 0.62) return "bright";
  if (visibility >= 0.36) return "moderate";
  return "faint";
}

export function brightnessHintLabel(hint: BrightnessHint): string {
  switch (hint) {
    case "bright":
      return "Bright";
    case "moderate":
      return "Moderate";
    case "faint":
      return "Faint";
    default:
      return assertNever(hint, "brightness");
  }
}

function frameFitWeight(fit: FrameFit): number {
  switch (fit) {
    case "good":
      return 1;
    case "tight":
      return 0.9;
    case "large":
      return 0.96;
    case "small":
      return 0.4;
    case "unknown":
      return 0.32;
    default:
      return assertNever(fit, "frame fit");
  }
}

/** Frame fit gates the score. Imageable hours and visibility share the rest. */
export function observationScore(item: PriorityFields): number {
  const hours = Math.min(item.usableHours, 8) / 5;
  return frameFitWeight(item.frameFit) * (0.42 * hours + item.visibility);
}

/** Objects with under an hour of imageable darkness sort after everything that has a real window. */
export function compareTargetPriority(a: PriorityFields, b: PriorityFields): number {
  const demoted = Number(a.usableHours < MIN_USABLE_HOURS) - Number(b.usableHours < MIN_USABLE_HOURS);
  if (demoted !== 0) return demoted;
  const score = observationScore(b) - observationScore(a);
  if (Math.abs(score) > 1e-9) return score;
  return b.moonScore - a.moonScore;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type HorizonSample = { time: Date; altitude: number };

export type HorizonStory = {
  rise: Date | null;
  set: Date | null;
  upAtStart: boolean;
  circumpolar: boolean;
};

/** Rise and set are real horizon crossings. The first sample is not treated as a rise. */
export function horizonStory(samples: HorizonSample[]): HorizonStory {
  let previous: number | null = null;
  let upAtStart = false;
  let wentBelow = false;
  let rise: Date | null = null;
  let set: Date | null = null;
  for (const sample of samples) {
    if (previous == null) upAtStart = sample.altitude >= 0;
    else if (previous >= 0 && sample.altitude < 0) set = sample.time;
    else if (previous < 0 && sample.altitude >= 0) rise = sample.time;
    if (sample.altitude < 0) wentBelow = true;
    previous = sample.altitude;
  }
  return {
    rise,
    set,
    upAtStart,
    circumpolar: samples.length > 0 && upAtStart && !wentBelow,
  };
}

export function passesListFilter(
  item: { band: BandAdvice; frameFit: FrameFit; moonHint: string | null; moonScore: number; objectType: DeepSkyType },
  filter: TargetListFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "narrowband":
      return item.band === "narrowband" || item.band === "both";
    case "broadband":
      return item.band === "broadband" || item.band === "both";
    case "galaxies":
      return item.objectType === "G" || item.objectType === "GPair" || item.objectType === "GTrpl" || item.objectType === "GGroup";
    case "nebulae":
      return (
        item.objectType === "Neb" ||
        item.objectType === "EmN" ||
        item.objectType === "RfN" ||
        item.objectType === "HII" ||
        item.objectType === "PN" ||
        item.objectType === "SNR" ||
        item.objectType === "Cl+N" ||
        item.objectType === "DrkN"
      );
    case "clusters":
      return item.objectType === "OCl" || item.objectType === "GCl" || item.objectType === "StCl" || item.objectType === "*Ass";
    case "good-fit":
      return item.frameFit === "good";
    case "moon-safe":
      return item.moonHint == null && item.moonScore >= 0.6;
    default:
      return assertNever(filter, "target list");
  }
}

export function listFilterLabel(filter: TargetListFilter): string {
  switch (filter) {
    case "all":
      return "All";
    case "narrowband":
      return "Narrowband";
    case "broadband":
      return "Broadband";
    case "galaxies":
      return "Galaxies";
    case "nebulae":
      return "Nebulae";
    case "clusters":
      return "Clusters";
    case "good-fit":
      return "Good fit";
    case "moon-safe":
      return "Moon-safe";
    default:
      return assertNever(filter, "target list");
  }
}
