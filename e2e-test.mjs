import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3000";
const SHOTS = join(process.cwd(), "test-screenshots");
mkdirSync(SHOTS, { recursive: true });

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

async function botCount(page) {
  return page.locator(".message.bot .bubble").count();
}

async function sendAndWait(page, text, timeout = 60000) {
  const before = await botCount(page);
  await page.fill("#input", text);
  await page.click("#send");
  await page.waitForFunction(
    (prev) => {
      const bots = document.querySelectorAll(".message.bot .bubble");
      if (bots.length <= prev) return false;
      const last = bots[bots.length - 1];
      const raw = last.getAttribute("data-raw") || "";
      const sendReady =
        document.getElementById("send").textContent.trim() === "Send";
      return raw.trim().length > 0 && sendReady;
    },
    before,
    { timeout }
  );
  const last = page.locator(".message.bot .bubble").last();
  return (await last.getAttribute("data-raw")) || "";
}

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

try {
  // 1. Load page
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const title = await page.locator("#convo-title").textContent();
  record("Page loads with header", !!title, `title="${title}"`);
  await page.screenshot({ path: join(SHOTS, "01-loaded.png") });

  // 2. Suggestion chips present on empty chat
  const chips = await page.locator(".suggestions .chip").count();
  record("Suggestion chips shown", chips > 0, `${chips} chips`);

  // 3. Basic chat + streaming reply
  const reply1 = await sendAndWait(page, "Say hello in one short sentence.");
  record("Basic chat reply received", reply1.length > 0, reply1.slice(0, 60));
  await page.screenshot({ path: join(SHOTS, "02-first-reply.png") });

  // 4. Markdown / code block + syntax highlight + copy-code button
  await sendAndWait(
    page,
    "Write a one-line Python hello world inside a code block. Code only."
  );
  const hasPre = (await page.locator(".message.bot pre code.hl").count()) > 0;
  const hasCopyCode = (await page.locator(".copy-code").count()) > 0;
  record("Code block rendered + highlighted", hasPre);
  record("Copy-code button present", hasCopyCode);
  await page.screenshot({ path: join(SHOTS, "03-code-block.png") });

  // 5. Regenerate button present
  const regen = page.locator(".regen-btn").last();
  const regenVisible = (await regen.count()) > 0;
  record("Regenerate button present", regenVisible);

  // 6. Timestamps present
  const stamps = await page.locator(".timestamp").count();
  record("Timestamps present", stamps > 0, `${stamps} stamps`);

  // 7. Copy reply button present
  const copyBtns = await page.locator(".meta-btn", { hasText: "Copy" }).count();
  record("Copy reply button present", copyBtns > 0);

  // 8. Multiple conversations: new chat
  const convosBefore = await page.locator(".convo-item").count();
  await page.click("#new-convo");
  await page.waitForTimeout(300);
  const convosAfter = await page.locator(".convo-item").count();
  record(
    "New conversation created",
    convosAfter === convosBefore + 1,
    `${convosBefore} -> ${convosAfter}`
  );
  await sendAndWait(page, "Give me a one-line fun fact.");
  await page.screenshot({ path: join(SHOTS, "04-second-convo.png") });

  // 9. Switch back to first conversation, history persists
  await page.locator(".convo-item").last().click();
  await page.waitForTimeout(400);
  const restored = await page.locator(".message.bot .bubble").count();
  record("Switch conversation restores history", restored >= 2, `${restored} bot msgs`);

  // 10. Theme toggle
  const themeBefore = await page.evaluate(() => document.body.dataset.theme);
  await page.click("#theme-toggle");
  await page.waitForTimeout(300);
  const themeAfter = await page.evaluate(() => document.body.dataset.theme);
  record("Theme toggles", themeBefore !== themeAfter, `${themeBefore} -> ${themeAfter}`);
  await page.screenshot({ path: join(SHOTS, "05-theme-light.png") });
  await page.click("#theme-toggle"); // back to dark
  await page.waitForTimeout(200);

  // 11. Model picker populated
  const modelOptions = await page.locator("#model-picker option").count();
  const modelValue = await page.locator("#model-picker").inputValue();
  record("Model picker populated", modelOptions > 0, `value=${modelValue}`);

  // 12. Mic button present (voice input available in chromium)
  const micVisible = await page.locator("#mic").isVisible();
  record("Mic (voice) button present", micVisible);

  // 13. Settings: editable personality flows to reply
  await page.click("#open-settings");
  await page.waitForTimeout(300);
  await page.fill(
    "#system-prompt",
    "You must reply with exactly this single word: ACKNOWLEDGED"
  );
  await page.click("#save-settings");
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(SHOTS, "06-settings.png") });
  const personalityReply = await sendAndWait(page, "Hello there");
  const followed = /acknowledg/i.test(personalityReply);
  record(
    "Custom personality applied",
    followed,
    followed ? "reply followed instruction" : `got: ${personalityReply.slice(0, 50)}`
  );

  // 14. Regenerate actually produces a new reply
  const beforeRegen = await page.locator(".message.bot .bubble").last().getAttribute("data-raw");
  await page.locator(".regen-btn").last().click();
  await page.waitForFunction(
    () => document.getElementById("send").textContent.trim() === "Send",
    null,
    { timeout: 60000 }
  );
  await page.waitForTimeout(300);
  const afterRegen = await page.locator(".message.bot .bubble").last().getAttribute("data-raw");
  record("Regenerate produces a reply", (afterRegen || "").length > 0, `len ${(afterRegen||"").length}`);
  await page.screenshot({ path: join(SHOTS, "07-final.png") });
} catch (err) {
  record("Test run", false, err.message);
} finally {
  await browser.close();
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== SUMMARY: ${passed}/${results.length} passed =====`);
  process.exit(passed === results.length ? 0 : 1);
}
