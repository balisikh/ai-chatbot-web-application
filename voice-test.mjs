import { chromium } from "playwright";

const BASE = "http://localhost:3567";
let allPass = true;
function check(name, pass, detail = "") {
  if (!pass) allPass = false;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

const now = new Date().toISOString();
const SEED = [
  {
    id: "v1",
    title: "Voice test",
    pinned: false,
    tags: [],
    createdAt: now,
    messages: [
      { role: "user", content: "hi", display: "hi", t: now },
      { role: "assistant", content: "Reading this aloud now.", t: now },
    ],
  },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
await ctx.addInitScript(() => {
  window.__spoken = [];
  const synth = window.speechSynthesis;
  if (synth) {
    synth.speak = function (u) {
      window.__spoken.push({ text: u.text, rate: u.rate, voice: u.voice && u.voice.name });
    };
    synth.cancel = function () {};
    synth.getVoices = function () {
      return [
        { name: "Test Voice A", lang: "en-US" },
        { name: "Test Voice B", lang: "en-GB" },
      ];
    };
  }
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem("ai_chat_convos", JSON.stringify(seed));
    localStorage.setItem("ai_chat_active", "v1");
  }, SEED);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // Open settings, voice list populated
  await page.click("#open-settings");
  await page.waitForTimeout(200);
  const voiceOptions = await page.locator("#voice-select option").count();
  check("Voice dropdown populated", voiceOptions === 3, `${voiceOptions} options (Default + 2)`);

  // Change speed to 1.5
  await page.$eval("#speech-rate", (el) => {
    el.value = "1.5";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const rateLabel = await page.locator("#rate-value").textContent();
  check("Speed label updates", rateLabel === "1.5", rateLabel);
  await page.click("#save-settings");
  await page.waitForTimeout(200);

  const savedRate = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ai_chat_settings")).speechRate
  );
  check("Speed persisted", savedRate === 1.5, String(savedRate));

  // Speak a reply -> rate should be applied (voice still default here)
  await page.locator(".message.bot .speak-btn").first().click();
  await page.waitForTimeout(150);
  const spoken = await page.evaluate(() => window.__spoken);
  check("Reply spoken with chosen speed", spoken.length === 1 && spoken[0].rate === 1.5, JSON.stringify(spoken));

  // Choose a specific voice and save
  await page.click("#open-settings");
  await page.waitForTimeout(200);
  await page.selectOption("#voice-select", "Test Voice B");
  await page.click("#save-settings");
  await page.waitForTimeout(200);
  const savedVoice = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ai_chat_settings")).voiceName
  );
  check("Voice selection persisted", savedVoice === "Test Voice B", savedVoice);
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL VOICE TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
