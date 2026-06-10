import * as dom from "./dom.js";
import * as state from "./state.js";
import { ENGLISH_ACCENT_LABELS, LANG_ALIASES, QUICK_LANG_CHIPS, VOICE_PREVIEW, SPEECH_MODE_PRESETS } from "./constants.js";
import { showToast } from "./utils.js";
import { saveSettings } from "./storage.js";

export function applyVoiceSettings(utter) {
  utter.rate = state.settings.speechRate || 1;
  if (state.settings.voiceName && window.speechSynthesis) {
    const v = window.speechSynthesis
      .getVoices()
      .find((x) => x.name === state.settings.voiceName);
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
export function stopAllSpeech() {
  window.speechSynthesis?.cancel();
  if (state.speakingAudio) {
    state.speakingAudio.pause();
    state.speakingAudio = null;
  }
}

export async function loadGoogleVoices() {
  try {
    const res = await fetch("/api/speech/voices");
    const data = await res.json();
    state.googleVoices = data.googleEnabled ? data.state.googleVoices || [] : [];
    state.googleEnglishAccentGroups = data.englishAccentGroups || [];
    state.googlePunjabiGroup = data.punjabiGroup || null;
    state.googleVoiceGroups = data.voiceGroups || [];
    state.googleTranslateEnabled = !!data.translateEnabled;
    state.googleVoiceCount = data.voiceCount || state.googleVoices.length;
    state.googleLanguageCount =
      data.languageCount ||
      state.googleEnglishAccentGroups.length + state.googleVoiceGroups.length;
    if (data.error) showToast("Google voices: " + data.error);
  } catch {
    state.googleVoices = [];
    state.googleEnglishAccentGroups = [];
    state.googlePunjabiGroup = null;
    state.googleVoiceGroups = [];
    state.googleTranslateEnabled = false;
    state.googleVoiceCount = 0;
    state.googleLanguageCount = 0;
  }
}

export async function translateText(text, target, source) {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target, source }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Translation failed");
  return data;
}

export function getSelectedVoiceLang() {
  if (state.settings.voiceName?.startsWith("google:")) {
    const id = state.settings.voiceName.slice(7);
    const v = state.googleVoices.find((x) => x.id === id);
    return v?.lang || "";
  }
  if (state.settings.voiceName && window.speechSynthesis) {
    const v = window.speechSynthesis
      .getVoices()
      .find((x) => x.name === state.settings.voiceName);
    return v?.lang || "";
  }
  return "";
}

export function speechTranslateTarget(lang) {
  if (!lang) return null;
  const base = lang.split("-")[0].toLowerCase();
  if (base === "en") return null;
  return base;
}

export function langFromVoiceName(voiceName) {
  if (voiceName?.startsWith("google:")) {
    const id = voiceName.slice(7);
    const v = state.googleVoices.find((x) => x.id === id);
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

export function previewTextForVoice(voiceName) {
  const lang = langFromVoiceName(voiceName);
  const base = (lang.split("-")[0] || "en").toLowerCase();
  return VOICE_PREVIEW[base] || VOICE_PREVIEW.en;
}

export async function prepareSpeechText(text, { skipTranslate = false } = {}) {
  let plain = toPlainText(text || "").trim();
  if (!plain) return "";
  const target = speechTranslateTarget(getSelectedVoiceLang());
  if (
    !skipTranslate &&
    state.settings.translateForSpeech &&
    target &&
    state.googleTranslateEnabled
  ) {
    try {
      const data = await translateText(plain, target);
      if (data.translatedText) return data.translatedText;
    } catch {
      /* speak original English if translation fails */
    }
  }
  return plain;
}

export function languageLabel(langCode) {
  if (!langCode) return "";
  const base = langCode.split("-")[0];
  try {
    return state.clientLangNames?.of(base) || langCode;
  } catch {
    return langCode;
  }
}

export function voiceSearchTerms(q) {
  const terms = [q];
  const lower = q.toLowerCase().trim();
  if (!lower) return terms;
  for (const [name, codes] of Object.entries(LANG_ALIASES)) {
    if (name.includes(lower) || lower.includes(name)) {
      terms.push(name, ...codes);
    }
    for (const code of codes) {
      if (lower === code || lower.startsWith(code + "-")) terms.push(code);
    }
  }
  return [...new Set(terms.filter(Boolean))];
}

export function matchesVoiceFilter(q, parts) {
  if (!q) return true;
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return voiceSearchTerms(q).some((term) => haystack.includes(term.toLowerCase()));
}

export function setVoicePickerValue(value, displayLabel) {
  if (dom.voiceSelect) dom.voiceSelect.value = value;
  if (dom.voicePickerLabelEl) {
    dom.voicePickerLabelEl.textContent = displayLabel || "Default voice";
  }
}

export function openVoicePicker() {
  state.voicePickerOpen = true;
  dom.voicePickerPanel?.classList.remove("hidden");
  dom.voicePickerTrigger?.classList.add("open");
  dom.voicePickerTrigger?.setAttribute("aria-expanded", "true");
}

export function closeVoicePicker() {
  state.voicePickerOpen = false;
  dom.voicePickerPanel?.classList.add("hidden");
  dom.voicePickerTrigger?.classList.remove("open");
  dom.voicePickerTrigger?.setAttribute("aria-expanded", "false");
}

export function selectVoiceItem(value, label) {
  setVoicePickerValue(value, label);
  if (value) {
    const lang = langFromVoiceName(value);
    const base = (lang.split("-")[0] || "").toLowerCase();
    if (base) {
      if (!state.settings.voiceByLang) state.settings.voiceByLang = {};
      state.settings.voiceByLang[base] = value;
      state.settings.speechMode = "custom";
    }
  }
  if (dom.voicePickerList) {
    dom.voicePickerList.querySelectorAll(".voice-picker-item").forEach((el) => {
      el.classList.toggle("selected", el.dataset.value === value);
    });
  }
  closeVoicePicker();
}

export function registerVoiceLabel(value, label) {
  if (value) state.voiceLabelMap.set(value, label);
}

export function collectVoiceGroup(label, voices, valueFn, titleFn, metaFn) {
  if (!voices.length) return null;
  const items = voices.map((v) => {
    const value = valueFn(v);
    const title = titleFn(v);
    const meta = metaFn ? metaFn(v) : "";
    registerVoiceLabel(value, title);
    return { value, title, meta, displayLabel: title };
  });
  return { label, items };
}

export function renderVoicePickerList(groups, emptyMessage) {
  if (!dom.voicePickerList) return;
  dom.voicePickerList.innerHTML = "";

  const def = document.createElement("button");
  def.type = "button";
  def.className = "voice-picker-item";
  def.dataset.value = "";
  const defTitle = document.createElement("span");
  defTitle.className = "voice-picker-item-title";
  defTitle.textContent = "Default voice";
  def.appendChild(defTitle);
  if (!dom.voiceSelect?.value) def.classList.add("selected");
  def.addEventListener("click", () => selectVoiceItem("", "Default voice"));
  dom.voicePickerList.appendChild(def);

  if (!groups.length && emptyMessage) {
    const empty = document.createElement("div");
    empty.className = "voice-picker-empty";
    empty.textContent = emptyMessage;
    dom.voicePickerList.appendChild(empty);
    return;
  }

  for (const group of groups) {
    const header = document.createElement("div");
    header.className = "voice-picker-group-label";
    header.textContent = group.label;
    dom.voicePickerList.appendChild(header);

    for (const item of group.items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "voice-picker-item";
      btn.dataset.value = item.value;
      const title = document.createElement("span");
      title.className = "voice-picker-item-title";
      title.textContent = item.title;
      btn.appendChild(title);
      if (item.meta) {
        const meta = document.createElement("span");
        meta.className = "voice-picker-item-meta";
        meta.textContent = item.meta;
        btn.appendChild(meta);
      }
      if (dom.voiceSelect?.value === item.value) btn.classList.add("selected");
      btn.addEventListener("click", () =>
        selectVoiceItem(item.value, item.displayLabel)
      );
      dom.voicePickerList.appendChild(btn);
    }
  }
}

export function googleVoiceTitle(v) {
  if (v.label?.startsWith("Google Punjabi")) return v.label;
  const g =
    v.gender === "male" ? "Male" : v.gender === "female" ? "Female" : "Voice";
  return `${g} · ${v.tier}`;
}

export function groupBrowserVoices(browserVoices) {
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

export function populateVoiceLangChips() {
  if (!dom.voiceLangChipsEl) return;
  dom.voiceLangChipsEl.innerHTML = "";
  for (const chip of QUICK_LANG_CHIPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = chip.label;
    const active =
      chip.query === ""
        ? !state.voiceSearchQuery
        : state.voiceSearchQuery === chip.query.toLowerCase();
    if (active) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.voiceSearchQuery = chip.query.toLowerCase();
      if (dom.voiceSearchInput) dom.voiceSearchInput.value = chip.query;
      populateVoices();
      populateVoiceLangChips();
    });
    dom.voiceLangChipsEl.appendChild(btn);
  }
}

export function updateVoiceMatchCount(count, filtered) {
  if (!dom.voiceMatchCountEl) return;
  if (!filtered) {
    dom.voiceMatchCountEl.textContent = count ? `${count} voices available` : "";
    return;
  }
  dom.voiceMatchCountEl.textContent = count
    ? `${count} voice${count === 1 ? "" : "s"} match`
    : "No matches";
}

export async function previewSelectedVoice() {
  const voiceName = dom.voiceSelect?.value;
  if (!voiceName) {
    showToast("Pick a voice from the list first");
    return;
  }
  const prev = state.settings.voiceName;
  state.settings.voiceName = voiceName;
  const sample = previewTextForVoice(voiceName);
  showToast("Playing voice preview…");
  try {
    await playSpeech(sample, { skipTranslate: true });
  } finally {
    state.settings.voiceName = prev;
  }
}

export function updateVoiceHint(matchCount = 0) {
  if (!dom.voiceHint) return;
  dom.voiceHint.classList.remove("hidden");
  if (state.voiceSearchQuery && matchCount === 0) {
    dom.voiceHint.textContent =
      `No voices matched "${state.voiceSearchQuery}". Try a chip above or search: United Kingdom, Punjabi, Hindi.`;
    return;
  }
  if (state.googleVoices.length > 0) {
    const paCount = state.googlePunjabiGroup?.voices?.length || 0;
    dom.voiceHint.textContent =
      `${state.googleLanguageCount} languages, ${state.googleVoiceCount} Google voices` +
      (paCount ? ` (including ${paCount} Punjabi)` : "") +
      ". English by accent; Punjabi male & female below. Enable translation toggles above.";
    return;
  }
  dom.voiceHint.textContent =
    "English browser voices work without a key. For all accents and languages, add " +
    "GOOGLE_CLOUD_TTS_API_KEY to .env (enable Text-to-Speech + Translation APIs), " +
    "then restart the server.";
}

export function buildVoiceLabelMap(browserVoices) {
  state.voiceLabelMap = new Map();
  for (const g of state.googleEnglishAccentGroups) {
    collectVoiceGroup(
      "",
      g.voices,
      (v) => "google:" + v.id,
      googleVoiceTitle,
      (v) => v.lang
    );
  }
  if (state.googlePunjabiGroup?.voices?.length) {
    collectVoiceGroup(
      "",
      state.googlePunjabiGroup.voices,
      (v) => "google:" + v.id,
      (v) => v.label,
      (v) => v.lang
    );
  }
  for (const g of state.googleVoiceGroups) {
    collectVoiceGroup(
      "",
      g.voices,
      (v) => "google:" + v.id,
      googleVoiceTitle,
      (v) => v.lang
    );
  }
  const browserGroups = groupBrowserVoices(browserVoices);
  for (const g of browserGroups) {
    collectVoiceGroup(
      "",
      g.voices,
      (v) => v.name,
      (v) => v.name,
      (v) => v.lang
    );
  }
}

export function populateVoices() {
  const hasBrowserTts = !!window.speechSynthesis;
  if (!hasBrowserTts && !state.googleVoices.length) {
    if (dom.ttsControls) dom.ttsControls.style.display = "none";
    return;
  }
  if (dom.ttsControls) dom.ttsControls.style.display = "";

  const browserVoices = hasBrowserTts
    ? window.speechSynthesis.getVoices()
    : [];
  const saved = state.settings.voiceName;
  const q = state.voiceSearchQuery;
  buildVoiceLabelMap(browserVoices);

  const groups = [];
  let totalShown = 0;

  for (const g of state.googleEnglishAccentGroups) {
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
    const group = collectVoiceGroup(
      `Google — ${g.label}`,
      voices,
      (v) => "google:" + v.id,
      googleVoiceTitle,
      (v) => v.lang
    );
    if (group) {
      groups.push(group);
      totalShown += voices.length;
    }
  }

  if (state.googlePunjabiGroup?.voices?.length) {
    const g = state.googlePunjabiGroup;
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
    const group = collectVoiceGroup(
      "Google — Punjabi",
      voices,
      (v) => "google:" + v.id,
      (v) => v.label,
      (v) => v.lang
    );
    if (group) {
      groups.push(group);
      totalShown += voices.length;
    }
  }

  for (const g of state.googleVoiceGroups) {
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
    const group = collectVoiceGroup(
      `Google — ${g.label}`,
      voices,
      (v) => "google:" + v.id,
      googleVoiceTitle,
      (v) => v.lang
    );
    if (group) {
      groups.push(group);
      totalShown += voices.length;
    }
  }

  const browserGroups = groupBrowserVoices(browserVoices);
  for (const g of browserGroups) {
    const voices = q
      ? g.voices.filter((v) =>
          matchesVoiceFilter(q, [g.label, v.name, v.lang])
        )
      : g.voices;
    const group = collectVoiceGroup(
      g.label,
      voices,
      (v) => v.name,
      (v) => v.name,
      (v) => v.lang
    );
    if (group) {
      groups.push(group);
      totalShown += voices.length;
    }
  }

  const emptyMessage =
    q && totalShown === 0
      ? state.googleVoices.length
        ? "No match — try another language name or accent"
        : "No match — add GOOGLE_CLOUD_TTS_API_KEY for more languages"
      : "";

  renderVoicePickerList(groups, emptyMessage);

  const savedLabel =
    saved && state.voiceLabelMap.has(saved)
      ? state.voiceLabelMap.get(saved)
      : saved
      ? saved
      : "Default voice";
  setVoicePickerValue(saved || "", saved ? savedLabel : "Default voice");

  if (state.voicePickerOpen && q) openVoicePicker();

  updateVoiceMatchCount(totalShown, q);
  updateVoiceHint(totalShown);
}

// Chrome/Edge often ignore speak() if it runs in the same tick as cancel().
export async function playSpeech(text, { onStart, onEnd, skipTranslate = false } = {}) {
  const plain = await prepareSpeechText(text, { skipTranslate });
  if (!plain) {
    showToast("Nothing to read aloud");
    onEnd?.();
    return;
  }

  // Google Cloud TTS (real Google Punjabi / English voices).
  if (state.settings.voiceName?.startsWith("google:")) {
    const voiceId = state.settings.voiceName.slice(7);
    try {
      const res = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: plain,
          voiceName: voiceId,
          rate: state.settings.speechRate || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "TTS failed");
      stopAllSpeech();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      state.speakingAudio = audio;
      onStart?.();
      audio.onended = () => {
        if (state.speakingAudio === audio) state.speakingAudio = null;
        onEnd?.();
      };
      audio.onerror = () => {
        if (state.speakingAudio === audio) state.speakingAudio = null;
        showToast("Could not play Google voice audio");
        onEnd?.();
      };
      await audio.play();
    } catch (err) {
      showToast(err.message || "Google voice failed — check API key in .env");
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
export function speak(text) {
  if (!state.settings.readAloud || !window.speechSynthesis) return;
  playSpeech(text);
}

export function resetSpeakBtn(btn) {
  btn.textContent = "\u{1F50A}";
  btn.title = "Read this reply aloud";
  btn.classList.remove("active");
}
export function makeSpeakButton(getText) {
  const btn = document.createElement("button");
  btn.className = "meta-btn speak-btn";
  resetSpeakBtn(btn);
  btn.addEventListener("click", () => {
    const wasThis = state.speakingBtn === btn;
    stopAllSpeech();
    if (state.speakingBtn) {
      resetSpeakBtn(state.speakingBtn);
      state.speakingBtn = null;
    }
    if (wasThis) return; // second click = stop
    playSpeech(getText(), {
      onStart: () => {
        state.speakingBtn = btn;
        btn.textContent = "\u23F9";
        btn.title = "Stop";
        btn.classList.add("active");
      },
      onEnd: () => {
        if (state.speakingBtn === btn) {
          resetSpeakBtn(btn);
          state.speakingBtn = null;
        }
      },
    });
  });
  return btn;
}
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
