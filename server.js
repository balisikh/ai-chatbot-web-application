import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import OpenAI from "openai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, "public")));
app.use(express.json());

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

// --- Provider 1: OpenAI --------------------------------------------------
// Streams reply text chunks to the client via the supplied write() callback.
async function streamWithOpenAI(messages, write, opts = {}) {
  const stream = await openai.chat.completions.create({
    model: opts.model || OPENAI_MODEL,
    stream: true,
    messages: [
      { role: "system", content: opts.systemPrompt || SYSTEM_PROMPT },
      ...messages,
    ],
  });
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
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model || OLLAMA_MODEL,
      stream: true,
      messages: [
        { role: "system", content: opts.systemPrompt || SYSTEM_PROMPT },
        ...messages,
      ],
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Ollama responded with status ${res.status}`);
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
    return res.json({
      provider: "ollama",
      models: models.length ? models : [OLLAMA_MODEL],
      current: OLLAMA_MODEL,
    });
  }
  return res.json({ provider: "offline", models: ["offline"], current: "offline" });
});

app.post("/api/chat", async (req, res) => {
  const { messages, model, systemPrompt } = req.body;
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
    // If nothing was sent yet, fall back to the offline assistant.
    if (!res.headersSent || !res.writableEnded) {
      try {
        write("\n\n[Switched to offline mode due to an AI error]\n");
        write(replyOffline(messages));
      } catch {
        /* connection may already be closed */
      }
    }
    return res.end();
  }
});

app.listen(PORT, async () => {
  const provider = await detectProvider();
  const label =
    provider === "openai"
      ? "OpenAI (cloud)"
      : provider === "ollama"
      ? `Ollama local model (${OLLAMA_MODEL})`
      : "offline demo mode (no AI model connected)";
  console.log(`AI chatbot running at http://localhost:${PORT}`);
  console.log(`Active AI provider: ${label}`);
});
