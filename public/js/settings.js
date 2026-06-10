import * as dom from "./dom.js";
import * as state from "./state.js";
import { THEMES, ACCENTS, PRESETS, THEME_KEY, SPEECH_MODE_PRESETS } from "./constants.js";
import { saveSettings, getActive } from "./storage.js";
import { showToast } from "./utils.js";
import { loadGoogleVoices, populateVoices, populateVoiceLangChips, closeVoicePicker, setVoicePickerValue, applySpeechMode, initSpeechModeButtons, previewSelectedVoice, openVoicePicker } from "./voice.js";

export function applyTheme(theme) {
  document.body.dataset.theme = theme;
}
export function applyAccent(color) {
  if (color) {
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--user-bubble", color);
  } else {
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--user-bubble");
  }
}
// Header button cycles through the available themes for quick switching.
dom.themeToggleBtn.addEventListener("click", () => {
  const ids = THEMES.map((t) => t.id);
  const idx = ids.indexOf(state.settings.theme);
  state.settings.theme = ids[(idx + 1) % ids.length];
  applyTheme(state.settings.theme);
  localStorage.setItem(THEME_KEY, state.settings.theme);
  saveSettings();
  if (dom.themeSelect) dom.themeSelect.value = state.settings.theme;
});

export function populateThemeControls() {
  dom.themeSelect.innerHTML = "";
  for (const t of THEMES) {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.label;
    dom.themeSelect.appendChild(o);
  }
  dom.themeSelect.addEventListener("change", () => {
    state.settings.theme = dom.themeSelect.value;
    applyTheme(state.settings.theme);
    localStorage.setItem(THEME_KEY, state.settings.theme);
    saveSettings();
  });

  dom.accentRow.innerHTML = "";
  const mkSwatch = (color, isDefault) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "accent-swatch" + (isDefault ? " default" : "");
    if (!isDefault) b.style.background = color;
    b.title = isDefault ? "Theme default" : color;
    b.addEventListener("click", () => {
      state.settings.accent = isDefault ? "" : color;
      applyAccent(state.settings.accent);
      saveSettings();
      markSelectedAccent();
    });
    dom.accentRow.appendChild(b);
  };
  mkSwatch("", true);
  ACCENTS.forEach((c) => mkSwatch(c, false));
}
export function markSelectedAccent() {
  const swatches = dom.accentRow.querySelectorAll(".accent-swatch");
  swatches.forEach((s) => s.classList.remove("selected"));
  if (!state.settings.accent) {
    swatches[0]?.classList.add("selected");
  } else {
    const idx = ACCENTS.indexOf(state.settings.accent);
    if (idx >= 0) swatches[idx + 1]?.classList.add("selected");
  }
}

// --- Sidebar toggle / new chat / search -----------------------------------
export function isMobile() {
  return window.matchMedia("(max-width: 720px)").matches;
}
export function openMobileSidebar() {
  dom.sidebar.classList.add("open");
  dom.sidebarBackdrop.classList.remove("hidden");
}
export function closeMobileSidebar() {
  dom.sidebar.classList.remove("open");
  dom.sidebarBackdrop.classList.add("hidden");
}
dom.toggleSidebarBtn.addEventListener("click", () => {
  if (isMobile()) {
    if (dom.sidebar.classList.contains("open")) closeMobileSidebar();
    else openMobileSidebar();
  } else {
    dom.appEl.classList.toggle("dom.sidebar-collapsed");
  }
});
dom.sidebarBackdrop.addEventListener("click", closeMobileSidebar);
dom.newConvoBtn.addEventListener("click", () => {
  if (state.isGenerating && state.currentController) state.currentController.abort();
  newConversation();
  renderSidebar();
  renderConversation();
  if (isMobile()) closeMobileSidebar();
  input.focus();
});
dom.searchInput.addEventListener("input", () => {
  state.searchQuery = dom.searchInput.value.toLowerCase().trim();
  renderSidebar();
});

// --- Export ---------------------------------------------------------------
export function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function exportConversation(format) {
  if (format === "all") {
    const stamp = new Date().toISOString().slice(0, 10);
    const backup = {
      type: "ai-chatbot-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      count: state.conversations.length,
      conversations: state.conversations,
    };
    download(
      `ai-chat-backup-${stamp}.json`,
      JSON.stringify(backup, null, 2),
      "application/json"
    );
    showToast(`Exported all ${state.conversations.length} chats`);
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
dom.exportBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dom.exportMenu.classList.toggle("hidden");
});
dom.exportMenu.querySelectorAll("button").forEach((b) =>
  b.addEventListener("click", () => {
    exportConversation(b.dataset.format);
    dom.exportMenu.classList.add("hidden");
  })
);
document.addEventListener("click", () => dom.exportMenu.classList.add("hidden"));

// --- Settings -------------------------------------------------------------
export function populatePresets() {
  dom.presetSelect.innerHTML = "";
  for (const name of Object.keys(PRESETS)) {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    dom.presetSelect.appendChild(o);
  }
  const custom = document.createElement("option");
  custom.value = "Custom";
  custom.textContent = "Custom";
  dom.presetSelect.appendChild(custom);
}
export async function openSettings() {
  dom.presetSelect.value = state.settings.preset || "Default assistant";
  dom.systemPromptInput.value = state.settings.systemPrompt || "";
  dom.systemPromptInput.placeholder = PRESETS["Default assistant"];
  dom.temperatureInput.value = String(state.settings.temperature ?? 0.7);
  dom.tempValueEl.textContent = dom.temperatureInput.value;
  dom.maxLengthSelect.value = String(state.settings.maxTokens ?? 512);
  dom.themeSelect.value = state.settings.theme || "dark";
  markSelectedAccent();
  dom.autoScrollInput.checked = state.settings.autoScroll !== false;
  dom.readAloudInput.checked = !!state.settings.readAloud;
  dom.translateToEnglishInput.checked = !!state.settings.translateToEnglish;
  dom.showTranslationInput.checked = state.settings.showTranslation !== false;
  dom.translateForSpeechInput.checked = state.settings.translateForSpeech !== false;
  if (dom.voiceSearchInput) dom.voiceSearchInput.value = state.voiceSearchQuery;
  window.speechSynthesis?.getVoices();
  populateVoiceLangChips();
  initSpeechModeButtons();
  await loadGoogleVoices();
  populateVoices();
  dom.speechRateInput.value = String(state.settings.speechRate || 1);
  dom.rateValueEl.textContent = Number(state.settings.speechRate || 1).toFixed(1);
  dom.settingsModal.classList.remove("hidden");
}
export function closeSettings() {
  closeVoicePicker();
  dom.settingsModal.classList.add("hidden");
}
dom.openSettingsBtn.addEventListener("click", openSettings);
dom.presetSelect.addEventListener("change", () => {
  if (dom.presetSelect.value !== "Custom") {
    dom.systemPromptInput.value = PRESETS[dom.presetSelect.value] || "";
  }
});
dom.systemPromptInput.addEventListener("input", () => {
  dom.presetSelect.value = "Custom";
});
dom.temperatureInput.addEventListener("input", () => {
  dom.tempValueEl.textContent = dom.temperatureInput.value;
});
dom.speechRateInput.addEventListener("input", () => {
  dom.rateValueEl.textContent = Number(dom.speechRateInput.value).toFixed(1);
});
if (window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", populateVoices);
}
dom.saveSettingsBtn.addEventListener("click", () => {
  state.settings.preset = dom.presetSelect.value;
  state.settings.systemPrompt = dom.systemPromptInput.value.trim();
  state.settings.temperature = parseFloat(dom.temperatureInput.value);
  state.settings.maxTokens = parseInt(dom.maxLengthSelect.value, 10) || 0;
  state.settings.autoScroll = dom.autoScrollInput.checked;
  state.settings.readAloud = dom.readAloudInput.checked;
  state.settings.translateToEnglish = dom.translateToEnglishInput.checked;
  state.settings.showTranslation = dom.showTranslationInput.checked;
  state.settings.translateForSpeech = dom.translateForSpeechInput.checked;
  state.settings.voiceName = dom.voiceSelect.value;
  state.settings.speechRate = parseFloat(dom.speechRateInput.value) || 1;
  saveSettings();
  closeSettings();
});
dom.resetSettingsBtn.addEventListener("click", () => {
  dom.presetSelect.value = "Default assistant";
  dom.systemPromptInput.value = "";
  dom.temperatureInput.value = "0.7";
  dom.tempValueEl.textContent = "0.7";
  dom.maxLengthSelect.value = "512";
  dom.themeSelect.value = "dark";
  dom.autoScrollInput.checked = true;
  dom.readAloudInput.checked = false;
  dom.translateToEnglishInput.checked = false;
  dom.showTranslationInput.checked = true;
  dom.translateForSpeechInput.checked = true;
  setVoicePickerValue("", "Default voice");
  closeVoicePicker();
  dom.speechRateInput.value = "1";
  dom.rateValueEl.textContent = "1.0";
  state.settings.accent = "";
  applyAccent("");
  applyTheme("dark");
  state.settings.theme = "dark";
  localStorage.setItem(THEME_KEY, "dark");
  markSelectedAccent();
});
dom.settingsModal.addEventListener("click", (e) => {
  if (e.target === dom.settingsModal) closeSettings();
});
export function initSettings() {
  if (dom.voiceSearchInput) {
    dom.voiceSearchInput.addEventListener("input", () => {
      state.voiceSearchQuery = dom.voiceSearchInput.value.toLowerCase().trim();
      populateVoices();
      populateVoiceLangChips();
    });
  }
  if (dom.previewVoiceBtn) {
    dom.previewVoiceBtn.addEventListener("click", () => {
      previewSelectedVoice();
    });
  }
  if (dom.voicePickerTrigger) {
    dom.voicePickerTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.voicePickerOpen) closeVoicePicker();
      else openVoicePicker();
    });
  }
  document.addEventListener("click", (e) => {
    if (!state.voicePickerOpen || !dom.voicePickerEl) return;
    if (!dom.voicePickerEl.contains(e.target)) closeVoicePicker();
  });
  initSpeechModeButtons();
}
