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

async function sendAndWait(page, text, timeout = 60000) {
  const captured = await page.evaluate(() => {
    const bots = document.querySelectorAll(".message.bot .bubble");
    return bots.length ? bots[bots.length - 1].getAttribute("data-raw") || "" : "";
  });
  await page.fill("#input", text);
  await page.click("#send");
  await page.waitForFunction(
    (prevRaw) => {
      const bots = document.querySelectorAll(".message.bot .bubble");
      if (!bots.length) return false;
      const raw = bots[bots.length - 1].getAttribute("data-raw") || "";
      const ready =
        document.getElementById("send").textContent.trim() === "Send";
      return ready && raw.trim().length > 0 && raw !== prevRaw;
    },
    captured,
    { timeout }
  );
  return (await page.locator(".message.bot .bubble").last().getAttribute("data-raw")) || "";
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1100, height: 720 },
  acceptDownloads: true,
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // 1. Settings: presets + temperature + length present
  await page.click("#open-settings");
  await page.waitForTimeout(200);
  const presetCount = await page.locator("#preset option").count();
  check("Personality presets listed", presetCount >= 5, `${presetCount} presets`);
  await page.selectOption("#preset", "Pirate");
  const promptVal = await page.inputValue("#system-prompt");
  check("Preset fills system prompt", /pirate/i.test(promptVal));
  await page.fill("#temperature", "0.3");
  const tempLabel = await page.locator("#temp-value").textContent();
  check("Temperature slider updates label", tempLabel === "0.3", `value=${tempLabel}`);
  await page.selectOption("#max-length", "256");
  await page.click("#save-settings");
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(SHOTS, "10-settings-advanced.png") });

  // 2. Personality applies in a reply
  const reply = await sendAndWait(page, "Greet me in one short sentence.");
  check("Reply generated with custom settings", reply.length > 0, reply.slice(0, 50));

  // 3. Edit & resend button present on user message
  const editBtn = page.locator(".message.user .meta-btn", { hasText: "Edit" }).first();
  check("Edit button on user message", (await editBtn.count()) > 0);

  // 4. Edit truncates and refills input
  await editBtn.click();
  await page.waitForTimeout(200);
  const inputAfterEdit = await page.inputValue("#input");
  check("Edit refills the input box", inputAfterEdit.length > 0, inputAfterEdit.slice(0, 40));
  await page.fill("#input", ""); // clear to avoid accidental resend

  // 5. Rename conversation (rename button)
  await sendAndWait(page, "Tell me a fun fact in one line.");
  await page.locator(".convo-rename").first().click();
  await page.fill(".rename-input", "My Renamed Chat");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const renamed = await page.locator(".convo-item-title").first().textContent();
  check("Rename conversation works", renamed === "My Renamed Chat", `title=${renamed}`);

  // 6. Pin conversation
  await page.click("#new-convo");
  await page.waitForTimeout(200);
  await sendAndWait(page, "Second chat message.");
  // pin the second item (the renamed older one)
  const pinButtons = page.locator(".convo-pin");
  const pinCountBefore = await page.locator(".convo-pin.pinned").count();
  await pinButtons.nth(1).click();
  await page.waitForTimeout(300);
  const pinnedNow = await page.locator(".convo-pin.pinned").count();
  check("Pin conversation works", pinnedNow === pinCountBefore + 1);

  // 7. Search filters conversations
  await page.fill("#search", "Renamed");
  await page.waitForTimeout(300);
  const filtered = await page.locator(".convo-item").count();
  check("Search filters conversations", filtered === 1, `${filtered} shown`);
  await page.fill("#search", "");
  await page.waitForTimeout(200);

  // 8. Export menu opens and download works (markdown)
  await page.click("#export-btn");
  await page.waitForTimeout(200);
  const menuOpen = await page.locator("#export-menu").isVisible();
  check("Export menu opens", menuOpen);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 5000 }),
    page.click('#export-menu button[data-format="md"]'),
  ]);
  const fname = download.suggestedFilename();
  check("Export downloads a .md file", fname.endsWith(".md"), fname);

  // 9. File attach: set a text file and verify chip appears
  await page.setInputFiles("#file-input", {
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("The secret keyword is BANANA-42."),
  });
  await page.waitForTimeout(300);
  const chipVisible = await page.locator("#attachment").isVisible();
  check("File attachment chip appears", chipVisible);
  await page.screenshot({ path: join(SHOTS, "11-file-attached.png") });

  // 10. Ask about the file content
  const fileReply = await sendAndWait(page, "What is the secret keyword in the file?", 60000);
  check("File content used in reply", /banana/i.test(fileReply), fileReply.slice(0, 60));
  await page.screenshot({ path: join(SHOTS, "12-file-answer.png") });
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL FEATURE TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
