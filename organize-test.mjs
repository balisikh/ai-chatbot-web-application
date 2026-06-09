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

const now = new Date().toISOString();
const SEED = [
  {
    id: "c1",
    title: "Work planning",
    pinned: false,
    tags: [],
    createdAt: now,
    messages: [
      { role: "user", content: "Plan my week with about forty characters here.", display: "Plan my week", t: now },
      { role: "assistant", content: "Here is a detailed plan that is reasonably long so tokens are counted nicely.", t: now },
    ],
  },
  {
    id: "c2",
    title: "Recipe ideas",
    pinned: false,
    tags: [],
    createdAt: now,
    messages: [
      { role: "user", content: "Give me dinner ideas", display: "Give me dinner ideas", t: now },
      { role: "assistant", content: "Pasta, tacos, stir fry.", t: now },
    ],
  },
];

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem("ai_chat_convos", JSON.stringify(seed));
    localStorage.setItem("ai_chat_active", "c1");
  }, SEED);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // ---- 1. Token / usage counter ----
  const usageVisible = await page.locator("#usage").isVisible();
  const usageText = await page.locator("#usage").textContent();
  check("Usage pill visible", usageVisible);
  check("Usage shows token total", /\d+\s+tokens/.test(usageText), usageText);
  const tokCounts = await page.locator(".meta .token-count").count();
  check("Per-message token counts shown", tokCounts >= 2, `${tokCounts} counts`);
  const firstTok = await page.locator(".meta .token-count").first().textContent();
  check("Token count format", /~\d+ tok/.test(firstTok), firstTok);
  await page.screenshot({ path: join(SHOTS, "24-usage.png") });

  // ---- 2. Auto-scroll toggle persists ----
  await page.click("#open-settings");
  await page.waitForTimeout(200);
  const autoChecked = await page.isChecked("#auto-scroll");
  check("Auto-scroll defaults on", autoChecked);
  await page.uncheck("#auto-scroll");
  await page.click("#save-settings");
  await page.waitForTimeout(200);
  const persisted = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ai_chat_settings")).autoScroll
  );
  check("Auto-scroll setting saved as false", persisted === false, String(persisted));
  // turn it back on for normal behavior
  await page.click("#open-settings");
  await page.waitForTimeout(150);
  await page.check("#auto-scroll");
  await page.click("#save-settings");
  await page.waitForTimeout(150);

  // ---- 3. Conversation tags ----
  // Add tags to the first conversation
  await page.locator(".convo-item").first().locator(".convo-tag-btn").click();
  await page.waitForTimeout(150);
  await page.fill(".tag-editor", "work, urgent");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const chipTexts = await page.locator(".convo-item").first().locator(".convo-tag").allTextContents();
  check("Tags added to conversation", chipTexts.join(",") === "#work,#urgent", chipTexts.join(","));
  check("Tags persisted", await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem("ai_chat_convos")).find((x) => x.id === "c1");
    return JSON.stringify(c.tags) === JSON.stringify(["work", "urgent"]);
  }));

  // Tag filter bar appears
  const filterChips = await page.locator("#tag-filter .tag-chip").count();
  check("Tag filter bar appears", filterChips >= 3, `${filterChips} chips (All + tags)`);
  await page.screenshot({ path: join(SHOTS, "25-tags.png") });

  // Filtering by a tag narrows the list
  await page.locator("#tag-filter .tag-chip", { hasText: "#work" }).click();
  await page.waitForTimeout(300);
  const shown = await page.locator(".convo-item").count();
  check("Filtering by tag narrows list", shown === 1, `${shown} shown`);

  // "All" restores
  await page.locator("#tag-filter .tag-chip", { hasText: "All" }).click();
  await page.waitForTimeout(300);
  const all = await page.locator(".convo-item").count();
  check("'All' restores full list", all === 2, `${all} shown`);
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL ORGANIZE TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
