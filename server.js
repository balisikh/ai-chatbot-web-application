import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { parseOffice } from "officeparser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";
import * as XLSX from "xlsx";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3567;

app.use(express.static(join(__dirname, "public")));
app.use(express.json({ limit: "2mb" }));

const chatLimiter = rateLimit({
  windowMs:
    (Number.parseInt(process.env.CHAT_RATE_WINDOW_MIN, 10) || 15) * 60 * 1000,
  max: Number.parseInt(process.env.CHAT_RATE_MAX, 10) || 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many chat requests. Please wait and try again." },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.parseInt(process.env.API_RATE_MAX, 10) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

const ATTACH_MAX_BYTES = 15 * 1024 * 1024;
const ATTACH_MAX_CHARS = 30000;
const ATTACH_MAX_PDF_PAGES = 50;
const attachUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATTACH_MAX_BYTES },
});

function attachmentKindFromFile(file) {
  const name = file.originalname || "";
  const type = (file.mimetype || "").toLowerCase();
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(name)
  ) {
    return "docx";
  }
  if (/\.doc$/i.test(name)) return "doc";
  if (
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    /\.(xlsx|xls)$/i.test(name)
  ) {
    return "excel";
  }
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    /\.pptx$/i.test(name)
  ) {
    return "pptx";
  }
  if (/\.ppt$/i.test(name)) return "ppt";
  if (/\.svg$/i.test(name) || type === "image/svg+xml") return "svg";
  if (/\.ico$/i.test(name)) return "unsupported-image";
  if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(name) || type.startsWith("image/")) {
    return "image";
  }
  if (/\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(name) || type.startsWith("video/")) {
    return "video";
  }
  if (
    /\.(txt|md|csv|json|js|ts|py|html|css|log|xml|yml|yaml)$/i.test(name) ||
    type.startsWith("text/")
  ) {
    return "text";
  }
  return "unknown";
}

function truncateAttachmentText(text) {
  if (text.length > ATTACH_MAX_CHARS) {
    return text.slice(0, ATTACH_MAX_CHARS) + "\n...[truncated]";
  }
  return text;
}

async function extractPdfBuffer(buf) {
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText({ first: ATTACH_MAX_PDF_PAGES });
    let text = result.text || "";
    if (result.total > ATTACH_MAX_PDF_PAGES) {
      text += `\n[Only first ${ATTACH_MAX_PDF_PAGES} pages read]`;
    }
    return text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxBuffer(buf) {
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value || "";
}

function extractExcelBuffer(buf) {
  const workbook = XLSX.read(buf, { type: "buffer" });
  let text = "";
  for (const name of workbook.SheetNames) {
    text += `\n=== Sheet: ${name} ===\n`;
    text += XLSX.utils.sheet_to_csv(workbook.Sheets[name]) + "\n";
    if (text.length > ATTACH_MAX_CHARS) break;
  }
  return text;
}

function imageMimeFromFile(file) {
  const type = (file.mimetype || "").toLowerCase();
  if (type.startsWith("image/")) return type;
  const name = (file.originalname || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".bmp")) return "image/bmp";
  return "image/png";
}

async function extractPptxBuffer(buf) {
  const zip = await JSZip.loadAsync(buf);
  const paths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/i)?.[1] || "0", 10);
      const nb = parseInt(b.match(/slide(\d+)/i)?.[1] || "0", 10);
      return na - nb;
    });
  let text = "";
  for (const path of paths) {
    const xml = await zip.file(path).async("string");
    const bits = [];
    for (const m of xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)) {
      if (m[1]) bits.push(m[1]);
    }
    if (bits.length) text += bits.join(" ") + "\n";
  }
  return text.trim();
}

async function describeImageBuffer(buf, mime) {
  if (!openai) {
    throw new Error(
      "Image description needs OPENAI_API_KEY on the server (vision). Describe the image in your message, or attach a PDF."
    );
  }
  const base64 = buf.toString("base64");
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Describe this image for a chat assistant. Include all visible text (OCR). Be clear and concise.",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${base64}` },
          },
        ],
      },
    ],
    max_tokens: 1024,
  });
  const desc = response.choices?.[0]?.message?.content?.trim();
  if (!desc) throw new Error("Could not describe this image");
  return `[Image description]\n${desc}`;
}

async function extractOfficeLegacyBuffer(buf) {
  const result = await parseOffice(buf);
  if (typeof result === "string") return result;
  if (result?.text) return result.text;
  if (typeof result?.toText === "function") return result.toText();
  return String(result ?? "");
}

function extractSvgBuffer(buf) {
  const raw = buf.toString("utf8");
  const chunks = [];
  for (const m of raw.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)) {
    const inner = m[1].replace(/<[^>]+>/g, " ").trim();
    if (inner) chunks.push(inner);
  }
  for (const m of raw.matchAll(/<tspan[^>]*>([\s\S]*?)<\/tspan>/gi)) {
    const inner = m[1].replace(/<[^>]+>/g, " ").trim();
    if (inner) chunks.push(inner);
  }
  let text = chunks.join(" ").replace(/\s+/g, " ").trim();
  if (!text) {
    text = raw
      .replace(/<script[\s>][\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s>][\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (!text) throw new Error("No readable text in this SVG");
  return `[SVG content]\n${text}`;
}

async function extractAttachmentBuffer(file) {
  const kind = attachmentKindFromFile(file);
  const buf = file.buffer;
  switch (kind) {
    case "pdf":
      return await extractPdfBuffer(buf);
    case "docx":
      return await extractDocxBuffer(buf);
    case "doc":
      return await extractOfficeLegacyBuffer(buf);
    case "excel":
      return extractExcelBuffer(buf);
    case "pptx":
      return await extractPptxBuffer(buf);
    case "ppt":
      return await extractOfficeLegacyBuffer(buf);
    case "svg":
      return extractSvgBuffer(buf);
    case "unsupported-image":
      throw new Error("ICO images are not supported — use PNG, JPEG, or SVG");
    case "image":
      return await describeImageBuffer(buf, imageMimeFromFile(file));
    case "video":
      throw new Error(
        "Video files cannot be read as text — describe what you need in your message"
      );
    case "text":
      return buf.toString("utf8");
    default:
      const asText = buf.toString("utf8");
      if (asText && !asText.includes("\0")) return asText;
      throw new Error(
        "Unsupported file — use PDF, Word, PowerPoint, Excel, images, SVG, or plain text"
      );
  }
}

// A short instruction that shapes the chatbot's personality and behavior.
const SYSTEM_PROMPT =
  "You are a friendly, helpful AI assistant. Answer clearly and concisely.";

// --- Configuration -------------------------------------------------------
// A real OpenAI key is only "set" if it isn't blank or the placeholder.
const rawKey = process.env.OPENAI_API_KEY || "";
const OPENAI_API_KEY =
  rawKey && rawKey !== "PASTE_YOUR_KEY_HERE" ? rawKey : null;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Optional Google Cloud Text-to-Speech (real "Google" voices, including Punjabi).
const rawTtsKey = process.env.GOOGLE_CLOUD_TTS_API_KEY || "";
const GOOGLE_TTS_KEY =
  rawTtsKey && rawTtsKey !== "PASTE_YOUR_KEY_HERE" ? rawTtsKey : null;

const VOICE_CACHE_MS = 60 * 60 * 1000;
const VOICE_TIER_RANK = { Studio: 0, Neural2: 1, Wavenet: 2, Standard: 3, Polyglot: 4 };
const ENGLISH_ACCENT_LABELS = {
  "en-US": "United States",
  "en-GB": "United Kingdom",
  "en-AU": "Australia",
  "en-IN": "India",
  "en-CA": "Canada",
  "en-IE": "Ireland",
  "en-NZ": "New Zealand",
  "en-PH": "Philippines",
  "en-SG": "Singapore",
  "en-ZA": "South Africa",
  "en-GB-WLS": "Wales",
};

let googleVoiceCache = null;
let googleVoiceCacheTime = 0;

// Guaranteed Google Punjabi voices (male + female, Wavenet + Standard).
const GOOGLE_PUNJABI_VOICES = [
  {
    id: "pa-IN-Wavenet-A",
    lang: "pa-IN",
    gender: "female",
    tier: "Wavenet",
    label: "Google Punjabi — Female (Wavenet)",
  },
  {
    id: "pa-IN-Wavenet-B",
    lang: "pa-IN",
    gender: "male",
    tier: "Wavenet",
    label: "Google Punjabi — Male (Wavenet)",
  },
  {
    id: "pa-IN-Standard-A",
    lang: "pa-IN",
    gender: "female",
    tier: "Standard",
    label: "Google Punjabi — Female (Standard)",
  },
  {
    id: "pa-IN-Standard-B",
    lang: "pa-IN",
    gender: "male",
    tier: "Standard",
    label: "Google Punjabi — Male (Standard)",
  },
];

function isPunjabiLang(lang) {
  return (lang || "").toLowerCase().startsWith("pa");
}

function genderWord(gender) {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  return "Voice";
}

function punjabiFriendlyLabel(voice) {
  return `Google Punjabi — ${genderWord(voice.gender)} (${voice.tier})`;
}

function friendlyGoogleVoiceLabel(langCode, voice, langNames) {
  if (isPunjabiLang(voice.lang || langCode)) {
    return punjabiFriendlyLabel(voice);
  }
  const name = languageDisplayName(langCode, langNames)
    .replace(/\s*\([A-Z]{2,3}\)\s*$/, "")
    .trim();
  return `Google ${name} — ${genderWord(voice.gender)} (${voice.tier})`;
}

function voiceGenderIds(voices) {
  const female = voices.find((v) => v.gender === "female");
  const male = voices.find((v) => v.gender === "male");
  return {
    femaleVoiceId: female?.id || null,
    maleVoiceId: male?.id || null,
  };
}

function voiceTier(name) {
  if (name.includes("Studio")) return "Studio";
  if (name.includes("Neural2")) return "Neural2";
  if (name.includes("Wavenet")) return "Wavenet";
  if (name.includes("Polyglot")) return "Polyglot";
  return "Standard";
}

function formatVoiceLabel(lang, name, gender, tier) {
  const g =
    gender === "male" ? "Male" : gender === "female" ? "Female" : "Voice";
  return `${g} (${tier}) — ${name}`;
}

function pickBestVoices(rawVoices) {
  const byKey = new Map();
  for (const v of rawVoices) {
    const key = `${v.lang}|${v.gender}|${v.tier}`;
    if (!byKey.has(key)) byKey.set(key, v);
  }
  const byLang = new Map();
  for (const v of byKey.values()) {
    if (!byLang.has(v.lang)) byLang.set(v.lang, []);
    byLang.get(v.lang).push(v);
  }
  const picked = [];
  for (const list of byLang.values()) {
    list.sort(
      (a, b) =>
        (VOICE_TIER_RANK[a.tier] ?? 9) - (VOICE_TIER_RANK[b.tier] ?? 9)
    );
    const seen = new Set();
    for (const v of list) {
      const g = v.gender || "neutral";
      if (seen.has(g)) continue;
      seen.add(g);
      picked.push(v);
      if (seen.size >= 2) break;
    }
  }
  return picked;
}

function languageDisplayName(langCode, langNames) {
  const parts = langCode.split("-");
  const base = parts[0];
  const region = parts[1] || "";
  try {
    let name = langNames.of(base) || langCode;
    if (region) name += ` (${region})`;
    return name;
  } catch {
    return langCode;
  }
}

async function fetchGoogleVoiceCatalog() {
  if (
    googleVoiceCache &&
    Date.now() - googleVoiceCacheTime < VOICE_CACHE_MS
  ) {
    return googleVoiceCache;
  }

  const url = `https://texttospeech.googleapis.com/v1/voices?key=${GOOGLE_TTS_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to fetch Google voices");
  }

  const langNames = new Intl.DisplayNames(["en"], { type: "language" });
  const raw = [];
  for (const v of data.voices || []) {
    const lang = v.languageCodes?.[0];
    const id = v.name;
    if (!lang || !id) continue;
    const gender = (v.ssmlGender || "NEUTRAL").toLowerCase();
    const tier = voiceTier(id);
    raw.push({
      id,
      lang,
      gender,
      tier,
      label: formatVoiceLabel(lang, id, gender, tier),
    });
  }

  for (const v of raw) {
    v.label = friendlyGoogleVoiceLabel(v.lang, v, langNames);
  }

  const googleVoices = pickBestVoices(raw);
  for (const v of googleVoices) {
    v.label = friendlyGoogleVoiceLabel(v.lang, v, langNames);
  }
  const englishAccentGroups = [];
  const voiceGroups = [];
  const enByAccent = new Map();
  const otherByLang = new Map();

  for (const v of googleVoices) {
    const base = v.lang.split("-")[0].toLowerCase();
    if (base === "en") {
      if (!enByAccent.has(v.lang)) enByAccent.set(v.lang, []);
      enByAccent.get(v.lang).push(v);
    } else {
      if (!otherByLang.has(v.lang)) otherByLang.set(v.lang, []);
      otherByLang.get(v.lang).push(v);
    }
  }

  for (const [langCode, voices] of enByAccent) {
    const accent = ENGLISH_ACCENT_LABELS[langCode] || langCode;
    englishAccentGroups.push({
      langCode,
      label: `English — ${accent}`,
      voices,
    });
  }
  englishAccentGroups.sort((a, b) => a.label.localeCompare(b.label));

  for (const [langCode, voices] of otherByLang) {
    voiceGroups.push({
      langCode,
      label: languageDisplayName(langCode, langNames),
      voices,
      ...voiceGenderIds(voices),
    });
  }
  voiceGroups.sort((a, b) => a.label.localeCompare(b.label));

  const catalog = {
    googleVoices,
    englishAccentGroups,
    voiceGroups,
    languageCount: englishAccentGroups.length + voiceGroups.length,
    voiceCount: googleVoices.length,
  };
  applyPunjabiVoices(catalog);

  googleVoiceCache = catalog;
  googleVoiceCacheTime = Date.now();
  return googleVoiceCache;
}

function applyPunjabiVoices(catalog) {
  const byId = new Map(GOOGLE_PUNJABI_VOICES.map((v) => [v.id, { ...v }]));

  for (const v of catalog.googleVoices) {
    if (!isPunjabiLang(v.lang)) continue;
    byId.set(v.id, {
      ...v,
      label: punjabiFriendlyLabel(v),
    });
  }

  const punjabiVoices = [...byId.values()].sort((a, b) => {
    const tier =
      (VOICE_TIER_RANK[a.tier] ?? 9) - (VOICE_TIER_RANK[b.tier] ?? 9);
    if (tier !== 0) return tier;
    return (a.gender || "").localeCompare(b.gender || "");
  });

  catalog.voiceGroups = catalog.voiceGroups.filter(
    (g) => !isPunjabiLang(g.langCode)
  );

  const mergedIds = new Set(catalog.googleVoices.map((v) => v.id));
  for (const pv of punjabiVoices) {
    if (!mergedIds.has(pv.id)) {
      catalog.googleVoices.push(pv);
      mergedIds.add(pv.id);
    } else {
      const idx = catalog.googleVoices.findIndex((x) => x.id === pv.id);
      if (idx >= 0) catalog.googleVoices[idx] = { ...catalog.googleVoices[idx], ...pv };
    }
  }

  catalog.punjabiGroup = {
    langCode: "pa-IN",
    label: "Punjabi",
    voices: punjabiVoices,
    ...voiceGenderIds(punjabiVoices),
  };
  catalog.punjabiVoices = punjabiVoices;
  catalog.languageCount =
    catalog.englishAccentGroups.length + catalog.voiceGroups.length + 1;
  catalog.voiceCount = catalog.googleVoices.length;
}

function findGoogleVoice(voiceId) {
  if (googleVoiceCache?.googleVoices) {
    const hit = googleVoiceCache.googleVoices.find((v) => v.id === voiceId);
    if (hit) return hit;
  }
  return GOOGLE_PUNJABI_VOICES.find((v) => v.id === voiceId) || null;
}

// --- Provider 1: OpenAI --------------------------------------------------
// Streams reply text chunks to the client via the supplied write() callback.
async function streamWithOpenAI(messages, write, opts = {}) {
  const params = {
    model: opts.model || OPENAI_MODEL,
    stream: true,
    messages: [
      { role: "system", content: opts.systemPrompt || SYSTEM_PROMPT },
      ...messages,
    ],
  };
  if (typeof opts.temperature === "number") params.temperature = opts.temperature;
  if (typeof opts.maxTokens === "number" && opts.maxTokens > 0)
    params.max_tokens = opts.maxTokens;

  const stream = await openai.chat.completions.create(params);
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) write(delta);
  }
}

// --- Provider 2: Ollama (free local AI) ----------------------------------
async function isOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function listOllamaModels() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m) => m.name);
  } catch {
    return [];
  }
}

// Streams reply text chunks from Ollama (newline-delimited JSON) to write().
async function streamWithOllama(messages, write, opts = {}) {
  const options = {};
  if (typeof opts.temperature === "number") options.temperature = opts.temperature;
  if (typeof opts.maxTokens === "number" && opts.maxTokens > 0)
    options.num_predict = opts.maxTokens;

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model || OLLAMA_MODEL,
      stream: true,
      options,
      messages: [
        { role: "system", content: opts.systemPrompt || SYSTEM_PROMPT },
        ...messages,
      ],
    }),
  });
  if (!res.ok || !res.body) {
    let detail = `status ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.error) detail = errBody.error;
    } catch {
      /* not JSON */
    }
    throw new Error(`Ollama error: ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;
      const obj = JSON.parse(line);
      const piece = obj.message?.content;
      if (piece) write(piece);
    }
  }
}

// --- Provider 3: Built-in offline assistant ------------------------------
// A lightweight rule-based responder so the chat always works, even with no
// API key and no local model installed. Replies are simple but real.
function replyOffline(messages) {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const text = (last?.content || "").trim();
  const lower = text.toLowerCase();
  const includesAny = (arr) => arr.some((w) => lower.includes(w));

  if (!text) return "I'm here! Type a message and I'll respond.";
  if (includesAny(["hello", "hi ", "hey", "good morning", "good afternoon"]))
    return "Hello! I'm your AI assistant running in offline demo mode. How can I help you today?";
  if (includesAny(["how are you", "how's it going", "how are u"]))
    return "I'm doing great, thanks for asking! What would you like to talk about?";
  if (includesAny(["your name", "who are you", "what are you"]))
    return "I'm a simple AI chatbot assistant. Right now I'm running in offline demo mode, but I can be connected to a powerful AI model (OpenAI or a free local model via Ollama).";
  if (includesAny(["thank", "thanks", "cheers"]))
    return "You're very welcome! Is there anything else I can help with?";
  if (includesAny(["bye", "goodbye", "see you"]))
    return "Goodbye! Have a wonderful day.";
  if (lower.includes("?"))
    return `That's a great question. I'm currently in offline demo mode, so my answers are limited. Once a real AI model is connected, I'll be able to answer "${text}" properly.`;
  return `You said: "${text}". I'm running in offline demo mode right now, so my replies are basic. Connect an AI model (OpenAI or free local Ollama) to unlock full, intelligent responses.`;
}

// --- Decide which provider to use, with graceful fallback ----------------
let activeProvider = "offline";

async function detectProvider() {
  if (openai) activeProvider = "openai";
  else if (await isOllamaRunning()) activeProvider = "ollama";
  else activeProvider = "offline";
  return activeProvider;
}

// Returns which provider is active and the models the user can choose from.
app.get("/api/models", async (req, res) => {
  if (openai) {
    return res.json({
      provider: "openai",
      models: [OPENAI_MODEL, "gpt-4o", "gpt-4o-mini", "gpt-4.1-mini"],
      current: OPENAI_MODEL,
    });
  }
  if (await isOllamaRunning()) {
    const models = await listOllamaModels();
    const current =
      models.includes(OLLAMA_MODEL) ? OLLAMA_MODEL : models[0] || null;
    return res.json({
      provider: "ollama",
      models,
      current,
      configuredModel: OLLAMA_MODEL,
      modelMissing: models.length > 0 && !models.includes(OLLAMA_MODEL),
      noModelsInstalled: models.length === 0,
    });
  }
  return res.json({ provider: "offline", models: ["offline"], current: "offline" });
});

// Google Cloud TTS — all languages; English grouped by accent.
app.get("/api/speech/voices", async (req, res) => {
  if (!GOOGLE_TTS_KEY) {
    return res.json({
      googleEnabled: false,
      translateEnabled: false,
      googleVoices: [],
      englishAccentGroups: [],
      voiceGroups: [],
      languageCount: 0,
      voiceCount: 0,
    });
  }
  try {
    const catalog = await fetchGoogleVoiceCatalog();
    return res.json({
      googleEnabled: true,
      translateEnabled: true,
      googleVoices: catalog.googleVoices,
      englishAccentGroups: catalog.englishAccentGroups,
      punjabiGroup: catalog.punjabiGroup,
      punjabiVoices: catalog.punjabiVoices,
      voiceGroups: catalog.voiceGroups,
      languageCount: catalog.languageCount,
      voiceCount: catalog.voiceCount,
    });
  } catch (err) {
    console.error("Google voices error:", err.message);
    return res.json({
      googleEnabled: false,
      translateEnabled: !!GOOGLE_TTS_KEY,
      error: err.message,
      googleVoices: [],
      englishAccentGroups: [],
      voiceGroups: [],
      languageCount: 0,
      voiceCount: 0,
    });
  }
});

app.post("/api/translate", apiLimiter, async (req, res) => {
  if (!GOOGLE_TTS_KEY) {
    return res.status(503).json({
      error:
        "Translation is not configured. Add GOOGLE_CLOUD_TTS_API_KEY to your .env file.",
    });
  }
  const { text, target, source } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Request must include 'text'." });
  }
  const targetLang =
    typeof target === "string" && target.trim() ? target.trim() : "en";
  const plain = text.slice(0, 5000);

  try {
    const params = new URLSearchParams();
    params.append("q", plain);
    params.append("target", targetLang);
    if (typeof source === "string" && source.trim()) {
      params.append("source", source.trim());
    }
    const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TTS_KEY}`;
    const trRes = await fetch(url, { method: "POST", body: params });
    const data = await trRes.json();
    if (!trRes.ok) {
      const msg = data.error?.message || "Translation request failed";
      return res.status(500).json({ error: msg });
    }
    const hit = data.data?.translations?.[0];
    if (!hit) {
      return res.status(500).json({ error: "No translation returned." });
    }
    return res.json({
      translatedText: hit.translatedText,
      detectedSourceLanguage: hit.detectedSourceLanguage || null,
    });
  } catch (err) {
    console.error("Translate error:", err.message);
    return res.status(500).json({ error: "Translation request failed." });
  }
});

app.post("/api/speech/synthesize", apiLimiter, async (req, res) => {
  if (!GOOGLE_TTS_KEY) {
    return res.status(503).json({
      error:
        "Google Text-to-Speech is not configured. Add GOOGLE_CLOUD_TTS_API_KEY to your .env file.",
    });
  }

  const { text, voiceName, rate } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Request must include 'text'." });
  }

  try {
    if (!googleVoiceCache) await fetchGoogleVoiceCatalog();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const voice = findGoogleVoice(voiceName);
  if (!voice) {
    return res.status(400).json({ error: "Unknown Google voice." });
  }

  const speakingRate =
    typeof rate === "number" && rate >= 0.5 && rate <= 2 ? rate : 1;
  const plain = text.slice(0, 5000);

  try {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`;
    const gRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: plain },
        voice: { languageCode: voice.lang, name: voice.id },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate,
        },
      }),
    });
    const data = await gRes.json();
    if (!gRes.ok) {
      const msg = data.error?.message || "Google TTS request failed";
      return res.status(500).json({ error: msg });
    }
    return res.json({ audioContent: data.audioContent });
  } catch (err) {
    console.error("Google TTS error:", err.message);
    return res.status(500).json({ error: "Google TTS request failed." });
  }
});

app.post("/api/attach/extract", apiLimiter, (req, res) => {
  attachUpload.single("file")(req, res, async (uploadErr) => {
    if (uploadErr) {
      const msg =
        uploadErr.code === "LIMIT_FILE_SIZE"
          ? "File too large (max 15 MB)"
          : uploadErr.message || "Upload failed";
      return res.status(400).json({ error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    try {
      const text = await extractAttachmentBuffer(req.file);
      if (!text.trim()) {
        return res
          .status(400)
          .json({ error: "No readable text found in that file" });
      }
      return res.json({
        name: req.file.originalname,
        text: truncateAttachmentText(text),
      });
    } catch (err) {
      console.error("Attachment extract error:", err.message);
      return res
        .status(400)
        .json({ error: err.message || "Could not read file" });
    }
  });
});

app.post("/api/chat", chatLimiter, async (req, res) => {
  const { messages, model, systemPrompt, temperature, maxTokens } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ error: "Request must include a non-empty 'messages' array." });
  }

  const opts = {
    model: typeof model === "string" && model ? model : undefined,
    systemPrompt:
      typeof systemPrompt === "string" && systemPrompt.trim()
        ? systemPrompt.trim()
        : undefined,
    temperature:
      typeof temperature === "number" && temperature >= 0 && temperature <= 2
        ? temperature
        : undefined,
    maxTokens:
      typeof maxTokens === "number" && maxTokens > 0 ? maxTokens : undefined,
  };

  // Stream the reply back as plain text so the UI can show it word-by-word.
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  const write = (chunk) => res.write(chunk);

  try {
    if (openai) {
      res.setHeader("X-Provider", "openai");
      await streamWithOpenAI(messages, write, opts);
      return res.end();
    }
    if (await isOllamaRunning()) {
      res.setHeader("X-Provider", "ollama");
      await streamWithOllama(messages, write, opts);
      return res.end();
    }
    // No AI provider available: stream the offline reply.
    res.setHeader("X-Provider", "offline");
    write(replyOffline(messages));
    return res.end();
  } catch (providerErr) {
    console.error("AI provider failed:", providerErr.message);
  const msg = providerErr.message || "Unknown AI error";
  const isModelMissing = /model.*not found/i.test(msg);
  const userHint = isModelMissing
    ? `The AI model is not installed. Open a terminal and run: ollama pull ${OLLAMA_MODEL}`
    : msg;
  try {
    if (!res.writableEnded) {
      if (isModelMissing) {
        write(`Error: ${userHint}`);
      } else {
        write(`\n\nError: ${userHint}\n\n[Switched to offline demo mode]\n`);
        write(replyOffline(messages));
      }
    }
  } catch {
    /* connection may already be closed */
  }
  return res.end();
  }
});

async function logStartup() {
  const provider = await detectProvider();
  const label =
    provider === "openai"
      ? "OpenAI (cloud)"
      : provider === "ollama"
      ? `Ollama local model (${OLLAMA_MODEL})`
      : "offline demo mode (no AI model connected)";
  console.log(`Active AI provider: ${label}`);
  console.log(
    "File attachments: POST /api/attach/extract (PDF, Word, PPTX, PPT, DOC, Excel, images, SVG, text)"
  );
  console.log(
    "Rate limits: /api/chat max " +
      (process.env.CHAT_RATE_MAX || 40) +
      " per " +
      (process.env.CHAT_RATE_WINDOW_MIN || 15) +
      " min"
  );
  if (openai) {
    console.log("Image attachments: vision via OpenAI (" + OPENAI_MODEL + ")");
  }
  if (GOOGLE_TTS_KEY) {
    try {
      const catalog = await fetchGoogleVoiceCatalog();
      console.log(
        `Google TTS + Translation: enabled (${catalog.languageCount} languages, ${catalog.voiceCount} voices)`
      );
    } catch (err) {
      console.log("Google TTS key set but voice catalog failed:", err.message);
    }
  } else {
    console.log(
      "Google TTS + Translation: not configured (run npm run verify:google)"
    );
  }
}

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`AI chatbot running at http://localhost:${PORT}`);
    await logStartup();
  });
}
