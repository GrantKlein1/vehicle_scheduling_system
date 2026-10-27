<script setup>
import { computed, ref } from "vue";
import { CATEGORY_ICONS, vehicleTitle } from "../../config/vehicleDisplay.js";

const props = defineProps({
  vehicles: { type: Array, required: true },
  selectedId: { type: [Number, String], default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["select"]);

const search = ref("");

const filtered = computed(() => {
  const query = String(search.value ?? "").trim().toLowerCase();
  if (!query) {
    return props.vehicles;
  }
  return props.vehicles.filter((vehicle) => {
    const haystack = [
      vehicle.year,
      vehicle.make,
      vehicle.model,
      vehicle.category,
      vehicle.licensePlateNumber,
      vehicle.areaAssigned,
      vehicle.color,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
});

function plateLabel(vehicle) {
  return vehicle.licensePlateNumber || "No plate";
}
</script>

<template>
  <v-card class="vehicle-panel" variant="outlined">
    <v-card-text class="pb-2">
      <v-text-field
        v-model="search"
        label="Search vehicles"
        prepend-inner-icon="mdi-magnify"
        clearable
        density="compact"
        hide-details
      />
      <p class="text-caption mt-2 mb-0">{{ filtered.length }} vehicles</p>
    </v-card-text>
    <v-progress-linear v-if="loading" indeterminate />
    <v-list class="vehicle-list" nav>
      <v-list-item
        v-for="vehicle in filtered"
        :key="vehicle.id"
        class="vehicle-list-item"
        :active="vehicle.id === selectedId"
        color="primary"
        rounded="lg"
        @click="emit('select', vehicle.id)"
      >
        <template #prepend>
          <v-avatar color="primary" variant="tonal">
            <v-icon :icon="CATEGORY_ICONS[vehicle.category]" />
          </v-avatar>
        </template>
        <v-list-item-title>{{ vehicleTitle(vehicle) }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ plateLabel(vehicle) }} - {{ vehicle.areaAssigned }}
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <p v-if="filtered.length === 0" class="text-body-2 px-4 pb-4">No vehicles match your search.</p>
  </v-card>
</template>

<style scoped>
.vehicle-panel {
  color: rgb(var(--v-theme-on-surface));
  border-color: rgb(var(--v-theme-outline));
}

@media (min-width: 960px) {
  .vehicle-list {
    max-height: calc(100vh - 220px);
    overflow-y: auto;
  }
}
</style>
