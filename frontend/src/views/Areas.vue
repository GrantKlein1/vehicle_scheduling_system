<script setup>
import { ref, computed, onMounted } from "vue";
import {
  listAreas,
  createArea,
  updateArea,
  deleteArea,
  listAreaAdmins,
  assignAreaAdmin,
  removeAreaAdmin,
} from "../services/areaServices.js";

const areas = ref([]);
const selectedAreaId = ref(null);
const search = ref("");
const loading = ref(false);
const errorMessage = ref("");

// Snackbars
const snackbar = ref({
  show: false,
  text: "",
  color: "success",
});

function showSnackbar(text, color = "success") {
  snackbar.value = {
    show: true,
    text,
    color,
  };
}

// Dialogs
const isAddDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isAssignAdminDialogOpen = ref(false);
const isRemoveAdminDialogOpen = ref(false);

const areaForm = ref({
  name: "",
  notificationEmail: "",
  logo: "",
});
const areaFormErrors = ref({});

const adminForm = ref({
  email: "",
});
const adminFormErrors = ref({});

const areaAdmins = ref([]);
const loadingAdmins = ref(false);
const adminToRemove = ref(null);

const filteredAreas = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return areas.value;
  return areas.value.filter(
    (area) =>
      area.name?.toLowerCase().includes(query) ||
      area.notificationEmail?.toLowerCase().includes(query)
  );
});

const selectedArea = computed(() => {
  return areas.value.find((a) => a.id === selectedAreaId.value) || null;
});

async function loadAreas() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const res = await listAreas();
    areas.value = res.data;
    if (areas.value.length > 0 && !selectedAreaId.value) {
      selectArea(areas.value[0]);
    } else if (selectedAreaId.value) {
      const stillExists = areas.value.find((a) => a.id === selectedAreaId.value);
      if (stillExists) {
        selectArea(stillExists);
      } else if (areas.value.length > 0) {
        selectArea(areas.value[0]);
      } else {
        selectedAreaId.value = null;
        areaAdmins.value = [];
      }
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.message || "Failed to load areas.";
  } finally {
    loading.value = false;
  }
}

async function selectArea(area) {
  selectedAreaId.value = area.id;
  await loadAreaAdmins(area.id);
}

async function loadAreaAdmins(areaId) {
  if (!areaId) {
    areaAdmins.value = [];
    return;
  }
  loadingAdmins.value = true;
  try {
    const res = await listAreaAdmins(areaId);
    areaAdmins.value = res.data;
  } catch {
    areaAdmins.value = [];
  } finally {
    loadingAdmins.value = false;
  }
}

function openAddDialog() {
  areaForm.value = { name: "", notificationEmail: "", logo: "" };
  areaFormErrors.value = {};
  isAddDialogOpen.value = true;
}

function openEditDialog() {
  if (!selectedArea.value) return;
  areaForm.value = {
    name: selectedArea.value.name,
    notificationEmail: selectedArea.value.notificationEmail || "",
    logo: selectedArea.value.logo || "",
  };
  areaFormErrors.value = {};
  isEditDialogOpen.value = true;
}

function openDeleteDialog() {
  if (!selectedArea.value) return;
  isDeleteDialogOpen.value = true;
}

function openAssignAdminDialog() {
  adminForm.value = { email: "" };
  adminFormErrors.value = {};
  isAssignAdminDialogOpen.value = true;
}

function promptRemoveAdmin(admin) {
  adminToRemove.value = admin;
  isRemoveAdminDialogOpen.value = true;
}

function validateForm() {
  const errors = {};
  if (!areaForm.value.name?.trim()) {
    errors.name = "Area name cannot be empty.";
  } else if (areaForm.value.name.trim().length > 50) {
    errors.name = "Area name cannot exceed 50 characters.";
  }

  const email = areaForm.value.notificationEmail?.trim();
  if (!email) {
    errors.notificationEmail = "Notification email cannot be empty.";
  } else if (email.length > 255) {
    errors.notificationEmail = "Notification email cannot exceed 255 characters.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.notificationEmail = "Notification email must be a valid email address.";
  }

  if (areaForm.value.logo && areaForm.value.logo.trim().length > 255) {
    errors.logo = "Logo cannot exceed 255 characters.";
  }

  areaFormErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function handleCreateArea() {
  if (!validateForm()) return;
  try {
    const res = await createArea(areaForm.value);
    isAddDialogOpen.value = false;
    showSnackbar("Area was created successfully.");
    await loadAreas();
    selectedAreaId.value = res.data.id;
    await loadAreaAdmins(res.data.id);
  } catch (err) {
    showSnackbar(err.response?.data?.message || "Failed to create area.", "error");
  }
}

async function handleUpdateArea() {
  if (!validateForm()) return;
  try {
    await updateArea(selectedAreaId.value, areaForm.value);
    isEditDialogOpen.value = false;
    showSnackbar("Area was updated successfully.");
    await loadAreas();
  } catch (err) {
    showSnackbar(err.response?.data?.message || "Failed to update area.", "error");
  }
}

async function handleDeleteArea() {
  try {
    await deleteArea(selectedAreaId.value);
    isDeleteDialogOpen.value = false;
    showSnackbar("Area was deleted successfully!");
    selectedAreaId.value = null;
    await loadAreas();
  } catch (err) {
    isDeleteDialogOpen.value = false;
    showSnackbar(err.response?.data?.message || "Failed to delete area.", "error");
  }
}

async function handleAssignAdmin() {
  const email = adminForm.value.email?.trim();
  if (!email) {
    adminFormErrors.value = { email: "Email is required." };
    return;
  }
  try {
    await assignAreaAdmin(selectedAreaId.value, { email });
    isAssignAdminDialogOpen.value = false;
    showSnackbar("User assigned as area admin successfully.");
    await loadAreaAdmins(selectedAreaId.value);
  } catch (err) {
    showSnackbar(err.response?.data?.message || "Failed to assign area admin.", "error");
  }
}

async function handleRemoveAdmin() {
  if (!adminToRemove.value) return;
  try {
    await removeAreaAdmin(selectedAreaId.value, adminToRemove.value.id);
    isRemoveAdminDialogOpen.value = false;
    showSnackbar("Area admin removed successfully.");
    await loadAreaAdmins(selectedAreaId.value);
  } catch (err) {
    isRemoveAdminDialogOpen.value = false;
    showSnackbar(err.response?.data?.message || "Failed to remove area admin.", "error");
  }
}

onMounted(() => {
  loadAreas();
});
</script>

<template>
  <v-container fluid class="areas-view pa-6">
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h4 font-weight-bold">Areas</h1>
      <v-btn class="oc-cta" color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
        + Add Area
      </v-btn>
    </div>

    <v-alert v-if="errorMessage" type="error" class="mb-4" closable>
      {{ errorMessage }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center my-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="areas.length === 0" class="text-center my-12 text-h6 text-medium-emphasis">
      No areas yet.
    </div>

    <v-row v-else>
      <!-- Left Column: List -->
      <v-col cols="12" md="5" lg="4">
        <v-card variant="outlined" class="mb-4">
          <v-card-text class="pa-3">
            <v-text-field
              v-model="search"
              placeholder="Search areas"
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
            />
          </v-card-text>
        </v-card>

        <v-card variant="outlined" class="area-list-card">
          <v-list v-if="filteredAreas.length > 0" lines="two" class="pa-0">
            <v-list-item
              v-for="area in filteredAreas"
              :key="area.id"
              :class="{ 'v-list-item--active bg-primary-lighten-5': area.id === selectedAreaId }"
              @click="selectArea(area)"
            >
              <template #prepend>
                <v-avatar color="primary" variant="tonal" rounded>
                  <img v-if="area.logo" :src="area.logo" :alt="area.name" style="object-fit: cover; width: 100%; height: 100%;" />
                  <v-icon v-else icon="mdi-domain" />
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium">
                {{ area.name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ area.notificationEmail || "No email" }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <div v-else class="pa-6 text-center text-medium-emphasis">
            No areas match your search.
          </div>
        </v-card>
      </v-col>

      <!-- Right Column: Detail Panel -->
      <v-col cols="12" md="7" lg="8">
        <v-card v-if="selectedArea" variant="outlined" class="pa-4">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center">
              <v-avatar size="48" color="primary" variant="tonal" rounded class="mr-4">
                <img
                  v-if="selectedArea.logo"
                  :src="selectedArea.logo"
                  :alt="selectedArea.name"
                  style="object-fit: cover; width: 100%; height: 100%;"
                />
                <v-icon v-else icon="mdi-domain" size="28" />
              </v-avatar>
              <div>
                <h2 class="text-h5 font-weight-bold">{{ selectedArea.name }}</h2>
                <div class="text-body-2 text-medium-emphasis">
                  {{ selectedArea.notificationEmail }}
                </div>
              </div>
            </div>
            <div class="d-flex gap-2">
              <v-btn
                variant="outlined"
                color="primary"
                prepend-icon="mdi-pencil"
                class="mr-2"
                @click="openEditDialog"
              >
                Edit area
              </v-btn>
              <v-btn
                variant="outlined"
                color="error"
                prepend-icon="mdi-delete"
                @click="openDeleteDialog"
              >
                Delete area
              </v-btn>
            </div>
          </div>

          <v-divider class="my-4" />

          <v-row class="mb-4">
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Area Name</div>
              <div class="text-body-1 font-weight-medium">{{ selectedArea.name }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Notification Email</div>
              <div class="text-body-1 font-weight-medium">
                {{ selectedArea.notificationEmail || "None" }}
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Area Logo</div>
              <div class="text-body-1 font-weight-medium">
                {{ selectedArea.logo || "No logo provided" }}
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Created</div>
              <div class="text-body-1 font-weight-medium">
                {{ selectedArea.createdAt ? new Date(selectedArea.createdAt).toLocaleDateString() : "N/A" }}
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Area Administrators Section -->
          <div class="area-admins-section">
            <div class="d-flex align-center justify-space-between mb-3">
              <h3 class="text-h6 font-weight-bold">Area Administrators</h3>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-account-plus"
                @click="openAssignAdminDialog"
              >
                + Assign Area Admin
              </v-btn>
            </div>

            <div v-if="loadingAdmins" class="d-flex justify-center my-4">
              <v-progress-circular indeterminate size="24" />
            </div>

            <div
              v-else-if="areaAdmins.length === 0"
              class="pa-4 text-center text-medium-emphasis bg-grey-lighten-4 rounded"
            >
              No area administrators assigned.
            </div>

            <v-table v-else density="compact" class="admins-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="admin in areaAdmins" :key="admin.id">
                  <td>{{ admin.fName }} {{ admin.lName }}</td>
                  <td>{{ admin.email }}</td>
                  <td class="text-right">
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      variant="text"
                      color="error"
                      aria-label="Remove area admin"
                      @click="promptRemoveAdmin(admin)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Area Dialog -->
    <v-dialog v-model="isAddDialogOpen" max-width="500">
      <v-card>
        <v-card-title class="pa-4 text-h6 font-weight-bold">Add Area</v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-text-field
            v-model="areaForm.name"
            label="Area Name *"
            variant="outlined"
            density="compact"
            :error-messages="areaFormErrors.name"
            class="mb-3"
          />
          <v-text-field
            v-model="areaForm.notificationEmail"
            label="Notification Email *"
            variant="outlined"
            density="compact"
            :error-messages="areaFormErrors.notificationEmail"
            class="mb-3"
          />
          <v-text-field
            v-model="areaForm.logo"
            label="Area Logo"
            variant="outlined"
            density="compact"
            placeholder="e.g. athletics-logo.png"
            :error-messages="areaFormErrors.logo"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn variant="text" @click="isAddDialogOpen = false">Cancel</v-btn>
          <v-btn class="oc-cta" color="primary" @click="handleCreateArea">Save Area</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Area Dialog -->
    <v-dialog v-model="isEditDialogOpen" max-width="500">
      <v-card>
        <v-card-title class="pa-4 text-h6 font-weight-bold">Edit Area</v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-text-field
            v-model="areaForm.name"
            label="Area Name *"
            variant="outlined"
            density="compact"
            :error-messages="areaFormErrors.name"
            class="mb-3"
          />
          <v-text-field
            v-model="areaForm.notificationEmail"
            label="Notification Email *"
            variant="outlined"
            density="compact"
            :error-messages="areaFormErrors.notificationEmail"
            class="mb-3"
          />
          <v-text-field
            v-model="areaForm.logo"
            label="Area Logo"
            variant="outlined"
            density="compact"
            :error-messages="areaFormErrors.logo"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn variant="text" @click="isEditDialogOpen = false">Cancel</v-btn>
          <v-btn class="oc-cta" color="primary" @click="handleUpdateArea">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Area Dialog -->
    <v-dialog v-model="isDeleteDialogOpen" max-width="450">
      <v-card>
        <v-card-title class="pa-4 text-h6 font-weight-bold">Delete Area</v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          Are you sure you want to delete {{ selectedArea?.name }}?
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn variant="text" @click="isDeleteDialogOpen = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="handleDeleteArea">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Assign Area Admin Dialog -->
    <v-dialog v-model="isAssignAdminDialogOpen" max-width="450">
      <v-card>
        <v-card-title class="pa-4 text-h6 font-weight-bold">
          Assign Area Administrator
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-text-field
            v-model="adminForm.email"
            label="User Email *"
            placeholder="user@eagles.oc.edu"
            variant="outlined"
            density="compact"
            :error-messages="adminFormErrors.email"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn variant="text" @click="isAssignAdminDialogOpen = false">Cancel</v-btn>
          <v-btn class="oc-cta" color="primary" @click="handleAssignAdmin">Assign Admin</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Area Admin Confirmation Dialog -->
    <v-dialog v-model="isRemoveAdminDialogOpen" max-width="450">
      <v-card>
        <v-card-title class="pa-4 text-h6 font-weight-bold">
          Remove Area Administrator
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          Are you sure you want to remove {{ adminToRemove?.fName }} {{ adminToRemove?.lName }} as an administrator for {{ selectedArea?.name }}?
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn variant="text" @click="isRemoveAdminDialogOpen = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="handleRemoveAdmin">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.area-list-card {
  max-height: 600px;
  overflow-y: auto;
}
</style>
