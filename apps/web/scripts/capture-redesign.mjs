import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-redesign";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await mkdir(outDir, { recursive: true });

async function openPlanner(width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("section.block[data-panel='06 Best targets tonight'] .target").first().waitFor({ timeout: 30000 });
  await page.addStyleTag({ content: ".topbar { position: static; }" });
}

await openPlanner(1440, 900);
const targets = page.locator("section.block[data-panel='06 Best targets tonight']");
await page.getByRole("button", { name: "Show more" }).waitFor();
await targets.screenshot({ path: `${outDir}/redesign-targets-all.png` });

await page.getByRole("button", { name: "Nebulae" }).click();
await page.getByRole("button", { name: "Show more" }).waitFor();
await targets.screenshot({ path: `${outDir}/redesign-targets-nebulae.png` });

const search = page.getByLabel("Name or catalogue id");
await search.fill("M42");
const result = page.locator("section.block button.row").first();
await result.waitFor({ timeout: 30000 });
await result.click();
const plate = page.locator("img.plate");
await plate.waitFor({ state: "visible", timeout: 90000 });
await page.waitForFunction(
  () => {
    const image = document.querySelector("img.plate");
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  },
  { timeout: 90000 },
);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${outDir}/redesign-1440.png`, fullPage: true });

await browser.close();
console.log("redesign screenshots written");
