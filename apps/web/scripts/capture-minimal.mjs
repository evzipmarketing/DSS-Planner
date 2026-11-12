import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const layouts = ["a", "b", "c", "d"];
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-minimal";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });

for (const layout of layouts) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/?layout=${layout}`, { waitUntil: "domcontentloaded" });
  const target = page.locator(".target").first();
  await target.waitFor({ timeout: 30000 });
  await target.click();
  await page.locator("img.plate").waitFor({ state: "visible", timeout: 90000 }).catch(() => undefined);
  await page
    .waitForFunction(
      () => {
        const image = document.querySelector("img.plate");
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
      },
      { timeout: 20000 },
    )
    .catch(() => undefined);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${outDir}/minimal-${layout}-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${outDir}/minimal-${layout}-mobile.png` });
  await page.close();
  console.log(`layout ${layout} captured`);
}

await browser.close();
