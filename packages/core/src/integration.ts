import { assertNever } from "./never";
import { BORTLE_SKY_MAG, type FilterKind, type ImagingFilter } from "./types";

/**
 * Photons per second per cm² per nm for a magnitude-0 star, used as a
 * planning zero point (order of the Johnson V continuum). This is a
 * heuristic, not a radiometric calibration.
 */
export const VEGA_PHOTONS_PER_S_CM2_NM = 10_000;

const QUANTUM_EFFICIENCY = 0.6;
const OPTICAL_TRANSMISSION = 0.75;
const SKY_NOISE_TO_READ_NOISE = 5;
const BROADBAND_SUB_MIN = 30;
const BROADBAND_SUB_MAX = 180;
const NARROWBAND_SUB_MIN = 120;
const NARROWBAND_SUB_MAX = 900;
const TOTAL_HOURS_CAP = 24;

export type ExposureSuggestion = {
  filter: ImagingFilter;
  skyMagPerArcsec2: number;
  skyElectronsPerSecond: number;
  subExposureSeconds: number;
  totalHours: number;
  tonightHours: number;
  subCount: number;
  explanation: string;
};

export function skyMagnitude(bortle: number): number {
  const clamped = Math.min(9, Math.max(1, Math.round(bortle)));
  return BORTLE_SKY_MAG[clamped] ?? BORTLE_SKY_MAG[5] ?? 20;
}

export function skyElectronsPerSecond(input: {
  bortle: number;
  apertureMm: number;
  pixelScaleArcsec: number;
  bandpassNm: number;
  transmission: number;
}): number {
  const areaCm2 = Math.PI * (input.apertureMm / 20) ** 2;
  const pixelArcsec2 = input.pixelScaleArcsec ** 2;
  const flux = 10 ** (-0.4 * skyMagnitude(input.bortle));
  return (
    VEGA_PHOTONS_PER_S_CM2_NM *
    input.bandpassNm *
    areaCm2 *
    pixelArcsec2 *
    flux *
    input.transmission *
    QUANTUM_EFFICIENCY *
    OPTICAL_TRANSMISSION
  );
}

export type ExposureClass = "bright" | "medium" | "faint";

/** Integrated magnitude. Bright covers M42, M31 and the Pleiades; faint is the mag-10-and-dimmer crowd. */
export function exposureClass(magnitude: number | null): ExposureClass {
  if (magnitude == null) return "medium";
  if (magnitude <= 5.5) return "bright";
  if (magnitude <= 8.5) return "medium";
  return "faint";
}

function classHours(kind: ExposureClass): number {
  switch (kind) {
    case "bright":
      return 3;
    case "medium":
      return 6;
    case "faint":
      return 12;
    default:
      return assertNever(kind, "exposure class");
  }
}

function narrowbandHoursFactor(kind: FilterKind): number {
  switch (kind) {
    case "broadband":
    case "uv_ir_cut":
    case "luminance":
    case "red":
    case "green":
    case "blue":
      return 1;
    case "dual_narrowband":
      return 1.45;
    case "tri_narrowband":
      return 1.55;
    case "quad_narrowband":
      return 1.4;
    case "ha":
    case "oiii":
      return 1.7;
    case "sii":
      return 1.9;
    default:
      return assertNever(kind, "filter");
  }
}

export function subExposureBounds(kind: FilterKind): { min: number; max: number } {
  return isNarrowband(kind)
    ? { min: NARROWBAND_SUB_MIN, max: NARROWBAND_SUB_MAX }
    : { min: BROADBAND_SUB_MIN, max: BROADBAND_SUB_MAX };
}

export function suggestedSubExposureSeconds(skyEPerSec: number, readNoiseE: number, kind: FilterKind = "broadband"): number {
  const bounds = subExposureBounds(kind);
  if (skyEPerSec <= 0) return bounds.max;
  const targetElectrons = (SKY_NOISE_TO_READ_NOISE * readNoiseE) ** 2;
  const raw = targetElectrons / skyEPerSec;
  return clamp(raw, bounds.min, bounds.max);
}

/**
 * Hours for a planning-quality stack. Bright, medium and faint targets
 * start at 3 h, 6 h and 12 h. Bortle and focal ratio nudge that gently.
 * Narrowband asks for more. The result never exceeds 24 h.
 */
export function suggestedTotalHours(
  kind: FilterKind,
  bortle: number,
  focalRatio: number,
  magnitude: number | null = null,
): number {
  const bortleFactor = clamp(1 + 0.06 * (Math.min(9, Math.max(1, bortle)) - 4), 0.75, 1.45);
  const speed = clamp((focalRatio / 5) ** 2, 0.75, 1.45);
  const hours = classHours(exposureClass(magnitude)) * narrowbandHoursFactor(kind) * bortleFactor * speed;
  return clamp(hours, 0.5, TOTAL_HOURS_CAP);
}

export function suggestExposure(input: {
  filter: ImagingFilter;
  bortle: number;
  apertureMm: number;
  focalLengthMm: number;
  pixelScaleArcsec: number;
  readNoiseE: number;
  moonIlluminatedFraction?: number;
  moonSeparationDeg?: number | null;
  moonAltitudeDeg?: number;
  usableHours?: number | null;
  magnitude?: number | null;
}): ExposureSuggestion {
  const moon = moonExposureFactor(input.filter.kind, {
    illuminatedFraction: input.moonIlluminatedFraction ?? 0,
    separationDeg: input.moonSeparationDeg ?? null,
    moonAltitudeDeg: input.moonAltitudeDeg ?? -90,
  });
  const skyRate =
    skyElectronsPerSecond({
      bortle: input.bortle,
      apertureMm: input.apertureMm,
      pixelScaleArcsec: input.pixelScaleArcsec,
      bandpassNm: input.filter.bandpassNm,
      transmission: input.filter.transmission,
    }) * moon.skyMultiplier;
  const subExposureSeconds = suggestedSubExposureSeconds(skyRate, input.readNoiseE, input.filter.kind);
  const ratio = input.focalLengthMm / input.apertureMm;
  const totalHours = clamp(
    suggestedTotalHours(input.filter.kind, input.bortle, ratio, input.magnitude ?? null) * moon.hoursMultiplier,
    0.5,
    TOTAL_HOURS_CAP,
  );
  const tonightHours =
    input.usableHours == null ? totalHours : Math.min(totalHours, Math.max(0, input.usableHours));
  const subCount = Math.max(1, Math.round((tonightHours * 3600) / subExposureSeconds));
  return {
    filter: input.filter,
    skyMagPerArcsec2: skyMagnitude(input.bortle),
    skyElectronsPerSecond: skyRate,
    subExposureSeconds,
    totalHours,
    tonightHours,
    subCount,
    explanation: integrationExplanation({
      kind: input.filter.kind,
      bortle: input.bortle,
      focalRatio: ratio,
      totalHours,
      tonightHours,
      usableHours: input.usableHours ?? null,
      moonNote: moon.note,
      targetClass: exposureClass(input.magnitude ?? null),
    }),
  };
}

function moonExposureFactor(
  kind: FilterKind,
  moon: { illuminatedFraction: number; separationDeg: number | null; moonAltitudeDeg: number },
): { skyMultiplier: number; hoursMultiplier: number; note: string } {
  const bright = moon.illuminatedFraction >= 0.35 && moon.moonAltitudeDeg >= 0;
  const near = bright && moon.separationDeg != null && moon.separationDeg < 35;
  const narrow = isNarrowband(kind);
  if (!bright) {
    return {
      skyMultiplier: 1,
      hoursMultiplier: 1,
      note: "The Moon is down or only a thin crescent, so it barely changes the plan.",
    };
  }
  if (near && !narrow) {
    return {
      skyMultiplier: 1.6,
      hoursMultiplier: 1.35,
      note: "The Moon is bright and close. Broadband skyglow will dominate; a different night is a better use of the time.",
    };
  }
  if (near && narrow) {
    return {
      skyMultiplier: 1.15,
      hoursMultiplier: 1.15,
      note: "The Moon is close, but a narrow band rejects most of its light. Keep the target well clear of the glare.",
    };
  }
  if (!narrow) {
    return {
      skyMultiplier: 1.25,
      hoursMultiplier: 1.2,
      note: "The Moon is up and bright. It is far from the target, but broadband still loses contrast.",
    };
  }
  return {
    skyMultiplier: 1.05,
    hoursMultiplier: 1.08,
    note: "The Moon is up, but a narrow filter and a wide separation keep most of the moonlight out.",
  };
}

function integrationExplanation(input: {
  kind: FilterKind;
  bortle: number;
  focalRatio: number;
  totalHours: number;
  tonightHours: number;
  usableHours: number | null;
  moonNote: string;
  targetClass: ExposureClass;
}): string {
  const stack = input.totalHours.toFixed(1);
  const tonight = input.tonightHours.toFixed(1);
  const ratio = input.focalRatio.toFixed(1);
  const target =
    input.targetClass === "bright"
      ? "This is a bright target, so a few hours is a useful stack."
      : input.targetClass === "medium"
        ? "This is a medium target, so plan on several hours."
        : "This is a faint target, so the stack is longer.";
  const night =
    input.usableHours == null
      ? `A full stack is about ${stack} h.`
      : input.totalHours - input.tonightHours > 0.15
        ? `A full stack is about ${stack} h. This night has about ${input.usableHours.toFixed(1)} h of imageable time, so plan on ${tonight} h tonight and finish on another night.`
        : `About ${tonight} h fits in this night’s imageable window.`;
  return `${target} ${night} The length follows the object’s brightness, then a modest stretch for a Bortle ${input.bortle} sky at f/${ratio}. Subs stay in the usual range for this sky: long enough for sky noise to matter, and not so short that the stack becomes thousands of frames. ${input.moonNote}`;
}

export function isNarrowband(kind: FilterKind): boolean {
  switch (kind) {
    case "dual_narrowband":
    case "tri_narrowband":
    case "quad_narrowband":
    case "ha":
    case "oiii":
    case "sii":
      return true;
    case "broadband":
    case "uv_ir_cut":
    case "luminance":
    case "red":
    case "green":
    case "blue":
      return false;
    default:
      return assertNever(kind, "filter");
  }
}

export function filterKindLabel(kind: FilterKind): string {
  switch (kind) {
    case "broadband":
      return "Broadband";
    case "uv_ir_cut":
      return "UV/IR cut";
    case "dual_narrowband":
      return "Dual narrowband";
    case "tri_narrowband":
      return "Tri narrowband";
    case "quad_narrowband":
      return "Quad narrowband";
    case "ha":
      return "H-alpha";
    case "oiii":
      return "OIII";
    case "sii":
      return "SII";
    case "luminance":
      return "Luminance";
    case "red":
      return "Red";
    case "green":
      return "Green";
    case "blue":
      return "Blue";
    default:
      return assertNever(kind, "filter");
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
