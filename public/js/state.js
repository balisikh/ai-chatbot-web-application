import { loadJSON } from "./persistence.js";
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
