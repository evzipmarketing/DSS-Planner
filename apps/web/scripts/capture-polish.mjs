import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-polish";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function assertOneRow() {
  const tops = await page.locator(".settings-row .chip-btn").evaluateAll((buttons) =>
    buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
  );
  if (tops.length !== 4) throw new Error(`Expected 4 settings buttons, saw ${tops.length}`);
  const spread = Math.max(...tops) - Math.min(...tops);
  if (spread > 2) throw new Error(`Settings buttons are not on one row: ${tops.join(", ")}`);
}

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".target").first().waitFor({ timeout: 30000 });
await page.locator(".bortle-line").waitFor();
const title = await page.title();
if (title !== "DeepSkyMate") throw new Error(`Unexpected title: ${title}`);
await assertOneRow();
await page.screenshot({ path: `${outDir}/desktop-1280.png` });
await page.locator(".min-bar").screenshot({ path: `${outDir}/header-dark.png` });
const theme = page.getByRole("button", { name: /^Theme is/ });
await theme.click();
await page.waitForFunction(() => document.documentElement.dataset.theme === "night");
await page.locator(".min-bar").screenshot({ path: `${outDir}/header-night.png` });
await theme.click();
await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
await page.locator(".min-bar").screenshot({ path: `${outDir}/header-light.png` });
await theme.click();
await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");

await page.setViewportSize({ width: 1024, height: 900 });
await page.evaluate(() => window.scrollTo(0, 0));
await assertOneRow();
const overflow1024 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow1024 > 1) throw new Error(`1024 page overflows by ${overflow1024}px`);
await page.screenshot({ path: `${outDir}/desktop-1024.png` });

await page.getByRole("button", { name: /^Telescope/ }).click();
await page.getByText(/^Focal length \d+ mm$/).waitFor();
const placement = await page.evaluate(() => {
  const panel = document.querySelector(".settings-panel");
  const headline = document.querySelector(".hero h1");
  if (!panel || !headline) return null;
  const box = panel.getBoundingClientRect();
  const head = headline.getBoundingClientRect();
  return {
    left: box.left,
    right: box.right,
    top: box.top,
    bottom: box.bottom,
    width: window.innerWidth,
    height: window.innerHeight,
    headlineTop: head.top,
  };
});
if (!placement) throw new Error("Telescope panel did not open");
if (placement.left < -1 || placement.right > placement.width + 1 || placement.top < -1) {
  throw new Error(`Telescope panel is off screen: ${JSON.stringify(placement)}`);
}
if (placement.headlineTop < placement.bottom - 1) {
  throw new Error(`Telescope panel covers the headline: ${JSON.stringify(placement)}`);
}
await page.screenshot({ path: `${outDir}/desktop-telescope.png` });

await page.setViewportSize({ width: 375, height: 812 });
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator(".target").first().waitFor({ timeout: 30000 });
const overflow375 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow375 > 1) throw new Error(`375 page overflows by ${overflow375}px`);
const mobileTops = await page.locator(".settings-row .chip-btn").evaluateAll((buttons) =>
  buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
);
const rows = new Set(mobileTops);
if (rows.size !== 2) throw new Error(`Expected 2 mobile settings rows, saw ${[...rows].join(", ")}`);
await page.screenshot({ path: `${outDir}/mobile-top.png` });

await browser.close();
console.log("screenshots written");
