import * as dom from "./dom.js";
import * as state from "./state.js";
import { WELCOME, SUGGESTIONS, THEME_KEY } from "./constants.js";
import { saveConvos, saveSettings, newConversation, getActive, deleteConversation, switchConversation, maybeAutoTitle } from "./storage.js";
import { renderMarkdown, toPlainText, showToast, formatTime, estimateTokens, scrollToBottom, nearBottom, enhanceCodeBlocks, makeMetaButton } from "./utils.js";
import { speak, playSpeech, makeSpeakButton, stopAllSpeech, loadGoogleVoices, populateVoices, closeVoicePicker } from "./voice.js";
import { openSettings, closeSettings, applyTheme, applyAccent, populateThemeControls, markSelectedAccent, populatePresets, initSettings, isMobile, openMobileSidebar, closeMobileSidebar, exportConversation, download } from "./settings.js";

const ATTACH_MAX = 30000;

export function addMessage(role, text, opts = {}) {
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
  dom.messagesEl.appendChild(wrapper);
  if (nearBottom()) scrollToBottom();
  return wrapper;
}

export function showSuggestions() {
  const wrap = document.createElement("div");
  wrap.className = "suggestions";
  for (const s of SUGGESTIONS) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = s;
    chip.addEventListener("click", () => {
      dom.input.value = s;
      dom.form.requestSubmit();
    });
    wrap.appendChild(chip);
  }
  dom.messagesEl.appendChild(wrap);
}
export function removeSuggestions() {
  dom.messagesEl.querySelector(".suggestions")?.remove();
}

export function renderConversation() {
  const convo = getActive();
  dom.convoTitleEl.textContent = convo.title || "AI Chatbot";
  dom.messagesEl.innerHTML = "";
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
          state.settings.showTranslation && msg.translation ? msg.translation : null,
        tokens: estimateTokens(msg.content),
        onEdit: () => editMessage(i),
      });
    } else {
      addMessage("bot", msg.content, {
        time: msg.t,
        error: msg.error,
        tokens: msg.error ? 0 : estimateTokens(msg.content),
        onRetry: msg.error && !state.isGenerating ? regenerate : undefined,
        onRegenerate:
          !msg.error && i === lastAssistant && !state.isGenerating ? regenerate : undefined,
        onFeedback: !msg.error ? (v) => setFeedback(i, v) : undefined,
        feedback: msg.feedback,
      });
    }
  });
  updateUsage();
  scrollToBottom();
}

export function updateUsage() {
  const convo = getActive();
  const total = convo.messages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0
  );
  if (total > 0) {
    dom.usageEl.textContent = `\u2248 ${total.toLocaleString()} tokens`;
    dom.usageEl.classList.remove("hidden");
  } else {
    dom.usageEl.classList.add("hidden");
  }
}

export function allTags() {
  const set = new Set();
  state.conversations.forEach((c) => (c.tags || []).forEach((t) => set.add(t)));
  return [...set].sort();
}

export function renderTagFilter() {
  dom.tagFilterEl.innerHTML = "";
  const tags = allTags();
  if (tags.length === 0) {
    if (state.activeTag) state.activeTag = null;
    dom.tagFilterEl.classList.add("hidden");
    return;
  }
  dom.tagFilterEl.classList.remove("hidden");
  const mk = (label, value) => {
    const chip = document.createElement("button");
    chip.className = "tag-chip" + (state.activeTag === value ? " active" : "");
    chip.textContent = label;
    chip.addEventListener("click", () => {
      state.activeTag = value;
      renderSidebar();
    });
    dom.tagFilterEl.appendChild(chip);
  };
  mk("All", null);
  tags.forEach((t) => mk("#" + t, t));
}

export function renderSidebar() {
  renderTagFilter();
  dom.convoListEl.innerHTML = "";
  let list = [...state.conversations].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );
  if (state.activeTag) list = list.filter((c) => (c.tags || []).includes(state.activeTag));
  if (state.searchQuery) {
    list = list.filter((c) => {
      if ((c.title || "").toLowerCase().includes(state.searchQuery)) return true;
      if ((c.tags || []).some((t) => t.toLowerCase().includes(state.searchQuery)))
        return true;
      return c.messages.some((m) =>
        (m.display || m.content || "").toLowerCase().includes(state.searchQuery)
      );
    });
  }

  for (const convo of list) {
    const item = document.createElement("div");
    item.className = "convo-item" + (convo.id === state.activeId ? " active" : "");

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
      deleteConversation(convo.id); renderSidebar(); renderConversation();
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
          state.activeTag = t;
          renderSidebar();
        });
        tagsRow.appendChild(chip);
      });
      item.appendChild(tagsRow);
    }

    dom.convoListEl.appendChild(item);
  }
}

export function startTagEdit(convo, item) {
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

export function startRename(convo, titleEl) {
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
    if (convo.id === state.activeId) dom.convoTitleEl.textContent = convo.title;
  };
  editor.addEventListener("blur", commit);
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter") editor.blur();
    if (e.key === "Escape") renderSidebar();
  });
}

// --- Model picker ---------------------------------------------------------
export async function loadModels() {
  try {
    const res = await fetch("/api/models");
    const data = await res.json();
    dom.modelPicker.innerHTML = "";
    if (data.noModelsInstalled) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No model — run ollama pull";
      dom.modelPicker.appendChild(opt);
      dom.modelPicker.disabled = true;
      showToast(
        `Install the AI model: ollama pull ${data.configuredModel || "llama3.2:1b"}`
      );
      return;
    }
    for (const m of data.models) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      dom.modelPicker.appendChild(opt);
    }
    const desired = state.settings.model || data.current;
    if (data.models.includes(desired)) dom.modelPicker.value = desired;
    else if (data.current) dom.modelPicker.value = data.current;
    state.settings.model = dom.modelPicker.value;
    if (data.modelMissing && data.configuredModel) {
      showToast(`Model ${data.configuredModel} missing — using ${data.current}`);
    }
    if (data.provider === "offline") dom.modelPicker.disabled = true;
  } catch {
    dom.modelPicker.innerHTML = "<option>default</option>";
  }
}
dom.modelPicker.addEventListener("change", () => {
  state.settings.model = dom.modelPicker.value;
  saveSettings();
});

// --- File upload ----------------------------------------------------------
const ATTACH_MAX = 30000;
export function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  if (state.pdfjsReady) return state.pdfjsReady;
  state.pdfjsReady = new Promise((resolve, reject) => {
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
  return state.pdfjsReady;
}
export async function extractPdfText(file) {
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
export function setAttachment(name, content) {
  if (content.length > ATTACH_MAX)
    content = content.slice(0, ATTACH_MAX) + "\n...[truncated]";
  state.pendingAttachment = { name, content };
  dom.attachmentNameEl.textContent = "\u{1F4CE} " + name;
  dom.attachmentEl.classList.remove("hidden");
}
dom.attachBtn.addEventListener("click", () => dom.fileInput.click());
dom.fileInput.addEventListener("change", async () => {
  const f = dom.fileInput.files[0];
  dom.fileInput.value = "";
  if (!f) return;
  const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  if (isPdf) {
    dom.attachmentNameEl.textContent = "\u{1F4CE} Reading " + f.name + "...";
    dom.attachmentEl.classList.remove("hidden");
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
export function clearAttachment() {
  state.pendingAttachment = null;
  dom.attachmentNameEl.textContent = "";
  dom.attachmentEl.classList.add("hidden");
}
dom.attachmentRemoveBtn.addEventListener("click", clearAttachment);

// --- Voice dom.input ----------------------------------------------------------
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
state.recognition = null;
state.listening = false;
if (SpeechRecognition) {
  state.recognition = new SpeechRecognition();
  state.recognition.lang = "en-US";
  state.recognition.interimResults = false;
  state.recognition.maxAlternatives = 1;
  state.recognition.addEventListener("result", (e) => {
    dom.input.value = e.results[0][0].transcript;
    dom.input.dispatchEvent(new Event("input"));
  });
  state.recognition.addEventListener("end", () => {
    state.listening = false;
    dom.micBtn.classList.remove("listening");
    if (dom.input.value.trim()) dom.form.requestSubmit();
  });
  state.recognition.addEventListener("error", () => {
    state.listening = false;
    dom.micBtn.classList.remove("listening");
  });
  dom.micBtn.addEventListener("click", () => {
    if (state.listening) {
      state.recognition.stop();
      return;
    }
    try {
      state.recognition.start();
      state.listening = true;
      dom.micBtn.classList.add("listening");
    } catch {
      /* already started */
    }
  });
} else {
  dom.micBtn.style.display = "none";
}

// --- Scroll-to-bottom + new-messages indicator ----------------------------
export function markNewMessages() {
  dom.scrollBottomBtn.classList.remove("hidden");
  dom.scrollBottomBtn.classList.add("new");
  dom.scrollBottomBtn.textContent = "New messages \u2193";
}
export function clearNewMessages() {
  dom.scrollBottomBtn.classList.remove("new");
  dom.scrollBottomBtn.textContent = "\u2193";
}
dom.messagesEl.addEventListener("scroll", () => {
  if (nearBottom()) {
    dom.scrollBottomBtn.classList.add("hidden");
    clearNewMessages();
  } else {
    dom.scrollBottomBtn.classList.remove("hidden");
  }
});
dom.scrollBottomBtn.addEventListener("click", () => {
  clearNewMessages();
  scrollToBottom();
});

// --- Input behavior -------------------------------------------------------
export function updateCounter() {
  const text = dom.input.value;
  const chars = text.length;
  if (chars === 0) {
    dom.charCounter.classList.add("hidden");
    return;
  }
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  dom.charCounter.textContent = `${words} word${words === 1 ? "" : "s"} \u00B7 ${chars} character${chars === 1 ? "" : "s"}`;
  dom.charCounter.classList.toggle("warn", chars > 4000);
  dom.charCounter.classList.remove("hidden");
}
dom.input.addEventListener("input", () => {
  dom.input.style.height = "auto";
  dom.input.style.height = dom.input.scrollHeight + "px";
  updateCounter();
});
dom.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    dom.form.requestSubmit();
  }
});

// --- Generating state -----------------------------------------------------
export function setGenerating(on) {
  state.isGenerating = on;
  dom.sendBtn.textContent = on ? "Stop" : "Send";
  dom.sendBtn.classList.toggle("stop", on);
  dom.sendBtn.disabled = false;
}
dom.sendBtn.addEventListener("click", (e) => {
  if (state.isGenerating && state.currentController) {
    e.preventDefault();
    state.currentController.abort();
  }
});

// --- Core: stream a reply -------------------------------------------------
export async function generateReply() {
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

  state.currentController = new AbortController();
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
        model: state.settings.model || undefined,
        systemPrompt: state.settings.systemPrompt || undefined,
        temperature:
          typeof state.settings.temperature === "number" ? state.settings.temperature : undefined,
        maxTokens: state.settings.maxTokens > 0 ? state.settings.maxTokens : undefined,
      }),
      signal: state.currentController.signal,
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
      if (state.settings.autoScroll) scrollToBottom();
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
    dom.input.focus();
  }
}

// --- Sending --------------------------------------------------------------
dom.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (state.isGenerating) return;
  const text = dom.input.value.trim();
  if (!text && !state.pendingAttachment) return;

  const convo = getActive();
  removeSuggestions();

  let content = text;
  let display = text;
  let translation = null;
  let file = null;

  if (text && state.settings.translateToEnglish && state.googleTranslateEnabled) {
    try {
      const data = await translateText(text, "en");
      if (data.translatedText) {
        translation = data.translatedText;
        if (translation !== text) content = translation;
      }
    } catch (err) {
      showToast(err.message || "Translation failed — sending original text");
    }
  }

  if (state.pendingAttachment) {
    file = state.pendingAttachment.name;
    const userPart = translation || text;
    content =
      `The user attached a file named "${file}". Its contents:\n\n\`\`\`\n` +
      state.pendingAttachment.content +
      `\n\`\`\`\n\n` +
      (userPart
        ? `User message: ${userPart}`
        : "Please read the file and help with it.");
    display = text || "(sent a file)";
  }

  addMessage("user", display, {
    file,
    translation:
      state.settings.showTranslation && translation && translation !== display
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

  dom.input.value = "";
  dom.input.style.height = "auto";
  updateCounter();
  clearAttachment();

  await generateReply();
});

// --- Edit & resend --------------------------------------------------------
export function editMessage(index) {
  if (state.isGenerating) return;
  const convo = getActive();
  const msg = convo.messages[index];
  if (!msg) return;
  dom.input.value = msg.display || msg.content;
  dom.input.dispatchEvent(new Event("input"));
  convo.messages = convo.messages.slice(0, index);
  saveConvos();
  renderSidebar();
  renderConversation();
  dom.input.focus();
}

// --- Feedback (thumbs) ----------------------------------------------------
export function setFeedback(index, value) {
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
export async function regenerate() {
  if (state.isGenerating) return;
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
    dom.newConvoBtn.click();
    showToast("New chat");
    return;
  }
  if (mod && e.key === "/") {
    e.preventDefault();
    dom.searchInput.focus();
    return;
  }
  if (e.key === "Escape") {
    if (state.isGenerating && state.currentController) {
      state.currentController.abort();
      return;
    }
    if (!dom.settingsModal.classList.contains("hidden")) {
      if (state.voicePickerOpen) {
        closeVoicePicker();
        return;
      }
      closeSettings();
      return;
    }
    if (!dom.exportMenu.classList.contains("hidden")) {
      dom.exportMenu.classList.add("hidden");
      return;
    }
    if (dom.sidebar.classList.contains("open")) {
      closeMobileSidebar();
      return;
    }
    if (document.activeElement === dom.input) dom.input.blur();
  }
});

