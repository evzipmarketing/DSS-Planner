import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-d2";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
const target = page.locator(".target").first();
await target.waitFor({ timeout: 30000 });
await target.click();
await page.locator("img.plate").waitFor({ state: "visible", timeout: 90000 }).catch(() => undefined);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${outDir}/desktop-dark.png`, fullPage: true });

const theme = page.getByRole("button", { name: /^Theme is/ });
await theme.click();
await page.screenshot({ path: `${outDir}/desktop-night.png`, fullPage: true });
await theme.click();
await page.screenshot({ path: `${outDir}/desktop-light.png`, fullPage: true });
await theme.click();

await page.getByRole("button", { name: /^Telescope:/ }).click();
await page.getByText("Flattener, reducer, or Barlow").waitFor();
await page.screenshot({ path: `${outDir}/desktop-telescope.png` });
await page.getByRole("button", { name: /^Telescope:/ }).click();
await page.getByRole("button", { name: /^Camera:/ }).click();
await page.getByText("Add a filter").waitFor();
await page.screenshot({ path: `${outDir}/desktop-camera.png` });
await page.getByRole("button", { name: /^Camera:/ }).click();

await page.setViewportSize({ width: 375, height: 812 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${outDir}/mobile-dark.png` });

await browser.close();
console.log("screenshots written");
