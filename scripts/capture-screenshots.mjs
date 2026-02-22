import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "docs", "screenshots");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function capture() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();

  // --- Desktop screenshots ---
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });

  const page = await desktop.newPage();

  // 1. Ready to Watch (main dashboard)
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  // Wait for posters to load
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: join(outDir, "ready-to-watch.png"),
    fullPage: false,
  });
  console.log("Captured: ready-to-watch.png");

  // 2. Click a series card to open detail panel
  const firstCard = page.locator("button.cursor-pointer").first();
  if (await firstCard.isVisible()) {
    await firstCard.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(outDir, "detail-panel.png"),
      fullPage: false,
    });
    console.log("Captured: detail-panel.png");

    // Close panel
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // 3. Almost Ready page
  await page.goto(`${BASE_URL}/almost-ready`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: join(outDir, "almost-ready.png"),
    fullPage: false,
  });
  console.log("Captured: almost-ready.png");

  // 4. Settings page
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(outDir, "settings.png"),
    fullPage: false,
  });
  console.log("Captured: settings.png");

  await desktop.close();

  // --- Mobile screenshot ---
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
  });

  const mobilePage = await mobile.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({
    path: join(outDir, "mobile.png"),
    fullPage: false,
  });
  console.log("Captured: mobile.png");

  await mobile.close();
  await browser.close();

  console.log(`\nAll screenshots saved to ${outDir}`);
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
