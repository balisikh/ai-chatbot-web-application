/**
 * Smoke tests — run with: npm test
 * Starts checks against a running server (default http://localhost:3000).
 * Set TEST_BASE_URL or PORT to match your .env.
 */
import { chromium } from "playwright";

const PORT = process.env.PORT || "3000";
const BASE = process.env.TEST_BASE_URL || `http://localhost:${PORT}`;

let pass = true;
function check(name, ok, detail = "") {
  if (!ok) pass = false;
  const suffix = detail ? `  → ${detail}` : "";
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${suffix}`);
}

async function main() {
  console.log(`Testing ${BASE}\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const homeRes = await page.goto(BASE, { waitUntil: "domcontentloaded" });
    check("Home page responds", homeRes?.ok());
    const title = await page.title();
    check("Page title present", title.length > 0, title);

    const hasChatForm = await page.locator("#chat-form").count();
    check("Chat form exists", hasChatForm === 1);

    const hasSettings = await page.locator("#open-settings").count();
    check("Settings button exists", hasSettings === 1);

    await page.click("#open-settings");
    await page.waitForSelector("#settings-modal:not(.hidden)");
    check("Settings modal opens", true);

    const enCount = await page.locator("#speech-mode-english .speech-mode-chip").count();
    const langFilter = await page.locator("#speech-mode-lang-search").count();
    check("Language quick-setup filter exists", langFilter === 1);
    const langHint = await page.locator("#speech-mode-languages-hint").innerText();
    check("Language quick-setup hint visible", langHint.length > 10);
    const status = await page.locator("#speech-mode-google-status").innerText();
    check(
      "Google status badge visible",
      /online|offline|setup/i.test(status)
    );
    const langCount = await page.locator("#speech-mode-languages .speech-mode-chip").count();
    check("English accent chips rendered", enCount >= 4, `${enCount}`);
    check("Language chips rendered", langCount >= 10, `${langCount}`);
    const enText = await page.locator("#speech-mode-english").innerText();
    const langText = await page.locator("#speech-mode-languages").innerText();
    check(
      "English US/UK chips present",
      /English \(US\)/.test(enText) && /English \(UK\)/.test(enText)
    );
    check(
      "Requested language chips present",
      /Punjabi/i.test(langText) &&
        /Hindi/i.test(langText) &&
        /Polish/i.test(langText) &&
        /French/i.test(langText) &&
        /German/i.test(langText) &&
        /Portuguese/i.test(langText)
    );

    await page.keyboard.press("Escape");

    const modelsRes = await page.request.get(`${BASE}/api/models`);
    check("GET /api/models", modelsRes.ok(), String(modelsRes.status()));
    const models = await modelsRes.json();
    check("Models payload has provider", !!models.provider, models.provider || "");

    const voicesRes = await page.request.get(`${BASE}/api/speech/voices`);
    check("GET /api/speech/voices", voicesRes.ok());
    const voices = await voicesRes.json();
    check(
      "Speech voices payload",
      typeof voices.googleEnabled === "boolean",
      voices.googleEnabled ? "Google enabled" : "Google disabled"
    );

    if (voices.googleEnabled) {
      const en = voices.englishAccentGroups?.length || 0;
      const pa =
        voices.punjabiVoices?.length ||
        voices.punjabiGroup?.voices?.length ||
        0;
      check("English accent groups", en >= 1, `${en}`);
      check("Punjabi voices listed", pa >= 2, `${pa}`);
    } else {
      console.log(
        "INFO  Google API key not set — enable in .env for full voice/translation tests"
      );
    }

    const attachRes = await page.request.post(`${BASE}/api/attach/extract`, {
      multipart: {
        file: {
          name: "smoke.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("smoke attachment text"),
        },
      },
    });
    check("POST /api/attach/extract", attachRes.ok(), String(attachRes.status()));
    if (attachRes.ok()) {
      const attach = await attachRes.json();
      check(
        "Attachment extract returns text",
        attach.text?.includes("smoke attachment"),
        attach.text || ""
      );
    }

    const translateRes = await page.request.post(`${BASE}/api/translate`, {
      data: { text: "hello", target: "en" },
    });
    if (voices.translateEnabled) {
      check("POST /api/translate", translateRes.ok());
    } else {
      check(
        "POST /api/translate disabled without key",
        translateRes.status() === 503,
        String(translateRes.status())
      );
    }
  } catch (err) {
    pass = false;
    console.error("FAIL  Test run error:", err.message);
    console.error(
      `Hint: start the server first (npm start) on ${BASE}`
    );
  } finally {
    await browser.close();
  }

  console.log("");
  if (!pass) {
    console.error("Some tests failed.");
    process.exit(1);
  }
  console.log("All smoke tests passed.");
}

main();
