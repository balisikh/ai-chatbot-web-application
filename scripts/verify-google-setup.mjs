/**
 * Verify Google TTS + Translation before deploy.
 * Usage: npm run verify:google
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });

const raw = process.env.GOOGLE_CLOUD_TTS_API_KEY || "";
const key =
  raw && raw !== "PASTE_YOUR_KEY_HERE" && raw.trim() ? raw.trim() : null;

console.log("Google Cloud pre-deploy check\n");

if (!key) {
  console.log("GOOGLE_CLOUD_TTS_API_KEY is not set in .env\n");
  console.log("Do this once in Google Cloud Console:");
  console.log("  1. https://console.cloud.google.com/apis/library/texttospeech.googleapis.com → Enable");
  console.log("  2. https://console.cloud.google.com/apis/library/translate.googleapis.com → Enable");
  console.log("  3. https://console.cloud.google.com/apis/credentials → Create API key");
  console.log("  4. Add to .env:  GOOGLE_CLOUD_TTS_API_KEY=your_key");
  console.log("  5. For Vercel: same name in Project → Settings → Environment Variables");
  console.log("  6. Run this script again, then restart the server.\n");
  process.exit(1);
}

let pass = true;

try {
  const voicesUrl = `https://texttospeech.googleapis.com/v1/voices?key=${key}`;
  const vRes = await fetch(voicesUrl);
  const vData = await vRes.json();
  if (!vRes.ok) {
    pass = false;
    console.log("FAIL  Text-to-Speech API:", vData.error?.message || vRes.status);
  } else {
    const count = (vData.voices || []).length;
    console.log(`PASS  Text-to-Speech API (${count} raw voices from Google)`);
  }
} catch (err) {
  pass = false;
  console.log("FAIL  Text-to-Speech API:", err.message);
}

try {
  const params = new URLSearchParams();
  params.append("q", "hello");
  params.append("target", "hi");
  const trUrl = `https://translation.googleapis.com/language/translate/v2?key=${key}`;
  const tRes = await fetch(trUrl, { method: "POST", body: params });
  const tData = await tRes.json();
  if (!tRes.ok) {
    pass = false;
    console.log("FAIL  Translation API:", tData.error?.message || tRes.status);
  } else {
    const text = tData.data?.translations?.[0]?.translatedText || "";
    console.log(`PASS  Translation API (hello → ${text})`);
  }
} catch (err) {
  pass = false;
  console.log("FAIL  Translation API:", err.message);
}

console.log("");
if (pass) {
  console.log("Google voices + translation are ready for deploy.");
  console.log("Restart npm start, then check Settings shows Google online.");
  process.exit(0);
}
console.log("Fix the errors above, then run: npm run verify:google");
process.exit(1);
