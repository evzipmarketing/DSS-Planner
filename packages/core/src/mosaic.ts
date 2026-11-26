import { formatDeclination, formatRightAscension } from "./format";
import { frameFillPercent, frameFit, frameFitHint, type FrameFit } from "./planning";
import type { FieldOfView } from "./optics";

/** Soft cap for MVP UI clarity (lazy sky plates). */
export const MOSAIC_MAX_DIM = 5;

/** Plate zoom: higher = closer in (smaller sky FOV). */
export const MOSAIC_ZOOM_MIN = 0.5;
export const MOSAIC_ZOOM_MAX = 4;
export const MOSAIC_ZOOM_STEP = 0.25;

export type MosaicRaDec = {
  raDeg: number;
  decDeg: number;
};

export type MosaicFov = Pick<FieldOfView, "widthDeg" | "heightDeg">;

export type MosaicPanel = {
  index: number;
  row: number;
  col: number;
  label: string;
  raDeg: number;
  decDeg: number;
  /** Four corners (NW, NE, SE, SW) in RA/Dec for the panel FOV at the mosaic rotation. */
  polygon: MosaicRaDec[];
};

export type MosaicPlan = {
  rows: number;
  cols: number;
  overlapPercent: number;
  rotationDeg: number;
  panelCount: number;
  panelFov: MosaicFov;
  /** Full mosaic span including outer panel edges (degrees). */
  mosaicWidthDeg: number;
  mosaicHeightDeg: number;
  /** Outer mosaic footprint corners (NW, NE, SE, SW) at the mosaic rotation. */
  outerPolygon: MosaicRaDec[];
  panels: MosaicPanel[];
  /** Object major axis vs mosaic min span, same scale as single-frame fill. */
  coveragePercent: number | null;
  coverageFit: FrameFit;
  coverageHint: string;
  undersampled: boolean;
};

export type PlanMosaicInput = {
  centerRaDec: MosaicRaDec;
  fov: MosaicFov;
  rows: number;
  cols: number;
  overlapPercent: number;
  rotationDeg: number;
  /** Object major axis in arcminutes; when set, coverage warning is computed. */
  majorArcmin?: number | null;
};

const DEG = Math.PI / 180;

function clampDim(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MOSAIC_MAX_DIM, Math.max(1, Math.round(value)));
}

function clampOverlap(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(80, Math.max(0, value));
}

function wrapRaDeg(raDeg: number): number {
  let next = raDeg % 360;
  if (next < 0) next += 360;
  return next;
}

/**
 * Convert east/north offsets (degrees) in the tangent plane at `center` into RA/Dec.
 * Matches the gnomonic convention used by `projection.ts` (north up, east left on plates).
 */
export function offsetToEquatorial(
  center: MosaicRaDec,
  eastDeg: number,
  northDeg: number,
): MosaicRaDec {
  const xi = eastDeg * DEG;
  const eta = northDeg * DEG;
  const dec0 = center.decDeg * DEG;
  const ra0 = center.raDeg * DEG;
  const rho = Math.hypot(xi, eta);
  if (rho < 1e-12) {
    return { raDeg: wrapRaDeg(center.raDeg), decDeg: center.decDeg };
  }
  const c = Math.atan(rho);
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);
  const dec = Math.asin(cosC * Math.sin(dec0) + (eta * sinC * Math.cos(dec0)) / rho);
  const ra =
    ra0 +
    Math.atan2(xi * sinC, rho * cosC * Math.cos(dec0) - eta * sinC * Math.sin(dec0));
  return { raDeg: wrapRaDeg(ra / DEG), decDeg: dec / DEG };
}

function rotateOffset(
  eastDeg: number,
  northDeg: number,
  rotationDeg: number,
): { eastDeg: number; northDeg: number } {
  const rad = rotationDeg * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Positive rotationDeg turns the mosaic clockwise on the sky plate (north-up view).
  return {
    eastDeg: eastDeg * cos + northDeg * sin,
    northDeg: -eastDeg * sin + northDeg * cos,
  };
}

function rotatedBoxPolygon(
  center: MosaicRaDec,
  widthDeg: number,
  heightDeg: number,
  rotationDeg: number,
): MosaicRaDec[] {
  const halfW = widthDeg / 2;
  const halfH = heightDeg / 2;
  // NW, NE, SE, SW in the unrotated frame (east +, north +).
  const corners: Array<[number, number]> = [
    [-halfW, halfH],
    [halfW, halfH],
    [halfW, -halfH],
    [-halfW, -halfH],
  ];
  return corners.map(([east, north]) => {
    const rotated = rotateOffset(east, north, rotationDeg);
    return offsetToEquatorial(center, rotated.eastDeg, rotated.northDeg);
  });
}

function panelPolygon(
  center: MosaicRaDec,
  fov: MosaicFov,
  rotationDeg: number,
): MosaicRaDec[] {
  return rotatedBoxPolygon(center, fov.widthDeg, fov.heightDeg, rotationDeg);
}

export function clampMosaicZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const stepped = Math.round(value / MOSAIC_ZOOM_STEP) * MOSAIC_ZOOM_STEP;
  return Math.min(MOSAIC_ZOOM_MAX, Math.max(MOSAIC_ZOOM_MIN, Number(stepped.toFixed(2))));
}

/**
 * Plate FOV that frames the mosaic with a little margin (sky API caps at 20°).
 * `zoom` > 1 zooms in (narrower FOV); `zoom` < 1 zooms out.
 * Zoom is applied relative to the clamped fit FOV so each step stays visible.
 */
export function mosaicPlateFovDeg(
  plan: Pick<MosaicPlan, "mosaicWidthDeg" | "mosaicHeightDeg">,
  zoom = 1,
): number {
  const span = Math.max(plan.mosaicWidthDeg, plan.mosaicHeightDeg) * 1.25;
  const fit = Math.min(20, Math.max(0.08, span));
  return Math.min(20, Math.max(0.08, fit / clampMosaicZoom(zoom)));
}

export function formatMosaicPanelCoords(panel: MosaicPanel): string {
  return `${panel.label}: ${formatRightAscension(panel.raDeg)}  ${formatDeclination(panel.decDeg)}`;
}

export function formatMosaicCoordsList(plan: MosaicPlan): string {
  return plan.panels.map(formatMosaicPanelCoords).join("\n");
}

/**
 * Build a rows×cols mosaic grid around a center with overlap and camera rotation.
 * Panel centers and FOV polygons use gnomonic offsets so polar fields stay sane.
 */
export function planMosaic(input: PlanMosaicInput): MosaicPlan {
  const rows = clampDim(input.rows);
  const cols = clampDim(input.cols);
  const overlapPercent = clampOverlap(input.overlapPercent);
  const rotationDeg = Number.isFinite(input.rotationDeg) ? input.rotationDeg : 0;
  const fov: MosaicFov = {
    widthDeg: Math.max(1e-6, input.fov.widthDeg),
    heightDeg: Math.max(1e-6, input.fov.heightDeg),
  };

  const overlapFrac = overlapPercent / 100;
  const stepX = fov.widthDeg * (1 - overlapFrac);
  const stepY = fov.heightDeg * (1 - overlapFrac);
  const mosaicWidthDeg = (cols - 1) * stepX + fov.widthDeg;
  const mosaicHeightDeg = (rows - 1) * stepY + fov.heightDeg;

  const panels: MosaicPanel[] = [];
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      // Row 0 is the north edge of the mosaic; col 0 is the west edge.
      const localEast = (col - (cols - 1) / 2) * stepX;
      const localNorth = ((rows - 1) / 2 - row) * stepY;
      const rotated = rotateOffset(localEast, localNorth, rotationDeg);
      const center = offsetToEquatorial(input.centerRaDec, rotated.eastDeg, rotated.northDeg);
      const label = `P${row + 1}${col + 1}`;
      panels.push({
        index,
        row,
        col,
        label,
        raDeg: center.raDeg,
        decDeg: center.decDeg,
        polygon: panelPolygon(center, fov, rotationDeg),
      });
      index += 1;
    }
  }

  const mosaicField = {
    widthArcmin: mosaicWidthDeg * 60,
    heightArcmin: mosaicHeightDeg * 60,
  };
  const coveragePercent = frameFillPercent(input.majorArcmin ?? null, mosaicField);
  const coverageFit = frameFit(coveragePercent);
  const undersampled = coverageFit === "large";
  const coverageHint =
    input.majorArcmin == null || input.majorArcmin <= 0
      ? "No major-axis size on this target, so mosaic coverage is unknown."
      : undersampled
        ? `Object still exceeds the ${rows}×${cols} mosaic (~${Math.round(coveragePercent ?? 0)}% of the short span). Add rows/cols or widen the FOV.`
        : frameFitHint(coverageFit);

  return {
    rows,
    cols,
    overlapPercent,
    rotationDeg,
    panelCount: panels.length,
    panelFov: fov,
    mosaicWidthDeg,
    mosaicHeightDeg,
    outerPolygon: rotatedBoxPolygon(input.centerRaDec, mosaicWidthDeg, mosaicHeightDeg, rotationDeg),
    panels,
    coveragePercent,
    coverageFit,
    coverageHint,
    undersampled,
  };
}
