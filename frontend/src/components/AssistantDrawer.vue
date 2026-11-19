<script setup>
import { computed, nextTick, ref, watch } from "vue";
import {
  assistantOpen,
  closeAssistant,
  loadAssistantHistory,
  saveAssistantHistory,
} from "../config/assistantState.js";
import { assistantMessageIsWide } from "../config/assistantFormat.js";
import { currentUser } from "../config/session.js";
import { chat } from "../services/assistantServices.js";
import AssistantMessage from "./AssistantMessage.vue";
import ReservationDraftCard from "./ReservationDraftCard.vue";
import TripRequestForm from "./TripRequestForm.vue";

const ASSISTANT_ERROR = "The assistant could not answer right now. Please try again.";
const MAX_CHAT_MESSAGES = 20;

const FLEET_ROLES = new Set(["area_admin", "admin", "system_admin", "maintenance"]);

const saved = loadAssistantHistory();
const messages = ref(saved.messages);
const draft = ref(saved.draft);
const input = ref("");
const sending = ref(false);
const errorMessage = ref("");
const messageInput = ref(null);
const scrollPane = ref(null);
let requestSerial = 0;

const canSend = computed(() => String(input.value ?? "").trim().length > 0 && !sending.value);
const canBook = computed(() => currentUser.value?.role !== "maintenance");
const bookingRequested = computed(
  () => canBook.value && messages.value.some((message) => message.role === "user" && asksToBook(message.content))
);
const suggestions = computed(() => {
  const role = currentUser.value?.role;
  if (role === "maintenance") {
    return [
      "Which vehicles are available?",
      "Which vehicles are in repair?",
      "Who are the valid drivers?",
      "List the destinations",
    ];
  }
  if (FLEET_ROLES.has(role)) {
    return [
      "What's still pending?",
      "Which vehicles are available?",
      "Who can drive a van?",
      "I want to make a reservation",
    ];
  }
  return [
    "What's still pending?",
    "What's free tomorrow from 8am to noon?",
    "Where can I go?",
    "I want to make a reservation",
  ];
});
const emptyCopy = computed(() => {
  const role = currentUser.value?.role;
  if (role === "maintenance") {
    return "Fleet, valid drivers, and destinations. Booked trips are not on your clipboard, and I will not pretend they are.";
  }
  if (FLEET_ROLES.has(role)) {
    return "Ask about trips in your scope or the fleet. I check the records. I do not freelance.";
  }
  return "Ask about your trips. I answer from the records, briefly, and with very little cheer.";
});
const canRetry = computed(() => {
  if (sending.value || !errorMessage.value) return false;
  const last = messages.value[messages.value.length - 1];
  return last?.role === "user" && String(last.content ?? "").trim().length > 0;
});

function bubbleClass(message) {
  if (message.role === "user") return "assistant-drawer__bubble--user";
  return {
    "assistant-drawer__bubble--assistant": true,
    "assistant-drawer__bubble--rich": assistantMessageIsWide(message.content),
  };
}

function asksToBook(content) {
  if (typeof content !== "string") return false;
  return /\b(book(?:ing)?|reserve[ds]?|make a reservation|schedule a(?: trip| van| vehicle| reservation)?|new reservation)\b/i.test(
    content
  );
}

watch(
  [messages, draft],
  () => {
    saveAssistantHistory({
      messages: messages.value,
      draft: draft.value,
    });
  },
  { deep: true }
);

watch([messages, sending, errorMessage, draft, bookingRequested], () => {
  scrollToEnd();
});

function readErrorMessage(error) {
  const message = error?.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  return ASSISTANT_ERROR;
}

function onComposerKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  sendMessage();
}

async function scrollToEnd() {
  await nextTick();
  const pane = scrollPane.value;
  if (!pane) return;
  pane.scrollTop = pane.scrollHeight;
}

async function deliver(serial) {
  try {
    const response = await chat(messages.value.slice(-MAX_CHAT_MESSAGES));
    if (serial !== requestSerial) return;
    const reply = response?.data?.reply;
    messages.value = [
      ...messages.value,
      { role: "assistant", content: typeof reply === "string" ? reply : "" },
    ];
  } catch (error) {
    if (serial !== requestSerial) return;
    errorMessage.value = readErrorMessage(error);
  } finally {
    if (serial === requestSerial) {
      sending.value = false;
    }
  }
}

async function sendMessage() {
  const content = String(input.value ?? "").trim();
  if (!content || sending.value) return;

  errorMessage.value = "";
  input.value = "";
  messages.value = [...messages.value, { role: "user", content }];
  const serial = ++requestSerial;
  sending.value = true;
  await deliver(serial);
}

function askSuggestion(text) {
  if (sending.value) return;
  input.value = text;
  sendMessage();
}

async function retry() {
  if (!canRetry.value) return;
  errorMessage.value = "";
  const serial = ++requestSerial;
  sending.value = true;
  await deliver(serial);
}

function clearConversation() {
  requestSerial += 1;
  sending.value = false;
  messages.value = [];
  draft.value = null;
  input.value = "";
  errorMessage.value = "";
}

function discardDraft() {
  draft.value = null;
}

function onTripDraft(next) {
  draft.value = next && typeof next === "object" ? next : null;
}

function onDraftCreated(result) {
  if (!draft.value || result?.id == null || result.id === "") return;
  draft.value = {
    ...draft.value,
    confirmedId: result.id,
    confirmedStatus: result.status || "pending",
  };
}

async function focusMessage() {
  await nextTick();
  const root = messageInput.value?.$el;
  const field = root?.querySelector?.("textarea:not(.v-textarea__sizer)");
  if (field && typeof field.focus === "function") {
    field.focus();
    return;
  }
  if (typeof messageInput.value?.focus === "function") {
    messageInput.value.focus();
  }
}

defineExpose({ messageInput, focusMessage });
</script>

<template>
  <v-navigation-drawer
    v-model="assistantOpen"
    class="assistant-drawer"
    location="right"
    :width="520"
    temporary
    disable-resize-watcher
  >
    <div class="assistant-drawer__body">
      <header class="assistant-drawer__header">
        <div class="assistant-drawer__identity">
          <span class="assistant-drawer__mark" aria-hidden="true">
            <v-icon icon="mdi-key-variant" size="20" />
          </span>
          <div>
            <p class="assistant-drawer__kicker">Keys</p>
            <h2 class="assistant-drawer__title">Assistant</h2>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          aria-label="Close assistant"
          @click="closeAssistant"
        />
      </header>

      <div ref="scrollPane" class="assistant-drawer__scroll">
        <div class="assistant-drawer__messages" role="log" aria-live="polite">
          <div v-if="messages.length === 0" class="assistant-drawer__empty">
            <p class="assistant-drawer__empty-copy">{{ emptyCopy }}</p>
            <div class="assistant-drawer__suggestions">
              <button
                v-for="suggestion in suggestions"
                :key="suggestion"
                type="button"
                class="assistant-drawer__suggestion"
                :disabled="sending"
                @click="askSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
          <div
            v-for="(message, index) in messages"
            :key="`${index}-${message.role}`"
            class="assistant-drawer__row"
            :class="
              message.role === 'user'
                ? 'assistant-drawer__row--user'
                : 'assistant-drawer__row--assistant'
            "
          >
            <span class="assistant-drawer__who">{{ message.role === "user" ? "You" : "Keys" }}</span>
            <div class="assistant-drawer__bubble" :class="bubbleClass(message)">
              <AssistantMessage v-if="message.role === 'assistant'" :content="message.content" />
              <template v-else>{{ message.content }}</template>
            </div>
          </div>
          <p v-if="sending" class="assistant-drawer__typing">Checking the records.</p>
        </div>

        <TripRequestForm v-if="bookingRequested" @draft="onTripDraft" />

        <ReservationDraftCard
          v-if="draft"
          :draft="draft"
          @edit="focusMessage"
          @discard="discardDraft"
          @created="onDraftCreated"
        />

        <v-alert
          v-if="errorMessage"
          class="assistant-drawer__error"
          type="error"
          variant="tonal"
        >
          <p class="assistant-drawer__error-text">{{ errorMessage }}</p>
          <v-btn
            v-if="canRetry"
            class="assistant-drawer__retry"
            variant="text"
            size="small"
            @click="retry"
          >
            Try again
          </v-btn>
        </v-alert>
      </div>

      <v-progress-linear
        v-if="sending"
        class="assistant-drawer__progress"
        indeterminate
        color="primary"
        height="3"
        aria-label="Assistant is replying"
      />

      <div class="assistant-drawer__composer">
        <v-textarea
          ref="messageInput"
          v-model="input"
          class="assistant-drawer__input"
          label="Message"
          placeholder="Ask about a trip, a vehicle, or a driver"
          auto-grow
          rows="1"
          max-rows="6"
          variant="outlined"
          density="comfortable"
          hide-details
          @keydown="onComposerKeydown"
        />
        <v-btn class="oc-cta assistant-drawer__send" color="primary" :disabled="!canSend" @click="sendMessage">
          Send
        </v-btn>
      </div>

      <div class="assistant-drawer__footer">
        <span class="assistant-drawer__hint">Enter sends. Shift+Enter adds a line.</span>
        <v-btn variant="text" size="small" @click="clearConversation">Clear conversation</v-btn>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.assistant-drawer {
  top: 64px !important;
  height: calc(100vh - 64px) !important;
  max-height: calc(100vh - 64px) !important;
  border-left: 1px solid rgba(128, 19, 40, 0.16);
}

.assistant-drawer :deep(.v-navigation-drawer__content) {
  height: 100%;
  overflow: hidden;
  background: #f7f3f4;
}

.assistant-drawer__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(128, 19, 40, 0.08), transparent 42%),
    #f7f3f4;
}

.assistant-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 8px 14px 16px;
  background: #801328;
  color: #fff;
}

.assistant-drawer__identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.assistant-drawer__mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
}

.assistant-drawer__kicker,
.assistant-drawer__title {
  margin: 0;
}

.assistant-drawer__kicker {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.82;
}

.assistant-drawer__title {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
}

.assistant-drawer__scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
}

.assistant-drawer__messages {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px 16px 12px;
}

.assistant-drawer__empty {
  padding: 4px 2px 8px;
}

.assistant-drawer__empty-copy {
  margin: 0 0 12px;
  color: #3d3336;
  font-size: 0.9375rem;
  line-height: 1.45;
}

.assistant-drawer__suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assistant-drawer__suggestion {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(128, 19, 40, 0.22);
  border-radius: 12px;
  background: #fff;
  color: #801328;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
}

.assistant-drawer__suggestion:hover:not(:disabled) {
  border-color: #801328;
  background: #fff6f7;
}

.assistant-drawer__suggestion:disabled {
  cursor: default;
  opacity: 0.6;
}

.assistant-drawer__row {
  display: flex;
  flex-direction: column;
  max-width: 92%;
  gap: 4px;
}

.assistant-drawer__row--user {
  align-self: flex-end;
  align-items: flex-end;
}

.assistant-drawer__row--assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.assistant-drawer__who {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6d5c61;
}

.assistant-drawer__bubble {
  max-width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.9375rem;
  line-height: 1.45;
}

.assistant-drawer__bubble--user {
  background: #801328;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.assistant-drawer__bubble--assistant {
  background: #fff;
  color: #1c1b1f;
  border: 1px solid rgba(128, 19, 40, 0.12);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(28, 27, 31, 0.04);
}

.assistant-drawer__typing {
  margin: 0;
  color: #6d5c61;
  font-size: 0.8125rem;
  font-style: italic;
}

.assistant-drawer__bubble--rich {
  max-width: 100%;
  min-width: 0;
}

.assistant-drawer__error {
  margin: 0 16px 12px;
}

.assistant-drawer__error-text {
  margin: 0;
}

.assistant-drawer__retry {
  margin-top: 4px;
  padding-inline: 0;
}

.assistant-drawer__composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px 0;
  background: #fff;
  border-top: 1px solid rgba(128, 19, 40, 0.12);
}

.assistant-drawer__input {
  flex: 1 1 auto;
}

.assistant-drawer__send {
  flex: none;
  min-width: 76px;
  height: 48px;
}

.assistant-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 8px 8px 16px;
  background: #fff;
}

.assistant-drawer__hint {
  color: #6d5c61;
  font-size: 0.75rem;
}
</style>
