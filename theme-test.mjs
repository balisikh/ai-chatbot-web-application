import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3567";
const SHOTS = join(process.cwd(), "test-screenshots");
mkdirSync(SHOTS, { recursive: true });

let allPass = true;
function check(name, pass, detail = "") {
  if (!pass) allPass = false;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // 1. Open settings, theme dropdown populated
  await page.click("#open-settings");
  await page.waitForTimeout(200);
  const themeOptions = await page.locator("#theme-select option").count();
  check("Theme dropdown populated", themeOptions === 6, `${themeOptions} themes`);

  // 2. Accent swatches present (default + 7 colors)
  const swatches = await page.locator(".accent-swatch").count();
  check("Accent swatches present", swatches === 8, `${swatches} swatches`);

  // 3. Pick the Forest theme
  await page.selectOption("#theme-select", "forest");
  await page.waitForTimeout(200);
  const themeAttr = await page.evaluate(() => document.body.dataset.theme);
  check("Theme switches to forest", themeAttr === "forest", themeAttr);
  const accentForest = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("--accent").trim()
  );
  check("Forest accent applied", accentForest.toLowerCase() === "#10b981", accentForest);
  await page.screenshot({ path: join(SHOTS, "13-theme-forest.png") });

  // 4. Pick a custom accent (pink, index 2 -> swatch 3)
  await page.locator(".accent-swatch").nth(3).click();
  await page.waitForTimeout(200);
  const customAccent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
  );
  check("Custom accent overrides theme", customAccent.toLowerCase() === "#ec4899", customAccent);

  // 5. Persists after reload
  await page.click("#save-settings");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const themeAfter = await page.evaluate(() => document.body.dataset.theme);
  const accentAfter = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
  );
  check("Theme persists after reload", themeAfter === "forest", themeAfter);
  check("Accent persists after reload", accentAfter.toLowerCase() === "#ec4899", accentAfter);

  // 6. Header button cycles themes
  const before = await page.evaluate(() => document.body.dataset.theme);
  await page.click("#theme-toggle");
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => document.body.dataset.theme);
  check("Header button cycles theme", after !== before, `${before} -> ${after}`);
  await page.screenshot({ path: join(SHOTS, "14-theme-cycled.png") });
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL THEME TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
