<script setup>
import { computed } from "vue";
import { vehicleIconBackdrop, vehicleIconPaint, CATEGORY_ICONS } from "../../config/vehicleDisplay.js";

const props = defineProps({
  category: { type: String, default: "" },
  color: { type: String, default: "" },
});

const icon = computed(() => CATEGORY_ICONS[props.category] ?? "mdi-car");
const paint = computed(() => vehicleIconPaint(props.color));
const backdrop = computed(() => vehicleIconBackdrop(props.color));
</script>

<template>
  <v-avatar class="vehicle-icon" :style="{ backgroundColor: backdrop, '--vehicle-paint': paint }">
    <v-icon :icon="icon" />
  </v-avatar>
</template>

<style scoped>
.vehicle-icon {
  border: 1px solid rgba(0, 0, 0, 0.16);
}

.vehicle-icon :deep(.v-icon) {
  color: var(--vehicle-paint) !important;
}
</style>
