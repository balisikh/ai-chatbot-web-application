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
  },
  loadJSON(SETTINGS_KEY, {})
);

let currentController = null;
let isGenerating = false;
let searchQuery = "";
let pendingAttachment = null;

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
        onEdit: () => editMessage(i),
      });
    } else {
      addMessage("bot", msg.content, {
        time: msg.t,
        error: msg.error,
        onRetry: msg.error && !isGenerating ? regenerate : undefined,
        onRegenerate:
          !msg.error && i === lastAssistant && !isGenerating ? regenerate : undefined,
        onFeedback: !msg.error ? (v) => setFeedback(i, v) : undefined,
        feedback: msg.feedback,
      });
    }
  });
  scrollToBottom();
}

function renderSidebar() {
  convoListEl.innerHTML = "";
  const sorted = [...conversations].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );
  const filtered = searchQuery
    ? sorted.filter((c) => {
        if ((c.title || "").toLowerCase().includes(searchQuery)) return true;
        return c.messages.some((m) =>
          (m.display || m.content || "").toLowerCase().includes(searchQuery)
        );
      })
    : sorted;

  for (const convo of filtered) {
    const item = document.createElement("div");
    item.className = "convo-item" + (convo.id === activeId ? " active" : "");

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

    item.appendChild(pin);
    item.appendChild(title);
    item.appendChild(rename);
    item.appendChild(del);
    convoListEl.appendChild(item);
  }
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
  return window.matchMedia("(max-width: 720px)").matches;
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
function openSettings() {
  presetSelect.value = settings.preset || "Default assistant";
  systemPromptInput.value = settings.systemPrompt || "";
  systemPromptInput.placeholder = PRESETS["Default assistant"];
  temperatureInput.value = String(settings.temperature ?? 0.7);
  tempValueEl.textContent = temperatureInput.value;
  maxLengthSelect.value = String(settings.maxTokens ?? 512);
  themeSelect.value = settings.theme || "dark";
  markSelectedAccent();
  readAloudInput.checked = !!settings.readAloud;
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
saveSettingsBtn.addEventListener("click", () => {
  settings.preset = presetSelect.value;
  settings.systemPrompt = systemPromptInput.value.trim();
  settings.temperature = parseFloat(temperatureInput.value);
  settings.maxTokens = parseInt(maxLengthSelect.value, 10) || 0;
  settings.readAloud = readAloudInput.checked;
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
  readAloudInput.checked = false;
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
    for (const m of data.models) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      modelPicker.appendChild(opt);
    }
    const desired = settings.model || data.current;
    if (data.models.includes(desired)) modelPicker.value = desired;
    settings.model = modelPicker.value;
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
function speak(text) {
  if (!settings.readAloud || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(toPlainText(text)));
}

// --- Scroll-to-bottom -----------------------------------------------------
messagesEl.addEventListener("scroll", () => {
  scrollBottomBtn.classList.toggle("hidden", nearBottom());
});
scrollBottomBtn.addEventListener("click", scrollToBottom);

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
      if (nearBottom()) scrollToBottom();
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
  let file = null;
  if (pendingAttachment) {
    file = pendingAttachment.name;
    content =
      `The user attached a file named "${file}". Its contents:\n\n\`\`\`\n` +
      pendingAttachment.content +
      `\n\`\`\`\n\n` +
      (text ? `User message: ${text}` : "Please read the file and help with it.");
    display = text || "(sent a file)";
  }

  addMessage("user", display, { file });
  convo.messages.push({
    role: "user",
    content,
    display,
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
if (conversations.length === 0) newConversation();
renderSidebar();
renderConversation();
loadModels();
input.focus();
