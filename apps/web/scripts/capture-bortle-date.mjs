import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-bortle-date";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function ensureLight() {
  for (let i = 0; i < 3; i += 1) {
    const current = await page.evaluate(() => document.documentElement.dataset.theme || "dark");
    if (current === "light") return;
    await page.getByRole("button", { name: /^Theme is/ }).click();
    await page.waitForFunction((previous) => (document.documentElement.dataset.theme || "dark") !== previous, current);
  }
  throw new Error("Could not switch to Light");
}

async function shot(width, name, open) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".target").first().waitFor({ timeout: 30000 });
  await ensureLight();
  await page.getByRole("button", { name: new RegExp(`^${open}`) }).click();
  if (open === "Location") {
    await page.getByText(/Estimate: Bortle \d+/).waitFor();
    if ((await page.getByRole("slider").count()) !== 0) throw new Error("Bortle slider is still present");
    if ((await page.getByRole("button", { name: "Use the estimate" }).count()) !== 0) throw new Error("Estimate button is still present");
  } else {
    await page.getByRole("button", { name: "Today" }).waitFor();
    if ((await page.getByRole("button", { name: "Previous day" }).count()) !== 1) throw new Error("Previous day is duplicated");
    const overflow = await page.evaluate(() => {
      const input = document.querySelector('input[type="date"]');
      const panel = document.querySelector(".settings-panel");
      if (!input || !panel) return { missing: true };
      const box = input.getBoundingClientRect();
      const bounds = panel.getBoundingClientRect();
      return {
        missing: false,
        inputRight: box.right,
        panelRight: bounds.right,
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    if (overflow.missing) throw new Error("Date input missing");
    if (overflow.inputRight > overflow.panelRight + 1) throw new Error(`Date input overflows the panel: ${JSON.stringify(overflow)}`);
    if (overflow.page > 1) throw new Error(`Page overflows by ${overflow.page}px`);
  }
  await page.screenshot({ path: `${outDir}/${name}.png` });
}

await shot(1280, "desktop-location", "Location");
await shot(1280, "desktop-date", "Date");
await shot(390, "mobile-location", "Location");
await shot(390, "mobile-date", "Date");

await browser.close();
console.log("screenshots written");
