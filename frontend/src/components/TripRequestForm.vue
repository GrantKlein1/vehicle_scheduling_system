<script setup>
import { onMounted, ref } from "vue";
import { VEHICLE_CATEGORIES } from "../config/vehicleCatalog.js";
import { listDestinations } from "../services/destinationServices.js";
import { planTrip } from "../services/assistantServices.js";

const emit = defineEmits(["draft"]);

const destinationName = ref(null);
const category = ref(null);
const passengers = ref("");
const start = ref("");
const end = ref("");
const destinations = ref([]);
const vehicles = ref(null);
const vehicleId = ref(null);
const loading = ref(false);
const catalogError = ref("");
const errorMessage = ref("");
const fieldErrors = ref({});

onMounted(async () => {
  try {
    const response = await listDestinations();
    const rows = Array.isArray(response?.data) ? response.data : [];
    destinations.value = rows
      .map((destination) => destination?.name)
      .filter((name) => typeof name === "string" && name.trim() !== "");
  } catch {
    catalogError.value = "Destinations could not be loaded.";
  }
});

function chicagoWallToIso(wall) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wall);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let utc = desired;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(utc)).map((part) => [part.type, part.value])
    );
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second)
    );
    utc += desired - asUtc;
  }
  return new Date(utc).toISOString();
}

function tripFields() {
  const errors = {};
  const destination = typeof destinationName.value === "string" ? destinationName.value.trim() : "";
  if (!destination) errors.destinationName = "Destination is required.";
  if (!category.value) errors.category = "Vehicle type is required.";
  if (passengers.value === "" || passengers.value == null) {
    errors.passengers = "Passengers are required.";
  } else if (!Number.isInteger(Number(passengers.value)) || Number(passengers.value) < 1) {
    errors.passengers = "Enter a passenger count of at least 1.";
  }
  if (!start.value || !end.value) {
    errors.window = "Start and end are required.";
  } else if (end.value <= start.value) {
    errors.window = "End time must be after start time.";
  }
  return { errors, destination };
}

function payload(selectedVehicleId) {
  const { destination } = tripFields();
  const body = {
    destinationName: destination,
    category: category.value,
    passengers: Number(passengers.value),
    start: chicagoWallToIso(start.value),
    end: chicagoWallToIso(end.value),
  };
  if (selectedVehicleId != null) body.vehicleId = selectedVehicleId;
  return body;
}

function readError(error) {
  const message = error?.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  return "The trip could not be checked. Please try again.";
}

async function findVehicles() {
  const { errors } = tripFields();
  fieldErrors.value = errors;
  errorMessage.value = "";
  if (Object.keys(errors).length > 0) return;

  loading.value = true;
  vehicles.value = null;
  vehicleId.value = null;
  emit("draft", null);
  try {
    const response = await planTrip(payload());
    vehicles.value = Array.isArray(response?.data?.vehicles) ? response.data.vehicles : [];
  } catch (error) {
    errorMessage.value = readError(error);
  } finally {
    loading.value = false;
  }
}

async function reviewDraft() {
  if (vehicleId.value == null || loading.value) return;
  const { errors } = tripFields();
  fieldErrors.value = errors;
  if (Object.keys(errors).length > 0) return;

  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await planTrip(payload(vehicleId.value));
    const draft = response?.data?.draft;
    if (!draft || typeof draft !== "object") {
      errorMessage.value = "The trip could not be checked. Please try again.";
      return;
    }
    emit("draft", draft);
  } catch (error) {
    errorMessage.value = readError(error);
  } finally {
    loading.value = false;
  }
}

function vehicleLabel(vehicle) {
  const seats = vehicle?.passengerCapacity;
  const area = vehicle?.areaAssigned ? ` · ${vehicle.areaAssigned}` : "";
  const capacity = seats == null ? "" : ` · ${seats} seats`;
  return `${vehicle?.name ?? "Vehicle"}${capacity}${area}`;
}
</script>

<template>
  <v-card class="trip-form" variant="outlined">
    <div class="text-subtitle-1 font-weight-bold">Book a trip</div>
    <p class="trip-form__hint text-body-2">
      Choose the destination, vehicle type, and passengers. Times are Central Time.
    </p>

    <v-alert v-if="catalogError" class="mb-3" type="error" variant="tonal">
      {{ catalogError }}
    </v-alert>

    <v-select
      v-model="destinationName"
      :items="destinations"
      label="Destination"
      variant="outlined"
      density="comfortable"
      hide-details="auto"
      class="mb-3"
      :error-messages="fieldErrors.destinationName"
    />
    <v-select
      v-model="category"
      :items="VEHICLE_CATEGORIES"
      label="Vehicle type"
      variant="outlined"
      density="comfortable"
      hide-details="auto"
      class="mb-3"
      :error-messages="fieldErrors.category"
    />
    <v-text-field
      v-model="passengers"
      type="number"
      min="1"
      label="Passengers"
      variant="outlined"
      density="comfortable"
      hide-details="auto"
      class="mb-3"
      :error-messages="fieldErrors.passengers"
    />
    <v-text-field
      v-model="start"
      type="datetime-local"
      label="Start"
      variant="outlined"
      density="comfortable"
      hide-details="auto"
      class="mb-3"
    />
    <v-text-field
      v-model="end"
      type="datetime-local"
      label="End"
      variant="outlined"
      density="comfortable"
      hide-details="auto"
      class="mb-3"
      :error-messages="fieldErrors.window"
    />

    <v-btn color="primary" :disabled="loading" @click="findVehicles">Find vehicles</v-btn>

    <p v-if="vehicles && vehicles.length === 0" class="trip-form__empty text-body-2">
      No {{ category }} has room for {{ passengers }} passengers in that window.
    </p>

    <div v-if="vehicles && vehicles.length > 0" class="trip-form__vehicles">
      <div class="text-caption text-medium-emphasis">Choose a vehicle</div>
      <v-radio-group v-model="vehicleId" hide-details>
        <v-radio
          v-for="vehicle in vehicles"
          :key="vehicle.id"
          :label="vehicleLabel(vehicle)"
          :value="vehicle.id"
        />
      </v-radio-group>
      <v-btn color="primary" :disabled="loading || vehicleId == null" @click="reviewDraft">
        Review draft
      </v-btn>
    </div>

    <v-alert v-if="errorMessage" class="mt-3" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>
  </v-card>
</template>

<style scoped>
.trip-form {
  margin: 0 16px 12px;
  padding: 12px;
  color: rgb(28, 27, 31);
}

.trip-form__hint,
.trip-form__empty {
  margin: 4px 0 12px;
  color: rgb(28, 27, 31);
}

.trip-form__vehicles {
  margin-top: 12px;
}
</style>
