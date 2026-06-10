import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");
const app = readFileSync(join(root, "public/app.js"), "utf8");
const lines = app.split("\n");
const slice = (a, b) => lines.slice(a, b).join("\n");

mkdirSync(join(root, "public/js"), { recursive: true });

const domSrc =
  slice(0, 58).replace(/^const /gm, "export const ") +
  "\nexport const speechModeRowEl = document.getElementById(\"speech-mode-row\");\n";
writeFileSync(join(root, "public/js/dom.js"), domSrc);

const constSrc =
  slice(59, 97).replace(/^const /gm, "export const ") +
  "\n" +
  slice(144, 207).replace(/^const /gm, "export const ") +
  `
export const SPEECH_MODE_PRESETS = {
  english_us: {
    label: "English (US)",
    translateToEnglish: false,
    showTranslation: true,
    translateForSpeech: false,
    filterQuery: "united states",
    langCode: "en-US",
    voiceByLangKey: "en",
  },
  english_uk: {
    label: "English (UK)",
    translateToEnglish: false,
    showTranslation: true,
    translateForSpeech: false,
    filterQuery: "united kingdom",
    langCode: "en-GB",
    voiceByLangKey: "en",
  },
  punjabi_bilingual: {
    label: "English reply + Punjabi speech",
    translateToEnglish: true,
    showTranslation: true,
    translateForSpeech: true,
    filterQuery: "punjabi",
    langCode: "pa-IN",
    voiceByLangKey: "pa",
  },
};
`;
writeFileSync(join(root, "public/js/constants.js"), constSrc);

writeFileSync(
  join(root, "public/js/persistence.js"),
  slice(209, 224)
    .replace(/^function /gm, "export function ")
    .replace(/^async function /gm, "export async function ")
);

writeFileSync(
  join(root, "public/js/state.js"),
  `import { loadJSON } from "./persistence.js";
import { SETTINGS_KEY, THEME_KEY } from "./constants.js";

export let conversations = loadJSON("ai_chat_convos", []);
export let activeId = localStorage.getItem("ai_chat_active") || null;
export let settings = Object.assign(
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
    showTranslation: true,
    translateForSpeech: true,
    voiceByLang: {},
    speechMode: "custom",
  },
  loadJSON(SETTINGS_KEY, {})
);
export let currentController = null;
export let isGenerating = false;
export let searchQuery = "";
export let pendingAttachment = null;
export let activeTag = null;
export let googleVoices = [];
export let googleEnglishAccentGroups = [];
export let googlePunjabiGroup = null;
export let googleVoiceGroups = [];
export let googleTranslateEnabled = false;
export let googleVoiceCount = 0;
export let googleLanguageCount = 0;
export let voiceSearchQuery = "";
export let voicePickerOpen = false;
export let voiceLabelMap = new Map();
export let speakingAudio = null;
export let speakingBtn = null;
export let toastTimer = null;
export let pdfjsReady = null;
export let recognition = null;
export let listening = false;
export let clientLangNames = null;
try {
  clientLangNames = new Intl.DisplayNames(["en"], { type: "language" });
} catch {
  clientLangNames = null;
}
`
);

writeFileSync(
  join(root, "public/js/storage.js"),
  `import * as state from "./state.js";
import { CONVOS_KEY, ACTIVE_KEY, SETTINGS_KEY } from "./constants.js";
import { saveJSON } from "./persistence.js";

export function saveConvos() {
  saveJSON(CONVOS_KEY, state.conversations);
}
export function saveSettings() {
  saveJSON(SETTINGS_KEY, state.settings);
}
` +
    slice(233, 279)
      .replace(/^function /gm, "export function ")
      .replace(/^async function /gm, "export async function ")
      .replace(/\bconversations\b/g, "state.conversations")
      .replace(/\bactiveId\b/g, "state.activeId")
      .replace(/renderSidebar\(\);[\s\S]*?renderConversation\(\);/g, "")
      .replace(/if \(isMobile\(\)\) closeMobileSidebar\(\);/g, "")
);

function patchStateVars(code, vars) {
  for (const v of vars) {
    code = code.replace(new RegExp(`\\b${v}\\b`, "g"), `state.${v}`);
  }
  return code;
}

const stateVars = [
  "settings",
  "conversations",
  "activeId",
  "currentController",
  "isGenerating",
  "searchQuery",
  "pendingAttachment",
  "activeTag",
  "googleVoices",
  "googleEnglishAccentGroups",
  "googlePunjabiGroup",
  "googleVoiceGroups",
  "googleTranslateEnabled",
  "googleVoiceCount",
  "googleLanguageCount",
  "voiceSearchQuery",
  "voicePickerOpen",
  "voiceLabelMap",
  "speakingAudio",
  "speakingBtn",
  "toastTimer",
  "pdfjsReady",
  "recognition",
  "listening",
  "clientLangNames",
];

let utils = slice(281, 476)
  .replace(/^function /gm, "export function ")
  .replace(/^async function /gm, "export async function ")
  .replace(/^let toastTimer = null;\n/, "");
utils = `import * as state from "./state.js";
import * as dom from "./dom.js";

` + patchStateVars(utils, ["toastTimer"]);
utils = utils.replace(/\btoastEl\b/g, "dom.toastEl");
utils = utils.replace(/\bmessagesEl\b/g, "dom.messagesEl");
writeFileSync(join(root, "public/js/utils.js"), utils);

let voice = slice(1260, 1927)
  .replace(/^function /gm, "export function ")
  .replace(/^async function /gm, "export async function ")
  .replace(/^let speakingBtn = null;\n/, "");
voice =
  `import * as dom from "./dom.js";
import * as state from "./state.js";
import { ENGLISH_ACCENT_LABELS, LANG_ALIASES, QUICK_LANG_CHIPS, VOICE_PREVIEW, SPEECH_MODE_PRESETS } from "./constants.js";
import { showToast } from "./utils.js";
import { saveSettings } from "./storage.js";

` +
  patchStateVars(voice, stateVars);
voice = voice.replace(/\bvoiceSelect\b/g, "dom.voiceSelect");
voice = voice.replace(/\bvoiceSearchInput\b/g, "dom.voiceSearchInput");
voice = voice.replace(/\bvoiceLangChipsEl\b/g, "dom.voiceLangChipsEl");
voice = voice.replace(/\bvoiceMatchCountEl\b/g, "dom.voiceMatchCountEl");
voice = voice.replace(/\bpreviewVoiceBtn\b/g, "dom.previewVoiceBtn");
voice = voice.replace(/\bvoicePickerEl\b/g, "dom.voicePickerEl");
voice = voice.replace(/\bvoicePickerTrigger\b/g, "dom.voicePickerTrigger");
voice = voice.replace(/\bvoicePickerPanel\b/g, "dom.voicePickerPanel");
voice = voice.replace(/\bvoicePickerList\b/g, "dom.voicePickerList");
voice = voice.replace(/\bvoicePickerLabelEl\b/g, "dom.voicePickerLabelEl");
voice = voice.replace(/\bvoiceHint\b/g, "dom.voiceHint");
voice = voice.replace(/\bttsControls\b/g, "dom.ttsControls");
voice = voice.replace(/\btranslateToEnglishInput\b/g, "dom.translateToEnglishInput");
voice = voice.replace(/\bshowTranslationInput\b/g, "dom.showTranslationInput");
voice = voice.replace(/\btranslateForSpeechInput\b/g, "dom.translateForSpeechInput");
voice = voice.replace(/\breadAloudInput\b/g, "dom.readAloudInput");
voice = voice.replace(/\bspeechRateInput\b/g, "dom.speechRateInput");
voice = voice.replace(/\bspeechModeRowEl\b/g, "dom.speechModeRowEl");

voice += `
export function applySpeechMode(modeId) {
  const preset = SPEECH_MODE_PRESETS[modeId];
  if (!preset) return;
  state.settings.speechMode = modeId;
  state.settings.translateToEnglish = preset.translateToEnglish;
  state.settings.showTranslation = preset.showTranslation;
  state.settings.translateForSpeech = preset.translateForSpeech;
  state.voiceSearchQuery = preset.filterQuery.toLowerCase();
  if (dom.voiceSearchInput) dom.voiceSearchInput.value = preset.filterQuery;
  populateVoiceLangChips();
  populateVoices();
  let picked = null;
  let label = "Default voice";
  if (preset.voiceByLangKey === "pa" && state.googlePunjabiGroup?.voices?.length) {
    picked = state.googlePunjabiGroup.voices[0];
    label = picked.label;
  } else {
    const accent = state.googleEnglishAccentGroups.find((g) => g.langCode === preset.langCode);
    if (accent?.voices?.length) {
      picked = accent.voices[0];
      label = googleVoiceTitle(picked);
    }
  }
  if (picked) {
    const value = "google:" + picked.id;
    selectVoiceItem(value, label);
    state.settings.voiceByLang[preset.voiceByLangKey] = value;
  }
  if (dom.translateToEnglishInput) dom.translateToEnglishInput.checked = state.settings.translateToEnglish;
  if (dom.showTranslationInput) dom.showTranslationInput.checked = state.settings.showTranslation;
  if (dom.translateForSpeechInput) dom.translateForSpeechInput.checked = state.settings.translateForSpeech;
  saveSettings();
  showToast("Speech mode: " + preset.label);
}

export function initSpeechModeButtons() {
  if (!dom.speechModeRowEl) return;
  dom.speechModeRowEl.innerHTML = "";
  for (const [id, preset] of Object.entries(SPEECH_MODE_PRESETS)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.speechMode = id;
    btn.textContent = preset.label;
    if (state.settings.speechMode === id) btn.classList.add("active");
    btn.addEventListener("click", () => {
      applySpeechMode(id);
      dom.speechModeRowEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
    });
    dom.speechModeRowEl.appendChild(btn);
  }
}
`;

// patch selectVoiceItem to save voiceByLang - find in voice and add after setVoicePickerValue
voice = voice.replace(
  "setVoicePickerValue(value, label);",
  `setVoicePickerValue(value, label);
  if (value) {
    const lang = langFromVoiceName(value);
    const base = (lang.split("-")[0] || "").toLowerCase();
    if (base) {
      if (!state.settings.voiceByLang) state.settings.voiceByLang = {};
      state.settings.voiceByLang[base] = value;
      state.settings.speechMode = "custom";
    }
  }`
);

writeFileSync(join(root, "public/js/voice.js"), voice);

let settings = slice(819, 1102)
  .replace(/^function /gm, "export function ")
  .replace(/^async function /gm, "export async function ");
settings =
  `import * as dom from "./dom.js";
import * as state from "./state.js";
import { THEMES, ACCENTS, PRESETS, THEME_KEY, SPEECH_MODE_PRESETS } from "./constants.js";
import { saveSettings } from "./storage.js";
import { showToast } from "./utils.js";
import { loadGoogleVoices, populateVoices, populateVoiceLangChips, closeVoicePicker, setVoicePickerValue, applySpeechMode, initSpeechModeButtons } from "./voice.js";

` +
  patchStateVars(settings, ["settings", "voiceSearchQuery", "isGenerating", "currentController"]);
settings = settings.replace(/\bthemeToggleBtn\b/g, "dom.themeToggleBtn");
settings = settings.replace(/\bthemeSelect\b/g, "dom.themeSelect");
settings = settings.replace(/\baccentRow\b/g, "dom.accentRow");
settings = settings.replace(/\bsettingsModal\b/g, "dom.settingsModal");
settings = settings.replace(/\bopenSettingsBtn\b/g, "dom.openSettingsBtn");
settings = settings.replace(/\bsaveSettingsBtn\b/g, "dom.saveSettingsBtn");
settings = settings.replace(/\bresetSettingsBtn\b/g, "dom.resetSettingsBtn");
settings = settings.replace(/\bsystemPromptInput\b/g, "dom.systemPromptInput");
settings = settings.replace(/\breadAloudInput\b/g, "dom.readAloudInput");
settings = settings.replace(/\bpresetSelect\b/g, "dom.presetSelect");
settings = settings.replace(/\btemperatureInput\b/g, "dom.temperatureInput");
settings = settings.replace(/\btempValueEl\b/g, "dom.tempValueEl");
settings = settings.replace(/\bmaxLengthSelect\b/g, "dom.maxLengthSelect");
settings = settings.replace(/\bautoScrollInput\b/g, "dom.autoScrollInput");
settings = settings.replace(/\bvoiceSelect\b/g, "dom.voiceSelect");
settings = settings.replace(/\bspeechRateInput\b/g, "dom.speechRateInput");
settings = settings.replace(/\brateValueEl\b/g, "dom.rateValueEl");
settings = settings.replace(/\bvoiceSearchInput\b/g, "dom.voiceSearchInput");
settings = settings.replace(/\btranslateToEnglishInput\b/g, "dom.translateToEnglishInput");
settings = settings.replace(/\bshowTranslationInput\b/g, "dom.showTranslationInput");
settings = settings.replace(/\btranslateForSpeechInput\b/g, "dom.translateForSpeechInput");
settings = settings.replace(/\bsidebar\b/g, "dom.sidebar");
settings = settings.replace(/\bsidebarBackdrop\b/g, "dom.sidebarBackdrop");
settings = settings.replace(/\bnewConvoBtn\b/g, "dom.newConvoBtn");
settings = settings.replace(/\bsearchInput\b/g, "dom.searchInput");
settings = settings.replace(/\bexportBtn\b/g, "dom.exportBtn");
settings = settings.replace(/\bexportMenu\b/g, "dom.exportMenu");
settings = settings.replace(/\bappEl\b/g, "dom.appEl");
settings = settings.replace(/\btoggleSidebarBtn\b/g, "dom.toggleSidebarBtn");

settings += `
export function initSettings() {
  if (dom.voiceSearchInput) {
    dom.voiceSearchInput.addEventListener("input", () => {
      state.voiceSearchQuery = dom.voiceSearchInput.value.toLowerCase().trim();
      populateVoices();
      populateVoiceLangChips();
    });
  }
  if (dom.previewVoiceBtn) {
    dom.previewVoiceBtn.addEventListener("click", () => previewSelectedVoice());
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
`;

writeFileSync(join(root, "public/js/settings.js"), settings);

// chat: 478-818, 1103-1259, 1928-end minus startup
let chat = slice(478, 818) + "\n" + slice(1103, 1259) + "\n" + slice(1928, 2216);
chat = chat.replace(/^function /gm, "export function ").replace(/^async function /gm, "export async function ");
chat = chat.replace(/^const ATTACH_MAX = 30000;\n/, "const ATTACH_MAX = 30000;\n");
chat = chat.replace(/^let pdfjsReady = null;\n/, "");
chat = chat.replace(/^const SpeechRecognition =[\s\S]*?let listening = false;\n/, "");

chat =
  `import * as dom from "./dom.js";
import * as state from "./state.js";
import { WELCOME, SUGGESTIONS, THEME_KEY } from "./constants.js";
import { saveConvos, saveSettings, newConversation, getActive, deleteConversation, switchConversation, maybeAutoTitle } from "./storage.js";
import { renderMarkdown, toPlainText, showToast, formatTime, estimateTokens, scrollToBottom, nearBottom, enhanceCodeBlocks, makeMetaButton } from "./utils.js";
import { speak, playSpeech, makeSpeakButton, stopAllSpeech, loadGoogleVoices, populateVoices, closeVoicePicker } from "./voice.js";
import { openSettings, closeSettings, applyTheme, applyAccent, populateThemeControls, markSelectedAccent, populatePresets, initSettings, isMobile, openMobileSidebar, closeMobileSidebar, exportConversation, download } from "./settings.js";

const ATTACH_MAX = 30000;

` +
  patchStateVars(chat, stateVars);

const domNames = readFileSync(join(root, "public/js/dom.js"), "utf8").match(/export const (\w+)/g).map((s) => s.replace("export const ", ""));
for (const name of domNames) {
  if (name === "speechModeRowEl") continue;
  chat = chat.replace(new RegExp(`\\b${name}\\b`, "g"), `dom.${name}`);
}

// fix deleteConversation to render after delete
chat = chat.replace(
  /deleteConversation\(convo\.id\);/,
  "deleteConversation(convo.id); renderSidebar(); renderConversation();"
);
chat = chat.replace(
  /switchConversation\(convo\.id\);/,
  "switchConversation(convo.id); renderSidebar(); renderConversation(); if (isMobile()) closeMobileSidebar();"
);

writeFileSync(join(root, "public/js/chat.js"), chat);

writeFileSync(
  join(root, "public/js/main.js"),
  `import * as state from "./state.js";
import * as dom from "./dom.js";
import { applyTheme, applyAccent, populateThemeControls, populatePresets, initSettings } from "./settings.js";
import { loadGoogleVoices, populateVoices } from "./voice.js";
import { newConversation, saveConvos } from "./storage.js";
import { renderSidebar, renderConversation, loadModels } from "./chat.js";

export function boot() {
  applyTheme(state.settings.theme || "dark");
  applyAccent(state.settings.accent || "");
  populateThemeControls();
  populatePresets();
  initSettings();
  if (window.speechSynthesis) {
    loadGoogleVoices().then(() => populateVoices());
  }
  if (state.conversations.length === 0) newConversation();
  renderSidebar();
  renderConversation();
  loadModels();
  dom.input.focus();
}
`
);

console.log("build-final complete");
