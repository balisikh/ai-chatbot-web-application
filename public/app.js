// --- Element references ---------------------------------------------------
const form = document.getElementById("chat-form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const messagesEl = document.getElementById("messages");
const themeToggleBtn = document.getElementById("theme-toggle");
const sidebar = document.getElementById("sidebar");
const toggleSidebarBtn = document.getElementById("toggle-sidebar");
const convoListEl = document.getElementById("convo-list");
const newConvoBtn = document.getElementById("new-convo");
const convoTitleEl = document.getElementById("convo-title");
const modelPicker = document.getElementById("model-picker");
const micBtn = document.getElementById("mic");
const scrollBottomBtn = document.getElementById("scroll-bottom");
const settingsModal = document.getElementById("settings-modal");
const openSettingsBtn = document.getElementById("open-settings");
const saveSettingsBtn = document.getElementById("save-settings");
const resetSettingsBtn = document.getElementById("reset-settings");
const systemPromptInput = document.getElementById("system-prompt");
const readAloudInput = document.getElementById("read-aloud");

// --- Storage keys ---------------------------------------------------------
const CONVOS_KEY = "ai_chat_convos";
const ACTIVE_KEY = "ai_chat_active";
const SETTINGS_KEY = "ai_chat_settings";
const THEME_KEY = "ai_chat_theme";

const WELCOME = "Hi! I'm your AI assistant. Ask me anything to get started.";
const DEFAULT_PROMPT =
  "You are a friendly, helpful AI assistant. Answer clearly and concisely.";
const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a short poem about the sea",
  "Give me 3 dinner ideas",
  "How do I stay productive?",
];

// --- State ----------------------------------------------------------------
let conversations = loadJSON(CONVOS_KEY, []);
let activeId = localStorage.getItem(ACTIVE_KEY) || null;
let settings = loadJSON(SETTINGS_KEY, {
  systemPrompt: "",
  model: "",
  readAloud: false,
});

let currentController = null;
let isGenerating = false;

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
    /* ignore quota / disabled storage */
  }
}
function saveConvos() {
  saveJSON(CONVOS_KEY, conversations);
}

// --- Conversation model ---------------------------------------------------
function newConversation() {
  const convo = {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    title: "New chat",
    messages: [],
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
}

function maybeAutoTitle(convo, firstUserText) {
  if (convo.title === "New chat" && firstUserText) {
    convo.title = firstUserText.slice(0, 32) + (firstUserText.length > 32 ? "..." : "");
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

  for (const raw of lines) {
    const line = raw.trimEnd();
    const ph = line.match(/^\u0000(\d+)\u0000$/);
    if (ph) {
      closeList();
      const code = highlightCode(escapeHtml(codeBlocks[+ph[1]]));
      html += `<pre><code class="hl">${code}</code></pre>`;
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

// Strip markdown to plain text for speech synthesis.
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, " code snippet ")
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
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
        setTimeout(() => (btn.textContent = "Copy code"), 1500);
      } catch {
        btn.textContent = "Failed";
        setTimeout(() => (btn.textContent = "Copy code"), 1500);
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

function addMessage(role, text, time) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "user" : "bot"}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (role === "user") {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = renderMarkdown(text || "");
    bubble.dataset.raw = text || "";
    enhanceCodeBlocks(bubble);
  }
  wrapper.appendChild(bubble);

  const meta = document.createElement("div");
  meta.className = "meta";
  const stamp = document.createElement("span");
  stamp.className = "timestamp";
  stamp.textContent = formatTime(time);
  meta.appendChild(stamp);

  if (role !== "user") {
    meta.appendChild(
      makeMetaButton("Copy", "Copy reply", async () => {
        try {
          await navigator.clipboard.writeText(bubble.dataset.raw || "");
        } catch {
          /* ignore */
        }
      })
    );
  }
  wrapper.appendChild(meta);
  wrapper._meta = meta;
  wrapper._bubble = bubble;

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

// Adds a "Regenerate" button to the last bot message only.
function refreshRegenerateButton() {
  messagesEl
    .querySelectorAll(".regen-btn")
    .forEach((b) => b.remove());
  const botWrappers = messagesEl.querySelectorAll(".message.bot");
  const last = botWrappers[botWrappers.length - 1];
  const convo = getActive();
  const hasUser = convo.messages.some((m) => m.role === "user");
  if (last && last._meta && hasUser && !isGenerating) {
    const btn = makeMetaButton("Regenerate", "Regenerate this reply", regenerate);
    btn.classList.add("regen-btn");
    last._meta.appendChild(btn);
  }
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
  for (const msg of convo.messages) {
    addMessage(msg.role === "user" ? "user" : "bot", msg.content, msg.t);
  }
  refreshRegenerateButton();
  scrollToBottom();
}

function renderSidebar() {
  convoListEl.innerHTML = "";
  for (const convo of conversations) {
    const item = document.createElement("div");
    item.className = "convo-item" + (convo.id === activeId ? " active" : "");

    const title = document.createElement("span");
    title.className = "convo-item-title";
    title.textContent = convo.title || "New chat";
    title.addEventListener("click", () => switchConversation(convo.id));

    const del = document.createElement("button");
    del.className = "convo-del";
    del.textContent = "x";
    del.title = "Delete conversation";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(convo.id);
    });

    item.appendChild(title);
    item.appendChild(del);
    convoListEl.appendChild(item);
  }
}

// --- Theme ----------------------------------------------------------------
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggleBtn.textContent = theme === "light" ? "Dark" : "Light";
}
themeToggleBtn.addEventListener("click", () => {
  const next = document.body.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

// --- Sidebar / new chat ---------------------------------------------------
toggleSidebarBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});
newConvoBtn.addEventListener("click", () => {
  if (isGenerating && currentController) currentController.abort();
  newConversation();
  renderSidebar();
  renderConversation();
  input.focus();
});

// --- Settings -------------------------------------------------------------
function openSettings() {
  systemPromptInput.value = settings.systemPrompt || "";
  systemPromptInput.placeholder = DEFAULT_PROMPT;
  readAloudInput.checked = !!settings.readAloud;
  settingsModal.classList.remove("hidden");
}
function closeSettings() {
  settingsModal.classList.add("hidden");
}
openSettingsBtn.addEventListener("click", openSettings);
saveSettingsBtn.addEventListener("click", () => {
  settings.systemPrompt = systemPromptInput.value.trim();
  settings.readAloud = readAloudInput.checked;
  saveJSON(SETTINGS_KEY, settings);
  closeSettings();
});
resetSettingsBtn.addEventListener("click", () => {
  systemPromptInput.value = "";
  readAloudInput.checked = false;
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
  saveJSON(SETTINGS_KEY, settings);
});

// --- Voice input (speech-to-text) -----------------------------------------
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
    const text = e.results[0][0].transcript;
    input.value = text;
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

// --- Read aloud (text-to-speech) ------------------------------------------
function speak(text) {
  if (!settings.readAloud || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(toPlainText(text));
  window.speechSynthesis.speak(utter);
}

// --- Scroll-to-bottom button ----------------------------------------------
messagesEl.addEventListener("scroll", () => {
  scrollBottomBtn.classList.toggle("hidden", nearBottom());
});
scrollBottomBtn.addEventListener("click", scrollToBottom);

// --- Input behavior -------------------------------------------------------
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// --- Stop / generating state ----------------------------------------------
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

// --- Core: generate an assistant reply via streaming ----------------------
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
  refreshRegenerateButton();

  let full = "";
  let aborted = false;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: payloadMessages,
        model: settings.model || undefined,
        systemPrompt: settings.systemPrompt || undefined,
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
    if (err.name === "AbortError") {
      aborted = true;
    } else {
      bubble.classList.remove("typing");
      full = `Error: ${err.message}`;
      bubble.innerHTML = renderMarkdown(full);
      bubble.dataset.raw = full;
    }
  } finally {
    if (aborted && full.trim()) full += "\n\n_(stopped)_";
    else if (!full.trim()) full = aborted ? "_(stopped)_" : "(no response)";
    bubble.innerHTML = renderMarkdown(full);
    bubble.dataset.raw = full;
    enhanceCodeBlocks(bubble);

    convo.messages.push({
      role: "assistant",
      content: full,
      t: new Date().toISOString(),
    });
    saveConvos();
    setGenerating(false);
    refreshRegenerateButton();
    if (!aborted) speak(full);
    input.focus();
  }
}

// --- Sending --------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isGenerating) return;
  const text = input.value.trim();
  if (!text) return;

  const convo = getActive();
  removeSuggestions();

  addMessage("user", text);
  convo.messages.push({
    role: "user",
    content: text,
    t: new Date().toISOString(),
  });
  maybeAutoTitle(convo, text);
  saveConvos();
  renderSidebar();

  input.value = "";
  input.style.height = "auto";

  await generateReply();
}); 

// --- Regenerate -----------------------------------------------------------
async function regenerate() {
  if (isGenerating) return;
  const convo = getActive();
  if (convo.messages[convo.messages.length - 1]?.role === "assistant") {
    convo.messages.pop();
    saveConvos();
  }
  // Remove the last bot message from the DOM.
  const botWrappers = messagesEl.querySelectorAll(".message.bot");
  botWrappers[botWrappers.length - 1]?.remove();
  await generateReply();
}

// --- Startup --------------------------------------------------------------
applyTheme(localStorage.getItem(THEME_KEY) || "dark");
if (conversations.length === 0) newConversation();
renderSidebar();
renderConversation();
loadModels();
input.focus();
