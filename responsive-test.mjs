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

async function noHorizontalOverflow(page) {
  return page.evaluate(() => {
    const d = document.documentElement;
    return d.scrollWidth <= d.clientWidth + 1;
  });
}

try {
  // ---- Desktop ----
  {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const sidebarVisible = await page.locator("#sidebar").isVisible();
    check("Desktop: sidebar visible", sidebarVisible);
    check("Desktop: no horizontal overflow", await noHorizontalOverflow(page));
    await page.screenshot({ path: join(SHOTS, "15-desktop.png") });
    await page.close();
  }

  // ---- Tablet ----
  {
    const page = await (await browser.newContext({ viewport: { width: 820, height: 1100 } })).newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    check("Tablet: no horizontal overflow", await noHorizontalOverflow(page));
    await page.screenshot({ path: join(SHOTS, "16-tablet.png") });
    await page.close();
  }

  // ---- Phone ----
  {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    // Sidebar should be hidden (off-canvas) by default on a phone
    const drawerHiddenInitially = await page.evaluate(() => {
      const s = document.getElementById("sidebar");
      return s.getBoundingClientRect().left < 0;
    });
    check("Phone: sidebar starts off-canvas", drawerHiddenInitially);
    check("Phone: no horizontal overflow", await noHorizontalOverflow(page));
    await page.screenshot({ path: join(SHOTS, "17-phone-closed.png") });

    // Open drawer via hamburger
    await page.click("#toggle-sidebar");
    await page.waitForTimeout(400);
    const drawerOpen = await page.evaluate(() => {
      const s = document.getElementById("sidebar");
      return Math.round(s.getBoundingClientRect().left) >= 0;
    });
    check("Phone: hamburger opens drawer", drawerOpen);
    const backdropVisible = await page.locator("#sidebar-backdrop").isVisible();
    check("Phone: backdrop appears with drawer", backdropVisible);
    await page.screenshot({ path: join(SHOTS, "18-phone-drawer.png") });

    // Tap backdrop closes drawer
    await page.click("#sidebar-backdrop", { position: { x: 350, y: 300 } });
    await page.waitForTimeout(400);
    const closedAgain = await page.evaluate(() => {
      const s = document.getElementById("sidebar");
      return s.getBoundingClientRect().left < 0;
    });
    check("Phone: tapping backdrop closes drawer", closedAgain);

    // Open drawer, create a new chat -> drawer should auto-close
    await page.click("#toggle-sidebar");
    await page.waitForTimeout(300);
    await page.click("#new-convo");
    await page.waitForTimeout(400);
    const closedAfterNew = await page.evaluate(() => {
      const s = document.getElementById("sidebar");
      return s.getBoundingClientRect().left < 0;
    });
    check("Phone: drawer auto-closes after New chat", closedAfterNew);

    // Send a message; check the bubble fits within the viewport width
    await page.fill("#input", "Say hi in one short sentence.");
    await page.click("#send");
    await page.waitForFunction(
      () =>
        document.getElementById("send").textContent.trim() === "Send" &&
        document.querySelectorAll(".message.bot .bubble").length > 0 &&
        (document.querySelector(".message.bot .bubble").getAttribute("data-raw") || "").trim().length > 0,
      { timeout: 60000 }
    );
    check("Phone: no overflow after a reply", await noHorizontalOverflow(page));
    await page.screenshot({ path: join(SHOTS, "19-phone-chat.png") });
    await ctx.close();
  }
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL RESPONSIVE TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
