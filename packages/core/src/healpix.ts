/**
 * Nested HEALPix index for a J2000 equatorial position.
 * Arithmetic only — JavaScript bitwise ops are 32-bit, and fine pixels exceed that.
 * Checked against healpy for equatorial, polar, and high-nside positions.
 */
export function ang2pixNest(nside: number, raDeg: number, decDeg: number): number {
  const order = Math.round(Math.log2(nside));
  const phi = ((raDeg * Math.PI) / 180) % (2 * Math.PI);
  const phiWrapped = phi < 0 ? phi + 2 * Math.PI : phi;
  const theta = ((90 - decDeg) * Math.PI) / 180;
  const z = Math.cos(theta);
  const za = Math.abs(z);
  const tt = (phiWrapped / (Math.PI / 2)) % 4;

  let face: number;
  let ix: number;
  let iy: number;

  if (za <= 2 / 3) {
    const temp1 = nside * (0.5 + tt);
    const temp2 = nside * z * 0.75;
    const jp = Math.floor(temp1 - temp2);
    const jm = Math.floor(temp1 + temp2);
    const ifp = (jp >>> order) >>> 0;
    const ifm = (jm >>> order) >>> 0;
    if (ifp === ifm) face = ifp | 4;
    else if (ifp < ifm) face = ifp;
    else face = ifm + 8;
    ix = (jm >>> 0) & (nside - 1);
    iy = nside - ((jp >>> 0) & (nside - 1)) - 1;
  } else {
    const ntt = Math.min(3, Math.floor(tt));
    const tp = tt - ntt;
    const tmp = nside * Math.sqrt(3 * (1 - za));
    let jp = Math.floor(tp * tmp);
    let jm = Math.floor((1 - tp) * tmp);
    if (jp >= nside) jp = nside - 1;
    if (jm >= nside) jm = nside - 1;
    if (z >= 0) {
      face = ntt;
      ix = nside - jm - 1;
      iy = nside - jp - 1;
    } else {
      face = ntt + 8;
      ix = jp;
      iy = jm;
    }
  }

  return face * nside * nside + spreadBits(ix) + spreadBits(iy) * 2;
}

function spreadBits(value: number): number {
  let acc = 0;
  let bit = 1;
  let current = value;
  while (current > 0) {
    if (current & 1) acc += bit;
    bit *= 4;
    current = Math.floor(current / 2);
  }
  return acc;
}

/** Degrees per pixel of the CDS DSS2 colour HiPS at its deepest order. */
export const HIPS_PIXEL_SCALE_ORDER9_DEG = 2.236e-4;

/**
 * Colour JPEG tiles deeper than this are clipped to a few levels and do not
 * survive a contrast stretch. hips2fits still uses the full survey.
 */
export const HIPS_MAX_JPEG_ORDER = 7;

export function hipsPixelScaleDeg(order: number): number {
  return HIPS_PIXEL_SCALE_ORDER9_DEG * 2 ** (9 - order);
}

export function chooseHipsOrder(degPerPixel: number): number {
  let chosen = HIPS_MAX_JPEG_ORDER;
  for (let order = HIPS_MAX_JPEG_ORDER; order >= 3; order -= 1) {
    chosen = order;
    if (hipsPixelScaleDeg(order) >= degPerPixel * 0.7) break;
  }
  return chosen;
}

export type HipsPixel = {
  tile: number;
  x: number;
  y: number;
};

const HIPS_TILE_PIXELS = 512;
const HIPS_TILE_SPAN = HIPS_TILE_PIXELS * HIPS_TILE_PIXELS;

/**
 * Pixel inside a 512px HiPS JPEG.
 * Even nested bits run down the tile, odd bits run across.
 * Confirmed on isolated bright stars in CDS/P/DSS2/color.
 */
export function hipsTilePixel(raDeg: number, decDeg: number, order: number): HipsPixel {
  const nside = 2 ** (order + 9);
  const ipix = ang2pixNest(nside, raDeg, decDeg);
  const tile = Math.floor(ipix / HIPS_TILE_SPAN);
  let local = ipix - tile * HIPS_TILE_SPAN;
  let x = 0;
  let y = 0;
  for (let bit = 0; bit < 9; bit += 1) {
    y |= (local & 1) << bit;
    local = Math.floor(local / 2);
    x |= (local & 1) << bit;
    local = Math.floor(local / 2);
  }
  return { tile, x, y };
}

export function hipsDirectory(tile: number): number {
  return Math.floor(tile / 10_000) * 10_000;
}
