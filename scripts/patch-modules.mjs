import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");
const domKeys = readFileSync(join(root, "public/js/dom.js"), "utf8")
  .match(/export const (\w+)/g)
  .map((s) => s.replace("export const ", ""));

const destructure =
  `import * as dom from "./dom.js";\nconst { ${domKeys.join(", ")} } = dom;\nimport * as state from "./state.js";\n`;

const voiceHeader = `import * as dom from "./dom.js";
const { voiceSelect, voiceSearchInput, voiceLangChipsEl, voiceMatchCountEl, previewVoiceBtn, voicePickerEl, voicePickerTrigger, voicePickerPanel, voicePickerList, voicePickerLabelEl, voiceHint, ttsControls, translateToEnglishInput, showTranslationInput, translateForSpeechInput, readAloudInput, speechRateInput, speechModeRowEl } = dom;
import * as state from "./state.js";
import { ENGLISH_ACCENT_LABELS, LANG_ALIASES, QUICK_LANG_CHIPS, VOICE_PREVIEW, SPEECH_MODE_PRESETS } from "./constants.js";
import { showToast } from "./utils.js";
import { saveSettings } from "./storage.js";

`;

function stripImports(code) {
  return code.replace(/^import[\s\S]*?\n\n/, "");
}

let utils = readFileSync(join(root, "public/js/utils.js"), "utf8");
utils = destructure + stripImports(utils);
utils = utils.replace(/\btoastEl\b/g, "dom.toastEl");
utils = utils.replace(/\bmessagesEl\b/g, "dom.messagesEl");
writeFileSync(join(root, "public/js/utils.js"), utils);

let voice = readFileSync(join(root, "public/js/voice.js"), "utf8");
voice = voiceHeader + stripImports(voice);
// state vars
for (const key of [
  "settings",
  "voiceSearchQuery",
  "googleVoices",
  "googleEnglishAccentGroups",
  "googlePunjabiGroup",
  "googleVoiceGroups",
  "googleTranslateEnabled",
  "googleVoiceCount",
  "googleLanguageCount",
  "speakingAudio",
  "speakingBtn",
  "clientLangNames",
  "voicePickerOpen",
  "voiceLabelMap",
]) {
  voice = voice.replace(new RegExp(`\\b${key}\\b`, "g"), `state.${key}`);
}
writeFileSync(join(root, "public/js/voice.js"), voice);

let settings = readFileSync(join(root, "public/js/settings.js"), "utf8");
settings =
  destructure +
  `import { THEMES, ACCENTS, PRESETS, THEME_KEY, SPEECH_MODE_PRESETS } from "./constants.js";
import { saveSettings } from "./storage.js";
import { showToast } from "./utils.js";
import { loadGoogleVoices, populateVoices, populateVoiceLangChips, closeVoicePicker, setVoicePickerValue, applySpeechMode, initSpeechModeButtons } from "./voice.js";

` +
  stripImports(settings);
settings = settings.replace(/\bsettings\b/g, "state.settings");
writeFileSync(join(root, "public/js/settings.js"), settings);

let chat = readFileSync(join(root, "public/js/chat.js"), "utf8");
chat =
  destructure +
  `import { WELCOME, SUGGESTIONS, THEME_KEY } from "./constants.js";
import { saveConvos, saveSettings, newConversation, getActive, deleteConversation, switchConversation, maybeAutoTitle } from "./storage.js";
import { renderMarkdown, toPlainText, showToast, formatTime, estimateTokens, scrollToBottom, nearBottom, enhanceCodeBlocks, makeMetaButton, download } from "./utils.js";
import { speak, playSpeech, makeSpeakButton, stopAllSpeech, loadGoogleVoices, populateVoices, closeVoicePicker } from "./voice.js";
import { openSettings, closeSettings, applyTheme, applyAccent, populateThemeControls, markSelectedAccent, populatePresets, initSettings } from "./settings.js";

` +
  stripImports(chat);
for (const key of [
  "conversations",
  "activeId",
  "settings",
  "currentController",
  "isGenerating",
  "searchQuery",
  "pendingAttachment",
  "activeTag",
  "pdfjsReady",
  "recognition",
  "listening",
  "voicePickerOpen",
]) {
  chat = chat.replace(new RegExp(`\\b${key}\\b`, "g"), `state.${key}`);
}
writeFileSync(join(root, "public/js/chat.js"), chat);

console.log("patched");
