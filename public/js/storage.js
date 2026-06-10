import * as state from "./state.js";
import { CONVOS_KEY, ACTIVE_KEY, SETTINGS_KEY } from "./constants.js";
import { saveJSON } from "./persistence.js";

export function saveConvos() {
  saveJSON(CONVOS_KEY, state.conversations);
}
export function saveSettings() {
  saveJSON(SETTINGS_KEY, state.settings);
}

export function newConversation() {
  const convo = {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    title: "New chat",
    messages: [],
    pinned: false,
    tags: [],
    createdAt: new Date().toISOString(),
  };
  state.conversations.unshift(convo);
  state.activeId = convo.id;
  localStorage.setItem(ACTIVE_KEY, state.activeId);
  saveConvos();
  return convo;
}
export function getActive() {
  let convo = state.conversations.find((c) => c.id === state.activeId);
  if (!convo) {
    convo = state.conversations[0] || newConversation();
    state.activeId = convo.id;
    localStorage.setItem(ACTIVE_KEY, state.activeId);
  }
  return convo;
}
export function deleteConversation(id) {
  state.conversations = state.conversations.filter((c) => c.id !== id);
  if (state.activeId === id) {
    state.activeId = state.conversations[0]?.id || null;
    if (!state.activeId) newConversation();
    else localStorage.setItem(ACTIVE_KEY, state.activeId);
  }
  saveConvos();
  
}
export function switchConversation(id) {
  state.activeId = id;
  localStorage.setItem(ACTIVE_KEY, id);
  
  
}
export function maybeAutoTitle(convo, firstText) {
  if (convo.title === "New chat" && firstText) {
    convo.title = firstText.slice(0, 32) + (firstText.length > 32 ? "..." : "");
  }
}
