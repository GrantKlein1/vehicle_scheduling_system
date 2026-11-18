<script setup>
import { computed, nextTick, ref, watch } from "vue";
import {
  assistantOpen,
  closeAssistant,
  loadAssistantHistory,
  saveAssistantHistory,
} from "../config/assistantState.js";
import { currentUser } from "../config/session.js";
import { chat } from "../services/assistantServices.js";
import ReservationDraftCard from "./ReservationDraftCard.vue";
import TripRequestForm from "./TripRequestForm.vue";

const ASSISTANT_ERROR = "The assistant could not answer right now. Please try again.";
const MAX_CHAT_MESSAGES = 20;

const saved = loadAssistantHistory();
const messages = ref(saved.messages);
const draft = ref(saved.draft);
const input = ref("");
const sending = ref(false);
const errorMessage = ref("");
const messageInput = ref(null);
let requestSerial = 0;

const canSend = computed(() => String(input.value ?? "").trim().length > 0 && !sending.value);
const canBook = computed(() => currentUser.value?.role !== "maintenance");
const bookingRequested = computed(
  () => canBook.value && messages.value.some((message) => message.role === "user" && asksToBook(message.content))
);

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

async function sendMessage() {
  const content = String(input.value ?? "").trim();
  if (!content || sending.value) return;

  errorMessage.value = "";
  input.value = "";
  messages.value = [...messages.value, { role: "user", content }];
  const serial = ++requestSerial;
  sending.value = true;

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
    :width="380"
    temporary
    disable-resize-watcher
  >
    <div class="assistant-drawer__body">
      <div class="assistant-drawer__header">
        <div class="text-h6 font-weight-bold text-primary">Assistant</div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close assistant"
          @click="closeAssistant"
        />
      </div>

      <div class="assistant-drawer__scroll">
      <div class="assistant-drawer__messages" role="log" aria-live="polite">
        <p v-if="messages.length === 0" class="assistant-drawer__empty text-body-2 text-medium-emphasis">
          Ask about your reservations or available vehicles. Ask to make a reservation when you want to book.
        </p>
        <div
          v-for="(message, index) in messages"
          :key="`${index}-${message.role}`"
          class="assistant-drawer__bubble"
          :class="
            message.role === 'user'
              ? 'assistant-drawer__bubble--user'
              : 'assistant-drawer__bubble--assistant'
          "
        >
          {{ message.content }}
        </div>
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
        {{ errorMessage }}
      </v-alert>
      </div>

      <v-progress-linear
        v-if="sending"
        class="assistant-drawer__progress"
        indeterminate
        color="primary"
        height="4"
        aria-label="Assistant is replying"
      />

      <div class="assistant-drawer__composer">
        <v-textarea
          ref="messageInput"
          v-model="input"
          class="assistant-drawer__input"
          label="Message"
          auto-grow
          rows="1"
          max-rows="6"
          variant="outlined"
          density="comfortable"
          hide-details
          @keydown="onComposerKeydown"
        />
        <v-btn class="oc-cta" color="primary" :disabled="!canSend" @click="sendMessage">Send</v-btn>
      </div>

      <div class="assistant-drawer__footer">
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
}

.assistant-drawer :deep(.v-navigation-drawer__content) {
  height: 100%;
  overflow: hidden;
}

.assistant-drawer__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.assistant-drawer__scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.assistant-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 8px 12px 16px;
}

.assistant-drawer__messages {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  gap: 8px;
  padding: 4px 16px 12px;
}

.assistant-drawer__empty {
  margin: 0;
}

.assistant-drawer__bubble {
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.assistant-drawer__bubble--user {
  align-self: flex-end;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.assistant-drawer__bubble--assistant {
  align-self: flex-start;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
}

.assistant-drawer__error {
  margin: 0 16px 8px;
}

.assistant-drawer__composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 4px 16px 0;
}

.assistant-drawer__input {
  flex: 1 1 auto;
}

.assistant-drawer__footer {
  padding: 0 8px 8px;
}
</style>
