<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { toggleAssistant } from "../config/assistantState.js";
import { formatRoleLabel, roleMatchesNav } from "../config/roles.js";
import { clearCurrentUser, currentUser } from "../config/session.js";
import { logout } from "../services/authServices.js";

const router = useRouter();
const profileOpen = ref(false);

const navItems = [
  { title: "Vehicle", to: { name: "vehicles" }, roles: ["admin", "system_admin", "area_admin", "maintenance"] },
  {
    title: "Destination",
    to: { name: "destinations" },
    roles: ["admin", "system_admin", "area_admin", "maintenance"],
  },
  {
    title: "Driver",
    to: { name: "drivers" },
    roles: ["admin", "system_admin", "area_admin", "maintenance"],
  },
  {
    title: "Area",
    to: { name: "areas" },
    roles: ["admin", "system_admin"],
  },
  {
    title: "Reservation",
    to: { name: "reservations" },
    roles: ["requestor", "area_admin", "admin", "system_admin"],
  },
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

const email = computed(() =>
  showSessionActions.value ? currentUser.value.email ?? "" : ""
);

const initials = computed(() => {
  if (!showSessionActions.value) {
    return "";
  }
  const first = currentUser.value.fName?.trim()?.[0] ?? "";
  const last = currentUser.value.lName?.trim()?.[0] ?? "";
  const letters = `${first}${last}`.toUpperCase();
  return letters || "?";
});

function toggleProfile() {
  profileOpen.value = !profileOpen.value;
}

function closeProfileFromOutside(event) {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest(".menu-bar__session")) {
    profileOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", closeProfileFromOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", closeProfileFromOutside);
});

watch(
  () => router.currentRoute.value.fullPath,
  () => {
    profileOpen.value = false;
  }
);

async function signOut() {
  profileOpen.value = false;
  try {
    await logout();
  } finally {
    clearCurrentUser();
    await router.push({ name: "login" });
  }
}
</script>

<template>
  <v-app-bar class="menu-bar" color="primary" height="64" flat>
    <div class="menu-bar__layout">
      <nav class="menu-bar__nav" aria-label="Primary">
        <v-btn
          v-for="item in visibleNavItems"
          :key="item.title"
          class="menu-bar__item"
          variant="text"
          :to="item.to"
        >
          {{ item.title }}
        </v-btn>
      </nav>
      <div v-if="showSessionActions" class="menu-bar__session">
        <v-btn
          class="menu-bar__assistant"
          icon="mdi-robot-outline"
          variant="text"
          aria-label="Open assistant"
          title="Assistant"
          @click="toggleAssistant"
        />
        <button
          type="button"
          class="menu-bar__profile"
          aria-haspopup="menu"
          :aria-expanded="profileOpen"
          aria-controls="account-menu"
          @click="toggleProfile"
        >
          <span class="menu-bar__avatar" aria-hidden="true">{{ initials }}</span>
          <span class="menu-bar__identity">
            <span class="menu-bar__name">{{ displayName }}</span>
            <span v-if="roleLabel" class="menu-bar__role">{{ roleLabel }}</span>
          </span>
          <v-icon
            class="menu-bar__chevron"
            :class="{ 'menu-bar__chevron--open': profileOpen }"
            icon="mdi-chevron-down"
            size="18"
          />
        </button>
        <div v-if="profileOpen" id="account-menu" class="menu-bar__dropdown" role="menu">
          <p class="menu-bar__dropdown-name">{{ displayName }}</p>
          <p v-if="email" class="menu-bar__dropdown-email">{{ email }}</p>
          <p v-if="roleLabel" class="menu-bar__dropdown-role">{{ roleLabel }}</p>
          <button type="button" class="menu-bar__signout" role="menuitem" @click="signOut">
            Sign out
          </button>
        </div>
      </div>
    </div>
  </v-app-bar>
</template>

<style scoped>
.menu-bar {
  overflow: visible;
}

.menu-bar :deep(.v-toolbar__content) {
  overflow: visible;
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
  gap: 8px;
}

.menu-bar__session {
  position: relative;
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-bar :deep(.menu-bar__assistant.v-btn) {
  width: 40px;
  height: 40px;
  min-width: 0;
}

.menu-bar :deep(.menu-bar__item.v-btn) {
  min-width: 0;
  height: 36px;
  padding-inline: 12px;
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-transform: none;
}

.menu-bar__profile {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 240px;
  height: 40px;
  margin: 0;
  padding: 4px 8px 4px 4px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.menu-bar__profile:hover,
.menu-bar__profile[aria-expanded="true"] {
  background: rgba(255, 255, 255, 0.24);
}

.menu-bar__avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  color: #801328;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.menu-bar__identity {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  line-height: 1.2;
  text-align: left;
}

.menu-bar__name,
.menu-bar__role {
  max-width: 148px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-bar__name {
  font-size: 0.8125rem;
  font-weight: 500;
}

.menu-bar__role {
  font-size: 0.6875rem;
  font-weight: 400;
  opacity: 0.85;
}

.menu-bar__chevron {
  flex: none;
  opacity: 0.9;
  transition: transform 0.15s ease;
}

.menu-bar__chevron--open {
  transform: rotate(180deg);
}

.menu-bar__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  width: 240px;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  color: #1c1b1f;
  box-shadow: 0 8px 24px rgba(28, 27, 31, 0.18);
  text-align: left;
}

.menu-bar__dropdown-name,
.menu-bar__dropdown-email,
.menu-bar__dropdown-role {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-bar__dropdown-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.menu-bar__dropdown-email,
.menu-bar__dropdown-role {
  margin-top: 2px;
  font-size: 0.75rem;
  font-weight: 400;
  color: #5c534e;
}

.menu-bar__signout {
  width: 100%;
  height: 36px;
  margin-top: 12px;
  border: 0;
  border-radius: 8px;
  background: #801328;
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.menu-bar__signout:hover {
  background: #6a1021;
}
</style>
