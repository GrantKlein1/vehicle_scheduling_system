<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { createReservation } from "../services/reservationServices.js";

const props = defineProps({
  draft: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["edit", "discard", "created"]);

const chicagoDateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  dateStyle: "medium",
  timeStyle: "short",
});

const confirming = ref(false);
const errorMessage = ref("");
const localResult = ref(null);
let active = true;

onBeforeUnmount(() => {
  active = false;
});

const confirmationText = computed(() => {
  const id = localResult.value?.id ?? props.draft?.confirmedId;
  if (id == null || id === "") return "";
  const status = localResult.value?.status || props.draft?.confirmedStatus || "pending";
  return `Reservation ${id} is ${status}.`;
});

watch(
  () => props.draft,
  (next) => {
    if (next?.confirmedId == null || next?.confirmedId === "") {
      localResult.value = null;
      errorMessage.value = "";
    }
  }
);

function present(value) {
  if (typeof value === "number") return true;
  if (typeof value === "string") return value.trim() !== "";
  return value != null && value !== false;
}

function formatTimestamp(value) {
  if (!present(value)) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return chicagoDateTime.format(date);
  } catch {
    return String(value);
  }
}

function formatDriver(source) {
  const name = typeof source?.driverName === "string" ? source.driverName.trim() : "";
  const email = typeof source?.driverEmail === "string" ? source.driverEmail.trim() : "";
  if (name && email) return `${name} (${email})`;
  return name || email;
}

const rows = computed(() => {
  const source = props.draft ?? {};
  const items = [
    { label: "Vehicle", value: source.vehicleName },
    { label: "Destination", value: source.destinationName },
    { label: "Start", value: formatTimestamp(source.start) },
    { label: "End", value: formatTimestamp(source.end) },
    { label: "Area", value: source.areaName },
    { label: "Passengers", value: source.passengers },
  ];
  const driver = formatDriver(source);
  if (driver) items.push({ label: "Driver", value: driver });
  if (present(source.purpose)) items.push({ label: "Purpose", value: source.purpose });
  if (present(source.notes)) items.push({ label: "Notes", value: source.notes });
  return items.filter((item) => present(item.value));
});

function reservationPayload(source) {
  return {
    vehicleId: source.vehicleId,
    destinationName: source.destinationName,
    start: source.start,
    end: source.end,
    areaName: source.areaName,
    passengers: source.passengers,
    driverName: source.driverName,
    driverEmail: source.driverEmail,
    purpose: source.purpose,
    notes: source.notes,
  };
}

function apiMessage(error, fallback) {
  const message = error?.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

async function confirm() {
  if (confirming.value || confirmationText.value) return;
  confirming.value = true;
  errorMessage.value = "";

  try {
    const response = await createReservation(reservationPayload(props.draft));
    if (!active) return;
    const data = response?.data ?? {};
    if (data.id == null || data.id === "") {
      errorMessage.value = "The reservation could not be created. Please try again.";
      return;
    }
    const status = data.status || "pending";
    localResult.value = { id: data.id, status };
    emit("created", { id: data.id, status });
  } catch (error) {
    if (!active) return;
    errorMessage.value = apiMessage(error, "The reservation could not be created. Please try again.");
  } finally {
    if (active) confirming.value = false;
  }
}
</script>

<template>
  <v-card class="reservation-draft" variant="outlined">
    <dl class="reservation-draft__details">
      <div v-for="row in rows" :key="row.label" class="reservation-draft__row">
        <dt class="text-caption text-medium-emphasis">{{ row.label }}</dt>
        <dd class="text-body-2">{{ row.value }}</dd>
      </div>
    </dl>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mt-3">
      {{ errorMessage }}
    </v-alert>

    <p v-if="confirmationText" class="reservation-draft__status">{{ confirmationText }}</p>
    <div v-else class="reservation-draft__actions">
      <v-btn
        color="primary"
        class="oc-cta"
        :loading="confirming"
        :disabled="confirming"
        @click="confirm"
      >
        Confirm
      </v-btn>
      <v-btn variant="text" @click="emit('edit')">Edit</v-btn>
      <v-btn variant="text" @click="emit('discard')">Discard</v-btn>
    </div>
  </v-card>
</template>

<style scoped>
.reservation-draft {
  margin: 0 16px 12px;
  padding: 12px;
}

.reservation-draft__details {
  margin: 0;
}

.reservation-draft__row + .reservation-draft__row {
  margin-top: 8px;
}

.reservation-draft__row dd {
  margin: 0;
  white-space: pre-wrap;
}

.reservation-draft__status {
  margin: 12px 0 0;
  font-weight: 600;
}

.reservation-draft__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
</style>
