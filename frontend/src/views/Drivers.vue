<script setup>
import { computed, onMounted, ref } from "vue";
import { currentUser } from "../config/session.js";
import { isAnyAdmin } from "../config/roles.js";
import { createDriver, deleteDriver, listDrivers, updateDriver } from "../services/driverServices.js";

const canChangeDrivers = computed(() => isAnyAdmin(currentUser.value));

const drivers = ref([]);
const loaded = ref(false);
const snackbar = ref({ show: false, text: "", color: "success" });

const driverDialog = ref(false);
const driverMode = ref("add");
const editingId = ref(null);
const form = ref(emptyDriver());
const driverErrors = ref({});

const deleteDialog = ref(false);
const deletingDriver = ref(null);

const dialogTitle = computed(() => (driverMode.value === "add" ? "Add Driver" : "Edit Driver"));
const submitLabel = computed(() => (driverMode.value === "add" ? "Save" : "Update Driver"));

const FIELDS = [
  ["firstName", "First Name"],
  ["lastName", "Last Name"],
  ["driverLicenseNumber", "Driver License Number"],
  ["driverLicenseExpDate", "Driver License Expiration Date"],
  ["insuranceProvider", "Insurance Provider"],
  ["insuranceNumber", "Insurance Number"],
  ["approvedDate", "Approved Date"],
];

const DATE_FIELDS = ["driverLicenseExpDate", "approvedDate"];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function emptyDriver() {
  return {
    firstName: "",
    lastName: "",
    driverLicenseNumber: "",
    driverLicenseExpDate: "",
    insuranceProvider: "",
    insuranceNumber: "",
    approvedDate: "",
  };
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
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

function dateOnly(value) {
  if (!value) {
    return "";
  }
  return String(value).slice(0, 10);
}

function driverName(driver) {
  return `${driver.firstName} ${driver.lastName}`;
}

function fieldMessage(key, value) {
  if (isBlank(value)) {
    return "Required field";
  }
  if (key === "lastName" && String(value).trim().length > 50) {
    return "Last Name cannot exceed 50 characters.";
  }
  if (DATE_FIELDS.includes(key) && !isRealDate(String(value))) {
    const label = FIELDS.find(([field]) => field === key)?.[1] ?? "Date";
    return `${label} must be a valid date.`;
  }
  return "";
}

function validateForm() {
  const errors = {};
  for (const [key] of FIELDS) {
    const message = fieldMessage(key, form.value[key]);
    errors[key] = message ? [message] : [];
  }
  driverErrors.value = errors;
  return Object.values(errors).some((messages) => messages.length > 0);
}

function driverPayload() {
  return {
    firstName: String(form.value.firstName).trim(),
    lastName: String(form.value.lastName).trim(),
    driverLicenseNumber: String(form.value.driverLicenseNumber).trim(),
    driverLicenseExpDate: String(form.value.driverLicenseExpDate).trim(),
    insuranceProvider: String(form.value.insuranceProvider).trim(),
    insuranceNumber: String(form.value.insuranceNumber).trim(),
    approvedDate: String(form.value.approvedDate).trim(),
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

async function loadDrivers() {
  try {
    const response = await listDrivers();
    drivers.value = response.data;
  } catch (error) {
    drivers.value = [];
    notify(apiMessage(error), true);
  } finally {
    loaded.value = true;
  }
}

function openAdd() {
  driverMode.value = "add";
  editingId.value = null;
  form.value = emptyDriver();
  driverErrors.value = {};
  driverDialog.value = true;
}

function openEdit(driver) {
  driverMode.value = "edit";
  editingId.value = driver.id;
  form.value = {
    firstName: driver.firstName,
    lastName: driver.lastName,
    driverLicenseNumber: driver.driverLicenseNumber,
    driverLicenseExpDate: dateOnly(driver.driverLicenseExpDate),
    insuranceProvider: driver.insuranceProvider,
    insuranceNumber: driver.insuranceNumber,
    approvedDate: dateOnly(driver.approvedDate),
  };
  driverErrors.value = {};
  driverDialog.value = true;
}

function openDelete(driver) {
  deletingDriver.value = driver;
  deleteDialog.value = true;
}

async function saveDriver() {
  if (validateForm()) {
    return;
  }

  const body = driverPayload();
  try {
    if (driverMode.value === "add") {
      await createDriver(body);
      driverDialog.value = false;
      await loadDrivers();
      notify("Driver added successfully!");
      return;
    }

    await updateDriver(editingId.value, body);
    driverDialog.value = false;
    await loadDrivers();
  } catch (error) {
    notify(apiMessage(error), true);
  }
}

async function confirmDelete() {
  const driverId = deletingDriver.value?.id;
  try {
    await deleteDriver(driverId);
    deleteDialog.value = false;
    deletingDriver.value = null;
    await loadDrivers();
  } catch (error) {
    notify(apiMessage(error), true);
  }
}

function cancelDelete() {
  deleteDialog.value = false;
  deletingDriver.value = null;
}

onMounted(loadDrivers);
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Drivers</h1>
      <v-spacer />
      <v-btn
        v-if="canChangeDrivers"
        class="oc-cta"
        color="primary"
        type="button"
        @click="openAdd"
      >
        Add Driver
      </v-btn>
    </div>

    <v-table v-if="loaded" class="driver-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Driver License Expiration Date</th>
          <th>Status</th>
          <th v-if="canChangeDrivers"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="driver in drivers" :key="driver.id">
          <td>{{ driverName(driver) }}</td>
          <td>{{ dateOnly(driver.driverLicenseExpDate) }}</td>
          <td>{{ driver.status }}</td>
          <td v-if="canChangeDrivers">
            <v-btn variant="text" type="button" @click="openEdit(driver)">Edit</v-btn>
            <v-btn variant="text" type="button" @click="openDelete(driver)">Delete</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="driverDialog" max-width="720">
      <v-card>
        <v-card-title>{{ dialogTitle }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveDriver">
            <v-row>
              <v-col v-for="[key, label] in FIELDS" :key="key" cols="12" sm="6">
                <v-text-field
                  v-model="form[key]"
                  :label="label"
                  :type="DATE_FIELDS.includes(key) ? 'date' : 'text'"
                  :error-messages="driverErrors[key]"
                />
              </v-col>
              <v-col cols="12">
                <p class="text-body-2 mb-0">
                  Status is set from the approved date. It stays valid for one year, then becomes expired.
                </p>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" type="button" @click="driverDialog = false">Cancel</v-btn>
          <v-btn class="oc-cta" color="primary" type="button" @click="saveDriver">
            {{ submitLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="480">
      <v-card>
        <v-card-title>Delete this driver?</v-card-title>
        <v-card-text v-if="deletingDriver">
          Delete {{ driverName(deletingDriver) }} from the driver list?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" type="button" @click="cancelDelete">Cancel</v-btn>
          <v-btn class="oc-cta" color="primary" type="button" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color">{{ snackbar.text }}</v-snackbar>
  </v-container>
</template>
