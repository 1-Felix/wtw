import { chromium } from "playwright";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "docs");

const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    background: #0a0a0a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    overflow: hidden;
    position: relative;
  }
  /* Subtle grid pattern */
  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245, 158, 11, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  /* Ambient glow */
  body::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .container {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .logo-icon {
    width: 72px;
    height: 72px;
    background: #f59e0b;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-icon span {
    font-size: 40px;
    font-weight: 800;
    color: #0a0a0a;
    letter-spacing: -1px;
  }
  .logo-text {
    font-size: 80px;
    font-weight: 800;
    color: #f5f5f5;
    letter-spacing: -3px;
  }
  .tagline {
    font-size: 26px;
    color: #a3a3a3;
    font-weight: 400;
    letter-spacing: 0.5px;
  }
  .tech {
    display: flex;
    gap: 24px;
    margin-top: 12px;
  }
  .tech span {
    font-size: 15px;
    color: #525252;
    font-weight: 500;
    padding: 6px 16px;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-icon"><span>W</span></div>
      <div class="logo-text">wtw</div>
    </div>
    <div class="tagline">What to Watch — Your Jellyfin media readiness dashboard</div>
    <div class="tech">
      <span>Jellyfin</span>
      <span>Sonarr</span>
      <span>Radarr</span>
      <span>Self-hosted</span>
    </div>
  </div>
</body>
</html>`;

async function generate() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });

  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({
    path: join(outDir, "og-image.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("OG image saved to docs/og-image.png");
}

generate().catch((err) => {
  console.error("OG image generation failed:", err);
  process.exit(1);
});
