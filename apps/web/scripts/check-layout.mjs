import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const widths = [375, 768, 1024, 1280, 1440];
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-layout";

function overlapArea(a, b) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (width <= 1 || height <= 1) return 0;
  return width * height;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await mkdir(outDir, { recursive: true });
const failures = [];

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("section.block", { timeout: 30000 });
  await page.waitForSelector(".hour", { timeout: 20000 }).catch(() => undefined);

  const panels = await page.locator("section.block").evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        name: node.getAttribute("data-panel") ?? "panel",
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }),
  );

  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    if (!panel) continue;
    if (panel.x < -1 || panel.x + panel.width > width + 1) {
      failures.push(`${width}px ${panel.name} escapes the viewport (${panel.x.toFixed(0)}–${(panel.x + panel.width).toFixed(0)})`);
    }
    for (let j = i + 1; j < panels.length; j += 1) {
      const other = panels[j];
      if (!other) continue;
      const area = overlapArea(panel, other);
      if (area > 0) {
        failures.push(`${width}px ${panel.name} overlaps ${other.name} by ${area.toFixed(0)}px²`);
      }
    }
  }

  const hourBox = await page.locator(".hour-row").first().boundingBox();
  const sky = panels.find((panel) => panel.name.includes("Sky cover"));
  if (hourBox && sky) {
    if (hourBox.x < sky.x - 1 || hourBox.x + hourBox.width > sky.x + sky.width + 1) {
      failures.push(`${width}px sky-cover hours extend outside their panel`);
    }
  }

  await page.screenshot({ path: `${outDir}/layout-${width}.png`, fullPage: true });
  console.log(`${width}px panels=${panels.length} hourStrip=${Boolean(hourBox)}`);
}

await browser.close();
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("No overlapping panels.");
