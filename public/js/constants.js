// --- Storage keys ---------------------------------------------------------
export const CONVOS_KEY = "ai_chat_convos";
export const ACTIVE_KEY = "ai_chat_active";
export const SETTINGS_KEY = "ai_chat_settings";
export const THEME_KEY = "ai_chat_theme";

export const WELCOME = "Hi! I'm your AI assistant. Ask me anything to get started.";
export const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a short poem about the sea",
  "Give me 3 dinner ideas",
  "How do I stay productive?",
];

export const THEMES = [
  { id: "dark", label: "Dark (default)" },
  { id: "light", label: "Light" },
  { id: "midnight", label: "Midnight" },
  { id: "forest", label: "Forest" },
  { id: "solar", label: "Solar" },
  { id: "rose", label: "Rose" },
];
export const ACCENTS = ["#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#14b8a6"];

export const PRESETS = {
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

export const ENGLISH_ACCENT_LABELS = {
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

export const LANG_ALIASES = {
  english: ["en", "english", "en-us", "en-gb", "united states", "united kingdom"],
  punjabi: ["pa", "punjabi", "panjabi", "pa-in"],
  hindi: ["hi", "hindi", "hi-in"],
  urdu: ["ur", "urdu", "ur-pk"],
  spanish: ["es", "spanish", "espanol"],
  french: ["fr", "french", "francais"],
  arabic: ["ar", "arabic"],
  chinese: ["zh", "chinese", "mandarin"],
  german: ["de", "german"],
  italian: ["it", "italian"],
  portuguese: ["pt", "portuguese"],
  bengali: ["bn", "bengali"],
  tamil: ["ta", "tamil"],
  telugu: ["te", "telugu"],
  marathi: ["mr", "marathi"],
  gujarati: ["gu", "gujarati"],
  japanese: ["ja", "japanese"],
  korean: ["ko", "korean"],
  turkish: ["tr", "turkish"],
  russian: ["ru", "russian"],
  vietnamese: ["vi", "vietnamese"],
  thai: ["th", "thai"],
};

export const QUICK_LANG_CHIPS = [
  { label: "All", query: "" },
  { label: "English US", query: "united states" },
  { label: "English UK", query: "united kingdom" },
  { label: "Punjabi", query: "punjabi" },
  { label: "Hindi", query: "hindi" },
  { label: "Urdu", query: "urdu" },
  { label: "Spanish", query: "spanish" },
  { label: "French", query: "french" },
  { label: "Arabic", query: "arabic" },
  { label: "Chinese", query: "chinese" },
];

export const VOICE_PREVIEW = {
  en: "Hello. This is a sample of how this voice sounds.",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਇਹ ਮੇਰੀ ਆਵਾਜ਼ ਦਾ ਨਮੂਨਾ ਹੈ।",
  hi: "नमस्ते। यह मेरी आवाज़ का नमूना है।",
  ur: "السلام علیکم۔ یہ میری آواز کا نمونہ ہے۔",
  es: "Hola. Esta es una muestra de mi voz.",
  fr: "Bonjour. Ceci est un échantillon de ma voix.",
  de: "Hallo. Das ist eine Hörprobe meiner Stimme.",
  ar: "مرحباً. هذا عينة من صوتي.",
  zh: "你好。这是我声音的样本。",
};
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
