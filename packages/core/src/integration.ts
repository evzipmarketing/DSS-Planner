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
const MIN_SUB_SECONDS = 5;
const MAX_SUB_SECONDS = 900;

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

export function suggestedSubExposureSeconds(skyEPerSec: number, readNoiseE: number): number {
  if (skyEPerSec <= 0) return MAX_SUB_SECONDS;
  const targetElectrons = (SKY_NOISE_TO_READ_NOISE * readNoiseE) ** 2;
  const raw = targetElectrons / skyEPerSec;
  return clamp(raw, MIN_SUB_SECONDS, MAX_SUB_SECONDS);
}

function referenceHours(kind: FilterKind): number {
  switch (kind) {
    case "broadband":
      return 3;
    case "uv_ir_cut":
      return 2.5;
    case "luminance":
      return 3;
    case "red":
      return 2;
    case "green":
      return 2;
    case "blue":
      return 2.5;
    case "dual_narrowband":
      return 5;
    case "tri_narrowband":
      return 6;
    case "quad_narrowband":
      return 5.5;
    case "ha":
      return 8;
    case "oiii":
      return 8;
    case "sii":
      return 10;
    default:
      return assertNever(kind, "filter");
  }
}

/**
 * Hours for a planning-quality stack at the given sky and focal ratio.
 * Anchored at Bortle 4 and f/5. Narrowband starts longer because the
 * target signal is thinner; the sky term then stretches every filter
 * when the background is brighter.
 */
export function suggestedTotalHours(kind: FilterKind, bortle: number, focalRatio: number): number {
  const skyPenalty = 10 ** (0.4 * (skyMagnitude(4) - skyMagnitude(bortle)));
  const speed = (focalRatio / 5) ** 2;
  return clamp(referenceHours(kind) * skyPenalty * speed, 0.4, 48);
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
  const subExposureSeconds = suggestedSubExposureSeconds(skyRate, input.readNoiseE);
  const ratio = input.focalLengthMm / input.apertureMm;
  const totalHours = suggestedTotalHours(input.filter.kind, input.bortle, ratio) * moon.hoursMultiplier;
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
      skyMultiplier: 3,
      hoursMultiplier: 1.8,
      note: "The Moon is bright and close. Broadband skyglow will dominate; a different night is a better use of the time.",
    };
  }
  if (near && narrow) {
    return {
      skyMultiplier: 1.3,
      hoursMultiplier: 1.2,
      note: "The Moon is close, but a narrow band rejects most of its light. Keep the target well clear of the glare.",
    };
  }
  if (!narrow) {
    return {
      skyMultiplier: 1.8,
      hoursMultiplier: 1.5,
      note: "The Moon is up and bright. It is far from the target, but broadband still loses contrast.",
    };
  }
  return {
    skyMultiplier: 1.1,
    hoursMultiplier: 1.1,
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
}): string {
  const stack = input.totalHours.toFixed(1);
  const tonight = input.tonightHours.toFixed(1);
  const ratio = input.focalRatio.toFixed(1);
  const night =
    input.usableHours == null
      ? `A full stack is about ${stack} h.`
      : input.totalHours - input.tonightHours > 0.15
        ? `A full stack is about ${stack} h. This night has about ${input.usableHours.toFixed(1)} h of usable time, so plan on ${tonight} h tonight and finish on another night.`
        : `About ${tonight} h fits in this night’s usable window.`;
  return `${night} The length is scaled for a Bortle ${input.bortle} sky at f/${ratio}: brighter skies and slower optics need more time, and the sub length is set so sky noise reaches about five times the read noise. ${input.moonNote}`;
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
