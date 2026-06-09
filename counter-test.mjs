import { chromium } from "playwright";

const BASE = "http://localhost:3567";
let allPass = true;
function check(name, pass, detail = "") {
  if (!pass) allPass = false;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // Hidden when empty
  check("Counter hidden when empty", await page.locator("#char-counter").isHidden());

  // Shows correct counts
  await page.fill("#input", "hello world foo");
  await page.waitForTimeout(150);
  const text = await page.locator("#char-counter").textContent();
  check("Counter visible while typing", await page.locator("#char-counter").isVisible());
  check("Word count correct", /\b3 words\b/.test(text), text);
  check("Char count correct", /\b15 characters\b/.test(text), text);

  // Singular wording
  await page.fill("#input", "a");
  await page.waitForTimeout(150);
  const singular = await page.locator("#char-counter").textContent();
  check("Singular wording", /1 word \u00B7 1 character\b/.test(singular), singular);

  // Hides again when cleared
  await page.fill("#input", "");
  await page.waitForTimeout(150);
  check("Counter hides when cleared", await page.locator("#char-counter").isHidden());
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL COUNTER TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
