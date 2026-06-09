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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE ERROR:", m.text());
});

try {
  // Generate a real PDF with known text using Chromium itself.
  const gen = await ctx.newPage();
  await gen.setContent(
    "<h1>Quarterly Report</h1><p>The secret passphrase is PINEAPPLE-77.</p>" +
      "<p>Revenue grew by 42 percent this quarter.</p>"
  );
  const pdfBuffer = await gen.pdf({ format: "A4" });
  await gen.close();
  check("Generated a test PDF", pdfBuffer.length > 500, `${pdfBuffer.length} bytes`);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // Upload the PDF
  await page.setInputFiles("#file-input", {
    name: "report.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });

  // Wait for extraction to finish (chip shows filename, not "Reading...")
  await page.waitForFunction(
    () => {
      const el = document.getElementById("attachment-name");
      return (
        el &&
        el.textContent.includes("report.pdf") &&
        !el.textContent.includes("Reading")
      );
    },
    { timeout: 30000 }
  );
  check("PDF attachment chip ready", true);
  await page.screenshot({ path: join(SHOTS, "22-pdf-attached.png") });

  // Send a question with the PDF attached
  await page.fill("#input", "What is the secret passphrase?");
  await page.click("#send");
  await page.waitForTimeout(1200); // user message is saved before streaming

  // Verify the extracted PDF text made it into the saved user message
  const userContent = await page.evaluate(() => {
    const convos = JSON.parse(localStorage.getItem("ai_chat_convos") || "[]");
    const msgs = convos[0]?.messages || [];
    const u = [...msgs].reverse().find((m) => m.role === "user" && m.file);
    return u ? u.content : "";
  });
  check("PDF text extracted into message", /PINEAPPLE-77/.test(userContent), userContent.slice(0, 80));
  check("PDF file name recorded", /report\.pdf/.test(userContent));

  // Reply generation is slow with a large PDF context on a tiny model; this is
  // best-effort and does not affect the PDF feature result.
  try {
    await page.waitForFunction(
      () => {
        const bots = document.querySelectorAll(".message.bot .bubble");
        const last = bots[bots.length - 1];
        return (
          document.getElementById("send").textContent.trim() === "Send" &&
          (last?.getAttribute("data-raw") || "").trim().length > 0
        );
      },
      { timeout: 90000 }
    );
    console.log("INFO  reply finished");
  } catch {
    console.log("INFO  reply still generating (large context) - not a failure");
  }
  await page.screenshot({ path: join(SHOTS, "23-pdf-answer.png") });
} catch (err) {
  check("Test run", false, err.message);
} finally {
  await browser.close();
  console.log(`\n===== ${allPass ? "ALL PDF TESTS PASSED" : "SOME TESTS FAILED"} =====`);
  process.exit(allPass ? 0 : 1);
}
