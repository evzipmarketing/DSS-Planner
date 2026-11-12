import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-d2";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".target").first().waitFor({ timeout: 30000 });
const title = await page.title();
if (title !== "DSS Astro Planner") throw new Error(`Unexpected title: ${title}`);
await page.evaluate(async () => {
  for (const row of document.querySelectorAll(".target")) {
    row.scrollIntoView({ block: "center" });
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  window.scrollTo(0, 0);
});
await page.waitForFunction(
  () => {
    const slots = [...document.querySelectorAll(".target .thumb-slot")];
    if (slots.length < 8) return false;
    return slots.every((slot) => {
      const image = slot.querySelector("img.thumb");
      if (image?.complete && image.naturalWidth > 0) return true;
      return Boolean(slot.querySelector(".thumb-empty:not(.thumb-wait)"));
    });
  },
  null,
  { timeout: 90000 },
);
const thumbs = await page.evaluate(() => {
  const slots = [...document.querySelectorAll(".target .thumb-slot")];
  const loaded = slots.filter((slot) => {
    const image = slot.querySelector("img.thumb");
    return image?.complete && image.naturalWidth > 0;
  }).length;
  return { rows: slots.length, loaded };
});
console.log(JSON.stringify(thumbs));
if (thumbs.loaded < thumbs.rows) throw new Error(`Only ${thumbs.loaded} of ${thumbs.rows} thumbnails loaded`);
await page.addStyleTag({ content: ".settings-bar{position:static !important}" });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${outDir}/desktop-list.png` });

await page.getByRole("button", { name: /^Telescope/ }).click();
await page.getByText(/^Focal length \d+ mm$/).waitFor();
await page.getByText("Enter a focal length (mm)").waitFor();
await page.screenshot({ path: `${outDir}/desktop-telescope.png` });
await page.getByRole("button", { name: /^Telescope/ }).click();

await page.locator(".target").first().click();
await page.locator(".moon-mark").waitFor({ timeout: 15000 });
await page.locator("img.plate").waitFor({ state: "visible", timeout: 90000 });
await page.screenshot({ path: `${outDir}/desktop-expanded.png`, fullPage: true });

await page.setViewportSize({ width: 375, height: 812 });
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".target").first().waitFor({ timeout: 30000 });
await page.addStyleTag({ content: ".settings-bar{position:static !important}" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 1) throw new Error(`Mobile page overflows by ${overflow}px`);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${outDir}/mobile-top.png` });

await page.locator(".target").first().click();
await page.locator(".moon-mark").waitFor({ timeout: 15000 });
await page.locator(".inline-detail").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${outDir}/mobile-expanded.png`, fullPage: true });

const loaded = await page.evaluate(() => {
  const rows = document.querySelectorAll(".target").length;
  const thumbs = [...document.querySelectorAll(".target img.thumb")].filter((img) => img.complete && img.naturalWidth > 0).length;
  return { rows, thumbs };
});
console.log(JSON.stringify(loaded));

await browser.close();
console.log("screenshots written");
