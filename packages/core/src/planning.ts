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

export type PriorityFields = {
  frameFit: FrameFit;
  usableHours: number;
  moonScore: number;
};

/** Objects with under an hour of usable darkness sort after everything that has a real window. */
export function compareTargetPriority(a: PriorityFields, b: PriorityFields): number {
  const demoted = Number(a.usableHours < MIN_USABLE_HOURS) - Number(b.usableHours < MIN_USABLE_HOURS);
  if (demoted !== 0) return demoted;
  const fit = frameFitRank(a.frameFit) - frameFitRank(b.frameFit);
  if (fit !== 0) return fit;
  if (a.usableHours !== b.usableHours) return b.usableHours - a.usableHours;
  return b.moonScore - a.moonScore;
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
