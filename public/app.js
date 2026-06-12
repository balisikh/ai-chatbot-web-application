// --- Element references ---------------------------------------------------
const form = document.getElementById("chat-form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const messagesEl = document.getElementById("messages");
const themeToggleBtn = document.getElementById("theme-toggle");
const sidebar = document.getElementById("sidebar");
const appEl = document.querySelector(".app");
const toggleSidebarBtn = document.getElementById("toggle-sidebar");
const convoListEl = document.getElementById("convo-list");
const newConvoBtn = document.getElementById("new-convo");
const convoTitleEl = document.getElementById("convo-title");
const modelPicker = document.getElementById("model-picker");
const micBtn = document.getElementById("mic");
const attachBtn = document.getElementById("attach");
const fileInput = document.getElementById("file-input");
const attachmentEl = document.getElementById("attachment");
const attachmentNameEl = document.getElementById("attachment-name");
const attachmentRemoveBtn = document.getElementById("attachment-remove");
const scrollBottomBtn = document.getElementById("scroll-bottom");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const charCounter = document.getElementById("char-counter");
const toastEl = document.getElementById("toast");
const searchInput = document.getElementById("search");
const exportBtn = document.getElementById("export-btn");
const exportMenu = document.getElementById("export-menu");
const settingsModal = document.getElementById("settings-modal");
const openSettingsBtn = document.getElementById("open-settings");
const saveSettingsBtn = document.getElementById("save-settings");
const resetSettingsBtn = document.getElementById("reset-settings");
const systemPromptInput = document.getElementById("system-prompt");
const readAloudInput = document.getElementById("read-aloud");
const presetSelect = document.getElementById("preset");
const temperatureInput = document.getElementById("temperature");
const tempValueEl = document.getElementById("temp-value");
const maxLengthSelect = document.getElementById("max-length");
const themeSelect = document.getElementById("theme-select");
const accentRow = document.getElementById("accent-row");
const autoScrollInput = document.getElementById("auto-scroll");
const usageEl = document.getElementById("usage");
const tagFilterEl = document.getElementById("tag-filter");
const voiceSelect = document.getElementById("voice-select");
const speechRateInput = document.getElementById("speech-rate");
const rateValueEl = document.getElementById("rate-value");
const ttsControls = document.getElementById("tts-controls");
const voiceHint = document.getElementById("voice-hint");
const voiceSearchInput = document.getElementById("voice-search");
const translateToEnglishInput = document.getElementById("translate-to-english");
const translateSourceRow = document.getElementById("translate-source-row");
const translateSourceLangSelect = document.getElementById("translate-source-lang");
const showTranslationInput = document.getElementById("show-translation");
const replyInUserLanguageInput = document.getElementById("reply-in-user-language");
const translateForSpeechInput = document.getElementById("translate-for-speech");
const speechModeEnglishEl = document.getElementById("speech-mode-english");
const speechModeLanguagesEl = document.getElementById("speech-mode-languages");
const speechModeLangSearchInput = document.getElementById("speech-mode-lang-search");
const speechModeEnglishHint = document.getElementById("speech-mode-english-hint");
const speechModeLanguagesTitle = document.getElementById("speech-mode-languages-title");
const speechModeLanguagesHint = document.getElementById("speech-mode-languages-hint");
const speechModeGoogleStatus = document.getElementById("speech-mode-google-status");
const googleSpeechPipelineHint = document.getElementById("google-speech-pipeline-hint");
const translationOptionsHint = document.getElementById("translation-options-hint");

// --- Storage keys ---------------------------------------------------------
const CONVOS_KEY = "ai_chat_convos";
const ACTIVE_KEY = "ai_chat_active";
const SETTINGS_KEY = "ai_chat_settings";
const THEME_KEY = "ai_chat_theme";

function isLocalDevHost() {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function googleVoicesSetupHint() {
  if (isLocalDevHost()) {
    return "Google voices are not enabled yet. Add GOOGLE_CLOUD_TTS_API_KEY to .env, then run npm run verify:google.";
  }
  return "Ask your admin to enable Google voices on the server.";
}

const WELCOME = "Hi! I'm your AI assistant. Ask me anything to get started.";
const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a short poem about the sea",
  "Give me 3 dinner ideas",
  "How do I stay productive?",
];

const THEMES = [
  { id: "dark", label: "Dark (default)" },
  { id: "light", label: "Light" },
  { id: "midnight", label: "Midnight" },
  { id: "forest", label: "Forest" },
  { id: "solar", label: "Solar" },
  { id: "rose", label: "Rose" },
];
const ACCENTS = ["#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#14b8a6"];

const PRESETS = {
  "Default assistant":
    "You are a friendly, helpful AI assistant. Answer clearly and concisely.",
  "Helpful tutor":
    "You are a patient tutor. Explain concepts step by step with simple analogies and examples.",
  "Coding assistant":
    "You are an expert programming assistant. Provide correct, well-commented code and explain briefly.",
  "Creative writer":
    "You are a creative writer. Respond with vivid, imaginative, engaging prose.",
  "Concise expert":
    "You are a concise expert. Give accurate, no-fluff answers in as few words as possible.",
  "Pirate": "You are a witty pirate. Always answer in pirate speak, but stay helpful.",
};

// --- State ----------------------------------------------------------------
let conversations = loadJSON(CONVOS_KEY, []);
let activeId = localStorage.getItem(ACTIVE_KEY) || null;
let settings = Object.assign(
  {
    systemPrompt: "",
    model: "",
    readAloud: false,
    temperature: 0.7,
    maxTokens: 512,
    preset: "Default assistant",
    theme: localStorage.getItem(THEME_KEY) || "dark",
    accent: "",
    autoScroll: true,
    voiceName: "",
    speechRate: 1,
    translateToEnglish: false,
    translateSourceLang: "",
    showTranslation: true,
    replyInUserLanguage: false,
    translateForSpeech: false,
  },
  loadJSON(SETTINGS_KEY, {})
);

let currentController = null;
let isGenerating = false;
let searchQuery = "";
let pendingAttachment = null;
let activeTag = null;
let googleVoices = [];
let googleEnglishAccentGroups = [];
let googlePunjabiGroup = null;
let googleVoiceGroups = [];
let googleTranslateEnabled = false;
let googleCatalogOnline = false;
let cachedLanguageModes = [];
let googleVoiceCount = 0;
let googleLanguageCount = 0;
let voiceSearchQuery = "";
let speakingAudio = null;

let clientLangNames = null;
try {
  clientLangNames = new Intl.DisplayNames(["en"], { type: "language" });
} catch {
  clientLangNames = null;
}

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

const ENGLISH_ACCENT_SHORT = {
  "en-US": "US",
  "en-GB": "UK",
  "en-AU": "AU",
  "en-CA": "CA",
  "en-IN": "IN",
  "en-IE": "IE",
  "en-NZ": "NZ",
  "en-PH": "PH",
  "en-SG": "SG",
  "en-ZA": "ZA",
  "en-GB-WLS": "Wales",
};

const PUNJABI_VOICE_PREFERENCES = [
  "google:pa-IN-Wavenet-A",
  "google:pa-IN-Wavenet-B",
  "google:pa-IN-Standard-A",
  "google:pa-IN-Standard-B",
];

// Popular languages for quick setup before Google loads; merged with full API catalog when online.
const LANGUAGE_QUICK_SETUP_REGIONS = [
  { id: "south-asia", label: "South Asia" },
  { id: "middle-east", label: "Middle East & Turkey" },
  { id: "east-asia", label: "East Asia" },
  { id: "southeast-asia", label: "Southeast Asia" },
  { id: "europe", label: "Europe" },
  { id: "americas", label: "Americas & Spanish" },
];

const LANGUAGE_QUICK_SETUP = [
  { langCode: "pa-IN", label: "Punjabi", region: "south-asia", preferredVoiceIds: PUNJABI_VOICE_PREFERENCES },
  { langCode: "hi-IN", label: "Hindi", region: "south-asia" },
  { langCode: "ur-PK", label: "Urdu", region: "south-asia" },
  { langCode: "bn-IN", label: "Bengali", region: "south-asia" },
  { langCode: "gu-IN", label: "Gujarati", region: "south-asia" },
  { langCode: "mr-IN", label: "Marathi", region: "south-asia" },
  { langCode: "ta-IN", label: "Tamil", region: "south-asia" },
  { langCode: "te-IN", label: "Telugu", region: "south-asia" },
  { langCode: "ar-XA", label: "Arabic", region: "middle-east" },
  { langCode: "tr-TR", label: "Turkish", region: "middle-east" },
  { langCode: "zh-CN", label: "Chinese", region: "east-asia" },
  { langCode: "ja-JP", label: "Japanese", region: "east-asia" },
  { langCode: "ko-KR", label: "Korean", region: "east-asia" },
  { langCode: "th-TH", label: "Thai", region: "southeast-asia" },
  { langCode: "vi-VN", label: "Vietnamese", region: "southeast-asia" },
  { langCode: "fr-FR", label: "French", region: "europe" },
  { langCode: "de-DE", label: "German", region: "europe" },
  { langCode: "it-IT", label: "Italian", region: "europe" },
  { langCode: "nl-NL", label: "Dutch", region: "europe" },
  { langCode: "sv-SE", label: "Swedish", region: "europe" },
  { langCode: "pl-PL", label: "Polish", region: "europe" },
  { langCode: "ru-RU", label: "Russian", region: "europe" },
  { langCode: "pt-PT", label: "Portuguese (Portugal)", region: "europe" },
  { langCode: "es-ES", label: "Spanish (Spain)", region: "americas" },
  { langCode: "es-MX", label: "Spanish (Mexico)", region: "americas" },
  { langCode: "pt-BR", label: "Portuguese (Brazil)", region: "americas" },
];

function quickSetupEntryForLang(langCode) {
  const base = langBase(langCode);
  return LANGUAGE_QUICK_SETUP.find(
    (e) => e.langCode === langCode || langBase(e.langCode) === base
  );
}

function quickSetupSortIndex(langCode) {
  const entry = quickSetupEntryForLang(langCode);
  if (!entry) return 9999;
  return LANGUAGE_QUICK_SETUP.indexOf(entry);
}

function sortLanguageModesInRegion(modes) {
  return modes.sort((a, b) => {
    const oa = quickSetupSortIndex(a.langCode);
    const ob = quickSetupSortIndex(b.langCode);
    if (oa !== ob) return oa - ob;
    const af = /female/i.test(a.label) ? 0 : /male/i.test(a.label) ? 1 : 2;
    const bf = /female/i.test(b.label) ? 0 : /male/i.test(b.label) ? 1 : 2;
    if (af !== bf) return af - bf;
    return a.label.localeCompare(b.label);
  });
}

const TRANSLATE_SOURCE_PRESETS = [
  { code: "", label: "Any non-English language → English" },
  { code: "pa", label: "Punjabi → English only" },
  { code: "hi", label: "Hindi → English only" },
  { code: "ur", label: "Urdu → English only" },
  { code: "bn", label: "Bengali → English only" },
  { code: "gu", label: "Gujarati → English only" },
  { code: "mr", label: "Marathi → English only" },
  { code: "ta", label: "Tamil → English only" },
  { code: "te", label: "Telugu → English only" },
  { code: "ar", label: "Arabic → English only" },
  { code: "zh", label: "Chinese → English only" },
  { code: "es", label: "Spanish → English only" },
  { code: "fr", label: "French → English only" },
  { code: "de", label: "German → English only" },
];

// --- Storage helpers ------------------------------------------------------
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
function saveConvos() {
  saveJSON(CONVOS_KEY, conversations);
}
function saveSettings() {
  saveJSON(SETTINGS_KEY, settings);
}

// --- Conversation model ---------------------------------------------------
function newConversation() {
  const convo = {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    title: "New chat",
    messages: [],
    pinned: false,
    tags: [],
    createdAt: new Date().toISOString(),
  };
  conversations.unshift(convo);
  activeId = convo.id;
  localStorage.setItem(ACTIVE_KEY, activeId);
  saveConvos();
  return convo;
}
function getActive() {
  let convo = conversations.find((c) => c.id === activeId);
  if (!convo) {
    convo = conversations[0] || newConversation();
    activeId = convo.id;
    localStorage.setItem(ACTIVE_KEY, activeId);
  }
  return convo;
}
function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  if (activeId === id) {
    activeId = conversations[0]?.id || null;
    if (!activeId) newConversation();
    else localStorage.setItem(ACTIVE_KEY, activeId);
  }
  saveConvos();
  renderSidebar();
  renderConversation();
}
function switchConversation(id) {
  activeId = id;
  localStorage.setItem(ACTIVE_KEY, id);
  renderSidebar();
  renderConversation();
  if (isMobile()) closeMobileSidebar();
}
function maybeAutoTitle(convo, firstText) {
  if (convo.title === "New chat" && firstText) {
    convo.title = firstText.slice(0, 32) + (firstText.length > 32 ? "..." : "");
  }
}

// --- Markdown renderer (self-contained, offline, safe) --------------------
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function highlightCode(escaped) {
  const pattern =
    /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b|\b(const|let|var|function|return|if|else|for|while|import|from|export|class|new|async|await|try|catch|throw|def|lambda|print|true|false|null|undefined|None|True|False|public|private|static|void|int|float|string|bool)\b/g;
  return escaped.replace(pattern, (m, comment, str, num, kw) => {
    if (comment) return `<span class="tok-comment">${comment}</span>`;
    if (str) return `<span class="tok-string">${str}</span>`;
    if (num) return `<span class="tok-number">${num}</span>`;
    if (kw) return `<span class="tok-keyword">${kw}</span>`;
    return m;
  });
}
function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}
function isTableSeparator(line) {
  if (!line || !line.includes("-")) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
}

function renderMarkdown(md) {
  const codeBlocks = [];
  let src = md.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
    codeBlocks.push(code.replace(/\n$/, ""));
    return `\u0000${codeBlocks.length - 1}\u0000`;
  });
  const inline = (s) => {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    return s;
  };
  const lines = src.split("\n");
  let html = "";
  let listType = null;
  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const ph = line.match(/^\u0000(\d+)\u0000$/);
    if (ph) {
      closeList();
      html += `<pre><code class="hl">${highlightCode(
        escapeHtml(codeBlocks[+ph[1]])
      )}</code></pre>`;
      continue;
    }
    // GitHub-style tables: header row, separator row, then body rows.
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      closeList();
      const header = splitTableRow(line);
      const aligns = splitTableRow(lines[i + 1]).map((c) => {
        const l = c.startsWith(":");
        const r = c.endsWith(":");
        return l && r ? "center" : r ? "right" : l ? "left" : "";
      });
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      i--;
      const cellStyle = (idx) =>
        aligns[idx] ? ` style="text-align:${aligns[idx]}"` : "";
      let t = "<table><thead><tr>";
      header.forEach((h, idx) => (t += `<th${cellStyle(idx)}>${inline(h)}</th>`));
      t += "</tr></thead><tbody>";
      for (const row of rows) {
        t += "<tr>";
        for (let idx = 0; idx < header.length; idx++) {
          t += `<td${cellStyle(idx)}>${inline(row[idx] || "")}</td>`;
        }
        t += "</tr>";
      }
      t += "</tbody></table>";
      html += t;
      continue;
    }
    if (/^\s*$/.test(line)) {
      closeList();
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      closeList();
      const lvl = m[1].length;
      html += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (listType !== "ul") {
        closeList();
        html += "<ul>";
        listType = "ul";
      }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (listType !== "ol") {
        closeList();
        html += "<ol>";
        listType = "ol";
      }
      html += `<li>${inline(m[1])}</li>`;
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, " code snippet ")
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

// --- Toast ----------------------------------------------------------------
let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  void toastEl.offsetWidth; // restart transition
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.classList.add("hidden"), 220);
  }, 1800);
}

// --- DOM helpers ----------------------------------------------------------
function formatTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
// Rough token estimate (~4 characters per token, the common rule of thumb).
function estimateTokens(text) {
  return Math.max(1, Math.round((text || "").length / 4));
}
function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function nearBottom() {
  return (
    messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 60
  );
}
function enhanceCodeBlocks(bubble) {
  bubble.querySelectorAll("pre").forEach((pre) => {
    if (pre.querySelector(".copy-code")) return;
    const btn = document.createElement("button");
    btn.className = "copy-code";
    btn.textContent = "Copy code";
    btn.addEventListener("click", async () => {
      const code = pre.querySelector("code");
      try {
        await navigator.clipboard.writeText(code ? code.textContent : "");
        btn.textContent = "Copied!";
        showToast("Code copied to clipboard");
        setTimeout(() => (btn.textContent = "Copy code"), 1500);
      } catch {
        /* ignore */
      }
    });
    pre.appendChild(btn);
  });
}
function makeMetaButton(label, title, onClick) {
  const btn = document.createElement("button");
  btn.className = "meta-btn";
  btn.textContent = label;
  btn.title = title;
  btn.addEventListener("click", onClick);
  return btn;
}

function addMessage(role, text, opts = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "user" : "bot"}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (role === "user") {
    if (opts.file) {
      const badge = document.createElement("div");
      badge.className = "file-badge";
      badge.textContent = "\u{1F4CE} " + opts.file;
      bubble.appendChild(badge);
    }
    const span = document.createElement("span");
    span.textContent = text;
    bubble.appendChild(span);
    if (opts.detectedLang && langBase(opts.detectedLang) !== "en") {
      const det = document.createElement("div");
      det.className = "detected-lang-badge";
      det.textContent =
        "Detected: " + formatDetectedLanguageLabel(opts.detectedLang);
      bubble.appendChild(det);
    }
    if (opts.translation) {
      const tr = document.createElement("div");
      tr.className = "translation-badge";
      tr.textContent = "English: " + opts.translation;
      bubble.appendChild(tr);
    }
  } else {
    if (opts.error) bubble.classList.add("error");
    bubble.innerHTML = renderMarkdown(text || "");
    bubble.dataset.raw = text || "";
    enhanceCodeBlocks(bubble);
    if (opts.replyTranslation) {
      const tr = document.createElement("div");
      tr.className = "translation-badge";
      tr.textContent = "English: " + opts.replyTranslation;
      bubble.appendChild(tr);
    }
  }
  wrapper.appendChild(bubble);

  const meta = document.createElement("div");
  meta.className = "meta";
  const stamp = document.createElement("span");
  stamp.className = "timestamp";
  stamp.textContent = formatTime(opts.time);
  meta.appendChild(stamp);

  if (opts.tokens) {
    const tok = document.createElement("span");
    tok.className = "timestamp token-count";
    tok.textContent = `~${opts.tokens} tok`;
    tok.title = "Estimated tokens";
    meta.appendChild(tok);
  }

  if (role === "user" && opts.onEdit) {
    meta.appendChild(makeMetaButton("Edit", "Edit & resend", opts.onEdit));
  }
  if (role !== "user") {
    meta.appendChild(
      makeMetaButton("Copy", "Copy reply", async () => {
        try {
          await navigator.clipboard.writeText(bubble.dataset.raw || "");
          showToast("Copied to clipboard");
        } catch {
          /* ignore */
        }
      })
    );
    if (!opts.error && (text || "").trim()) {
      meta.appendChild(makeSpeakButton(() => bubble.dataset.raw || text));
    }
    if (opts.onRetry) {
      const r = makeMetaButton("Retry", "Try again", opts.onRetry);
      r.classList.add("retry-btn");
      meta.appendChild(r);
    }
    if (opts.onRegenerate) {
      const b = makeMetaButton("Regenerate", "Regenerate this reply", opts.onRegenerate);
      b.classList.add("regen-btn");
      meta.appendChild(b);
    }
    if (opts.onFeedback) {
      const up = makeMetaButton("\u{1F44D}", "Good response", () =>
        opts.onFeedback("up")
      );
      const down = makeMetaButton("\u{1F44E}", "Bad response", () =>
        opts.onFeedback("down")
      );
      if (opts.feedback === "up") up.classList.add("active");
      if (opts.feedback === "down") down.classList.add("active");
      meta.appendChild(up);
      meta.appendChild(down);
    }
  }
  wrapper.appendChild(meta);

  wrapper._bubble = bubble;
  wrapper._meta = meta;
  messagesEl.appendChild(wrapper);
  if (nearBottom()) scrollToBottom();
  return wrapper;
}

function showSuggestions() {
  const wrap = document.createElement("div");
  wrap.className = "suggestions";
  for (const s of SUGGESTIONS) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = s;
    chip.addEventListener("click", () => {
      input.value = s;
      form.requestSubmit();
    });
    wrap.appendChild(chip);
  }
  messagesEl.appendChild(wrap);
}
function removeSuggestions() {
  messagesEl.querySelector(".suggestions")?.remove();
}

function renderConversation() {
  const convo = getActive();
  convoTitleEl.textContent = convo.title || "AI Chatbot";
  messagesEl.innerHTML = "";
  if (convo.messages.length === 0) {
    addMessage("bot", WELCOME);
    showSuggestions();
    return;
  }
  let lastAssistant = -1;
  for (let i = convo.messages.length - 1; i >= 0; i--) {
    if (convo.messages[i].role === "assistant") {
      lastAssistant = i;
      break;
    }
  }
  convo.messages.forEach((msg, i) => {
    if (msg.role === "user") {
      addMessage("user", msg.display || msg.content, {
        time: msg.t,
        file: msg.file,
        translation:
          settings.showTranslation && msg.translation ? msg.translation : null,
        detectedLang:
          settings.showTranslation && msg.detectedLang ? msg.detectedLang : null,
        tokens: estimateTokens(msg.content),
        onEdit: () => editMessage(i),
      });
    } else {
      const botText = msg.display || msg.content;
      addMessage("bot", botText, {
        time: msg.t,
        error: msg.error,
        replyTranslation:
          settings.showTranslation &&
          msg.display &&
          msg.display !== msg.content
            ? msg.content
            : null,
        tokens: msg.error ? 0 : estimateTokens(msg.content),
        onRetry: msg.error && !isGenerating ? regenerate : undefined,
        onRegenerate:
          !msg.error && i === lastAssistant && !isGenerating ? regenerate : undefined,
        onFeedback: !msg.error ? (v) => setFeedback(i, v) : undefined,
        feedback: msg.feedback,
      });
    }
  });
  updateUsage();
  scrollToBottom();
}

function updateUsage() {
  const convo = getActive();
  const total = convo.messages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0
  );
  if (total > 0) {
    usageEl.textContent = `\u2248 ${total.toLocaleString()} tokens`;
    usageEl.classList.remove("hidden");
  } else {
    usageEl.classList.add("hidden");
  }
}

function allTags() {
  const set = new Set();
  conversations.forEach((c) => (c.tags || []).forEach((t) => set.add(t)));
  return [...set].sort();
}

function renderTagFilter() {
  tagFilterEl.innerHTML = "";
  const tags = allTags();
  if (tags.length === 0) {
    if (activeTag) activeTag = null;
    tagFilterEl.classList.add("hidden");
    return;
  }
  tagFilterEl.classList.remove("hidden");
  const mk = (label, value) => {
    const chip = document.createElement("button");
    chip.className = "tag-chip" + (activeTag === value ? " active" : "");
    chip.textContent = label;
    chip.addEventListener("click", () => {
      activeTag = value;
      renderSidebar();
    });
    tagFilterEl.appendChild(chip);
  };
  mk("All", null);
  tags.forEach((t) => mk("#" + t, t));
}

function renderSidebar() {
  renderTagFilter();
  convoListEl.innerHTML = "";
  let list = [...conversations].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );
  if (activeTag) list = list.filter((c) => (c.tags || []).includes(activeTag));
  if (searchQuery) {
    list = list.filter((c) => {
      if ((c.title || "").toLowerCase().includes(searchQuery)) return true;
      if ((c.tags || []).some((t) => t.toLowerCase().includes(searchQuery)))
        return true;
      return c.messages.some((m) =>
        (m.display || m.content || "").toLowerCase().includes(searchQuery)
      );
    });
  }

  for (const convo of list) {
    const item = document.createElement("div");
    item.className = "convo-item" + (convo.id === activeId ? " active" : "");

    const row = document.createElement("div");
    row.className = "convo-row";

    const pin = document.createElement("button");
    pin.className = "convo-pin" + (convo.pinned ? " pinned" : "");
    pin.textContent = convo.pinned ? "\u2605" : "\u2606";
    pin.title = convo.pinned ? "Unpin" : "Pin to top";
    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      convo.pinned = !convo.pinned;
      saveConvos();
      renderSidebar();
    });

    const title = document.createElement("span");
    title.className = "convo-item-title";
    title.textContent = convo.title || "New chat";
    title.title = "Click to open";
    title.addEventListener("click", () => switchConversation(convo.id));

    const tagBtn = document.createElement("button");
    tagBtn.className = "convo-tag-btn";
    tagBtn.textContent = "\u{1F3F7}";
    tagBtn.title = "Edit tags";
    tagBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startTagEdit(convo, item);
    });

    const rename = document.createElement("button");
    rename.className = "convo-rename";
    rename.textContent = "\u270E";
    rename.title = "Rename conversation";
    rename.addEventListener("click", (e) => {
      e.stopPropagation();
      startRename(convo, title);
    });

    const del = document.createElement("button");
    del.className = "convo-del";
    del.textContent = "x";
    del.title = "Delete conversation";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(convo.id);
    });

    row.appendChild(pin);
    row.appendChild(title);
    row.appendChild(tagBtn);
    row.appendChild(rename);
    row.appendChild(del);
    item.appendChild(row);

    if ((convo.tags || []).length) {
      const tagsRow = document.createElement("div");
      tagsRow.className = "convo-tags";
      convo.tags.forEach((t) => {
        const chip = document.createElement("span");
        chip.className = "convo-tag";
        chip.textContent = "#" + t;
        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          activeTag = t;
          renderSidebar();
        });
        tagsRow.appendChild(chip);
      });
      item.appendChild(tagsRow);
    }

    convoListEl.appendChild(item);
  }
}

function startTagEdit(convo, item) {
  if (item.querySelector(".tag-editor")) return;
  const editor = document.createElement("input");
  editor.className = "tag-editor";
  editor.value = (convo.tags || []).join(", ");
  editor.placeholder = "tags, comma, separated";
  item.appendChild(editor);
  editor.focus();
  const commit = () => {
    convo.tags = editor.value
      .split(",")
      .map((t) => t.trim().replace(/^#/, "").toLowerCase())
      .filter((t, i, arr) => t && arr.indexOf(t) === i);
    saveConvos();
    renderSidebar();
  };
  editor.addEventListener("blur", commit);
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter") editor.blur();
    if (e.key === "Escape") renderSidebar();
  });
}

function startRename(convo, titleEl) {
  const editor = document.createElement("input");
  editor.className = "rename-input";
  editor.value = convo.title;
  titleEl.replaceWith(editor);
  editor.focus();
  editor.select();
  const commit = () => {
    const v = editor.value.trim();
    convo.title = v || convo.title;
    saveConvos();
    renderSidebar();
    if (convo.id === activeId) convoTitleEl.textContent = convo.title;
  };
  editor.addEventListener("blur", commit);
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter") editor.blur();
    if (e.key === "Escape") renderSidebar();
  });
}

// --- Theme & accent -------------------------------------------------------
function applyTheme(theme) {
  document.body.dataset.theme = theme;
}
function applyAccent(color) {
  if (color) {
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--user-bubble", color);
  } else {
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--user-bubble");
  }
}
// Header button cycles through the available themes for quick switching.
themeToggleBtn.addEventListener("click", () => {
  const ids = THEMES.map((t) => t.id);
  const idx = ids.indexOf(settings.theme);
  settings.theme = ids[(idx + 1) % ids.length];
  applyTheme(settings.theme);
  localStorage.setItem(THEME_KEY, settings.theme);
  saveSettings();
  if (themeSelect) themeSelect.value = settings.theme;
});

function populateThemeControls() {
  themeSelect.innerHTML = "";
  for (const t of THEMES) {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.label;
    themeSelect.appendChild(o);
  }
  themeSelect.addEventListener("change", () => {
    settings.theme = themeSelect.value;
    applyTheme(settings.theme);
    localStorage.setItem(THEME_KEY, settings.theme);
    saveSettings();
  });

  accentRow.innerHTML = "";
  const mkSwatch = (color, isDefault) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "accent-swatch" + (isDefault ? " default" : "");
    if (!isDefault) b.style.background = color;
    b.title = isDefault ? "Theme default" : color;
    b.addEventListener("click", () => {
      settings.accent = isDefault ? "" : color;
      applyAccent(settings.accent);
      saveSettings();
      markSelectedAccent();
    });
    accentRow.appendChild(b);
  };
  mkSwatch("", true);
  ACCENTS.forEach((c) => mkSwatch(c, false));
}
function markSelectedAccent() {
  const swatches = accentRow.querySelectorAll(".accent-swatch");
  swatches.forEach((s) => s.classList.remove("selected"));
  if (!settings.accent) {
    swatches[0]?.classList.add("selected");
  } else {
    const idx = ACCENTS.indexOf(settings.accent);
    if (idx >= 0) swatches[idx + 1]?.classList.add("selected");
  }
}

// --- Sidebar toggle / new chat / search -----------------------------------
function isMobile() {
  return window.matchMedia("(max-width: 960px)").matches;
}
function openMobileSidebar() {
  sidebar.classList.add("open");
  sidebarBackdrop.classList.remove("hidden");
}
function closeMobileSidebar() {
  sidebar.classList.remove("open");
  sidebarBackdrop.classList.add("hidden");
}
toggleSidebarBtn.addEventListener("click", () => {
  if (isMobile()) {
    if (sidebar.classList.contains("open")) closeMobileSidebar();
    else openMobileSidebar();
  } else {
    appEl.classList.toggle("sidebar-collapsed");
  }
});
sidebarBackdrop.addEventListener("click", closeMobileSidebar);
newConvoBtn.addEventListener("click", () => {
  if (isGenerating && currentController) currentController.abort();
  newConversation();
  renderSidebar();
  renderConversation();
  if (isMobile()) closeMobileSidebar();
  input.focus();
});
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.toLowerCase().trim();
  renderSidebar();
});

// --- Export ---------------------------------------------------------------
function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function exportConversation(format) {
  if (format === "all") {
    const stamp = new Date().toISOString().slice(0, 10);
    const backup = {
      type: "ai-chatbot-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      count: conversations.length,
      conversations,
    };
    download(
      `ai-chat-backup-${stamp}.json`,
      JSON.stringify(backup, null, 2),
      "application/json"
    );
    showToast(`Exported all ${conversations.length} chats`);
    return;
  }
  const convo = getActive();
  const safe = (convo.title || "chat").replace(/[^a-z0-9-_]+/gi, "_");
  if (format === "json") {
    download(`${safe}.json`, JSON.stringify(convo, null, 2), "application/json");
  } else if (format === "txt") {
    const body = convo.messages
      .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.display || m.content}`)
      .join("\n\n");
    download(`${safe}.txt`, body, "text/plain");
  } else {
    const body =
      `# ${convo.title}\n\n` +
      convo.messages
        .map(
          (m) =>
            `**${m.role === "user" ? "You" : "Assistant"}:**\n\n${m.display || m.content}`
        )
        .join("\n\n---\n\n");
    download(`${safe}.md`, body, "text/markdown");
  }
}
exportBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle("hidden");
});
exportMenu.querySelectorAll("button").forEach((b) =>
  b.addEventListener("click", () => {
    exportConversation(b.dataset.format);
    exportMenu.classList.add("hidden");
  })
);
document.addEventListener("click", () => exportMenu.classList.add("hidden"));

// --- Settings -------------------------------------------------------------
function populatePresets() {
  presetSelect.innerHTML = "";
  for (const name of Object.keys(PRESETS)) {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    presetSelect.appendChild(o);
  }
  const custom = document.createElement("option");
  custom.value = "Custom";
  custom.textContent = "Custom";
  presetSelect.appendChild(custom);
}
async function openSettings() {
  presetSelect.value = settings.preset || "Default assistant";
  systemPromptInput.value = settings.systemPrompt || "";
  systemPromptInput.placeholder = PRESETS["Default assistant"];
  temperatureInput.value = String(settings.temperature ?? 0.7);
  tempValueEl.textContent = temperatureInput.value;
  maxLengthSelect.value = String(settings.maxTokens ?? 512);
  themeSelect.value = settings.theme || "dark";
  markSelectedAccent();
  autoScrollInput.checked = settings.autoScroll !== false;
  readAloudInput.checked = !!settings.readAloud;
  translateToEnglishInput.checked = !!settings.translateToEnglish;
  showTranslationInput.checked = settings.showTranslation !== false;
  if (replyInUserLanguageInput) {
    replyInUserLanguageInput.checked = !!settings.replyInUserLanguage;
  }
  translateForSpeechInput.checked = !!settings.translateForSpeech;
  if (voiceSearchInput) voiceSearchInput.value = voiceSearchQuery;
  window.speechSynthesis?.getVoices();
  await loadGoogleVoices();
  populateTranslateSourceOptions();
  updateTranslationControlsState();
  renderSpeechModeChips();
  populateVoices();
  speechRateInput.value = String(settings.speechRate || 1);
  rateValueEl.textContent = Number(settings.speechRate || 1).toFixed(1);
  settingsModal.classList.remove("hidden");
}
function closeSettings() {
  settingsModal.classList.add("hidden");
}
openSettingsBtn.addEventListener("click", openSettings);
presetSelect.addEventListener("change", () => {
  if (presetSelect.value !== "Custom") {
    systemPromptInput.value = PRESETS[presetSelect.value] || "";
  }
});
systemPromptInput.addEventListener("input", () => {
  presetSelect.value = "Custom";
});
temperatureInput.addEventListener("input", () => {
  tempValueEl.textContent = temperatureInput.value;
});
speechRateInput.addEventListener("input", () => {
  rateValueEl.textContent = Number(speechRateInput.value).toFixed(1);
});
if (window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", populateVoices);
}
if (voiceSearchInput) {
  voiceSearchInput.addEventListener("input", () => {
    voiceSearchQuery = voiceSearchInput.value.toLowerCase().trim();
    populateVoices();
  });
}
if (speechModeLangSearchInput) {
  speechModeLangSearchInput.addEventListener("input", () => {
    renderLanguageModeChips(speechModeLangSearchInput.value);
  });
}
if (translateToEnglishInput) {
  translateToEnglishInput.addEventListener(
    "change",
    updateTranslateSourceRowVisibility
  );
}
if (voiceSelect) {
  voiceSelect.addEventListener("change", () => {
    syncSettingsWithVoiceSelection();
    settings.voiceName = voiceSelect.value;
    updateRecognitionLang();
  });
}
saveSettingsBtn.addEventListener("click", () => {
  settings.preset = presetSelect.value;
  settings.systemPrompt = systemPromptInput.value.trim();
  settings.temperature = parseFloat(temperatureInput.value);
  settings.maxTokens = parseInt(maxLengthSelect.value, 10) || 0;
  settings.autoScroll = autoScrollInput.checked;
  settings.readAloud = readAloudInput.checked;
  settings.translateToEnglish = translateToEnglishInput.checked;
  settings.translateSourceLang = translateSourceLangSelect?.value || "";
  settings.showTranslation = showTranslationInput.checked;
  settings.replyInUserLanguage = replyInUserLanguageInput?.checked || false;
  settings.translateForSpeech = translateForSpeechInput.checked;
  settings.voiceName = voiceSelect.value;
  settings.speechRate = parseFloat(speechRateInput.value) || 1;
  saveSettings();
  updateRecognitionLang();
  closeSettings();
});
resetSettingsBtn.addEventListener("click", () => {
  presetSelect.value = "Default assistant";
  systemPromptInput.value = "";
  temperatureInput.value = "0.7";
  tempValueEl.textContent = "0.7";
  maxLengthSelect.value = "512";
  themeSelect.value = "dark";
  autoScrollInput.checked = true;
  readAloudInput.checked = false;
  translateToEnglishInput.checked = false;
  settings.translateSourceLang = "";
  populateTranslateSourceOptions();
  updateTranslationControlsState();
  showTranslationInput.checked = true;
  if (replyInUserLanguageInput) replyInUserLanguageInput.checked = false;
  translateForSpeechInput.checked = false;
  voiceSelect.value = "";
  speechRateInput.value = "1";
  rateValueEl.textContent = "1.0";
  settings.accent = "";
  applyAccent("");
  applyTheme("dark");
  settings.theme = "dark";
  localStorage.setItem(THEME_KEY, "dark");
  markSelectedAccent();
});
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeSettings();
});

// --- Model picker ---------------------------------------------------------
async function loadModels() {
  try {
    const res = await fetch("/api/models");
    const data = await res.json();
    modelPicker.innerHTML = "";
    if (data.noModelsInstalled) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No model — run ollama pull";
      modelPicker.appendChild(opt);
      modelPicker.disabled = true;
      showToast(
        `Install the AI model: ollama pull ${data.configuredModel || "llama3.2:1b"}`
      );
      return;
    }
    for (const m of data.models) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      modelPicker.appendChild(opt);
    }
    const desired = settings.model || data.current;
    if (data.models.includes(desired)) modelPicker.value = desired;
    else if (data.current) modelPicker.value = data.current;
    settings.model = modelPicker.value;
    if (data.modelMissing && data.configuredModel) {
      showToast(`Model ${data.configuredModel} missing — using ${data.current}`);
    }
    if (data.provider === "offline") modelPicker.disabled = true;
  } catch {
    modelPicker.innerHTML = "<option>default</option>";
  }
}
modelPicker.addEventListener("change", () => {
  settings.model = modelPicker.value;
  saveSettings();
});

// --- File upload ----------------------------------------------------------
const ATTACH_MAX = 30000;
const ATTACH_MAX_BYTES = 15 * 1024 * 1024;

async function extractAttachmentText(file) {
  const form = new FormData();
  form.append("file", file);
  let res;
  try {
    res = await fetch("/api/attach/extract", { method: "POST", body: form });
  } catch {
    throw new Error("Could not reach the server — is it still running?");
  }
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    /* non-JSON body (e.g. old server HTML 404 page) */
  }
  if (!res.ok) {
    if (data.error) throw new Error(data.error);
    if (res.status === 404) {
      throw new Error(
        "File reading is not available on this server — stop it and run npm start again"
      );
    }
    throw new Error(`Could not read file (server error ${res.status})`);
  }
  return data.text || "";
}

function setAttachment(name, content) {
  if (content.length > ATTACH_MAX)
    content = content.slice(0, ATTACH_MAX) + "\n...[truncated]";
  pendingAttachment = { name, content };
  attachmentNameEl.textContent = "\u{1F4CE} " + name;
  attachmentEl.classList.remove("hidden");
}

attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const f = fileInput.files[0];
  fileInput.value = "";
  if (!f) return;
  if (f.size > ATTACH_MAX_BYTES) {
    showToast("File too large (max 15 MB)");
    return;
  }
  attachmentNameEl.textContent = "\u{1F4CE} Reading " + f.name + "...";
  attachmentEl.classList.remove("hidden");
  try {
    const text = await extractAttachmentText(f);
    if (!text.trim()) {
      showToast("No readable text found in that file");
      clearAttachment();
      return;
    }
    setAttachment(f.name, text);
    showToast("File loaded");
  } catch (err) {
    showToast(err.message || "Could not read file");
    clearAttachment();
  }
});
function clearAttachment() {
  pendingAttachment = null;
  attachmentNameEl.textContent = "";
  attachmentEl.classList.add("hidden");
}
attachmentRemoveBtn.addEventListener("click", clearAttachment);

// --- Voice input ----------------------------------------------------------
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.addEventListener("result", (e) => {
    input.value = e.results[0][0].transcript;
    input.dispatchEvent(new Event("input"));
  });
  recognition.addEventListener("end", () => {
    listening = false;
    micBtn.classList.remove("listening");
    if (input.value.trim()) form.requestSubmit();
  });
  recognition.addEventListener("error", () => {
    listening = false;
    micBtn.classList.remove("listening");
  });
  micBtn.addEventListener("click", () => {
    if (listening) {
      recognition.stop();
      return;
    }
    updateRecognitionLang();
    try {
      recognition.start();
      listening = true;
      micBtn.classList.add("listening");
    } catch {
      /* already started */
    }
  });
} else {
  micBtn.style.display = "none";
}

// --- Read aloud -----------------------------------------------------------
function applyVoiceSettings(utter) {
  utter.rate = settings.speechRate || 1;
  if (settings.voiceName && window.speechSynthesis) {
    const v = window.speechSynthesis
      .getVoices()
      .find((x) => x.name === settings.voiceName);
    if (v) {
      try {
        utter.voice = v;
        utter.lang = v.lang || utter.lang;
      } catch {
        /* ignore unsupported voice objects */
      }
    }
  }
}
function stopAllSpeech() {
  window.speechSynthesis?.cancel();
  if (speakingAudio) {
    speakingAudio.pause();
    speakingAudio = null;
  }
}

async function loadGoogleVoices() {
  try {
    const res = await fetch("/api/speech/voices");
    const data = await res.json();
    googleCatalogOnline = !!data.googleEnabled;
    googleVoices = data.googleEnabled ? data.googleVoices || [] : [];
    googleEnglishAccentGroups = data.englishAccentGroups || [];
    googlePunjabiGroup = data.punjabiGroup || null;
    googleVoiceGroups = data.voiceGroups || [];
    googleTranslateEnabled = !!data.translateEnabled;
    googleVoiceCount = data.voiceCount || googleVoices.length;
    googleLanguageCount =
      data.languageCount ||
      googleEnglishAccentGroups.length + googleVoiceGroups.length;
    if (data.error) showToast("Google voices: " + data.error);
    populateTranslateSourceOptions();
    updateRecognitionLang();
    renderSpeechModeChips();
    updateGoogleSpeechPipelineHint();
  } catch {
    googleCatalogOnline = false;
    googleVoices = [];
    googleEnglishAccentGroups = [];
    googlePunjabiGroup = null;
    googleVoiceGroups = [];
    googleTranslateEnabled = false;
    googleVoiceCount = 0;
    googleLanguageCount = 0;
  }
}

async function translateText(text, target, source) {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target, source }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Translation failed");
  return data;
}

function langBase(code) {
  return (code || "").split("-")[0].toLowerCase();
}

function updateTranslateSourceRowVisibility() {
  if (!translateSourceRow) return;
  const show = !!translateToEnglishInput?.checked;
  translateSourceRow.classList.toggle("hidden", !show);
}

function updateTranslationOptionsHint() {
  if (!translationOptionsHint) return;
  if (!googleTranslateEnabled) {
    translationOptionsHint.classList.remove("hidden");
    translationOptionsHint.textContent = googleVoicesSetupHint();
  } else {
    translationOptionsHint.classList.add("hidden");
    translationOptionsHint.textContent = "";
  }
}

function updateTranslationControlsState() {
  updateTranslateSourceRowVisibility();
  updateTranslationOptionsHint();
}

function collectGoogleLangCodes() {
  const codes = new Set();
  for (const v of googleVoices) {
    const base = langBase(v.lang);
    if (base && base !== "en") codes.add(base);
  }
  if (googlePunjabiGroup?.langCode) {
    codes.add(langBase(googlePunjabiGroup.langCode));
  }
  for (const g of googleVoiceGroups) {
    const base = langBase(g.langCode);
    if (base && base !== "en") codes.add(base);
  }
  return codes;
}

function populateTranslateSourceOptions() {
  if (!translateSourceLangSelect) return;
  const seen = new Set();
  const options = [];
  for (const item of TRANSLATE_SOURCE_PRESETS) {
    const base = langBase(item.code);
    if (item.code && seen.has(base)) continue;
    if (item.code) seen.add(base);
    options.push(item);
  }
  for (const base of collectGoogleLangCodes()) {
    if (seen.has(base)) continue;
    seen.add(base);
    options.push({
      code: base,
      label: `${languageLabel(base)} → English only`,
    });
  }
  const saved = settings.translateSourceLang || "";
  translateSourceLangSelect.innerHTML = "";
  for (const item of options) {
    const o = document.createElement("option");
    o.value = item.code;
    o.textContent = item.label;
    translateSourceLangSelect.appendChild(o);
  }
  if ([...translateSourceLangSelect.options].some((o) => o.value === saved)) {
    translateSourceLangSelect.value = saved;
  } else {
    translateSourceLangSelect.value = "";
  }
}

function formatDetectedLanguageLabel(code) {
  if (!code) return "";
  const base = langBase(code);
  const label = languageLabel(base);
  const region = code.includes("-") ? code.split("-")[1] : "";
  if (region && label && label !== code) {
    return `${label} (${region})`;
  }
  return label || code;
}

async function translateUserMessageToEnglish(text) {
  if (!text || !settings.translateToEnglish || !googleTranslateEnabled) {
    return { translation: null, detected: null };
  }
  const sourceFilter = settings.translateSourceLang || "";
  try {
    const data = await translateText(
      text,
      "en",
      sourceFilter || undefined
    );
    const detected = data.detectedSourceLanguage || null;
    const detectedBase = langBase(detected);
    if (!data.translatedText || data.translatedText === text) {
      return { translation: null, detected };
    }
    if (sourceFilter) {
      const want = langBase(sourceFilter);
      if (detectedBase && detectedBase !== want) {
        return { translation: null, detected };
      }
    } else if (detectedBase === "en") {
      return { translation: null, detected };
    }
    return { translation: data.translatedText, detected };
  } catch (err) {
    showToast(err.message || "Translation failed — sending original text");
    return { translation: null, detected: null };
  }
}

function syncSettingsWithVoiceSelection() {
  const lang = voiceLangFromName(voiceSelect?.value ?? settings.voiceName);
  const base = langBase(lang);
  if (!base || base === "en") return;
  if (readAloudInput) readAloudInput.checked = true;
  if (translateForSpeechInput) translateForSpeechInput.checked = true;
  if (translateSourceLangSelect && translateToEnglishInput?.checked) {
    const match = [...translateSourceLangSelect.options].some(
      (o) => o.value === base
    );
    if (match) translateSourceLangSelect.value = base;
  }
}

function voiceLangFromName(voiceName) {
  if (voiceName?.startsWith("google:")) {
    const id = voiceName.slice(7);
    const v = googleVoices.find((x) => x.id === id);
    return v?.lang || "";
  }
  if (voiceName && window.speechSynthesis) {
    const v = window.speechSynthesis
      .getVoices()
      .find((x) => x.name === voiceName);
    return v?.lang || "";
  }
  return "";
}

function getSelectedVoiceLang() {
  return voiceLangFromName(settings.voiceName);
}

/** Speech recognition locale — follows voice or translate-source language. */
function recognitionLangForSettings() {
  const voiceLang = getSelectedVoiceLang();
  if (voiceLang) return voiceLang;
  const source = settings.translateSourceLang || "";
  if (source) {
    const base = langBase(source);
    const fromVoice = googleVoices.find((v) => langBase(v.lang) === base);
    if (fromVoice?.lang) return fromVoice.lang;
    const fromGroup = googleVoiceGroups.find((g) => langBase(g.langCode) === base);
    if (fromGroup?.langCode) return fromGroup.langCode;
    if (source.includes("-")) return source;
    return base;
  }
  return "en-US";
}

function updateRecognitionLang() {
  if (!recognition) return;
  recognition.lang = recognitionLangForSettings();
}

function speechTranslateTarget(lang) {
  if (!lang) return null;
  const base = lang.split("-")[0].toLowerCase();
  if (base === "en") return null;
  return base;
}

function replyTranslateTarget() {
  const fromVoice = speechTranslateTarget(getSelectedVoiceLang());
  if (fromVoice) return fromVoice;
  const source = settings.translateSourceLang || "";
  if (source && langBase(source) !== "en") return langBase(source);
  return null;
}

async function prepareSpeechText(text) {
  let plain = toPlainText(text || "").trim();
  if (!plain) return "";
  const target = speechTranslateTarget(getSelectedVoiceLang());
  if (
    settings.replyInUserLanguage &&
    target &&
    googleTranslateEnabled
  ) {
    return plain;
  }
  if (
    settings.translateForSpeech &&
    target &&
    googleTranslateEnabled
  ) {
    try {
      const data = await translateText(plain, target, "en");
      if (!data.translatedText) return plain;
      const detected = langBase(data.detectedSourceLanguage);
      if (detected && detected !== "en") return plain;
      return data.translatedText;
    } catch {
      /* speak original text if translation fails */
    }
  }
  return plain;
}

function languageLabel(langCode) {
  if (!langCode) return "";
  const base = langCode.split("-")[0];
  try {
    return clientLangNames?.of(base) || langCode;
  } catch {
    return langCode;
  }
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPunjabiLangCode(langCode) {
  const l = (langCode || "").toLowerCase();
  return l === "pa" || l.startsWith("pa-");
}

function englishAccentChipLabel(langCode) {
  const short = ENGLISH_ACCENT_SHORT[langCode];
  if (short) return `English (${short})`;
  const region = ENGLISH_ACCENT_LABELS[langCode];
  return region ? `English (${region})` : langCode;
}

function buildEnglishAccentMatch(langCode) {
  const region = ENGLISH_ACCENT_LABELS[langCode] || "";
  const parts = [langCode, region, "english"].filter(Boolean);
  return new RegExp(parts.map(escapeRegex).join("|"), "i");
}

function buildLangMatch(langCode, label) {
  const parts = [langCode, label];
  const base = langBase(langCode);
  if (base) parts.push(base);
  parts.push(languageLabel(langCode));
  if (isPunjabiLangCode(langCode)) {
    parts.push("punjabi", "panjabi", "pa-in", "pa");
  }
  const unique = [...new Set(parts.filter(Boolean))];
  return new RegExp(unique.map(escapeRegex).join("|"), "i");
}

function collectGoogleLanguageGroups() {
  const groups = [];
  if (googlePunjabiGroup?.voices?.length) {
    groups.push({
      langCode: googlePunjabiGroup.langCode || "pa-IN",
      label: "Punjabi",
      voices: googlePunjabiGroup.voices,
    });
  }
  for (const g of googleVoiceGroups) groups.push(g);
  return groups;
}

function findGoogleLanguageGroup(groups, langCode) {
  const base = langBase(langCode);
  return groups.find(
    (g) => g.langCode === langCode || langBase(g.langCode) === base
  );
}

function speechModeLanguageLabel(langCode, fallbackLabel) {
  const clean = (fallbackLabel || "").replace(/^Google — /, "").trim();
  if (clean && clean !== langCode && !/^[a-z]{2}(-[A-Za-z0-9]+)?$/i.test(clean)) {
    return clean;
  }
  const parts = (langCode || "").split("-");
  const baseName = languageLabel(parts[0]);
  const region = parts[1];
  return region ? `${baseName} (${region})` : baseName;
}

function googleVoiceId(v) {
  return v?.id ? `google:${v.id}` : "";
}

function pickGoogleVoiceIdForGender(group, gender) {
  if (!group) return "";
  if (gender === "female" && group.femaleVoiceId) {
    return `google:${group.femaleVoiceId}`;
  }
  if (gender === "male" && group.maleVoiceId) {
    return `google:${group.maleVoiceId}`;
  }
  const voices = group.voices || [];
  const match = voices.find((v) => v.gender === gender);
  if (match) return googleVoiceId(match);
  return googleVoiceId(voices[0]);
}

function buildNonEnglishSpeechMode(entry, googleGroup, opts = {}) {
  const label = speechModeLanguageLabel(
    entry.langCode,
    entry.label || googleGroup?.label
  );
  const cleanLabel = label;
  const genderSuffix = opts.gender === "female" ? " — female" : opts.gender === "male" ? " — male" : "";
  const displayLabel = genderSuffix ? `${cleanLabel}${genderSuffix}` : cleanLabel;
  let voiceIds = [];
  if (opts.gender && googleGroup) {
    const id = pickGoogleVoiceIdForGender(googleGroup, opts.gender);
    if (id) voiceIds.push(id);
  }
  if (!voiceIds.length) {
    voiceIds = (googleGroup?.voices || []).map((v) => googleVoiceId(v)).filter(Boolean);
  }
  if (entry.preferredVoiceIds?.length) {
    for (const id of entry.preferredVoiceIds) {
      if (!voiceIds.includes(id)) voiceIds.push(id);
    }
  }
  return {
    label: displayLabel,
    search: `${cleanLabel} ${opts.gender || ""}`.trim(),
    match: buildLangMatch(entry.langCode, cleanLabel),
    langCode: entry.langCode,
    isEnglish: false,
    voiceIds,
    gender: opts.gender || "",
    region: entry.region || "",
  };
}

function expandLanguageModesFromGroup(g, preset) {
  const entry = {
    langCode: g.langCode,
    label: g.label,
    preferredVoiceIds: preset?.preferredVoiceIds,
    region: preset?.region || "",
  };
  if (!googleCatalogOnline) {
    return [buildNonEnglishSpeechMode(entry, g)];
  }
  const femaleId = g.femaleVoiceId || g.voices?.find((v) => v.gender === "female")?.id;
  const maleId = g.maleVoiceId || g.voices?.find((v) => v.gender === "male")?.id;
  if (femaleId && maleId) {
    return [
      buildNonEnglishSpeechMode(entry, g, { gender: "female" }),
      buildNonEnglishSpeechMode(entry, g, { gender: "male" }),
    ];
  }
  return [buildNonEnglishSpeechMode(entry, g)];
}

function buildSpeechModeCatalog() {
  const englishModes = [];
  const languageModes = [];
  const seenEnglish = new Set();

  const addEnglish = (langCode) => {
    if (!langCode || seenEnglish.has(langCode)) return;
    seenEnglish.add(langCode);
    const search = ENGLISH_ACCENT_LABELS[langCode] || langCode;
    englishModes.push({
      label: englishAccentChipLabel(langCode),
      search,
      match: buildEnglishAccentMatch(langCode),
      langCode,
      isEnglish: true,
      voiceIds: [],
    });
  };

  for (const g of googleEnglishAccentGroups) addEnglish(g.langCode);
  if (!googleEnglishAccentGroups.length) {
    for (const langCode of Object.keys(ENGLISH_ACCENT_LABELS)) addEnglish(langCode);
  }
  englishModes.sort((a, b) => a.label.localeCompare(b.label));

  const hasGoogleCatalog =
    googleVoices.length > 0 || collectGoogleLanguageGroups().length > 0;

  if (hasGoogleCatalog) {
    const seenCodes = new Set();
    const googleOther = collectGoogleLanguageGroups();

    for (const g of googleOther) {
      if (langBase(g.langCode) === "en" || seenCodes.has(g.langCode)) continue;
      seenCodes.add(g.langCode);
      const preset = LANGUAGE_QUICK_SETUP.find(
        (e) =>
          e.langCode === g.langCode || langBase(e.langCode) === langBase(g.langCode)
      );
      for (const mode of expandLanguageModesFromGroup(g, preset)) {
        languageModes.push(mode);
      }
    }

    for (const v of googleVoices) {
      const lang = v.lang;
      if (!lang || langBase(lang) === "en" || seenCodes.has(lang)) continue;
      seenCodes.add(lang);
      const voices = googleVoices.filter((x) => x.lang === lang);
      const preset = quickSetupEntryForLang(lang);
      const group = { langCode: lang, label: preset?.label || "", voices };
      for (const mode of expandLanguageModesFromGroup(group, preset)) {
        languageModes.push(mode);
      }
    }
  } else {
    for (const entry of LANGUAGE_QUICK_SETUP) {
      languageModes.push(
        buildNonEnglishSpeechMode(
          entry,
          findGoogleLanguageGroup(collectGoogleLanguageGroups(), entry.langCode)
        )
      );
    }
  }

  languageModes.sort((a, b) => a.label.localeCompare(b.label));
  return { englishModes, languageModes };
}

function languageModeMatchesFilter(mode, query) {
  if (!query) return true;
  const haystack = `${mode.label} ${mode.langCode} ${mode.search}`.toLowerCase();
  return haystack.includes(query);
}

function updateGoogleSpeechPipelineHint() {
  if (!googleSpeechPipelineHint) return;
  if (googleTranslateEnabled && googleCatalogOnline) {
    googleSpeechPipelineHint.classList.remove("hidden");
    googleSpeechPipelineHint.textContent =
      "Google active: type your language → English for the AI → turn on “Show AI replies in my language” " +
      "to read replies in your language (or use read-aloud with voice translation).";
  } else {
    googleSpeechPipelineHint.classList.add("hidden");
    googleSpeechPipelineHint.textContent = "";
  }
}

function updateSpeechModeLabels() {
  updateGoogleSpeechPipelineHint();
  if (speechModeEnglishHint) {
    speechModeEnglishHint.textContent =
      "English only — turns translation off and picks an English accent voice.";
  }
  const count = cachedLanguageModes.length;
  if (speechModeLanguagesTitle) {
    speechModeLanguagesTitle.textContent = googleCatalogOnline
      ? `Quick setup — Google languages (${count})`
      : `Quick setup — languages (${count} popular)`;
  }
  if (speechModeLanguagesHint) {
    speechModeLanguagesHint.textContent = googleCatalogOnline
      ? "Pick female or male for a language, then Save — you speak that language, the AI gets English, replies appear in your language when enabled below."
      : `Pick a language to set translation and read-aloud options. ${googleVoicesSetupHint()}`;
  }
  if (speechModeGoogleStatus) {
    speechModeGoogleStatus.classList.remove("hidden", "online", "offline");
    speechModeGoogleStatus.textContent = googleCatalogOnline
      ? "Google online"
      : "Setup only";
    speechModeGoogleStatus.classList.add(
      googleCatalogOnline ? "online" : "offline"
    );
  }
}

function appendLanguageModeChip(parent, mode) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip speech-mode-chip";
  btn.textContent = mode.label;
  btn.addEventListener("click", () => applySpeechMode(mode));
  parent.appendChild(btn);
}

function renderLanguageModeChips(query = "") {
  if (!speechModeLanguagesEl) return;
  speechModeLanguagesEl.innerHTML = "";
  const q = query.toLowerCase().trim();
  const filtered = cachedLanguageModes.filter((mode) =>
    languageModeMatchesFilter(mode, q)
  );
  let shown = 0;
  const useRegions = !q && filtered.some((m) => m.region);

  if (useRegions) {
    for (const reg of LANGUAGE_QUICK_SETUP_REGIONS) {
      const modes = sortLanguageModesInRegion(
        filtered.filter((m) => m.region === reg.id)
      );
      if (!modes.length) continue;
      const heading = document.createElement("div");
      heading.className = "speech-mode-region-label";
      heading.textContent = reg.label;
      speechModeLanguagesEl.appendChild(heading);
      for (const mode of modes) {
        appendLanguageModeChip(speechModeLanguagesEl, mode);
        shown++;
      }
    }
    const other = sortLanguageModesInRegion(
      filtered.filter(
        (m) =>
          !m.region || !LANGUAGE_QUICK_SETUP_REGIONS.some((r) => r.id === m.region)
      )
    );
    if (other.length) {
      const heading = document.createElement("div");
      heading.className = "speech-mode-region-label";
      heading.textContent = googleCatalogOnline
        ? "More Google languages"
        : "More languages";
      speechModeLanguagesEl.appendChild(heading);
      for (const mode of other) {
        appendLanguageModeChip(speechModeLanguagesEl, mode);
        shown++;
      }
    }
  } else {
    for (const mode of filtered) {
      appendLanguageModeChip(speechModeLanguagesEl, mode);
      shown++;
    }
  }
  if (!shown && cachedLanguageModes.length) {
    const empty = document.createElement("span");
    empty.className = "voice-hint";
    empty.textContent = "No languages match your filter.";
    speechModeLanguagesEl.appendChild(empty);
  }
}

function renderSpeechModeChips() {
  if (!speechModeEnglishEl || !speechModeLanguagesEl) return;
  speechModeEnglishEl.innerHTML = "";
  const { englishModes, languageModes } = buildSpeechModeCatalog();
  cachedLanguageModes = languageModes;
  const addChip = (parent, mode) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip speech-mode-chip";
    btn.textContent = mode.label;
    btn.addEventListener("click", () => applySpeechMode(mode));
    parent.appendChild(btn);
  };
  for (const mode of englishModes) addChip(speechModeEnglishEl, mode);
  const filterQuery = speechModeLangSearchInput?.value || "";
  renderLanguageModeChips(filterQuery);
  updateSpeechModeLabels();
}

function pickVoiceForMode(mode) {
  if (!voiceSelect) return false;
  const options = [...voiceSelect.options];

  if (mode.voiceIds?.length) {
    for (const id of mode.voiceIds) {
      const opt = options.find((o) => o.value === id);
      if (opt && !opt.disabled) {
        voiceSelect.value = id;
        return true;
      }
    }
  }

  const matched = options.find(
    (o) => o.value && !o.disabled && mode.match.test(o.textContent)
  );
  if (matched) {
    voiceSelect.value = matched.value;
    return true;
  }

  if (mode.isEnglish) {
    const anyEn = options.find(
      (o) => o.value && !o.disabled && /english/i.test(o.textContent)
    );
    if (anyEn) {
      voiceSelect.value = anyEn.value;
      return true;
    }
  }

  voiceSelect.value = "";
  return false;
}

function applySpeechMode(mode) {
  if (mode.isEnglish) {
    if (translateToEnglishInput) translateToEnglishInput.checked = false;
    if (showTranslationInput) showTranslationInput.checked = false;
    if (translateForSpeechInput) translateForSpeechInput.checked = false;
    if (replyInUserLanguageInput) replyInUserLanguageInput.checked = false;
    if (translateSourceLangSelect) translateSourceLangSelect.value = "";
  } else {
    if (readAloudInput) readAloudInput.checked = true;
    if (translateToEnglishInput) translateToEnglishInput.checked = true;
    if (showTranslationInput) showTranslationInput.checked = true;
    if (replyInUserLanguageInput) replyInUserLanguageInput.checked = true;
    if (translateForSpeechInput) translateForSpeechInput.checked = true;
    if (translateSourceLangSelect) {
      const base = langBase(mode.langCode);
      const match = [...translateSourceLangSelect.options].some(
        (o) => o.value === base
      );
      translateSourceLangSelect.value = match ? base : "";
    }
  }
  updateTranslateSourceRowVisibility();
  if (voiceSearchInput) {
    voiceSearchInput.value = mode.search;
    voiceSearchQuery = mode.search.toLowerCase();
  }
  populateVoices();
  const voiceOk = pickVoiceForMode(mode);
  if (voiceSelect?.value) settings.voiceName = voiceSelect.value;
  updateRecognitionLang();
  if (mode.isEnglish) {
    showToast(
      voiceOk
        ? `${mode.label}: English only (translation off) — click Save`
        : `${mode.label}: translation off — pick a voice below, then Save`
    );
    return;
  }
  if (voiceOk && googleTranslateEnabled) {
    showToast(
      `${mode.label}: translate + speak on — type in ${mode.label}, AI gets English — click Save`
    );
  } else if (!googleTranslateEnabled) {
    showToast(`${mode.label}: preset saved — click Save`);
  } else {
    showToast(
      `${mode.label}: translate on — pick a matching voice below, then Save`
    );
  }
}

function voiceSearchTerms(q) {
  const terms = [q];
  const lower = q.toLowerCase().trim();
  if (
    lower.includes("punjabi") ||
    lower.includes("panjabi") ||
    lower === "pa" ||
    lower.startsWith("pa-")
  ) {
    terms.push("punjabi", "panjabi", "pa-in", "pa");
  }
  for (const entry of LANGUAGE_QUICK_SETUP) {
    const label = entry.label.toLowerCase();
    const code = entry.langCode.toLowerCase();
    const base = langBase(entry.langCode);
    if (
      lower.includes(label) ||
      lower === base ||
      lower === code ||
      lower.startsWith(base + "-")
    ) {
      terms.push(entry.label, entry.langCode, base, languageLabel(base));
    }
  }
  for (const [code, region] of Object.entries(ENGLISH_ACCENT_LABELS)) {
    if (
      lower.includes(region.toLowerCase()) ||
      lower.includes(code.toLowerCase()) ||
      lower === "english"
    ) {
      terms.push(region, code, "english", "en");
    }
  }
  return [...new Set(terms.filter(Boolean))];
}

function voiceSearchNoMatchHint(query) {
  const q = query.trim();
  const langEntry = LANGUAGE_QUICK_SETUP.find(
    (e) =>
      e.label.toLowerCase().includes(q.toLowerCase()) ||
      q.toLowerCase().includes(e.label.toLowerCase()) ||
      q.toLowerCase() === langBase(e.langCode)
  );
  if (langEntry) {
    const code = langEntry.langCode;
    if (!googleVoices.length) {
      return (
        `No ${langEntry.label} voice is installed in your browser. Click the ` +
        `${langEntry.label} chip under Quick setup — languages (above), then Save. ` +
        googleVoicesSetupHint()
      );
    }
    return (
      `No Google/browser voice matched "${q}". Try ${code} in the filter, or click the ` +
      `${langEntry.label} chip under Quick setup — languages above.`
    );
  }
  if (!googleVoices.length) {
    return (
      `No voices matched "${q}". This box only lists browser voices on your PC. ` +
      `For language presets, use Quick setup — languages above. ${googleVoicesSetupHint()}`
    );
  }
  return (
    `No voices matched "${q}". Try a language name (Tamil, Hindi), accent ` +
    `(United Kingdom), or code (ta-IN, hi-IN). Or pick a Quick setup chip above.`
  );
}

function matchesVoiceFilter(q, parts) {
  if (!q) return true;
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return voiceSearchTerms(q).some((term) => haystack.includes(term.toLowerCase()));
}

function addVoiceGroup(label, voices, valueFn, labelFn) {
  if (!voices.length) return 0;
  const group = document.createElement("optgroup");
  group.label = label;
  voices.forEach((v) => {
    const o = document.createElement("option");
    o.value = valueFn(v);
    o.textContent = labelFn(v);
    group.appendChild(o);
  });
  voiceSelect.appendChild(group);
  return voices.length;
}

function groupBrowserVoices(browserVoices) {
  const enByAccent = new Map();
  const otherByLang = new Map();
  for (const v of browserVoices) {
    const lang = (v.lang || "").trim();
    const base = lang.split("-")[0].toLowerCase();
    if (base === "en") {
      const accent = ENGLISH_ACCENT_LABELS[lang] || lang;
      const label = `English — ${accent} (browser)`;
      if (!enByAccent.has(label)) enByAccent.set(label, []);
      enByAccent.get(label).push(v);
    } else {
      const label = `${languageLabel(lang)} (browser)`;
      if (!otherByLang.has(label)) otherByLang.set(label, []);
      otherByLang.get(label).push(v);
    }
  }
  const groups = [];
  for (const [label, voices] of enByAccent) {
    groups.push({ label, voices, kind: "en" });
  }
  groups.sort((a, b) => a.label.localeCompare(b.label));
  for (const [label, voices] of otherByLang) {
    groups.push({ label, voices, kind: "other" });
  }
  groups.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "en" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  return groups;
}

function updateVoiceHint(matchCount = 0) {
  if (!voiceHint) return;
  voiceHint.classList.remove("hidden");
  if (voiceSearchQuery && matchCount === 0) {
    voiceHint.textContent = voiceSearchNoMatchHint(voiceSearchQuery);
    return;
  }
  if (googleVoices.length > 0) {
    const paCount = googlePunjabiGroup?.voices?.length || 0;
    voiceHint.textContent =
      `${googleLanguageCount} languages, ${googleVoiceCount} Google voices` +
      (paCount ? ` (including ${paCount} Punjabi)` : "") +
      ". Turn on Read aloud + Translate English replies to voice language for non-English voices.";
    return;
  }
  voiceHint.classList.add("hidden");
  voiceHint.textContent = "";
}

function populateVoices() {
  const hasBrowserTts = !!window.speechSynthesis;
  if (!hasBrowserTts && !googleVoices.length) {
    if (ttsControls) ttsControls.style.display = "none";
    return;
  }
  if (ttsControls) ttsControls.style.display = "";

  const browserVoices = hasBrowserTts
    ? window.speechSynthesis.getVoices()
    : [];
  const saved = settings.voiceName;
  const q = voiceSearchQuery;
  voiceSelect.innerHTML = "";
  let totalShown = 0;

  const def = document.createElement("option");
  def.value = "";
  def.textContent = "Default voice";
  voiceSelect.appendChild(def);

  for (const g of googleEnglishAccentGroups) {
    const voices = q
      ? g.voices.filter((v) =>
          matchesVoiceFilter(q, [
            g.label,
            g.langCode,
            "english",
            "en",
            v.label,
            v.id,
            v.lang,
            v.gender,
            v.tier,
          ])
        )
      : g.voices;
    if (!voices.length) continue;
    totalShown += addVoiceGroup(
      `Google — ${g.label}`,
      voices,
      (v) => "google:" + v.id,
      (v) => v.label
    );
  }

  if (googlePunjabiGroup?.voices?.length) {
    const g = googlePunjabiGroup;
    const voices = q
      ? g.voices.filter((v) =>
          matchesVoiceFilter(q, [
            g.label,
            g.langCode,
            "punjabi",
            "panjabi",
            "pa-in",
            "pa",
            v.label,
            v.id,
            v.lang,
            v.gender,
            v.tier,
          ])
        )
      : g.voices;
    if (voices.length) {
      totalShown += addVoiceGroup(
        "Google — Punjabi",
        voices,
        (v) => "google:" + v.id,
        (v) => v.label
      );
    }
  }

  for (const g of googleVoiceGroups) {
    const voices = q
      ? g.voices.filter((v) =>
          matchesVoiceFilter(q, [
            g.label,
            g.langCode,
            languageLabel(g.langCode),
            v.label,
            v.id,
            v.lang,
            v.gender,
            v.tier,
          ])
        )
      : g.voices;
    if (!voices.length) continue;
    totalShown += addVoiceGroup(
      `Google — ${g.label}`,
      voices,
      (v) => "google:" + v.id,
      (v) => v.label
    );
  }

  const browserGroups = groupBrowserVoices(browserVoices);
  for (const g of browserGroups) {
    const voices = q
      ? g.voices.filter((v) =>
          matchesVoiceFilter(q, [g.label, v.name, v.lang])
        )
      : g.voices;
    if (!voices.length) continue;
    totalShown += addVoiceGroup(
      g.label,
      voices,
      (v) => v.name,
      (v) => `${v.name} (${v.lang})`
    );
  }

  if (q && totalShown === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.disabled = true;
    opt.textContent = "No match — try another language name or accent";
    voiceSelect.appendChild(opt);
  }

  if (saved && [...voiceSelect.options].some((o) => o.value === saved)) {
    voiceSelect.value = saved;
  }
  updateVoiceHint(totalShown);
}

// Chrome/Edge often ignore speak() if it runs in the same tick as cancel().
async function playSpeech(text, { onStart, onEnd } = {}) {
  const plain = await prepareSpeechText(text);
  if (!plain) {
    showToast("Nothing to read aloud");
    onEnd?.();
    return;
  }

  // Google Cloud TTS (real Google Punjabi / English voices).
  if (settings.voiceName?.startsWith("google:")) {
    const voiceId = settings.voiceName.slice(7);
    try {
      const res = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: plain,
          voiceName: voiceId,
          rate: settings.speechRate || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "TTS failed");
      stopAllSpeech();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      speakingAudio = audio;
      onStart?.();
      audio.onended = () => {
        if (speakingAudio === audio) speakingAudio = null;
        onEnd?.();
      };
      audio.onerror = () => {
        if (speakingAudio === audio) speakingAudio = null;
        showToast("Could not play Google voice audio");
        onEnd?.();
      };
      await audio.play();
    } catch (err) {
      showToast(err.message || "Google voice failed");
      onEnd?.();
    }
    return;
  }

  if (!window.speechSynthesis) {
    showToast("Speech isn't supported in this browser");
    onEnd?.();
    return;
  }

  stopAllSpeech();
  window.speechSynthesis.getVoices(); // prime voice list (required in some browsers)
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(plain);
    applyVoiceSettings(u);
    u.onstart = () => onStart?.();
    const finish = () => onEnd?.();
    u.onend = finish;
    u.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") {
        showToast("Could not play speech — try Default voice in Settings");
      }
      finish();
    };
    window.speechSynthesis.speak(u);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, 80);
}
function speak(text) {
  if (!settings.readAloud || !window.speechSynthesis) return;
  playSpeech(text);
}

let speakingBtn = null;
function resetSpeakBtn(btn) {
  btn.textContent = "\u{1F50A}";
  btn.title = "Read this reply aloud";
  btn.classList.remove("active");
}
function makeSpeakButton(getText) {
  const btn = document.createElement("button");
  btn.className = "meta-btn speak-btn";
  resetSpeakBtn(btn);
  btn.addEventListener("click", () => {
    const wasThis = speakingBtn === btn;
    stopAllSpeech();
    if (speakingBtn) {
      resetSpeakBtn(speakingBtn);
      speakingBtn = null;
    }
    if (wasThis) return; // second click = stop
    playSpeech(getText(), {
      onStart: () => {
        speakingBtn = btn;
        btn.textContent = "\u23F9";
        btn.title = "Stop";
        btn.classList.add("active");
      },
      onEnd: () => {
        if (speakingBtn === btn) {
          resetSpeakBtn(btn);
          speakingBtn = null;
        }
      },
    });
  });
  return btn;
}

// --- Scroll-to-bottom + new-messages indicator ----------------------------
function markNewMessages() {
  scrollBottomBtn.classList.remove("hidden");
  scrollBottomBtn.classList.add("new");
  scrollBottomBtn.textContent = "New messages \u2193";
}
function clearNewMessages() {
  scrollBottomBtn.classList.remove("new");
  scrollBottomBtn.textContent = "\u2193";
}
messagesEl.addEventListener("scroll", () => {
  if (nearBottom()) {
    scrollBottomBtn.classList.add("hidden");
    clearNewMessages();
  } else {
    scrollBottomBtn.classList.remove("hidden");
  }
});
scrollBottomBtn.addEventListener("click", () => {
  clearNewMessages();
  scrollToBottom();
});

// --- Input behavior -------------------------------------------------------
function updateCounter() {
  const text = input.value;
  const chars = text.length;
  if (chars === 0) {
    charCounter.classList.add("hidden");
    return;
  }
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  charCounter.textContent = `${words} word${words === 1 ? "" : "s"} \u00B7 ${chars} character${chars === 1 ? "" : "s"}`;
  charCounter.classList.toggle("warn", chars > 4000);
  charCounter.classList.remove("hidden");
}
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
  updateCounter();
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// --- Generating state -----------------------------------------------------
function setGenerating(on) {
  isGenerating = on;
  sendBtn.textContent = on ? "Stop" : "Send";
  sendBtn.classList.toggle("stop", on);
  sendBtn.disabled = false;
}
sendBtn.addEventListener("click", (e) => {
  if (isGenerating && currentController) {
    e.preventDefault();
    currentController.abort();
  }
});

// --- Core: stream a reply -------------------------------------------------
async function generateReply() {
  const convo = getActive();
  const payloadMessages = convo.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const wrapper = addMessage("bot", "");
  const bubble = wrapper._bubble;
  bubble.classList.add("typing");
  bubble.innerHTML =
    '<span class="dots"><span></span><span></span><span></span></span>';

  currentController = new AbortController();
  setGenerating(true);

  let full = "";
  let aborted = false;
  let errored = false;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: payloadMessages,
        model: settings.model || undefined,
        systemPrompt: settings.systemPrompt || undefined,
        temperature:
          typeof settings.temperature === "number" ? settings.temperature : undefined,
        maxTokens: settings.maxTokens > 0 ? settings.maxTokens : undefined,
      }),
      signal: currentController.signal,
    });
    if (!res.ok || !res.body) {
      let message = "Request failed";
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {
        /* not JSON */
      }
      throw new Error(message);
    }
    bubble.classList.remove("typing");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      bubble.innerHTML = renderMarkdown(full);
      bubble.dataset.raw = full;
      enhanceCodeBlocks(bubble);
      if (settings.autoScroll) scrollToBottom();
      else if (!nearBottom()) markNewMessages();
    }
  } catch (err) {
    if (err.name === "AbortError") aborted = true;
    else {
      full = `Error: ${err.message}`;
      errored = true;
    }
  } finally {
    if (aborted && full.trim()) full += "\n\n_(stopped)_";
    else if (!full.trim()) full = aborted ? "_(stopped)_" : "(no response)";

    let displayText = full;
    if (
      settings.replyInUserLanguage &&
      googleTranslateEnabled &&
      !errored &&
      full.trim() &&
      bubble
    ) {
      const target = replyTranslateTarget();
      if (target) {
        try {
          const data = await translateText(full, target, "en");
          if (
            data.translatedText?.trim() &&
            data.translatedText !== full
          ) {
            displayText = data.translatedText;
            bubble.classList.remove("typing");
            bubble.innerHTML = renderMarkdown(displayText);
            bubble.dataset.raw = displayText;
            enhanceCodeBlocks(bubble);
            if (settings.showTranslation && displayText !== full) {
              const tr = document.createElement("div");
              tr.className = "translation-badge";
              tr.textContent = "English: " + full;
              bubble.appendChild(tr);
            }
          }
        } catch (err) {
          showToast(err.message || "Could not translate reply");
        }
      }
    }

    convo.messages.push({
      role: "assistant",
      content: full,
      display: displayText !== full ? displayText : undefined,
      error: errored || undefined,
      t: new Date().toISOString(),
    });
    saveConvos();
    setGenerating(false);
    renderConversation();
    if (!aborted) speak(displayText);
    input.focus();
  }
}

// --- Sending --------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isGenerating) return;
  const text = input.value.trim();
  if (!text && !pendingAttachment) return;

  const convo = getActive();
  removeSuggestions();

  let content = text;
  let display = text;
  let translation = null;
  let detectedLang = null;
  let file = null;

  if (text) {
    const tr = await translateUserMessageToEnglish(text);
    translation = tr.translation;
    detectedLang = tr.detected;
    if (translation) content = translation;
  }

  if (pendingAttachment) {
    file = pendingAttachment.name;
    const userPart = translation || text;
    content =
      `The user attached a file named "${file}". Its contents:\n\n\`\`\`\n` +
      pendingAttachment.content +
      `\n\`\`\`\n\n` +
      (userPart
        ? `User message: ${userPart}`
        : "Please read the file and help with it.");
    display = text || "(sent a file)";
  }

  addMessage("user", display, {
    file,
    translation:
      settings.showTranslation && translation && translation !== display
        ? translation
        : null,
    detectedLang:
      settings.showTranslation && detectedLang ? detectedLang : null,
  });
  convo.messages.push({
    role: "user",
    content,
    display,
    translation:
      translation && translation !== display ? translation : undefined,
    detectedLang: detectedLang || undefined,
    file,
    t: new Date().toISOString(),
  });
  maybeAutoTitle(convo, text || file);
  saveConvos();
  renderSidebar();

  input.value = "";
  input.style.height = "auto";
  updateCounter();
  clearAttachment();

  await generateReply();
});

// --- Edit & resend --------------------------------------------------------
function editMessage(index) {
  if (isGenerating) return;
  const convo = getActive();
  const msg = convo.messages[index];
  if (!msg) return;
  input.value = msg.display || msg.content;
  input.dispatchEvent(new Event("input"));
  convo.messages = convo.messages.slice(0, index);
  saveConvos();
  renderSidebar();
  renderConversation();
  input.focus();
}

// --- Feedback (thumbs) ----------------------------------------------------
function setFeedback(index, value) {
  const convo = getActive();
  const msg = convo.messages[index];
  if (!msg) return;
  msg.feedback = msg.feedback === value ? null : value;
  saveConvos();
  if (msg.feedback === "up") showToast("Thanks for the feedback!");
  else if (msg.feedback === "down") showToast("Thanks — I'll try to do better.");
  renderConversation();
}

// --- Regenerate -----------------------------------------------------------
async function regenerate() {
  if (isGenerating) return;
  const convo = getActive();
  if (convo.messages[convo.messages.length - 1]?.role === "assistant") {
    convo.messages.pop();
    saveConvos();
  }
  renderConversation();
  await generateReply();
}

// --- Keyboard shortcuts ---------------------------------------------------
document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "k") {
    e.preventDefault();
    newConvoBtn.click();
    showToast("New chat");
    return;
  }
  if (mod && e.key === "/") {
    e.preventDefault();
    searchInput.focus();
    return;
  }
  if (e.key === "Escape") {
    if (isGenerating && currentController) {
      currentController.abort();
      return;
    }
    if (!settingsModal.classList.contains("hidden")) {
      closeSettings();
      return;
    }
    if (!exportMenu.classList.contains("hidden")) {
      exportMenu.classList.add("hidden");
      return;
    }
    if (sidebar.classList.contains("open")) {
      closeMobileSidebar();
      return;
    }
    if (document.activeElement === input) input.blur();
  }
});

// --- Startup --------------------------------------------------------------
applyTheme(settings.theme || "dark");
applyAccent(settings.accent || "");
populateThemeControls();
populatePresets();
if (window.speechSynthesis) {
  loadGoogleVoices().then(() => {
    populateVoices();
    renderSpeechModeChips();
    updateGoogleSpeechPipelineHint();
  });
}
if (conversations.length === 0) newConversation();
renderSidebar();
renderConversation();
loadModels();
input.focus();
