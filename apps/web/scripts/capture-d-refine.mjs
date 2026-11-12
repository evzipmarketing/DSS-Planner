import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-minimal";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });

async function prepare(page, layout) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/?layout=${layout}`, { waitUntil: "domcontentloaded" });
  const target = page.locator(".target").first();
  await target.waitFor({ timeout: 30000 });
  await page.getByText(/mean cloud|Sky cover/).first().waitFor({ timeout: 15000 }).catch(() => undefined);
  await target.click();
  await page.locator("img.plate").waitFor({ state: "visible", timeout: 90000 }).catch(() => undefined);
  await page.evaluate(() => window.scrollTo(0, 0));
}

const d1 = await browser.newPage();
await prepare(d1, "d1");
await d1.screenshot({ path: `${outDir}/minimal-d1-desktop.png`, fullPage: true });
await d1.setViewportSize({ width: 390, height: 844 });
await d1.evaluate(() => window.scrollTo(0, 0));
await d1.screenshot({ path: `${outDir}/minimal-d1-mobile.png` });
await d1.setViewportSize({ width: 1440, height: 900 });
await d1.evaluate(() => window.scrollTo(0, 0));
await d1.getByRole("button", { name: "Hyderabad" }).click();
await d1.getByText("Search for a place").waitFor();
await d1.screenshot({ path: `${outDir}/minimal-d1-desktop-open.png` });
await d1.close();

const d2 = await browser.newPage();
await prepare(d2, "d2");
await d2.screenshot({ path: `${outDir}/minimal-d2-desktop.png`, fullPage: true });
await d2.setViewportSize({ width: 390, height: 844 });
await d2.evaluate(() => window.scrollTo(0, 0));
await d2.screenshot({ path: `${outDir}/minimal-d2-mobile.png` });
await d2.setViewportSize({ width: 1440, height: 900 });
await d2.evaluate(() => window.scrollTo(0, 0));
await d2.getByRole("button", { name: /^Gear:/ }).click();
await d2.getByText("Telescope").first().waitFor();
await d2.screenshot({ path: `${outDir}/minimal-d2-desktop-open.png` });
await d2.close();

await browser.close();
console.log("d1 and d2 captured");
