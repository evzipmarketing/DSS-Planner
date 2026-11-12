import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const themes = ["a", "b", "c", "d", "e"];
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "/tmp/dss-palettes";

const browser = await chromium.launch({ headless: true });
await mkdir(outDir, { recursive: true });

for (const theme of themes) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/?theme=${theme}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.theme === expected,
    theme,
  );

  const search = page.getByLabel("Name or catalogue id");
  await search.waitFor({ timeout: 30000 });
  await search.fill("M42");
  const result = page.locator('section.block[data-panel="04 Catalogue"] button.row').first();
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
  await page.locator("section.block[data-panel='05 Object']").getByText("M42").first().waitFor();
  await page.addStyleTag({
    content: ".topbar { position: static; } nextjs-portal { display: none !important; }",
  });

  await page.screenshot({
    path: `${outDir}/palette-${theme}-desktop.png`,
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${outDir}/palette-${theme}-mobile.png`,
    fullPage: false,
  });

  await page.close();
  console.log(`palette ${theme} captured`);
}

await browser.close();
