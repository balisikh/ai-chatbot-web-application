import { chromium } from "playwright";
import { join } from "path";

const BASE = "http://localhost:3567";
const SHOTS = join(process.cwd(), "test-screenshots");

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1100, height: 820 } })).newPage();
try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.click("#open-settings");
  await page.waitForTimeout(300);
  const w = await page.$eval("#system-prompt", (el) => Math.round(el.getBoundingClientRect().width));
  const h = await page.$eval("#system-prompt", (el) => Math.round(el.getBoundingClientRect().height));
  console.log(`system-prompt box: ${w}px wide x ${h}px tall`);
  await page.screenshot({ path: join(SHOTS, "26-settings-box.png") });
} finally {
  await browser.close();
}
