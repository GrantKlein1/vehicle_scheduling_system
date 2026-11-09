<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { currentUser } from "../config/session.js";
import { isSystemAdmin, isAreaAdmin } from "../config/roles.js";
import {
  listReservations,
  createReservation,
  approveReservation,
  denyReservation,
  cancelReservation,
} from "../services/reservationServices.js";
import { listVehicles } from "../services/vehicleServices.js";
import { listDestinations } from "../services/destinationServices.js";
import { listDrivers } from "../services/driverServices.js";
import { listAreas } from "../services/areaServices.js";

const reservations = ref([]);
const vehicles = ref([]);
const destinations = ref([]);
const drivers = ref([]);
const areas = ref([]);

const loading = ref(false);
const search = ref("");
const statusFilter = ref("All");
const selectedReservationId = ref(null);

const snackbar = ref({
  show: false,
  text: "",
  color: "success",
});

function showSnackbar(text, color = "success") {
  snackbar.value = { show: true, text, color };
}

const isSystem = computed(() => isSystemAdmin(currentUser.value));
const isArea = computed(() => isAreaAdmin(currentUser.value));
const isStaffAdmin = computed(() => isSystem.value || isArea.value);

const pageTitle = computed(() =>
  isStaffAdmin.value ? "Vehicle Reservations" : "My Reservations"
);

const STATUS_FILTERS = ["All", "Pending", "Approved", "Denied", "Cancelled"];

const filteredReservations = computed(() => {
  return reservations.value.filter((r) => {
    if (statusFilter.value !== "All" && r.status?.toLowerCase() !== statusFilter.value.toLowerCase()) {
      return false;
    }
    if (search.value.trim()) {
      const q = search.value.trim().toLowerCase();
      const matchDest = (r.destinationName || "").toLowerCase().includes(q);
      const matchVehicle = (r.vehicleName || "").toLowerCase().includes(q);
      const matchDriver = (r.driverName || "").toLowerCase().includes(q);
      const matchArea = (r.areaName || "").toLowerCase().includes(q);
      const matchPurpose = (r.purpose || "").toLowerCase().includes(q);
      return matchDest || matchVehicle || matchDriver || matchArea || matchPurpose;
    }
    return true;
  });
});

const selectedReservation = computed(() => {
  return reservations.value.find((r) => r.id === selectedReservationId.value) || null;
});

watch(filteredReservations, (newVal) => {
  if (newVal.length > 0) {
    if (!selectedReservationId.value || !newVal.some((r) => r.id === selectedReservationId.value)) {
      selectedReservationId.value = newVal[0].id;
    }
  } else {
    selectedReservationId.value = null;
  }
});

function selectReservation(r) {
  selectedReservationId.value = r.id;
}

function statusColor(status) {
  switch (status?.toLowerCase()) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "denied":
      return "error";
    case "cancelled":
      return "grey";
    default:
      return "primary";
  }
}

function formatDateTime(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

async function loadReservations() {
  loading.value = true;
  try {
    const res = await listReservations();
    reservations.value = res.data || [];
    if (reservations.value.length > 0 && !selectedReservationId.value) {
      selectedReservationId.value = reservations.value[0].id;
    }
  } catch (err) {
    showSnackbar(err.response?.data?.message || "Failed to load reservations.", "error");
  } finally {
    loading.value = false;
  }
}

async function loadSupportingData() {
  try {
    const [vRes, dRes, drRes, aRes] = await Promise.allSettled([
      listVehicles(),
      listDestinations(),
      listDrivers(),
      listAreas(),
    ]);
    if (vRes.status === "fulfilled") vehicles.value = vRes.value.data || [];
    if (dRes.status === "fulfilled") destinations.value = dRes.value.data || [];
    if (drRes.status === "fulfilled") drivers.value = drRes.value.data || [];
    if (aRes.status === "fulfilled") areas.value = aRes.value.data || [];
  } catch (err) {
    // optional catalogs silently fail if restricted
  }
}

// Dialog States
const isCreateDialogOpen = ref(false);
const isDenyDialogOpen = ref(false);
const isCancelDialogOpen = ref(false);

const reservationForm = ref({
  vehicleId: null,
  destinationName: "",
  start: "",
  end: "",
  areaName: "",
  driverName: "",
  driverEmail: "",
  passengers: 1,
  purpose: "",
  notes: "",
});
const reservationFormErrors = ref({});
const denialReason = ref("");
const denialReasonError = ref("");

function openCreateDialog() {
  reservationForm.value = {
    vehicleId: vehicles.value[0]?.id || null,
    destinationName: "",
    start: "",
    end: "",
    areaName: vehicles.value[0]?.areaAssigned || currentUser.value?.areaName || "",
    driverName: "",
    driverEmail: "",
    passengers: 1,
    purpose: "",
    notes: "",
  };
  reservationFormErrors.value = {};
  isCreateDialogOpen.value = true;
}

function onVehicleChange() {
  const chosen = vehicles.value.find((v) => v.id === reservationForm.value.vehicleId);
  if (chosen && chosen.areaAssigned) {
    reservationForm.value.areaName = chosen.areaAssigned;
  }
}

function onDriverChange(driver) {
  if (typeof driver === "object" && driver !== null) {
    reservationForm.value.driverName = `${driver.firstName} ${driver.lastName}`.trim();
  }
}

function validateCreateForm() {
  const errors = {};
  if (!reservationForm.value.vehicleId) {
    errors.vehicleId = "Vehicle is required.";
  }
  const dest = typeof reservationForm.value.destinationName === "string"
    ? reservationForm.value.destinationName.trim()
    : reservationForm.value.destinationName?.name?.trim();
  if (!dest) {
    errors.destinationName = "Destination cannot be empty.";
  }
  if (!reservationForm.value.start || !reservationForm.value.end) {
    errors.start = "Start and end times are required.";
  } else {
    const s = new Date(reservationForm.value.start);
    const e = new Date(reservationForm.value.end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
      errors.end = "End time must be after start time.";
    }
  }
  reservationFormErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function handleCreateReservation() {
  if (!validateCreateForm()) return;

  const dest = typeof reservationForm.value.destinationName === "string"
    ? reservationForm.value.destinationName.trim()
    : reservationForm.value.destinationName?.name?.trim();

  const payload = {
    ...reservationForm.value,
    destinationName: dest,
    passengers: parseInt(reservationForm.value.passengers, 10) || 1,
  };

  try {
    const res = await createReservation(payload);
    isCreateDialogOpen.value = false;
    showSnackbar("Reservation submitted successfully!");
    await loadReservations();
    selectedReservationId.value = res.data.id;
  } catch (err) {
    showSnackbar(err.response?.data?.message || "Failed to create reservation.", "error");
  }
}

// Action checks
const canApproveOrDeny = computed(() => {
  if (!selectedReservation.value || selectedReservation.value.status !== "pending") return false;
  if (isSystem.value) return true;
  if (isArea.value && selectedReservation.value.areaName === currentUser.value?.areaName) return true;
  return false;
});

const canCancel = computed(() => {
  if (!selectedReservation.value) return false;
  const s = selectedReservation.value.status;
  if (s !== "pending" && s !== "approved") return false;
  if (isSystem.value) return true;
  if (isArea.value && selectedReservation.value.areaName === currentUser.value?.areaName) return true;
  if (selectedReservation.value.requestorId === currentUser.value?.userId) return true;
  return false;
});

async function handleApprove() {
  if (!selectedReservation.value) return;
  try {
    await approveReservation(selectedReservation.value.id);
    showSnackbar("Reservation approved successfully!");
    await loadReservations();
  } catch (err) {
    showSnackbar(err.response?.data?.message || "Failed to approve reservation.", "error");
  }
}

function openDenyDialog() {
  denialReason.value = "";
  denialReasonError.value = "";
  isDenyDialogOpen.value = true;
}

async function handleDeny() {
  if (!denialReason.value.trim()) {
    denialReasonError.value = "A denial reason is required.";
    return;
  }
  try {
    await denyReservation(selectedReservation.value.id, { reason: denialReason.value.trim() });
    isDenyDialogOpen.value = false;
    showSnackbar("Reservation denied.");
    await loadReservations();
  } catch (err) {
    showSnackbar(err.response?.data?.message || "Failed to deny reservation.", "error");
  }
}

function openCancelDialog() {
  isCancelDialogOpen.value = true;
}

async function handleCancel() {
  try {
    await cancelReservation(selectedReservation.value.id);
    isCancelDialogOpen.value = false;
    showSnackbar("Reservation cancelled.");
    await loadReservations();
  } catch (err) {
    isCancelDialogOpen.value = false;
    showSnackbar(err.response?.data?.message || "Failed to cancel reservation.", "error");
  }
}

onMounted(async () => {
  await Promise.all([loadReservations(), loadSupportingData()]);
});
</script>

<template>
  <v-container fluid class="reservations-view pa-6">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold">{{ pageTitle }}</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Book, review, and manage campus vehicle reservations
        </p>
      </div>
      <v-btn
        color="primary"
        class="oc-cta font-weight-bold px-4"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
      >
        + Request Vehicle
      </v-btn>
    </div>

    <!-- Status filter chips and search bar -->
    <v-card variant="outlined" class="pa-4 mb-6">
      <div class="d-flex align-center justify-space-between flex-wrap gap-4">
        <v-chip-group v-model="statusFilter" mandatory selected-class="text-primary font-weight-bold">
          <v-chip
            v-for="status in STATUS_FILTERS"
            :key="status"
            :value="status"
            filter
            variant="tonal"
          >
            {{ status }}
          </v-chip>
        </v-chip-group>

        <v-text-field
          v-model="search"
          density="compact"
          variant="outlined"
          placeholder="Search reservations"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          style="max-width: 320px;"
        />
      </div>
    </v-card>

    <!-- Master-Detail Content -->
    <v-row>
      <!-- Left Column: Reservation List -->
      <v-col cols="12" md="5" lg="4">
        <v-card variant="outlined" class="reservation-list-card">
          <v-progress-linear v-if="loading" indeterminate color="primary" />

          <v-list v-if="filteredReservations.length > 0" lines="two">
            <v-list-item
              v-for="r in filteredReservations"
              :key="r.id"
              :class="{ 'v-list-item--active bg-primary-lighten-5': r.id === selectedReservationId }"
              @click="selectReservation(r)"
            >
              <template #prepend>
                <v-avatar color="primary" variant="tonal" rounded>
                  <v-icon icon="mdi-calendar-clock" />
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ r.vehicleName }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ r.destinationName }} • {{ formatDateTime(r.start) }}
              </v-list-item-subtitle>

              <template #append>
                <v-chip
                  size="small"
                  :color="statusColor(r.status)"
                  variant="flat"
                  class="text-capitalize font-weight-medium"
                >
                  {{ r.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <div v-else-if="reservations.length === 0" class="pa-8 text-center text-medium-emphasis">
            No reservations yet.
          </div>
          <div v-else class="pa-8 text-center text-medium-emphasis">
            No reservations match your filter.
          </div>
        </v-card>
      </v-col>

      <!-- Right Column: Detail Panel -->
      <v-col cols="12" md="7" lg="8">
        <v-card v-if="selectedReservation" variant="outlined" class="pa-6">
          <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-4">
            <div>
              <div class="d-flex align-center gap-2">
                <h2 class="text-h5 font-weight-bold">Reservation #{{ selectedReservation.id }}</h2>
                <v-chip
                  size="small"
                  :color="statusColor(selectedReservation.status)"
                  variant="flat"
                  class="text-capitalize font-weight-bold"
                >
                  {{ selectedReservation.status }}
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Requested on {{ formatDateTime(selectedReservation.createdAt) }}
              </div>
            </div>

            <!-- Actions -->
            <div class="d-flex gap-2">
              <v-btn
                v-if="canApproveOrDeny"
                color="success"
                variant="flat"
                class="mr-2"
                prepend-icon="mdi-check"
                @click="handleApprove"
              >
                Approve
              </v-btn>
              <v-btn
                v-if="canApproveOrDeny"
                color="error"
                variant="flat"
                class="mr-2"
                prepend-icon="mdi-close"
                @click="openDenyDialog"
              >
                Deny
              </v-btn>
              <v-btn
                v-if="canCancel"
                color="error"
                variant="outlined"
                prepend-icon="mdi-cancel"
                @click="openCancelDialog"
              >
                Cancel Reservation
              </v-btn>
            </div>
          </div>

          <v-divider class="my-4" />

          <!-- Denial Alert if applicable -->
          <v-alert
            v-if="selectedReservation.status === 'denied'"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            <strong>Denial Reason:</strong> {{ selectedReservation.denialReason }}
          </v-alert>

          <!-- Reservation Details Grid -->
          <v-row class="mb-2">
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Vehicle</div>
              <div class="text-body-1 font-weight-medium">{{ selectedReservation.vehicleName }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Destination</div>
              <div class="text-body-1 font-weight-medium">{{ selectedReservation.destinationName }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Time Window</div>
              <div class="text-body-1 font-weight-medium">
                {{ formatDateTime(selectedReservation.start) }} to {{ formatDateTime(selectedReservation.end) }}
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Area</div>
              <div class="text-body-1 font-weight-medium">{{ selectedReservation.areaName || "None" }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Driver</div>
              <div class="text-body-1 font-weight-medium">
                <span v-if="selectedReservation.driverName">
                  {{ selectedReservation.driverName }}
                  <span v-if="selectedReservation.driverEmail" class="text-caption text-medium-emphasis">
                    ({{ selectedReservation.driverEmail }})
                  </span>
                </span>
                <span v-else class="text-medium-emphasis">No driver assigned</span>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Passengers</div>
              <div class="text-body-1 font-weight-medium">{{ selectedReservation.passengers }}</div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis">Purpose</div>
              <div class="text-body-1 font-weight-medium">{{ selectedReservation.purpose || "None" }}</div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis">Notes</div>
              <div class="text-body-1 font-weight-medium">{{ selectedReservation.notes || "None" }}</div>
            </v-col>
          </v-row>
        </v-card>

        <v-card v-else variant="outlined" class="pa-12 text-center text-medium-emphasis">
          Select a reservation from the list to view full trip details.
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog: Request Vehicle -->
    <v-dialog v-model="isCreateDialogOpen" max-width="640">
      <v-card>
        <v-card-title class="pa-4 font-weight-bold">
          Request Vehicle
        </v-card-title>
        <v-card-text class="pa-4">
          <v-select
            v-model="reservationForm.vehicleId"
            :items="vehicles"
            item-title="make"
            item-value="id"
            label="Vehicle *"
            :item-props="(v) => ({ title: `${v.year || ''} ${v.make} ${v.model} (${v.category})`, subtitle: `Area: ${v.areaAssigned}` })"
            variant="outlined"
            class="mb-3"
            :error-messages="reservationFormErrors.vehicleId"
            @update:model-value="onVehicleChange"
          />

          <v-combobox
            v-model="reservationForm.destinationName"
            :items="destinations.map(d => d.name)"
            label="Destination *"
            variant="outlined"
            placeholder="Select or enter destination"
            class="mb-3"
            :error-messages="reservationFormErrors.destinationName"
          />

          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="reservationForm.start"
                type="text"
                label="Start Date & Time (YYYY-MM-DD HH:mm) *"
                placeholder="2026-11-02 08:00"
                variant="outlined"
                class="mb-3"
                :error-messages="reservationFormErrors.start"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="reservationForm.end"
                type="text"
                label="End Date & Time (YYYY-MM-DD HH:mm) *"
                placeholder="2026-11-02 12:00"
                variant="outlined"
                class="mb-3"
                :error-messages="reservationFormErrors.end"
              />
            </v-col>
          </v-row>

          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-select
                v-model="reservationForm.areaName"
                :items="areas.map(a => a.name)"
                label="Area"
                variant="outlined"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="reservationForm.passengers"
                type="number"
                min="1"
                label="Passengers"
                variant="outlined"
                class="mb-3"
              />
            </v-col>
          </v-row>

          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-combobox
                v-model="reservationForm.driverName"
                :items="drivers.map(d => `${d.firstName} ${d.lastName}`.trim())"
                label="Driver Name"
                variant="outlined"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="reservationForm.driverEmail"
                type="email"
                label="Driver Email"
                variant="outlined"
                class="mb-3"
              />
            </v-col>
          </v-row>

          <v-text-field
            v-model="reservationForm.purpose"
            label="Purpose of Trip"
            variant="outlined"
            class="mb-3"
          />

          <v-textarea
            v-model="reservationForm.notes"
            label="Notes"
            rows="2"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions class="pa-4 justify-end">
          <v-btn variant="text" @click="isCreateDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" class="oc-cta font-weight-bold" @click="handleCreateReservation">
            Submit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Deny Reservation -->
    <v-dialog v-model="isDenyDialogOpen" max-width="500">
      <v-card>
        <v-card-title class="pa-4 font-weight-bold text-error">
          Deny Reservation
        </v-card-title>
        <v-card-text class="pa-4">
          <p class="text-body-2 mb-3">Please provide a reason for denying this reservation:</p>
          <v-textarea
            v-model="denialReason"
            label="Reason for denial *"
            variant="outlined"
            rows="3"
            :error-messages="denialReasonError"
          />
        </v-card-text>
        <v-card-actions class="pa-4 justify-end">
          <v-btn variant="text" @click="isDenyDialogOpen = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="handleDeny">Confirm Denial</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Cancel Reservation -->
    <v-dialog v-model="isCancelDialogOpen" max-width="480">
      <v-card>
        <v-card-title class="pa-4 font-weight-bold">
          Cancel Reservation
        </v-card-title>
        <v-card-text class="pa-4">
          Are you sure you want to cancel this reservation? The vehicle will be released for other trips.
        </v-card-text>
        <v-card-actions class="pa-4 justify-end">
          <v-btn variant="text" @click="isCancelDialogOpen = false">Keep Reservation</v-btn>
          <v-btn color="error" variant="flat" @click="handleCancel">Yes, Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4000">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
