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
    id: "s1",
    title: "Speak test",
    pinned: false,
    tags: [],
    createdAt: now,
    messages: [
      { role: "user", content: "hi", display: "hi", t: now },
      { role: "assistant", content: "Hello there, friend.", t: now },
    ],
  },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 } });
// Spy on the native speech engine (don't replace it) so the test is
// deterministic without depending on headless TTS actually producing audio.
await ctx.addInitScript(() => {
  window.__spoken = [];
  const synth = window.speechSynthesis;
  if (synth) {
    synth.speak = function (u) {
      window.__spoken.push(u && u.text);
    };
    synth.cancel = function () {};
  }
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem("ai_chat_convos", JSON.stringify(seed));
    localStorage.setItem("ai_chat_active", "s1");
  }, SEED);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const speakBtn = page.locator(".message.bot .speak-btn").first();
  check("Speak button present on reply", (await speakBtn.count()) === 1);
  const idleLabel = await speakBtn.textContent();
  check("Speak button idle shows speaker icon", idleLabel === "\u{1F50A}", idleLabel);

  // Click to speak
  await speakBtn.click();
  await page.waitForTimeout(150);
  const spoken = await page.evaluate(() => window.__spoken);
  check("Clicking speaks the reply text", spoken.includes("Hello there, friend."), JSON.stringify(spoken));
  const playingLabel = await speakBtn.textContent();
  check("Button switches to stop icon", playingLabel === "\u23F9", playingLabel);

  // Click again to stop
  await speakBtn.click();
  await page.waitForTimeout(150);
  const stoppedLabel = await speakBtn.textContent();
  check("Second click returns to speaker icon", stoppedLabel === "\u{1F50A}", stoppedLabel);
  const speakingFlag = await page.evaluate(() => window.speechSynthesis.speaking);
  check("Speech stopped after second click", speakingFlag === false);
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL SPEAK TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
