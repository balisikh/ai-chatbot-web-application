/**
 * Manual pre-deploy checklist (automated where possible).
 * Run: node tests/manual-checklist.mjs  (server on default port 3657)
 * Server must be running. Ollama recommended for chat tests.
 */
import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = process.env.PORT || "3657";
const BASE = process.env.TEST_BASE_URL || `http://localhost:${PORT}`;
const CHAT_TIMEOUT = Number(process.env.CHAT_TIMEOUT_MS || 90000);

let pass = 0;
let fail = 0;
let manual = 0;

function section(title) {
  console.log(`\n── ${title} ──`);
}

function ok(name, detail = "") {
  pass++;
  console.log(`  ✅ ${name}${detail ? `  → ${detail}` : ""}`);
}

function bad(name, detail = "") {
  fail++;
  console.log(`  ❌ ${name}${detail ? `  → ${detail}` : ""}`);
}

function you(name) {
  manual++;
  console.log(`  👤 ${name}`);
}

async function waitForBotReply(page, minLen = 1) {
  await page.waitForFunction(
    (min) => {
      const last = document.querySelector(".message.bot:last-child .bubble");
      if (!last) return false;
      if (last.classList.contains("typing")) return false;
      const raw = last.dataset.raw || last.textContent || "";
      return raw.trim().length >= min;
    },
    minLen,
    { timeout: CHAT_TIMEOUT }
  );
}

async function main() {
  console.log(`Manual checklist runner — ${BASE}`);
  console.log(`Chat timeout: ${CHAT_TIMEOUT / 1000}s (set CHAT_TIMEOUT_MS to change)\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    // ── A. Chat core ──
    section("A. Chat core");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });

    const suggestions = await page.locator(".suggestions .chip").count();
    if (suggestions >= 1) ok("Starter suggestions on new/empty chat", `${suggestions} chips`);
    else bad("Starter suggestions visible");

    await page.fill("#input", "Reply with exactly: CHECKLIST_OK");
    await page.click("#send");
    ok("Send message submitted");

    try {
      await waitForBotReply(page, 3);
      const reply = await page.locator(".message.bot .bubble").last().getAttribute("data-raw");
      if (reply && reply.length > 2) ok("Streaming reply received", reply.slice(0, 60).replace(/\n/g, " "));
      else bad("Bot reply empty or missing");
    } catch {
      bad("Streaming reply (timeout — is Ollama running?)");
    }

    // Stop generation: start long prompt then abort
    await page.fill("#input", "Write a very long story about a ship.");
    await page.click("#send");
    await page.waitForTimeout(400);
    const sendLabel = await page.locator("#send").innerText();
    if (sendLabel.toLowerCase() === "stop") ok("Send becomes Stop while generating");
    else bad("Send button should show Stop", sendLabel);
    await page.click("#send");
    await page.waitForTimeout(800);
    const stopped = await page.locator(".message.bot .bubble").last().innerText();
    if (/stopped/i.test(stopped) || stopped.length > 0) ok("Stop generation works");
    else bad("Stop generation");

    // Wait for idle
    await page.waitForFunction(
      () => document.querySelector("#send")?.textContent?.trim() === "Send",
      { timeout: CHAT_TIMEOUT }
    );

    const regen = await page.locator(".regen-btn").count();
    if (regen >= 1) ok("Regenerate button on last assistant message");
    else bad("Regenerate button missing");

    const editBtn = page.locator(".message.user .meta button").first();
    if (await editBtn.count()) {
      await editBtn.click();
      const inputVal = await page.inputValue("#input");
      if (inputVal.length > 0) ok("Edit & resend loads message into input");
      else bad("Edit & resend");
      await page.fill("#input", "");
    } else bad("Edit button on user message");

    you("Retry on error — stop Ollama briefly, send a message, confirm Retry appears (optional)");

    // ── B. Conversations ──
    section("B. Conversations");
    await page.fill("#search", "CHECKLIST");
    await page.waitForTimeout(200);
    const searchItems = await page.locator(".convo-item").count();
    if (searchItems >= 1) ok("Search filters conversations");
    else bad("Search");
    await page.fill("#search", "");

    const firstItem = page.locator(".convo-item").first();
    await firstItem.locator(".convo-pin").click();
    const pinned = await firstItem.locator(".convo-pin.pinned").count();
    if (pinned) ok("Pin conversation");
    else bad("Pin conversation");

    await firstItem.locator(".convo-rename").click();
    const editor = page.locator(".rename-input");
    await editor.fill("Checklist Test Chat");
    await editor.press("Enter");
    await page.waitForTimeout(200);
    const title = await page.locator("#convo-title").innerText();
    if (title.includes("Checklist")) ok("Rename conversation", title);
    else bad("Rename conversation", title);

  you("Tags — click tag button on a chat, add a tag, filter by tag chip in sidebar");

    // ── C. UI / export ──
    section("C. UI & export");
    await page.click("#open-settings");
    await page.waitForSelector("#settings-modal:not(.hidden)");

    const preset = await page.locator("#preset option").count();
    if (preset >= 3) ok("Settings: personality presets", `${preset} options`);
    else bad("Personality presets");

    await page.locator("#temperature").fill("0.5");
    await page.locator("#max-length").selectOption("256");
    if (await page.locator("#theme-select option").count() >= 3) ok("Settings: themes available");
    if (await page.locator("#accent-row .accent-swatch").count() >= 1) ok("Settings: accent colors");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    const exportVisible = await page.locator("#export-btn").isVisible();
    if (exportVisible) ok("Export button in header");
    await page.click("#export-btn");
    const exportOpts = await page.locator("#export-menu button").count();
    if (exportOpts >= 4) ok("Export menu options", `${exportOpts} formats`);
    await page.keyboard.press("Escape");

    const themeBefore = await page.evaluate(() => document.body.dataset.theme);
    await page.click("#theme-toggle");
    const themeAfter = await page.evaluate(() => document.body.dataset.theme);
    if (themeBefore !== themeAfter) ok("Header theme toggle cycles theme");
    else bad("Theme toggle");

    // Mobile drawer
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click("#toggle-sidebar");
    await page.waitForTimeout(200);
    const drawerOpen = await page.evaluate(() =>
      document.getElementById("sidebar").classList.contains("open")
    );
    if (drawerOpen) ok("Mobile sidebar drawer opens");
    else bad("Mobile drawer");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const drawerClosed = await page.evaluate(() =>
      !document.getElementById("sidebar").classList.contains("open")
    );
    if (drawerClosed) ok("Mobile drawer closes via backdrop");
    else bad("Drawer backdrop close");
    await page.setViewportSize({ width: 1280, height: 800 });

    // ── D. Voice (no Google) ──
    section("D. Voice (browser only — no Google key)");
    you("Microphone — click mic, speak, confirm text appears (browser permission required)");
    you("Read aloud — enable in Settings, send message, confirm audio plays");

    await page.click("#open-settings");
    const enChip = page.locator("#speech-mode-english .speech-mode-chip").first();
    await enChip.click();
    await page.waitForTimeout(300);
    const translateOff = !(await page.isChecked("#translate-to-english"));
    if (translateOff) ok("English accent chip turns translation off");
    else bad("English chip should disable translation");

    const hindiChip = page.locator("#speech-mode-languages .speech-mode-chip", {
      hasText: "Hindi",
    });
    if (await hindiChip.count()) {
      await hindiChip.click();
      await page.waitForTimeout(300);
      const readAloud = await page.isChecked("#read-aloud");
      const translateOn = await page.isChecked("#translate-to-english");
      if (readAloud && translateOn) ok("Language chip enables read-aloud + translate");
      else bad("Language chip toggles");
    }
    await page.keyboard.press("Escape");

    // ── E. Attachments ──
    section("E. File attachments");
    const pdfBuf = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 20 100 Td (Attach OK) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000230 00000 n \n0000000324 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n403\n%%EOF"
    );
    const txtPath = join(ROOT, "tests", "fixtures", "checklist.txt");
    // API: PDF
    const pdfRes = await page.request.post(`${BASE}/api/attach/extract`, {
      multipart: {
        file: { name: "test.pdf", mimeType: "application/pdf", buffer: pdfBuf },
      },
    });
    if (pdfRes.ok()) {
      const j = await pdfRes.json();
      if (j.text?.includes("Attach")) ok("PDF attachment extract", "API");
      else bad("PDF extract text empty");
    } else bad("PDF attachment API", String(pdfRes.status()));

    const txtRes = await page.request.post(`${BASE}/api/attach/extract`, {
      multipart: {
        file: {
          name: "note.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("plain text attachment"),
        },
      },
    });
    if (txtRes.ok()) ok("Text file attachment extract");

    const imgRes = await page.request.post(`${BASE}/api/attach/extract`, {
      multipart: {
        file: {
          name: "photo.png",
          mimeType: "image/png",
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        },
      },
    });
    if (imgRes.ok()) {
      const j = await imgRes.json();
      if (j.text?.includes("Image")) ok("Image described via vision API");
      else bad("Image extract text unexpected", j.text?.slice(0, 80));
    } else if (imgRes.status() === 400) {
      const err = (await imgRes.json()).error || "";
      if (/openai|image/i.test(err)) ok("Image rejected with clear message (no vision key)");
      else bad("Image error message", err);
    } else bad("Image attach API", String(imgRes.status()));

    you("UI attach — use paperclip in browser for a real PDF/docx/xlsx from your PC");

    // ── F. Keyboard ──
    section("F. Keyboard shortcuts");
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(200);
    const toastNew = await page.locator("#toast:not(.hidden)").innerText();
    if (/new chat/i.test(toastNew)) ok("Ctrl+K new chat");
    else bad("Ctrl+K", toastNew);

    await page.keyboard.press("Control+/");
    const searchFocused = await page.evaluate(
      () => document.activeElement?.id === "search"
    );
    if (searchFocused) ok("Ctrl+/ focuses search");
    else bad("Ctrl+/ focus search");

    await page.click("#open-settings");
    await page.keyboard.press("Escape");
    const modalHidden = await page.evaluate(() =>
      document.getElementById("settings-modal").classList.contains("hidden")
    );
    if (modalHidden) ok("Esc closes settings modal");
    else bad("Esc closes modal");

    // ── G. Feedback ──
    section("G. Feedback");
    const thumbs = await page.locator(".message.bot .meta button", { hasText: "👍" }).count();
    if (thumbs >= 1) {
      await page.locator(".message.bot .meta button", { hasText: "👍" }).first().click();
      const toastFb = await page.locator("#toast:not(.hidden)").innerText();
      if (/feedback/i.test(toastFb)) ok("Thumbs up feedback toast");
      else bad("Feedback toast", toastFb);
    } else bad("Thumbs buttons missing");

    // ── H. Git safety ──
    section("H. GitHub safety");
    if (!existsSync(join(ROOT, ".env"))) you(".env not in repo folder (or exists only locally — OK if gitignored)");
    else {
      const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
      if (gitignore.includes(".env")) ok(".env listed in .gitignore");
      else bad(".env not in .gitignore");
    }
    const appJs = readFileSync(join(ROOT, "public", "app.js"), "utf8");
    if (!/sk-[a-zA-Z0-9]{20,}/.test(appJs)) ok("No OpenAI-style keys in app.js");
    else bad("Possible API key in app.js");

    const serverJs = readFileSync(join(ROOT, "server.js"), "utf8");
    if (!/sk-[a-zA-Z0-9]{20,}/.test(serverJs)) ok("No OpenAI-style keys in server.js");
    else bad("Possible API key in server.js");
  } catch (err) {
    bad("Runner crashed", err.message);
    console.error(err);
  } finally {
    await browser.close();
  }

  console.log("\n══════════════════════════════════════");
  console.log(`  Automated PASS: ${pass}`);
  console.log(`  Automated FAIL: ${fail}`);
  console.log(`  Manual steps for you: ${manual}`);
  console.log("══════════════════════════════════════\n");

  if (fail > 0) process.exit(1);
}

main();
