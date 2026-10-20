<script setup>
import { computed } from "vue";
import { currentUser } from "../config/session.js";

const firstName = computed(() => currentUser.value?.fName || "");
</script>

<template>
  <v-container class="py-10">
    <h1 class="text-h4">Welcome, {{ firstName }}.</h1>
  </v-container>
</template>
