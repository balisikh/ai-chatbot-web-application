import { chromium } from "playwright";

const BASE = "http://localhost:3567";
let allPass = true;
function check(name, pass, detail = "") {
  if (!pass) allPass = false;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

const now = new Date().toISOString();
const SEED = [
  { id: "a1", title: "Alpha", pinned: false, tags: ["x"], createdAt: now, messages: [{ role: "user", content: "hi", display: "hi", t: now }] },
  { id: "a2", title: "Beta", pinned: true, tags: [], createdAt: now, messages: [{ role: "assistant", content: "yo", t: now }] },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem("ai_chat_convos", JSON.stringify(seed));
    localStorage.setItem("ai_chat_active", "a1");
  }, SEED);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  await page.click("#export-btn");
  await page.waitForTimeout(150);
  const hasAll = await page.locator('#export-menu button[data-format="all"]').count();
  check("Export-all option present", hasAll === 1);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 5000 }),
    page.click('#export-menu button[data-format="all"]'),
  ]);
  const fname = download.suggestedFilename();
  check("Backup filename correct", /^ai-chat-backup-\d{4}-\d{2}-\d{2}\.json$/.test(fname), fname);

  // Read the downloaded file contents
  const stream = await download.createReadStream();
  let data = "";
  for await (const chunk of stream) data += chunk;
  const parsed = JSON.parse(data);
  check("Backup type marker", parsed.type === "ai-chatbot-backup", parsed.type);
  check("Backup includes all conversations", parsed.count === 2 && parsed.conversations.length === 2, `count=${parsed.count}`);
  check("Backup preserves titles", parsed.conversations.map((c) => c.title).join(",") === "Alpha,Beta");
  check("Backup preserves tags", JSON.stringify(parsed.conversations[0].tags) === '["x"]');

  // Toast shown
  const toast = await page.locator("#toast").textContent();
  check("Toast confirms export", /all 2 chats/i.test(toast), toast);
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL EXPORT-ALL TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
