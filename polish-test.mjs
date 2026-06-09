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
const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

const SEED = {
  id: "t1",
  title: "Polish Test",
  pinned: false,
  createdAt: new Date().toISOString(),
  messages: [
    { role: "user", content: "show a table", display: "show a table", t: new Date().toISOString() },
    {
      role: "assistant",
      content:
        "Here is a table:\n\n| Name | Age |\n| :--- | ---: |\n| Alice | 30 |\n| Bob | 25 |\n\nDone.",
      t: new Date().toISOString(),
    },
    { role: "user", content: "do it again", display: "do it again", t: new Date().toISOString() },
    { role: "assistant", content: "Error: simulated failure", error: true, t: new Date().toISOString() },
  ],
};

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem("ai_chat_convos", JSON.stringify([seed]));
    localStorage.setItem("ai_chat_active", "t1");
  }, SEED);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // 1. Markdown table renders
  const tableCount = await page.locator(".message.bot table").count();
  check("Table element rendered", tableCount === 1, `${tableCount} tables`);
  const headers = await page.locator(".message.bot table th").allTextContents();
  check("Table headers correct", headers.join(",") === "Name,Age", headers.join(","));
  const firstCell = await page.locator(".message.bot table tbody tr").first().locator("td").first().textContent();
  check("Table body cell correct", firstCell.trim() === "Alice", firstCell);
  const align = await page.locator(".message.bot table th").last().getAttribute("style");
  check("Column alignment parsed", /right/.test(align || ""), align || "");
  await page.screenshot({ path: join(SHOTS, "20-table.png") });

  // 2. Error bubble + Retry button
  const errorBubble = await page.locator(".message.bot .bubble.error").count();
  check("Error bubble styled", errorBubble === 1);
  const retryBtn = page.locator(".message.bot .meta-btn", { hasText: "Retry" });
  check("Retry button present on error", (await retryBtn.count()) === 1);

  // 3. Thumbs feedback on the (non-error) table reply
  const firstBotMeta = page.locator(".message.bot").first();
  const thumbUp = firstBotMeta.locator(".meta-btn", { hasText: "\u{1F44D}" });
  await thumbUp.click();
  await page.waitForTimeout(300);
  const upActive = await firstBotMeta.locator(".meta-btn.active").count();
  check("Thumbs-up becomes active", upActive === 1);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai_chat_convos"))[0].messages[1].feedback
  );
  check("Feedback persisted", stored === "up", String(stored));

  // 4. Toast appears on Copy
  const copyBtn = firstBotMeta.locator(".meta-btn", { hasText: "Copy" });
  await copyBtn.click();
  await page.waitForTimeout(200);
  const toastVisible = await page.locator("#toast.show").isVisible();
  const toastText = await page.locator("#toast").textContent();
  check("Toast shows on copy", toastVisible && /copied/i.test(toastText), toastText);
  await page.screenshot({ path: join(SHOTS, "21-toast.png") });

  // 5. Keyboard shortcut: Ctrl+/ focuses search
  await page.keyboard.press("Control+/");
  await page.waitForTimeout(150);
  const searchFocused = await page.evaluate(() => document.activeElement.id === "search");
  check("Ctrl+/ focuses search", searchFocused);

  // 6. Keyboard shortcut: Ctrl+K creates a new chat
  const convosBefore = await page.locator(".convo-item").count();
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(300);
  const convosAfter = await page.locator(".convo-item").count();
  check("Ctrl+K adds a new chat", convosAfter === convosBefore + 1, `${convosBefore} -> ${convosAfter}`);

  // 7. Keyboard shortcut: Esc closes Settings
  await page.click("#open-settings");
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const modalClosed = await page.locator("#settings-modal").isHidden();
  check("Esc closes settings modal", modalClosed);

  // 8. Retry actually regenerates (end-to-end with server)
  await page.evaluate((seed) => {
    localStorage.setItem("ai_chat_convos", JSON.stringify([seed]));
    localStorage.setItem("ai_chat_active", "t1");
  }, SEED);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.locator(".message.bot .meta-btn", { hasText: "Retry" }).click();
  await page.waitForFunction(
    () =>
      document.getElementById("send").textContent.trim() === "Send" &&
      !document.querySelector(".message.bot .bubble:last-of-type")?.classList.contains("error"),
    { timeout: 60000 }
  );
  const stillError = await page.locator(".message.bot .bubble.error").count();
  check("Retry clears the error and regenerates", stillError === 0, `${stillError} errors left`);
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL POLISH TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
