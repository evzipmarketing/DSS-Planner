import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  chooseHipsOrder,
  hipsDirectory,
  hipsTilePixel,
} from "@dss/core";
import jpeg from "jpeg-js";

const HIPS2FITS = [
  "https://alasky.cds.unistra.fr/hips-image-services/hips2fits",
  "https://alaskybis.cds.unistra.fr/hips-image-services/hips2fits",
];

const TILE_ROOTS = [
  "https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/DSSColor",
  "https://irsa.ipac.caltech.edu/data/hips/CDS/DSS2/color",
  "http://skies.esac.esa.int/DSSColor",
];

export type SkyPlate = {
  bytes: Uint8Array;
  source: "hips2fits" | "hips-tiles";
};

type Tile = { width: number; height: number; data: Uint8Array };

const tiles = new Map<string, Tile | null>();
const tileMissUntil = new Map<string, number>();
const plates = new Map<string, SkyPlate>();
const plateGate = createGate(4);
const tileGate = createGate(6);
const DISK_CACHE = "/tmp/dss-sky-plates";
let diskReady: Promise<void> | null = null;
let hips2fitsBlockedUntil = 0;

export async function renderSkyPlate(input: {
  raDeg: number;
  decDeg: number;
  fovDeg: number;
  size: number;
}): Promise<SkyPlate> {
  const key = [
    input.raDeg.toFixed(4),
    input.decDeg.toFixed(4),
    input.fovDeg.toFixed(3),
    input.size,
  ].join("|");
  const cached = plates.get(key);
  if (cached) return cached;
  const stored = await readDisk(key);
  if (stored) {
    const plate = { bytes: stored, source: "hips-tiles" as const };
    rememberPlate(key, plate);
    return plate;
  }

  return plateGate.run(async () => {
    const again = plates.get(key);
    if (again) return again;
    // Small thumbnails skip the cutout service. It is often unreachable, and
    // waiting on it stalls every other row behind the first handful.
    const fromService = input.size > 160 ? await fetchHips2Fits(input) : null;
    const plate = fromService ?? (await renderFromTiles(input));
    rememberPlate(key, plate);
    await writeDisk(key, plate.bytes);
    return plate;
  });
}

function rememberPlate(key: string, plate: SkyPlate): void {
  plates.set(key, plate);
  while (plates.size > 240) {
    const oldest = plates.keys().next().value;
    if (!oldest) break;
    plates.delete(oldest);
  }
}

async function fetchHips2Fits(input: {
  raDeg: number;
  decDeg: number;
  fovDeg: number;
  size: number;
}): Promise<SkyPlate | null> {
  if (Date.now() < hips2fitsBlockedUntil) return null;
  const params = new URLSearchParams({
    hips: "CDS/P/DSS2/color",
    width: String(input.size),
    height: String(input.size),
    fov: String(input.fovDeg),
    projection: "TAN",
    coordsys: "icrs",
    ra: String(input.raDeg),
    dec: String(input.decDeg),
    rotation_angle: "0",
    format: "jpg",
  });
  const attempts = HIPS2FITS.map(async (root) => {
    const response = await fetch(`${root}?${params}`, {
      signal: AbortSignal.timeout(2500),
      headers: { "user-agent": "dss-planner/0.1" },
    });
    if (!response.ok) throw new Error(`hips2fits ${response.status}`);
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("image")) throw new Error("hips2fits did not return an image");
    return new Uint8Array(await response.arrayBuffer());
  });
  try {
    const bytes = await Promise.any(attempts);
    hips2fitsBlockedUntil = 0;
    return { bytes, source: "hips2fits" };
  } catch {
    hips2fitsBlockedUntil = Date.now() + 10 * 60 * 1000;
    return null;
  }
}

async function renderFromTiles(input: {
  raDeg: number;
  decDeg: number;
  fovDeg: number;
  size: number;
}): Promise<SkyPlate> {
  const { raDeg, decDeg, fovDeg, size } = input;
  const order = chooseHipsOrder(fovDeg / size);
  const count = size * size;
  const tileIndex = new Int32Array(count);
  const pixelX = new Uint16Array(count);
  const pixelY = new Uint16Array(count);
  const needed = new Set<number>();
  const degPerPx = fovDeg / size;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sky = inverseTan(raDeg, decDeg, degPerPx, size, x + 0.5, y + 0.5);
      const pixel = hipsTilePixel(sky.raDeg, sky.decDeg, order);
      const offset = y * size + x;
      tileIndex[offset] = pixel.tile;
      pixelX[offset] = pixel.x;
      pixelY[offset] = pixel.y;
      needed.add(pixel.tile);
    }
  }

  await mapPool([...needed], 8, (tile) => loadTile(order, tile));

  const rgba = new Uint8Array(count * 4);
  for (let offset = 0; offset < count; offset += 1) {
    const tile = tiles.get(`${order}:${tileIndex[offset] ?? 0}`);
    if (!tile) continue;
    const x = pixelX[offset] ?? 0;
    const y = pixelY[offset] ?? 0;
    if (x >= tile.width || y >= tile.height) continue;
    const source = (y * tile.width + x) * 4;
    const target = offset * 4;
    rgba[target] = tile.data[source] ?? 0;
    rgba[target + 1] = tile.data[source + 1] ?? 0;
    rgba[target + 2] = tile.data[source + 2] ?? 0;
    rgba[target + 3] = 255;
  }

  let lit = 0;
  for (let index = 0; index < rgba.length; index += 16) {
    lit += (rgba[index] ?? 0) + (rgba[index + 1] ?? 0) + (rgba[index + 2] ?? 0);
  }
  if (lit < 80) throw new Error("Sky thumbnail had no survey pixels.");

  const encoded = jpeg.encode({ data: rgba, width: size, height: size }, 82);
  return { bytes: encoded.data, source: "hips-tiles" };
}

async function loadTile(order: number, tile: number): Promise<void> {
  const key = `${order}:${tile}`;
  if (tiles.has(key)) return;
  const missed = tileMissUntil.get(key);
  if (missed != null && Date.now() < missed) return;
  await tileGate.run(async () => {
    if (tiles.has(key)) return;
    const directory = hipsDirectory(tile);
    for (const root of TILE_ROOTS) {
      try {
        const response = await fetch(`${root}/Norder${order}/Dir${directory}/Npix${tile}.jpg`, {
          signal: AbortSignal.timeout(12_000),
          headers: { "user-agent": "dss-planner/0.1" },
        });
        if (!response.ok) continue;
        const decoded = jpeg.decode(new Uint8Array(await response.arrayBuffer()), {
          useTArray: true,
          formatAsRGBA: true,
        });
        tiles.set(key, { width: decoded.width, height: decoded.height, data: decoded.data });
        tileMissUntil.delete(key);
        trimTiles();
        return;
      } catch {
        // Try the next mirror.
      }
    }
    tileMissUntil.set(key, Date.now() + 20_000);
  });
}

function trimTiles(): void {
  while (tiles.size > 180) {
    const oldest = tiles.keys().next().value;
    if (!oldest) break;
    tiles.delete(oldest);
  }
}

function diskPath(key: string): string {
  return `${DISK_CACHE}/${createHash("sha1").update(key).digest("hex")}.jpg`;
}

async function readDisk(key: string): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await readFile(diskPath(key)));
  } catch {
    return null;
  }
}

async function writeDisk(key: string, bytes: Uint8Array): Promise<void> {
  try {
    diskReady ??= mkdir(DISK_CACHE, { recursive: true }).then(() => undefined);
    await diskReady;
    await writeFile(diskPath(key), bytes);
  } catch {
    // A full disk should not fail the response. The memory cache still holds it.
  }
}

function createGate(limit: number): { run<T>(task: () => Promise<T>): Promise<T> } {
  let active = 0;
  const waiting: Array<() => void> = [];
  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active >= limit) {
        await new Promise<void>((resolve) => {
          waiting.push(resolve);
        });
      }
      active += 1;
      try {
        return await task();
      } finally {
        active -= 1;
        waiting.shift()?.();
      }
    },
  };
}

function inverseTan(
  ra0: number,
  dec0: number,
  degPerPx: number,
  size: number,
  x: number,
  y: number,
): { raDeg: number; decDeg: number } {
  const scale = (degPerPx * Math.PI) / 180;
  const xi = -(x - size / 2) * scale;
  const eta = -(y - size / 2) * scale;
  const dec0r = (dec0 * Math.PI) / 180;
  const ra0r = (ra0 * Math.PI) / 180;
  const rho = Math.hypot(xi, eta);
  if (rho < 1e-12) return { raDeg: ra0, decDeg: dec0 };
  const c = Math.atan(rho);
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);
  const dec = Math.asin(cosC * Math.sin(dec0r) + (eta * sinC * Math.cos(dec0r)) / rho);
  let ra =
    ra0r +
    Math.atan2(xi * sinC, rho * cosC * Math.cos(dec0r) - eta * sinC * Math.sin(dec0r));
  ra = (ra * 180) / Math.PI;
  if (ra < 0) ra += 360;
  return { raDeg: ra % 360, decDeg: (dec * 180) / Math.PI };
}

async function mapPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) await task(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}
