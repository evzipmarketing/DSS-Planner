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
  subCount: number;
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
}): ExposureSuggestion {
  const skyRate = skyElectronsPerSecond({
    bortle: input.bortle,
    apertureMm: input.apertureMm,
    pixelScaleArcsec: input.pixelScaleArcsec,
    bandpassNm: input.filter.bandpassNm,
    transmission: input.filter.transmission,
  });
  const subExposureSeconds = suggestedSubExposureSeconds(skyRate, input.readNoiseE);
  const ratio = input.focalLengthMm / input.apertureMm;
  const totalHours = suggestedTotalHours(input.filter.kind, input.bortle, ratio);
  const subCount = Math.max(1, Math.round((totalHours * 3600) / subExposureSeconds));
  return {
    filter: input.filter,
    skyMagPerArcsec2: skyMagnitude(input.bortle),
    skyElectronsPerSecond: skyRate,
    subExposureSeconds,
    totalHours,
    subCount,
  };
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
