import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-search";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function openCustom() {
  const button = page.locator(".custom-tab");
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  await page.locator(".custom-panel").waitFor();
}

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".target").first().waitFor({ timeout: 30000 });
await page.locator(".target").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: `${outDir}/desktop-dividers.png` });
await page.locator(".custom-tab").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${outDir}/custom-desktop-closed.png` });

await openCustom();
const panel = await page.locator(".custom-panel").boundingBox();
if (!panel) throw new Error("Custom panel did not open");
if (panel.x < -1 || panel.x + panel.width > 1281) throw new Error(`Custom panel is off screen: ${JSON.stringify(panel)}`);
await page.getByLabel("Magnitude", { exact: true }).fill("8");
await page.screenshot({ path: `${outDir}/custom-desktop-open.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".target").first().waitFor({ timeout: 30000 });
await page.locator(".target").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: `${outDir}/mobile-dividers.png` });
await page.locator(".custom-tab").scrollIntoViewIfNeeded();
const closedOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (closedOverflow > 1) throw new Error(`390 closed page overflows by ${closedOverflow}px`);
await page.screenshot({ path: `${outDir}/custom-mobile-closed.png` });
await openCustom();
const openOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (openOverflow > 1) throw new Error(`390 open page overflows by ${openOverflow}px`);
await page.locator(".custom-panel").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${outDir}/custom-mobile-open.png` });

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".target").first().waitFor({ timeout: 30000 });
const search = page.getByPlaceholder("M42, NGC 224, Horsehead");
await search.fill("M42");
await page.locator(".row").first().waitFor({ timeout: 15000 });
await page.locator(".row").first().click();
await page.getByRole("button", { name: "Show all targets", exact: true }).waitFor();
await page.locator(".search-clear").waitFor();
await page.locator(".moon-mark").waitFor({ timeout: 15000 });
const slots = await page.locator(".target-slot").count();
if (slots !== 1) throw new Error(`Expected one target row, saw ${slots}`);
if ((await page.locator(".inline-detail").count()) !== 1) throw new Error("Selected object is not expanded");
await page.screenshot({ path: `${outDir}/desktop-search.png`, fullPage: true });
await page.locator(".search-field").screenshot({ path: `${outDir}/search-clear.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 1) throw new Error(`390 search page overflows by ${overflow}px`);
if ((await page.locator(".target-slot").count()) !== 1) throw new Error("Expected one mobile target row");
await page.screenshot({ path: `${outDir}/mobile-search.png`, fullPage: true });

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".thumb-open").first().waitFor({ timeout: 30000 });
await page.locator(".thumb-open").first().click();
await page.locator(".preview-dialog").waitFor();
await page.locator(".preview-frame img").waitFor({ state: "visible", timeout: 90000 });
const stillClosed = await page.locator(".inline-detail").count();
if (stillClosed !== 0) throw new Error("Thumbnail click expanded the row");
await page.screenshot({ path: `${outDir}/preview-desktop.png` });

await page.setViewportSize({ width: 390, height: 844 });
const previewOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (previewOverflow > 1) throw new Error(`Preview overflows by ${previewOverflow}px`);
await page.screenshot({ path: `${outDir}/preview-mobile.png` });

await browser.close();
console.log("screenshots written");
