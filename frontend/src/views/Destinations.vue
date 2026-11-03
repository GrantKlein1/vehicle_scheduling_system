<script setup>
import { computed, onMounted, ref } from "vue";
import { currentUser } from "../config/session.js";
import { isAnyAdmin, isAreaAdmin, isSystemAdmin, ROLES } from "../config/roles.js";
import {
  createDestination,
  deleteDestination,
  listDestinations,
  updateDestination,
} from "../services/destinationServices.js";

const canEdit = computed(
  () =>
    isSystemAdmin(currentUser.value) ||
    isAreaAdmin(currentUser.value) ||
    currentUser.value?.role === ROLES.MAINTENANCE
);
const canDelete = computed(() => isAnyAdmin(currentUser.value));

const destinations = ref([]);
const loaded = ref(false);
const snackbar = ref({ show: false, text: "", color: "success" });

const destinationDialog = ref(false);
const destinationMode = ref("add");
const editingId = ref(null);
const form = ref(emptyDestination());
const destinationErrors = ref({});

const deleteDialog = ref(false);
const deletingDestination = ref(null);

const dialogTitle = computed(() =>
  destinationMode.value === "add" ? "Add Destination" : "Edit Destination"
);
const submitLabel = computed(() =>
  destinationMode.value === "add" ? "Save" : "Update Destination"
);

const FIELDS = [
  ["name", "Name"],
  ["addressLine1", "Address Line 1"],
  ["addressLine2", "Address Line 2"],
  ["city", "City"],
  ["state", "State"],
  ["zip", "Zip"],
];

const REQUIRED = ["name", "addressLine1", "city", "state", "zip"];

function emptyDestination() {
  return {
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
  };
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function validateForm() {
  const errors = {};
  for (const [key] of FIELDS) {
    errors[key] = REQUIRED.includes(key) && isBlank(form.value[key]) ? ["Required field"] : [];
  }
  destinationErrors.value = errors;
  return Object.values(errors).some((messages) => messages.length > 0);
}

function destinationPayload() {
  return {
    name: String(form.value.name).trim(),
    addressLine1: String(form.value.addressLine1).trim(),
    addressLine2: String(form.value.addressLine2 ?? "").trim(),
    city: String(form.value.city).trim(),
    state: String(form.value.state).trim(),
    zip: String(form.value.zip).trim(),
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

async function loadDestinations() {
  try {
    const response = await listDestinations();
    destinations.value = response.data;
  } catch (error) {
    destinations.value = [];
    notify(apiMessage(error), true);
  } finally {
    loaded.value = true;
  }
}

function openAdd() {
  destinationMode.value = "add";
  editingId.value = null;
  form.value = emptyDestination();
  destinationErrors.value = {};
  destinationDialog.value = true;
}

function openEdit(destination) {
  destinationMode.value = "edit";
  editingId.value = destination.id;
  form.value = {
    name: destination.name,
    addressLine1: destination.addressLine1,
    addressLine2: destination.addressLine2 ?? "",
    city: destination.city,
    state: destination.state,
    zip: destination.zip,
  };
  destinationErrors.value = {};
  destinationDialog.value = true;
}

function openDelete(destination) {
  deletingDestination.value = destination;
  deleteDialog.value = true;
}

async function saveDestination() {
  if (validateForm()) {
    return;
  }

  const body = destinationPayload();
  try {
    if (destinationMode.value === "add") {
      await createDestination(body);
      destinationDialog.value = false;
      await loadDestinations();
      notify("Destination added successfully!");
      return;
    }

    await updateDestination(editingId.value, body);
    destinationDialog.value = false;
    await loadDestinations();
  } catch (error) {
    notify(apiMessage(error), true);
  }
}

async function confirmDelete() {
  const destinationId = deletingDestination.value?.id;
  try {
    await deleteDestination(destinationId);
    deleteDialog.value = false;
    deletingDestination.value = null;
    await loadDestinations();
  } catch (error) {
    notify(apiMessage(error), true);
  }
}

function cancelDelete() {
  deleteDialog.value = false;
  deletingDestination.value = null;
}

onMounted(loadDestinations);
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Destinations</h1>
      <v-spacer />
      <v-btn class="oc-cta" color="primary" type="button" @click="openAdd">Add Destination</v-btn>
    </div>

    <v-table v-if="loaded" class="destination-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Address</th>
          <th>City</th>
          <th>State</th>
          <th>Zip</th>
          <th v-if="canEdit || canDelete"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="destination in destinations" :key="destination.id">
          <td>{{ destination.name }}</td>
          <td>
            <div>{{ destination.addressLine1 }}</div>
            <div v-if="destination.addressLine2">{{ destination.addressLine2 }}</div>
          </td>
          <td>{{ destination.city }}</td>
          <td>{{ destination.state }}</td>
          <td>{{ destination.zip }}</td>
          <td v-if="canEdit || canDelete">
            <v-btn
              v-if="canEdit"
              icon
              variant="text"
              type="button"
              aria-label="Edit"
              @click="openEdit(destination)"
            >
              <v-icon icon="mdi-pencil" />
            </v-btn>
            <v-btn
              v-if="canDelete"
              icon
              variant="text"
              type="button"
              aria-label="Delete"
              @click="openDelete(destination)"
            >
              <v-icon icon="mdi-delete" />
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="destinationDialog" max-width="720">
      <v-card>
        <v-card-title>{{ dialogTitle }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveDestination">
            <v-row>
              <v-col v-for="[key, label] in FIELDS" :key="key" cols="12" sm="6">
                <v-text-field
                  v-model="form[key]"
                  :label="label"
                  :error-messages="destinationErrors[key]"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" type="button" @click="destinationDialog = false">Close</v-btn>
          <v-btn class="oc-cta" color="primary" type="button" @click="saveDestination">
            {{ submitLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="480">
      <v-card>
        <v-card-title>Delete this destination?</v-card-title>
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
