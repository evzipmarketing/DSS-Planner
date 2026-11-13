import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-brand";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function ensureTheme(name) {
  for (let i = 0; i < 3; i += 1) {
    const current = await page.evaluate(() => document.documentElement.dataset.theme || "dark");
    if (current === name) return;
    await page.getByRole("button", { name: /^Theme is/ }).click();
    await page.waitForFunction((previous) => (document.documentElement.dataset.theme || "dark") !== previous, current);
  }
  const current = await page.evaluate(() => document.documentElement.dataset.theme || "dark");
  if (current !== name) throw new Error(`Theme is ${current}, wanted ${name}`);
}

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".brand-lockup").waitFor({ timeout: 30000 });
const title = await page.title();
if (title !== "DeepSkyMate") throw new Error(`Title is ${title}`);
const description = await page.locator('meta[name="description"]').getAttribute("content");
if (description !== "Astrophotography planner by DarkSkyscapes") throw new Error(description ?? "missing description");
if (await page.locator(".tagline").count()) throw new Error("Header still renders a separate tagline");

for (const theme of ["dark", "light", "night"]) {
  await ensureTheme(theme);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".min-bar").screenshot({ path: `${outDir}/header-${theme}.png` });
}

await page.setViewportSize({ width: 390, height: 844 });
for (const theme of ["light", "dark"]) {
  await ensureTheme(theme);
  await page.evaluate(() => window.scrollTo(0, 0));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`${theme} mobile overflows by ${overflow}px`);
  await page.locator(".min-bar").screenshot({ path: `${outDir}/header-mobile-${theme}.png` });
}

await browser.close();
console.log("screenshots written");
