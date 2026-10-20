<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { clearCurrentUser, currentUser } from "../config/session.js";
import { logout } from "../services/authServices.js";

const route = useRoute();
const router = useRouter();

const navItems = [];

const visibleNavItems = computed(() =>
  navItems.filter((item) => item.roles.includes(currentUser.value?.role))
);

const showSessionActions = computed(
  () => Boolean(currentUser.value?.token) && route.name === "home"
);

const displayName = computed(() => {
  if (!showSessionActions.value) {
    return "";
  }
  return `${currentUser.value.fName} ${currentUser.value.lName}`.trim();
});

async function signOut() {
  try {
    await logout();
  } finally {
    clearCurrentUser();
    await router.push({ name: "login" });
  }
}
</script>

<template>
  <v-app-bar class="menu-bar" color="primary" density="comfortable">
    <v-btn
      v-for="item in visibleNavItems"
      :key="item.title"
      variant="text"
      :to="item.to"
    >
      {{ item.title }}
    </v-btn>
    <v-spacer />
    <span v-if="displayName" class="mr-4">{{ displayName }}</span>
    <v-btn v-if="showSessionActions" variant="text" @click="signOut">Sign out</v-btn>
  </v-app-bar>
</template>
