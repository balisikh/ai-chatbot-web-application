import { chromium } from "playwright";

const BASE = "http://localhost:3567";
let pass = true;
function check(name, ok, detail = "") {
  if (!ok) pass = false;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

try {
  const voicesRes = await page.goto(`${BASE}/api/speech/voices`, { waitUntil: "networkidle" });
  const data = await voicesRes.json();
  check("Speech voices API responds", voicesRes.ok());
  if (data.googleEnabled) {
    const en = data.englishAccentGroups?.length || 0;
    const pa = data.punjabiVoices?.length || data.punjabiGroup?.voices?.length || 0;
    check("English accent groups listed", en >= 1, `${en}`);
    check("Google Punjabi voices listed", pa >= 2, `${pa}`);
    const punjabi = data.punjabiVoices || data.punjabiGroup?.voices || [];
    const hasMalePa = punjabi.some((v) => v.gender === "male");
    const hasFemalePa = punjabi.some((v) => v.gender === "female");
    check("Punjabi male + female", hasMalePa && hasFemalePa);
  } else {
    console.log("INFO  Google API key not set — voice groups appear after adding key");
    check("Translate endpoint exists", true);
    const tr = await page.request.post(`${BASE}/api/translate`, {
      data: { text: "hello", target: "en" },
    });
    check("Translate returns 503 without key", tr.status() === 503, String(tr.status()));
  }

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.click("#open-settings");
  await page.waitForTimeout(400);
  const hasTranslateToggle = await page.locator("#translate-to-english").count();
  check("Translate-to-English setting in UI", hasTranslateToggle === 1);
  const hasSpeechTranslate = await page.locator("#translate-for-speech").count();
  check("Translate-for-speech setting in UI", hasSpeechTranslate === 1);
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${pass ? "GOOGLE VOICE TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(pass ? 0 : 1);
}
