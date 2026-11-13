import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-placeholders";
const search = "e.g. M42, NGC 224, Horsehead";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

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

async function placeholderContrast() {
  return page.locator(`input[placeholder="${search}"]`).evaluate((el) => {
    const hint = getComputedStyle(el, "::placeholder");
    const typed = getComputedStyle(el);
    return { hint: hint.color, italic: hint.fontStyle, typed: typed.color };
  });
}

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.getByPlaceholder(search).waitFor({ timeout: 30000 });

for (const theme of ["dark", "night", "light"]) {
  await ensureTheme(theme);
  const contrast = await placeholderContrast();
  if (contrast.hint === contrast.typed) throw new Error(`${theme} placeholder matches typed text`);
  if (contrast.italic !== "italic") throw new Error(`${theme} placeholder is not italic`);
  console.log(theme, JSON.stringify(contrast));
  await page.locator(".search-field").screenshot({ path: `${outDir}/${theme}-search-empty.png` });
  await page.getByPlaceholder(search).fill("M42");
  await page.locator(".search-field").screenshot({ path: `${outDir}/${theme}-search-typed.png` });
  await page.getByPlaceholder(search).fill("");

  await page.locator(".custom-tab").click();
  await page.locator(".custom-panel").waitFor();
  await page.locator(".custom-panel").screenshot({ path: `${outDir}/${theme}-custom.png` });
  await page.locator(".custom-tab").click();

  await page.getByRole("button", { name: /^Telescope/ }).click();
  await page.getByPlaceholder("e.g. 800").waitFor();
  await page.locator(".field", { has: page.getByPlaceholder("e.g. 800") }).screenshot({ path: `${outDir}/${theme}-focal.png` });
  await page.getByRole("button", { name: /^Telescope/ }).click();
}

await page.setViewportSize({ width: 390, height: 844 });
await ensureTheme("dark");
await page.locator(".search-field").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${outDir}/mobile-search-empty.png` });

await browser.close();
console.log("screenshots written");
