<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { loginWithGoogle } from "../services/authServices.js";
import { setCurrentUser } from "../config/session.js";

const router = useRouter();
const buttonHost = ref(null);
const loading = ref(false);
const errorMessage = ref("");
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

let pollTimer = 0;

async function completeGoogleSignIn(credential) {
  if (!credential) {
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await loginWithGoogle(credential);
    setCurrentUser(response.data);
    await router.push({ name: "home" });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Google sign-in failed";
  } finally {
    loading.value = false;
  }
}

function renderGoogleButton() {
  const google = window.google;
  if (!google?.accounts?.id || !clientId || !buttonHost.value) {
    return false;
  }

  buttonHost.value.innerHTML = "";
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      completeGoogleSignIn(response?.credential);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    ux_mode: "popup",
    use_fedcm_for_button: true,
    button_auto_select: false,
  });
  google.accounts.id.renderButton(buttonHost.value, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: 280,
  });
  return true;
}

onMounted(() => {
  if (!clientId) {
    errorMessage.value = "Google sign-in failed";
    return;
  }

  if (renderGoogleButton()) {
    return;
  }

  const started = Date.now();
  pollTimer = window.setInterval(() => {
    if (renderGoogleButton() || Date.now() - started > 8000) {
      window.clearInterval(pollTimer);
      pollTimer = 0;
      if (!buttonHost.value?.childElementCount) {
        errorMessage.value = "Google sign-in failed";
      }
    }
  }, 200);
});

onBeforeUnmount(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer);
  }
});
</script>

<template>
  <div class="d-flex flex-column align-center w-100">
    <v-alert v-if="errorMessage" type="error" class="mb-4 w-100">
      {{ errorMessage }}
    </v-alert>
    <div ref="buttonHost" :class="{ 'google-sign-in-busy': loading }"></div>
    <v-progress-circular v-if="loading" indeterminate color="primary" class="mt-4" />
  </div>
</template>

<style scoped>
.google-sign-in-busy {
  pointer-events: none;
  opacity: 0.6;
}
</style>
