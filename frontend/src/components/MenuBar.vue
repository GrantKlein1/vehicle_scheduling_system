<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { clearCurrentUser, currentUser } from "../config/session.js";
import { formatRoleLabel, roleMatchesNav } from "../config/roles.js";
import { logout } from "../services/authServices.js";

const router = useRouter();

const navItems = [
  { title: "Vehicle", to: { name: "vehicles" }, roles: ["admin", "maintenance"] },
];

const visibleNavItems = computed(() =>
  navItems.filter((item) => roleMatchesNav(currentUser.value, item.roles))
);

const showSessionActions = computed(() => Boolean(currentUser.value?.token));

const displayName = computed(() => {
  if (!showSessionActions.value) {
    return "";
  }
  return `${currentUser.value.fName} ${currentUser.value.lName}`.trim();
});

const roleLabel = computed(() =>
  showSessionActions.value ? formatRoleLabel(currentUser.value) : ""
);

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
    <span v-if="roleLabel" class="mr-4">{{ roleLabel }}</span>
    <v-btn v-if="showSessionActions" variant="text" @click="signOut">Sign out</v-btn>
  </v-app-bar>
</template>

<style scoped>
.menu-bar :deep(.v-toolbar__content) {
  padding-inline: 12px;
}

.menu-bar__layout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
}

.menu-bar__nav {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.menu-bar__session {
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 16px;
}

.menu-bar :deep(.menu-bar__item.v-btn) {
  min-width: 0;
  height: 40px;
  padding-inline: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-transform: none;
}

.menu-bar__name {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}
</style>
