<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import VehicleListPanel from "../components/vehicles/VehicleListPanel.vue";
import { currentUser } from "../config/session.js";
import {
  AREA_OPTIONS,
  EXPIRATION_MONTHS,
  SERVICE_OPTIONS,
  VEHICLE_CATEGORIES,
  makesForCategory,
  modelsForMake,
} from "../config/vehicleCatalog.js";
import {
  CATEGORY_ICONS,
  formatDate,
  formatMileage,
  monthName,
  todayIso,
  vehicleTitle,
} from "../config/vehicleDisplay.js";
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  logMileage,
  logService,
  updateVehicle,
} from "../services/vehicleServices.js";

const display = useDisplay();
const isAdmin = computed(() => currentUser.value?.role === "admin");

const vehicles = ref([]);
const loadError = ref("");
const loadingList = ref(false);
const loaded = ref(false);
const selectedId = ref(null);
const logs = ref({ mileageLogs: [], serviceLogs: [] });
const loadingLogs = ref(false);
const savingMileage = ref(false);
const savingService = ref(false);
const detailCard = ref(null);
const snackbar = ref({ show: false, text: "", color: "success" });

const vehicleDialog = ref(false);
const vehicleMode = ref("add");
const editingId = ref(null);
const form = ref(emptyVehicle());
const vehicleErrors = ref({});

const deleteDialog = ref(false);
const mileage = ref(emptyMileage());
const mileageErrors = ref({});
const service = ref(emptyService());
const serviceErrors = ref({});

const REGISTRATION_FIELDS = ["vin", "licensePlateNumber", "licensePlateExpirationMonth"];

const dialogTitle = computed(() => (vehicleMode.value === "add" ? "Add Vehicle" : "Edit Vehicle"));
const submitLabel = computed(() => (vehicleMode.value === "add" ? "Add Vehicle" : "Update Vehicle"));
const isGolfCart = computed(() => form.value.category === "Golf Cart");
const makeItems = computed(() => makesForCategory(form.value.category));
const modelItems = computed(() => modelsForMake(form.value.category, form.value.make));
const selectedVehicle = computed(
  () => vehicles.value.find((vehicle) => vehicle.id === selectedId.value) ?? null
);
const latestMileage = computed(() => {
  const entries = logs.value.mileageLogs;
  return entries.length > 0 ? entries[entries.length - 1] : null;
});
const latestService = computed(() => {
  const entries = logs.value.serviceLogs;
  return entries.length > 0 ? entries[entries.length - 1] : null;
});
const mileageNewestFirst = computed(() => [...logs.value.mileageLogs].reverse());
const serviceNewestFirst = computed(() => [...logs.value.serviceLogs].reverse());
const detailFields = computed(() => {
  const vehicle = selectedVehicle.value;
  if (!vehicle) {
    return [];
  }
  const golfCart = vehicle.category === "Golf Cart";
  return [
    { label: "Color", value: vehicle.color },
    { label: "Passengers", value: vehicle.passengerCapacity },
    { label: "Purchased", value: formatDate(vehicle.purchasedDate) },
    { label: "VIN", value: golfCart ? "Not applicable" : vehicle.vin },
    { label: "License plate", value: golfCart ? "Not applicable" : vehicle.licensePlateNumber },
    {
      label: "Plate expires",
      value: golfCart ? "Not applicable" : monthName(vehicle.licensePlateExpirationMonth),
    },
  ];
});

function emptyVehicle() {
  return {
    category: null,
    make: "",
    model: "",
    year: "",
    vin: "",
    purchasedDate: "",
    color: "",
    passengerCapacity: "",
    licensePlateNumber: "",
    licensePlateExpirationMonth: null,
    areaAssigned: null,
  };
}

function emptyMileage() {
  return { entryDate: todayIso(), currentMileage: "" };
}

function emptyService() {
  return { entryDate: todayIso(), servicePerformed: null };
}

function logTableBind(count) {
  return count > 5 ? { fixedHeader: true, height: 240 } : {};
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const PLATE_PATTERN = /^[A-Z0-9]{2,8}$/;

const VEHICLE_FIELDS = [
  "category",
  "make",
  "model",
  "year",
  "vin",
  "purchasedDate",
  "color",
  "passengerCapacity",
  "licensePlateNumber",
  "licensePlateExpirationMonth",
  "areaAssigned",
];

function isBlank(value) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function asMessages(message) {
  return message ? [message] : [];
}

function hasErrors(errors) {
  return Object.values(errors).some((messages) => messages.length > 0);
}

function isRealDate(value) {
  if (typeof value !== "string" || !DATE_ONLY.test(value.trim())) {
    return false;
  }
  const trimmed = value.trim();
  const [year, month, day] = trimmed.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function integerInRange(value, min, max) {
  const number = toInteger(value);
  return typeof number === "number" && Number.isInteger(number) && number >= min && number <= max;
}

function textLimit(value, limit, limitMessage) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "Required field";
  }
  if (text.length > limit) {
    return limitMessage;
  }
  return "";
}

function vehicleFieldMessage(key, value) {
  if (form.value.category === "Golf Cart" && REGISTRATION_FIELDS.includes(key)) {
    return "";
  }
  if (isBlank(value)) {
    return "Required field";
  }
  if (key === "category" && !VEHICLE_CATEGORIES.includes(value)) {
    return "Category must be Golf Cart, Truck, Car, or Van.";
  }
  if (key === "make") {
    return textLimit(value, 40, "Make cannot exceed 40 characters.");
  }
  if (key === "model") {
    return textLimit(value, 40, "Model cannot exceed 40 characters.");
  }
  if (key === "year" && !integerInRange(value, 1950, 2027)) {
    return "Year must be from 1950 through 2027.";
  }
  if (key === "vin" && !VIN_PATTERN.test(String(value).trim())) {
    return "VIN must be a valid 17-character VIN.";
  }
  if (key === "purchasedDate" && !isRealDate(value)) {
    return "Purchased Date must be a valid date.";
  }
  if (key === "color") {
    return textLimit(value, 30, "Color cannot exceed 30 characters.");
  }
  if (key === "passengerCapacity" && !integerInRange(value, 1, 15)) {
    return "Number of passengers must be from 1 through 15.";
  }
  if (key === "licensePlateNumber" && !PLATE_PATTERN.test(String(value).trim())) {
    return "License Plate Number must be 2 to 8 letters or digits.";
  }
  if (key === "licensePlateExpirationMonth" && !integerInRange(value, 1, 12)) {
    return "License Plate Expiration Month must be from 1 through 12.";
  }
  if (key === "areaAssigned" && !AREA_OPTIONS.includes(value)) {
    return "Area Assigned must be Athletics, Support Central, or Maintenance.";
  }
  return "";
}

function logDateMessage(value) {
  if (!isRealDate(value)) {
    return "Date must be a valid date.";
  }
  if (value.trim() > todayIso()) {
    return "Date cannot be in the future.";
  }
  return "";
}

function mileageFieldMessage(key, value) {
  if (isBlank(value)) {
    return "Required field";
  }
  if (key === "entryDate") {
    return logDateMessage(value);
  }
  if (key === "currentMileage" && !integerInRange(value, 0, Number.MAX_SAFE_INTEGER)) {
    return "Current mileage must be zero or greater.";
  }
  return "";
}

function serviceFieldMessage(key, value) {
  if (isBlank(value)) {
    return "Required field";
  }
  if (key === "entryDate") {
    return logDateMessage(value);
  }
  if (key === "servicePerformed" && !SERVICE_OPTIONS.includes(value)) {
    return "Service performed must be Repair, Oil change, or Tire replacement.";
  }
  return "";
}

function collectMessages(keys, source, messageFor) {
  return Object.fromEntries(keys.map((key) => [key, asMessages(messageFor(key, source[key]))]));
}

async function blurVehicle(key) {
  await nextTick();
  vehicleErrors.value = {
    ...vehicleErrors.value,
    [key]: asMessages(vehicleFieldMessage(key, form.value[key])),
  };
}

async function blurMileage(key) {
  await nextTick();
  mileageErrors.value = {
    ...mileageErrors.value,
    [key]: asMessages(mileageFieldMessage(key, mileage.value[key])),
  };
}

async function blurService(key) {
  await nextTick();
  serviceErrors.value = {
    ...serviceErrors.value,
    [key]: asMessages(serviceFieldMessage(key, service.value[key])),
  };
}

function onVehicleBlur(key, focused) {
  if (!focused) blurVehicle(key);
}

function onMileageBlur(key, focused) {
  if (!focused) blurMileage(key);
}

function onServiceBlur(key, focused) {
  if (!focused) blurService(key);
}

function toInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return value;
}

function activeVehicleFields() {
  if (form.value.category === "Golf Cart") {
    return VEHICLE_FIELDS.filter((key) => !REGISTRATION_FIELDS.includes(key));
  }
  return VEHICLE_FIELDS;
}

function clearRegistration() {
  form.value.vin = "";
  form.value.licensePlateNumber = "";
  form.value.licensePlateExpirationMonth = null;
  vehicleErrors.value = {
    ...vehicleErrors.value,
    vin: [],
    licensePlateNumber: [],
    licensePlateExpirationMonth: [],
  };
}

function vehiclePayload() {
  const golfCart = form.value.category === "Golf Cart";
  return {
    category: form.value.category,
    make: String(form.value.make ?? "").trim(),
    model: String(form.value.model ?? "").trim(),
    year: toInteger(form.value.year),
    vin: golfCart ? null : String(form.value.vin ?? "").trim(),
    purchasedDate: form.value.purchasedDate,
    color: String(form.value.color ?? "").trim(),
    passengerCapacity: toInteger(form.value.passengerCapacity),
    licensePlateNumber: golfCart ? null : String(form.value.licensePlateNumber ?? "").trim(),
    licensePlateExpirationMonth: golfCart ? null : toInteger(form.value.licensePlateExpirationMonth),
    areaAssigned: form.value.areaAssigned,
  };
}

function notify(text, isError = false) {
  snackbar.value = {
    show: true,
    text,
    color: isError ? "error" : "success",
  };
}

function apiMessage(error) {
  return error?.response?.data?.message || "";
}

function resetLogForms() {
  mileage.value = emptyMileage();
  mileageErrors.value = {};
  service.value = emptyService();
  serviceErrors.value = {};
}

async function loadVehicles() {
  loadError.value = "";
  loadingList.value = true;
  try {
    const response = await listVehicles();
    vehicles.value = response.data;
  } catch (error) {
    vehicles.value = [];
    loadError.value = apiMessage(error);
  } finally {
    loadingList.value = false;
    loaded.value = true;
  }
}

async function refreshLogs(vehicleId) {
  loadingLogs.value = true;
  try {
    const response = await getVehicle(vehicleId);
    if (selectedId.value !== vehicleId) {
      return;
    }
    logs.value = {
      mileageLogs: response.data.mileageLogs ?? [],
      serviceLogs: response.data.serviceLogs ?? [],
    };
  } catch (error) {
    if (selectedId.value !== vehicleId) {
      return;
    }
    logs.value = { mileageLogs: [], serviceLogs: [] };
    notify(apiMessage(error), true);
  } finally {
    if (selectedId.value === vehicleId) {
      loadingLogs.value = false;
    }
  }
}

async function selectVehicle(id) {
  selectedId.value = id;
  resetLogForms();
  if (id === null || id === undefined) {
    logs.value = { mileageLogs: [], serviceLogs: [] };
    return;
  }
  await refreshLogs(id);
  if (display.smAndDown.value) {
    await nextTick();
    detailCard.value?.$el?.scrollIntoView?.({ behavior: "smooth" });
  }
}

function openAdd() {
  vehicleMode.value = "add";
  editingId.value = null;
  form.value = emptyVehicle();
  vehicleErrors.value = {};
  vehicleDialog.value = true;
}

function openEdit() {
  const vehicle = selectedVehicle.value;
  if (!vehicle) {
    return;
  }
  vehicleMode.value = "edit";
  editingId.value = vehicle.id;
  form.value = {
    category: vehicle.category,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin,
    purchasedDate: vehicle.purchasedDate,
    color: vehicle.color,
    passengerCapacity: vehicle.passengerCapacity,
    licensePlateNumber: vehicle.licensePlateNumber,
    licensePlateExpirationMonth: vehicle.licensePlateExpirationMonth,
    areaAssigned: vehicle.areaAssigned,
  };
  vehicleErrors.value = {};
  vehicleDialog.value = true;
}

function openDelete() {
  deleteDialog.value = true;
}

watch(
  () => form.value.category,
  (category) => {
    if (category === "Golf Cart") {
      clearRegistration();
    }
  }
);

async function saveVehicle() {
  vehicleErrors.value = collectMessages(activeVehicleFields(), form.value, vehicleFieldMessage);
  if (hasErrors(vehicleErrors.value)) {
    return;
  }

  const body = vehiclePayload();
  try {
    if (vehicleMode.value === "add") {
      const response = await createVehicle(body);
      vehicleDialog.value = false;
      await loadVehicles();
      await selectVehicle(response.data.id);
      notify(`${response.data.make} ${response.data.model} added successfully!`);
      return;
    }

    await updateVehicle(editingId.value, body);
    vehicleDialog.value = false;
    await loadVehicles();
    notify(`${body.make} ${body.model} updated successfully!`);
  } catch (error) {
    notify(apiMessage(error), true);
  }
}

async function confirmDelete() {
  const vehicleId = selectedId.value;
  try {
    await deleteVehicle(vehicleId);
    deleteDialog.value = false;
    await loadVehicles();
    const nextId = vehicles.value[0]?.id ?? null;
    await selectVehicle(nextId);
    notify("Vehicle deleted successfully!");
  } catch (error) {
    notify(apiMessage(error), true);
  }
}

async function saveMileage() {
  mileageErrors.value = collectMessages(
    ["entryDate", "currentMileage"],
    mileage.value,
    mileageFieldMessage
  );
  if (hasErrors(mileageErrors.value)) {
    return;
  }

  const vehicleId = selectedId.value;
  savingMileage.value = true;
  try {
    await logMileage(vehicleId, {
      entryDate: mileage.value.entryDate,
      currentMileage: toInteger(mileage.value.currentMileage),
    });
    mileage.value = emptyMileage();
    mileageErrors.value = {};
    await refreshLogs(vehicleId);
    notify("Mileage logged successfully!");
  } catch (error) {
    notify(apiMessage(error), true);
  } finally {
    savingMileage.value = false;
  }
}

async function saveService() {
  serviceErrors.value = collectMessages(
    ["entryDate", "servicePerformed"],
    service.value,
    serviceFieldMessage
  );
  if (hasErrors(serviceErrors.value)) {
    return;
  }

  const vehicleId = selectedId.value;
  savingService.value = true;
  try {
    await logService(vehicleId, {
      entryDate: service.value.entryDate,
      servicePerformed: service.value.servicePerformed,
    });
    service.value = emptyService();
    serviceErrors.value = {};
    await refreshLogs(vehicleId);
    notify("Service logged successfully!");
  } catch (error) {
    notify(apiMessage(error), true);
  } finally {
    savingService.value = false;
  }
}

onMounted(async () => {
  await loadVehicles();
  if (vehicles.value.length > 0) {
    await selectVehicle(vehicles.value[0].id);
  }
});
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Vehicles</h1>
      <v-spacer />
      <v-btn v-if="isAdmin" class="oc-cta" color="primary" type="button" @click="openAdd">
        Add Vehicle
      </v-btn>
    </div>

    <v-alert v-if="loadError" type="error" class="mb-4">{{ loadError }}</v-alert>

    <v-card v-else-if="loaded && vehicles.length === 0" class="vehicle-panel" variant="outlined">
      <v-card-text class="text-center py-8">No vehicles yet.</v-card-text>
    </v-card>

    <v-row v-else-if="vehicles.length > 0">
      <v-col cols="12" md="4">
        <VehicleListPanel
          :vehicles="vehicles"
          :selected-id="selectedId"
          :loading="loadingList"
          @select="selectVehicle"
        />
      </v-col>
      <v-col cols="12" md="8">
        <v-card ref="detailCard" class="vehicle-panel" variant="outlined">
          <v-progress-linear v-if="loadingLogs" indeterminate />
          <template v-if="selectedVehicle">
            <v-card-item :title="vehicleTitle(selectedVehicle)">
              <template #prepend>
                <v-avatar color="primary" variant="tonal">
                  <v-icon :icon="CATEGORY_ICONS[selectedVehicle.category]" />
                </v-avatar>
              </template>
              <template #subtitle>
                <v-chip size="small" color="primary" variant="tonal" class="mr-2">
                  {{ selectedVehicle.category }}
                </v-chip>
                <v-chip size="small" color="primary" variant="tonal">
                  {{ selectedVehicle.areaAssigned }}
                </v-chip>
              </template>
              <template v-if="isAdmin" #append>
                <v-btn icon variant="text" aria-label="Edit vehicle" @click="openEdit">
                  <v-icon icon="mdi-pencil" />
                </v-btn>
                <v-btn icon variant="text" aria-label="Delete vehicle" @click="openDelete">
                  <v-icon icon="mdi-delete" />
                </v-btn>
              </template>
            </v-card-item>

            <v-card-text>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-sheet color="surface-variant" rounded="lg" class="pa-3">
                    <div class="text-caption text-medium-emphasis">Current mileage</div>
                    <template v-if="latestMileage">
                      <div class="text-h6">{{ formatMileage(latestMileage.currentMileage) }}</div>
                      <div class="text-caption">as of {{ formatDate(latestMileage.entryDate) }}</div>
                    </template>
                    <div v-else class="text-body-1">No readings yet</div>
                  </v-sheet>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-sheet color="surface-variant" rounded="lg" class="pa-3">
                    <div class="text-caption text-medium-emphasis">Last service</div>
                    <template v-if="latestService">
                      <div class="text-h6">{{ latestService.servicePerformed }}</div>
                      <div class="text-caption">on {{ formatDate(latestService.entryDate) }}</div>
                    </template>
                    <div v-else class="text-body-1">No services yet</div>
                  </v-sheet>
                </v-col>
              </v-row>

              <h2 class="text-subtitle-1 mt-4 mb-2">Details</h2>
              <v-row>
                <v-col v-for="field in detailFields" :key="field.label" cols="6" sm="4">
                  <div class="text-caption text-medium-emphasis">{{ field.label }}</div>
                  <div class="text-body-1">{{ field.value }}</div>
                </v-col>
              </v-row>

              <v-divider class="my-4" />
              <h2 class="text-subtitle-1 mb-2">Mileage log</h2>
              <v-form @submit.prevent="saveMileage">
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="mileage.entryDate"
                      label="Mileage date"
                      type="date"
                      hide-details="auto"
                      :error-messages="mileageErrors.entryDate"
                      @update:focused="focused => onMileageBlur('entryDate', focused)"
                    />
                  </v-col>
                  <v-col cols="12" sm="5">
                    <v-text-field
                      v-model="mileage.currentMileage"
                      label="Current mileage"
                      type="number"
                      hide-details="auto"
                      :error-messages="mileageErrors.currentMileage"
                      @update:focused="focused => onMileageBlur('currentMileage', focused)"
                    />
                  </v-col>
                  <v-col cols="12" sm="3" class="d-flex align-center">
                    <v-btn
                      class="oc-cta"
                      color="primary"
                      type="button"
                      aria-label="Log mileage"
                      :loading="savingMileage"
                      @click="saveMileage"
                    >
                      Log mileage
                    </v-btn>
                  </v-col>
                </v-row>
              </v-form>
              <p v-if="mileageNewestFirst.length === 0" class="text-body-2 mt-2">No mileage readings yet.</p>
              <v-table
                v-else
                class="mt-2"
                density="compact"
                v-bind="logTableBind(mileageNewestFirst.length)"
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Mileage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in mileageNewestFirst" :key="`mileage-${entry.id}`">
                    <td>{{ formatDate(entry.entryDate) }}</td>
                    <td>{{ formatMileage(entry.currentMileage) }}</td>
                  </tr>
                </tbody>
              </v-table>

              <v-divider class="my-4" />
              <h2 class="text-subtitle-1 mb-2">Service log</h2>
              <v-form @submit.prevent="saveService">
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="service.entryDate"
                      label="Service date"
                      type="date"
                      hide-details="auto"
                      :error-messages="serviceErrors.entryDate"
                      @update:focused="focused => onServiceBlur('entryDate', focused)"
                    />
                  </v-col>
                  <v-col cols="12" sm="5">
                    <v-select
                      v-model="service.servicePerformed"
                      label="Service performed"
                      :items="SERVICE_OPTIONS"
                      hide-details="auto"
                      :error-messages="serviceErrors.servicePerformed"
                      @update:focused="focused => onServiceBlur('servicePerformed', focused)"
                    />
                  </v-col>
                  <v-col cols="12" sm="3" class="d-flex align-center">
                    <v-btn
                      class="oc-cta"
                      color="primary"
                      type="button"
                      aria-label="Log service"
                      :loading="savingService"
                      @click="saveService"
                    >
                      Log service
                    </v-btn>
                  </v-col>
                </v-row>
              </v-form>
              <p v-if="serviceNewestFirst.length === 0" class="text-body-2 mt-2">No services logged yet.</p>
              <v-table
                v-else
                class="mt-2"
                density="compact"
                v-bind="logTableBind(serviceNewestFirst.length)"
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in serviceNewestFirst" :key="`service-${entry.id}`">
                    <td>{{ formatDate(entry.entryDate) }}</td>
                    <td>{{ entry.servicePerformed }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </template>
          <v-card-text v-else>Select a vehicle to see its details, mileage, and service.</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="vehicleDialog" max-width="720">
      <v-card>
        <v-card-title>{{ dialogTitle }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveVehicle">
            <p class="text-subtitle-2 mb-2">Vehicle</p>
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="form.category"
                  label="Category"
                  :items="VEHICLE_CATEGORIES"
                  :error-messages="vehicleErrors.category"
                  @update:focused="focused => onVehicleBlur('category', focused)"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.year"
                  label="Year"
                  type="number"
                  :error-messages="vehicleErrors.year"
                  @update:focused="focused => onVehicleBlur('year', focused)"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-combobox
                  v-model="form.make"
                  label="Make"
                  :items="makeItems"
                  :error-messages="vehicleErrors.make"
                  @update:focused="focused => onVehicleBlur('make', focused)"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-combobox
                  v-model="form.model"
                  label="Model"
                  :items="modelItems"
                  :error-messages="vehicleErrors.model"
                  @update:focused="focused => onVehicleBlur('model', focused)"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.color"
                  label="Color"
                  :error-messages="vehicleErrors.color"
                  @update:focused="focused => onVehicleBlur('color', focused)"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.passengerCapacity"
                  label="Number of passengers"
                  type="number"
                  :error-messages="vehicleErrors.passengerCapacity"
                  @update:focused="focused => onVehicleBlur('passengerCapacity', focused)"
                />
              </v-col>
            </v-row>

            <template v-if="!isGolfCart">
              <p class="text-subtitle-2 mb-2">Registration</p>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="form.vin"
                    label="VIN"
                    :error-messages="vehicleErrors.vin"
                    @update:focused="focused => onVehicleBlur('vin', focused)"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.licensePlateNumber"
                    label="License Plate Number"
                    :error-messages="vehicleErrors.licensePlateNumber"
                    @update:focused="focused => onVehicleBlur('licensePlateNumber', focused)"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.licensePlateExpirationMonth"
                    label="License Plate Expiration Month"
                    :items="EXPIRATION_MONTHS"
                    :error-messages="vehicleErrors.licensePlateExpirationMonth"
                    @update:focused="focused => onVehicleBlur('licensePlateExpirationMonth', focused)"
                  />
                </v-col>
              </v-row>
            </template>
            <p v-else class="text-body-2 mb-4">Golf carts don't need a VIN or license plate.</p>

            <p class="text-subtitle-2 mb-2">Assignment</p>
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="form.areaAssigned"
                  label="Area Assigned"
                  :items="AREA_OPTIONS"
                  :error-messages="vehicleErrors.areaAssigned"
                  @update:focused="focused => onVehicleBlur('areaAssigned', focused)"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.purchasedDate"
                  label="Purchased Date"
                  type="date"
                  :error-messages="vehicleErrors.purchasedDate"
                  @update:focused="focused => onVehicleBlur('purchasedDate', focused)"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="vehicle-dialog-actions">
          <v-spacer />
          <v-btn
            class="vehicle-dialog-actions__btn"
            variant="outlined"
            color="primary"
            :slim="false"
            type="button"
            @click="vehicleDialog = false"
          >
            Close
          </v-btn>
          <v-btn
            class="oc-cta vehicle-dialog-actions__btn"
            color="primary"
            variant="flat"
            :slim="false"
            type="button"
            @click="saveVehicle"
          >
            {{ submitLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="480">
      <v-card>
        <v-card-title>Delete this vehicle?</v-card-title>
        <v-card-text>This removes the vehicle and its mileage and service logs.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn class="oc-cta" color="primary" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color">{{ snackbar.text }}</v-snackbar>
  </v-container>
</template>

<style scoped>
.vehicle-panel {
  color: rgb(var(--v-theme-on-surface));
  border-color: rgb(var(--v-theme-outline));
}

.vehicle-dialog-actions {
  align-items: center;
}

.vehicle-dialog-actions :deep(.vehicle-dialog-actions__btn) {
  flex: 0 0 10.75rem;
  width: 10.75rem;
  height: 36px;
  min-height: 36px;
  padding-inline: 16px;
  font-size: 0.875rem !important;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
  text-transform: none;
}
</style>
