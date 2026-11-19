<script setup>
import { computed } from "vue";
import { CATEGORY_ICONS } from "../../config/vehicleDisplay.js";

const props = defineProps({
  category: { type: String, default: "" },
});

const icon = computed(() => CATEGORY_ICONS[props.category] ?? "mdi-car");
</script>

<template>
  <v-avatar color="primary" variant="tonal">
    <v-icon :icon="icon" />
  </v-avatar>
</template>
