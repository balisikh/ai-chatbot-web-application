import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3567";
const SHOTS = join(process.cwd(), "test-screenshots");
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
let allPass = true;
function check(name, pass, detail = "") {
  if (!pass) allPass = false;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

try {
  // --- Desktop: sidebar should collapse/expand ---
  const desktop = await browser.newPage({ viewport: { width: 1024, height: 600 } });
  await desktop.goto(BASE, { waitUntil: "networkidle" });
  await desktop.waitForTimeout(300);

  const visibleBefore = await desktop.locator(".sidebar").isVisible();
  const widthBefore = await desktop.locator(".sidebar").evaluate((el) => el.getBoundingClientRect().width);
  check("Desktop: sidebar visible initially", visibleBefore && widthBefore > 50, `w=${Math.round(widthBefore)}`);

  await desktop.click("#toggle-sidebar");
  await desktop.waitForTimeout(400);
  const widthCollapsed = await desktop.locator(".sidebar").evaluate((el) => el.getBoundingClientRect().width);
  check("Desktop: ☰ collapses sidebar", widthCollapsed < 5, `w=${Math.round(widthCollapsed)}`);
  await desktop.screenshot({ path: join(SHOTS, "08-sidebar-collapsed.png") });

  await desktop.click("#toggle-sidebar");
  await desktop.waitForTimeout(400);
  const widthExpanded = await desktop.locator(".sidebar").evaluate((el) => el.getBoundingClientRect().width);
  check("Desktop: ☰ expands sidebar again", widthExpanded > 50, `w=${Math.round(widthExpanded)}`);
  await desktop.close();

  // --- Mobile: sidebar should slide in/out ---
  const mobile = await browser.newPage({ viewport: { width: 420, height: 740 } });
  await mobile.goto(BASE, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(300);

  const offscreen = await mobile.locator(".sidebar").evaluate((el) => el.getBoundingClientRect().left < 0);
  check("Mobile: sidebar hidden off-screen initially", offscreen);

  await mobile.click("#toggle-sidebar");
  await mobile.waitForTimeout(400);
  const onscreen = await mobile.locator(".sidebar").evaluate((el) => el.getBoundingClientRect().left >= 0);
  check("Mobile: ☰ slides sidebar in", onscreen);
  await mobile.screenshot({ path: join(SHOTS, "09-sidebar-mobile-open.png") });
  await mobile.close();
} catch (err) {
  check("Toggle test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL TOGGLE TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
