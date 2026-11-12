import { BLACK_MARBLE_B64 } from "./black-marble";

const COLS = 360;
const ROWS = 180;

let grid: Uint8Array | null = null;

function brightnessGrid(): Uint8Array {
  if (grid) return grid;
  const binary = atob(BLACK_MARBLE_B64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  grid = bytes;
  return bytes;
}

/** JPEG brightness (0–255) of the 1° cell, 90th percentile of the source pixels. */
export function nightLightBrightness(latitude: number, longitude: number): number {
  const bytes = brightnessGrid();
  const lat = Math.min(90, Math.max(-90, latitude));
  let lon = longitude;
  if (lon < -180 || lon > 180) lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  let column = Math.floor(lon + 180);
  if (column >= COLS) column = 0;
  if (column < 0) column = 0;
  let row = Math.floor(90 - lat);
  if (row < 0) row = 0;
  if (row >= ROWS) row = ROWS - 1;
  return bytes[row * COLS + column] ?? 0;
}

/**
 * Map relative city-light brightness onto a Bortle class.
 * The source image clips bright cities, so class 8 and 9 are the bright end,
 * and a black cell is reported as 2 because the image cannot separate a
 * class 1 site from empty ocean.
 */
export function bortleFromBrightness(brightness: number): number {
  if (brightness <= 0) return 2;
  if (brightness <= 4) return 3;
  if (brightness <= 15) return 4;
  if (brightness <= 40) return 5;
  if (brightness <= 80) return 6;
  if (brightness <= 140) return 7;
  if (brightness <= 210) return 8;
  return 9;
}

export function estimateBortle(latitude: number, longitude: number): number {
  return bortleFromBrightness(nightLightBrightness(latitude, longitude));
}
