import { ref } from "vue";
import Utils from "./utils.js";

// session.js imports this module to clear history on sign-out.
// Do not import session.js from here; that cycle would load session before storage is ready.

export const ASSISTANT_HISTORY_KEY = "assistantHistory";

export const assistantOpen = ref(false);

export function toggleAssistant() {
  assistantOpen.value = !assistantOpen.value;
}

export function closeAssistant() {
  assistantOpen.value = false;
}

function signedIn() {
  return Boolean(Utils.getStore("user")?.token);
}

function emptyHistory() {
  return { messages: [], draft: null };
}

function storage() {
  if (typeof sessionStorage === "undefined" || sessionStorage === null) {
    return null;
  }
  return sessionStorage;
}

function normalizeMessages(value) {
  if (!Array.isArray(value)) return [];
  const messages = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.role !== "user" && entry.role !== "assistant") continue;
    messages.push({
      role: entry.role,
      content: typeof entry.content === "string" ? entry.content : "",
    });
  }
  return messages;
}

function normalizeDraft(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

export function loadAssistantHistory() {
  const store = storage();
  if (!store) return emptyHistory();

  const raw = store.getItem(ASSISTANT_HISTORY_KEY);
  if (!raw) return emptyHistory();

  try {
    const parsed = JSON.parse(raw);
    return {
      messages: normalizeMessages(parsed?.messages),
      draft: normalizeDraft(parsed?.draft),
    };
  } catch {
    return emptyHistory();
  }
}

export function saveAssistantHistory(state) {
  const store = storage();
  if (!store || !signedIn()) return;

  const messages = normalizeMessages(state?.messages);
  const draft = normalizeDraft(state?.draft);
  if (messages.length === 0 && draft == null) {
    store.removeItem(ASSISTANT_HISTORY_KEY);
    return;
  }

  store.setItem(ASSISTANT_HISTORY_KEY, JSON.stringify({ messages, draft }));
}

export function clearAssistantHistory() {
  storage()?.removeItem(ASSISTANT_HISTORY_KEY);
}
