/**
 * Builds ES modules from public/app.js into public/js/
 * Run: node scripts/build-js-modules.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");
const src = readFileSync(join(root, "public/app.js"), "utf8");
const lines = src.split("\n");
const slice = (s, e) => lines.slice(s, e).join("\n");
const exportFns = (code) =>
  code
    .replace(/^function /gm, "export function ")
    .replace(/^async function /gm, "export async function ");

mkdirSync(join(root, "public/js"), { recursive: true });

writeFileSync(
  join(root, "public/js/dom.js"),
  slice(0, 58).replace(/^const /gm, "export const ") +
    "\nexport const speechModeRowEl = document.getElementById(\"speech-mode-row\");\n"
);

writeFileSync(
  join(root, "public/js/constants.js"),
  slice(59, 97)
    .replace(/^const /gm, "export const ")
    .concat("\n")
    .concat(
      slice(137, 207).replace(/^const /gm, "export const ")
    )
    .concat(`
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
`)
);

writeFileSync(
  join(root, "public/js/persistence.js"),
  exportFns(slice(208, 230))
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
  `import { conversations, activeId, settings } from "./state.js";
import { CONVOS_KEY, ACTIVE_KEY, SETTINGS_KEY } from "./constants.js";
import { loadJSON, saveJSON } from "./persistence.js";

` + exportFns(slice(225, 279))
);

writeFileSync(
  join(root, "public/js/utils.js"),
  `import { toastTimer } from "./state.js";
import * as dom from "./dom.js";

` + exportFns(slice(280, 477))
);

writeFileSync(
  join(root, "public/js/voice.js"),
  `import * as dom from "./dom.js";
import {
  settings,
  voiceSearchQuery,
  googleVoices,
  googleEnglishAccentGroups,
  googlePunjabiGroup,
  googleVoiceGroups,
  googleTranslateEnabled,
  googleVoiceCount,
  googleLanguageCount,
  speakingAudio,
  speakingBtn,
  clientLangNames,
  voicePickerOpen,
  voiceLabelMap,
} from "./state.js";
import {
  ENGLISH_ACCENT_LABELS,
  LANG_ALIASES,
  QUICK_LANG_CHIPS,
  VOICE_PREVIEW,
  SPEECH_MODE_PRESETS,
} from "./constants.js";
import { showToast } from "./utils.js";

` + exportFns(slice(1261, 1927))
);

writeFileSync(
  join(root, "public/js/settings.js"),
  `import * as dom from "./dom.js";
import { settings } from "./state.js";
import { THEMES, ACCENTS, PRESETS, THEME_KEY, SPEECH_MODE_PRESETS } from "./constants.js";
import { saveSettings } from "./storage.js";
import { showToast } from "./utils.js";
import {
  loadGoogleVoices,
  populateVoices,
  populateVoiceLangChips,
  closeVoicePicker,
  setVoicePickerValue,
  applySpeechMode,
  initSpeechModeButtons,
} from "./voice.js";

` +
    exportFns(slice(820, 982)) +
    "\n" +
    exportFns(slice(983, 1103))
);

writeFileSync(
  join(root, "public/js/chat.js"),
  `import * as dom from "./dom.js";
import {
  conversations,
  activeId,
  settings,
  currentController,
  isGenerating,
  searchQuery,
  pendingAttachment,
  activeTag,
  pdfjsReady,
  recognition,
  listening,
} from "./state.js";
import { WELCOME, SUGGESTIONS, THEME_KEY } from "./constants.js";
import {
  saveConvos,
  saveSettings,
  newConversation,
  getActive,
  deleteConversation,
  switchConversation,
  maybeAutoTitle,
} from "./storage.js";
import {
  renderMarkdown,
  toPlainText,
  showToast,
  formatTime,
  estimateTokens,
  scrollToBottom,
  nearBottom,
  enhanceCodeBlocks,
  makeMetaButton,
  download,
} from "./utils.js";
import { speak, playSpeech, makeSpeakButton, stopAllSpeech, loadGoogleVoices, populateVoices } from "./voice.js";
import {
  openSettings,
  closeSettings,
  applyTheme,
  applyAccent,
  populateThemeControls,
  markSelectedAccent,
  populatePresets,
  initSettings,
} from "./settings.js";

` +
    exportFns(slice(478, 819)) +
    "\n" +
    exportFns(slice(1104, 1260)) +
    "\n" +
    exportFns(slice(1928, 2229))
);

console.log("Built public/js modules");
