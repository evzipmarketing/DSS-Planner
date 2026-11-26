/**
 * Rasterize DeepSkyMate brand mark + wordmark for web PWA and Expo mobile.
 * Source of truth: apps/web/app/icon.svg + apps/web/public/deepskymate-logo-*.svg
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BG = "#141616";
const markPath = path.join(root, "apps/web/app/icon.svg");
const applePath = path.join(root, "apps/web/app/apple-icon.png");
const wordmarkDark = path.join(root, "apps/web/public/deepskymate-logo-dark.svg");

const webPublic = path.join(root, "apps/web/public");
const webApp = path.join(root, "apps/web/app");
const mobileImages = path.join(root, "apps/mobile/assets/images");

async function solidSquare(size, hex = BG) {
  const { r, g, b } = hexToRgb(hex);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r, g, b },
    },
  });
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

/** Place mark on dark square with ~18% padding. */
async function appIconPng(size) {
  const pad = Math.round(size * 0.18);
  const inner = size - pad * 2;
  const mark = await sharp(markPath).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return solidSquare(size)
    .then((img) =>
      img
        .composite([{ input: mark, left: pad, top: pad }])
        .png()
        .toBuffer(),
    );
}

async function writePng(file, buffer) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  console.log("wrote", path.relative(root, file));
}

async function main() {
  const markSvg = await readFile(markPath, "utf8");
  // Keep public + mobile SVG marks aligned with app/icon.svg
  await writeFile(path.join(webPublic, "icon.svg"), markSvg);
  await writeFile(path.join(mobileImages, "icon.svg"), markSvg);

  const sizes = {
    [path.join(webPublic, "icon-192.png")]: 192,
    [path.join(webPublic, "icon-512.png")]: 512,
    [path.join(webPublic, "apple-touch-icon.png")]: 180,
    [path.join(webApp, "apple-icon.png")]: 180,
    [path.join(mobileImages, "icon.png")]: 1024,
    [path.join(mobileImages, "adaptive-icon.png")]: 1024,
    [path.join(mobileImages, "splash-icon.png")]: 512,
    [path.join(mobileImages, "favicon.png")]: 48,
  };

  for (const [out, size] of Object.entries(sizes)) {
    await writePng(out, await appIconPng(size));
  }

  // Prefer existing designed apple-icon if present and larger mark clarity — regenerate from SVG above.
  // Favicon ICO: multi-size PNG pack via sharp (browsers accept PNG favicon too).
  const favicon32 = await appIconPng(32);
  const favicon16 = await appIconPng(16);
  await writePng(path.join(webPublic, "favicon-32.png"), favicon32);
  await writePng(path.join(webPublic, "favicon-16.png"), favicon16);
  // Next.js also serves app/icon.svg; drop a PNG favicon for older Android “Add to Home Screen”.
  await writePng(path.join(webPublic, "favicon.png"), await appIconPng(48));

  // Wordmark PNG for Expo Image (dark lockup on transparent).
  const wm = await sharp(wordmarkDark)
    .resize({ width: 840, height: 200, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writePng(path.join(mobileImages, "deepskymate-logo-dark.png"), wm);

  // Keep a copy of the designed apple source path in sync (already written).
  void applePath;
  console.log("Brand icons generated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
