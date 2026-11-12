import { assertNever } from "./never";
import type { Camera, Telescope } from "./types";

export type SamplingKind = "undersampled" | "balanced" | "oversampled";

export type FieldOfView = {
  widthDeg: number;
  heightDeg: number;
  widthArcmin: number;
  heightArcmin: number;
};

export type SamplingAdvice = {
  kind: SamplingKind;
  pixelScaleArcsec: number;
  assumedSeeingArcsec: number;
  fineLimitArcsec: number;
  coarseLimitArcsec: number;
};

export function effectiveFocalLengthMm(telescope: Telescope, reducer: number): number {
  return telescope.focalLengthMm * reducer;
}

export function focalRatio(apertureMm: number, focalLengthMm: number): number {
  return focalLengthMm / apertureMm;
}

export function angularSizeDeg(sensorMm: number, focalLengthMm: number): number {
  return 2 * Math.atan(sensorMm / (2 * focalLengthMm)) * (180 / Math.PI);
}

export function fieldOfView(camera: Camera, focalLengthMm: number): FieldOfView {
  const widthDeg = angularSizeDeg(camera.sensorWidthMm, focalLengthMm);
  const heightDeg = angularSizeDeg(camera.sensorHeightMm, focalLengthMm);
  return {
    widthDeg,
    heightDeg,
    widthArcmin: widthDeg * 60,
    heightArcmin: heightDeg * 60,
  };
}

/** Arcseconds per pixel. pixelSizeUm / focalLengthMm × 206.265. */
export function pixelScaleArcsec(pixelSizeUm: number, focalLengthMm: number): number {
  return (pixelSizeUm / focalLengthMm) * 206.265;
}

/**
 * Planning assumption only. Bortle describes sky brightness, not the air.
 * The scale runs from about 1.5″ in class 1 to about 3.5″ in class 9.
 */
export function assumedSeeingArcsec(bortle: number): number {
  const clamped = Math.min(9, Math.max(1, Math.round(bortle)));
  return 1.2 + 0.25 * clamped;
}

export function samplingAdvice(pixelScale: number, bortle: number): SamplingAdvice {
  const seeing = assumedSeeingArcsec(bortle);
  const fineLimit = seeing / 3;
  const coarseLimit = seeing;
  let kind: SamplingKind;
  if (pixelScale < fineLimit) kind = "oversampled";
  else if (pixelScale > coarseLimit) kind = "undersampled";
  else kind = "balanced";
  return {
    kind,
    pixelScaleArcsec: pixelScale,
    assumedSeeingArcsec: seeing,
    fineLimitArcsec: fineLimit,
    coarseLimitArcsec: coarseLimit,
  };
}

export function samplingSummary(advice: SamplingAdvice): string {
  const scale = advice.pixelScaleArcsec.toFixed(2);
  const seeing = advice.assumedSeeingArcsec.toFixed(1);
  switch (advice.kind) {
    case "undersampled":
      return `${scale}″/px is coarser than the assumed ${seeing}″ seeing. Star images will fall inside a pixel or two; a longer focal length or smaller pixels would resolve more.`;
    case "balanced":
      return `${scale}″/px sits between a third and one full width of the assumed ${seeing}″ seeing, which is a practical range for deep-sky detail.`;
    case "oversampled":
      return `${scale}″/px is finer than a third of the assumed ${seeing}″ seeing. Binning 2×2 would not throw away much detail, and each sub can be shorter.`;
    default:
      return assertNever(advice.kind, "sampling");
  }
}

export function sensorDisagreement(camera: Camera): { axis: "width" | "height"; ratio: number } | null {
  const impliedWidth = (camera.widthPx * camera.pixelSizeUm) / 1000;
  const impliedHeight = (camera.heightPx * camera.pixelSizeUm) / 1000;
  const widthRatio = impliedWidth / camera.sensorWidthMm;
  const heightRatio = impliedHeight / camera.sensorHeightMm;
  if (Math.abs(widthRatio - 1) >= Math.abs(heightRatio - 1)) {
    if (Math.abs(widthRatio - 1) > 0.1) return { axis: "width", ratio: widthRatio };
  } else if (Math.abs(heightRatio - 1) > 0.1) {
    return { axis: "height", ratio: heightRatio };
  }
  return null;
}
