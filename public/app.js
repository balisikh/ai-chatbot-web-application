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
const translateForSpeechInput = document.getElementById("translate-for-speech");
const applyPunjabiModeBtn = document.getElementById("apply-punjabi-mode");

// --- Storage keys ---------------------------------------------------------
const CONVOS_KEY = "ai_chat_convos";
const ACTIVE_KEY = "ai_chat_active";
const SETTINGS_KEY = "ai_chat_settings";
const THEME_KEY = "ai_chat_theme";

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
    translateForSpeech: true,
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
        tokens: estimateTokens(msg.content),
        onEdit: () => editMessage(i),
      });
    } else {
      addMessage("bot", msg.content, {
        time: msg.t,
        error: msg.error,
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
  translateForSpeechInput.checked = settings.translateForSpeech !== false;
  if (voiceSearchInput) voiceSearchInput.value = voiceSearchQuery;
  window.speechSynthesis?.getVoices();
  await loadGoogleVoices();
  populateTranslateSourceOptions();
  updateTranslationControlsState();
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
if (translateToEnglishInput) {
  translateToEnglishInput.addEventListener(
    "change",
    updateTranslateSourceRowVisibility
  );
}
if (voiceSelect) {
  voiceSelect.addEventListener("change", syncSettingsWithVoiceSelection);
}
if (applyPunjabiModeBtn) {
  applyPunjabiModeBtn.addEventListener("click", applyPunjabiChatMode);
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
  settings.translateForSpeech = translateForSpeechInput.checked;
  settings.voiceName = voiceSelect.value;
  settings.speechRate = parseFloat(speechRateInput.value) || 1;
  saveSettings();
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
  translateForSpeechInput.checked = true;
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
let pdfjsReady = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  if (pdfjsReady) return pdfjsReady;
  pdfjsReady = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "vendor/pdfjs/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "vendor/pdfjs/pdf.worker.min.js";
      resolve();
    };
    s.onerror = () => reject(new Error("Failed to load PDF reader"));
    document.head.appendChild(s);
  });
  return pdfjsReady;
}
async function extractPdfText(file) {
  await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const maxPages = Math.min(pdf.numPages, 50);
  let text = "";
  for (let p = 1; p <= maxPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n\n";
    if (text.length > ATTACH_MAX) break;
  }
  if (pdf.numPages > maxPages) text += `\n[Only first ${maxPages} pages read]`;
  return text;
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
  const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  if (isPdf) {
    attachmentNameEl.textContent = "\u{1F4CE} Reading " + f.name + "...";
    attachmentEl.classList.remove("hidden");
    try {
      const text = await extractPdfText(f);
      if (!text.trim()) {
        showToast("No readable text found in that PDF");
        clearAttachment();
        return;
      }
      setAttachment(f.name, text);
      showToast("PDF loaded");
    } catch (err) {
      showToast("Could not read PDF: " + err.message);
      clearAttachment();
    }
    return;
  }
  const reader = new FileReader();
  reader.onload = () => setAttachment(f.name, String(reader.result || ""));
  reader.readAsText(f);
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
  } catch {
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
  const show =
    translateToEnglishInput?.checked && !translateToEnglishInput.disabled;
  translateSourceRow.classList.toggle("hidden", !show);
}

function updateTranslationControlsState() {
  const enabled = googleTranslateEnabled;
  const controls = [
    translateToEnglishInput,
    showTranslationInput,
    translateForSpeechInput,
    translateSourceLangSelect,
  ];
  for (const el of controls) {
    if (el) el.disabled = !enabled;
  }
  updateTranslateSourceRowVisibility();
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

async function translateUserMessageToEnglish(text) {
  if (!text || !settings.translateToEnglish || !googleTranslateEnabled) {
    return null;
  }
  const sourceFilter = settings.translateSourceLang || "";
  try {
    const data = await translateText(
      text,
      "en",
      sourceFilter || undefined
    );
    if (!data.translatedText || data.translatedText === text) return null;
    const detected = langBase(data.detectedSourceLanguage);
    if (sourceFilter) {
      const want = langBase(sourceFilter);
      if (detected && detected !== want) return null;
    } else if (detected === "en") {
      return null;
    }
    return data.translatedText;
  } catch (err) {
    showToast(err.message || "Translation failed — sending original text");
    return null;
  }
}

function syncSettingsWithVoiceSelection() {
  const lang = voiceLangFromName(voiceSelect?.value ?? settings.voiceName);
  const base = langBase(lang);
  if (!base || base === "en") return;
  if (readAloudInput && !readAloudInput.disabled) readAloudInput.checked = true;
  if (translateForSpeechInput && !translateForSpeechInput.disabled) {
    translateForSpeechInput.checked = true;
  }
  if (
    translateSourceLangSelect &&
    !translateSourceLangSelect.disabled &&
    translateToEnglishInput?.checked
  ) {
    const match = [...translateSourceLangSelect.options].some(
      (o) => o.value === base
    );
    if (match) translateSourceLangSelect.value = base;
  }
}

const PUNJABI_VOICE_PREFERENCES = [
  "google:pa-IN-Wavenet-A",
  "google:pa-IN-Wavenet-B",
  "google:pa-IN-Standard-A",
  "google:pa-IN-Standard-B",
];

function pickPunjabiVoiceInSelect() {
  if (!voiceSelect) return false;
  for (const id of PUNJABI_VOICE_PREFERENCES) {
    const opt = [...voiceSelect.options].find((o) => o.value === id);
    if (opt && !opt.disabled) {
      voiceSelect.value = id;
      return true;
    }
  }
  const punjabi = [...voiceSelect.options].find(
    (o) => o.value && /punjabi/i.test(o.textContent)
  );
  if (punjabi && !punjabi.disabled) {
    voiceSelect.value = punjabi.value;
    return true;
  }
  return false;
}

function applyPunjabiChatMode() {
  if (readAloudInput) readAloudInput.checked = true;
  if (translateToEnglishInput) translateToEnglishInput.checked = true;
  if (showTranslationInput) showTranslationInput.checked = true;
  if (translateForSpeechInput) translateForSpeechInput.checked = true;
  if (translateSourceLangSelect && !translateSourceLangSelect.disabled) {
    const pa = [...translateSourceLangSelect.options].find(
      (o) => o.value === "pa"
    );
    translateSourceLangSelect.value = pa ? "pa" : "";
  }
  updateTranslateSourceRowVisibility();
  if (voiceSearchInput) {
    voiceSearchInput.value = "Punjabi";
    voiceSearchQuery = "punjabi";
  }
  populateVoices();
  const voiceOk = pickPunjabiVoiceInSelect();
  if (!googleTranslateEnabled) {
    showToast("Punjabi mode applied — translation needs server configuration");
  } else if (!voiceOk) {
    showToast(
      "Punjabi mode applied — install Punjabi speech in Windows or check Google key for voices"
    );
  } else {
    showToast("Punjabi chat mode applied — click Save to keep");
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

function speechTranslateTarget(lang) {
  if (!lang) return null;
  const base = lang.split("-")[0].toLowerCase();
  if (base === "en") return null;
  return base;
}

async function prepareSpeechText(text) {
  let plain = toPlainText(text || "").trim();
  if (!plain) return "";
  const target = speechTranslateTarget(getSelectedVoiceLang());
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

function voiceSearchTerms(q) {
  const terms = [q];
  const lower = q.toLowerCase();
  if (
    lower.includes("punjabi") ||
    lower.includes("panjabi") ||
    lower === "pa" ||
    lower.startsWith("pa-")
  ) {
    terms.push("punjabi", "panjabi", "pa-in", "pa");
  }
  return terms;
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
    voiceHint.textContent =
      `No voices matched "${voiceSearchQuery}". Try United Kingdom, Punjabi, Hindi, or pa-IN.`;
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
    convo.messages.push({
      role: "assistant",
      content: full,
      error: errored || undefined,
      t: new Date().toISOString(),
    });
    saveConvos();
    setGenerating(false);
    renderConversation();
    if (!aborted) speak(full);
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
  let file = null;

  if (text) {
    translation = await translateUserMessageToEnglish(text);
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
  });
  convo.messages.push({
    role: "user",
    content,
    display,
    translation:
      translation && translation !== display ? translation : undefined,
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
  loadGoogleVoices().then(() => populateVoices());
}
if (conversations.length === 0) newConversation();
renderSidebar();
renderConversation();
loadModels();
input.focus();
