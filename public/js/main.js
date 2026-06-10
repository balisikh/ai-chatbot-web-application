import * as state from "./state.js";
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
