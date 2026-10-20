<script setup>
import GoogleSignIn from "../components/GoogleSignIn.vue";
</script>

<template>
  <v-container class="login-page bg-surface" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" class="login-card-col">
        <v-card class="pa-6 pa-sm-10">
          <div class="d-flex flex-column text-center">
            <v-avatar color="primary-container" size="64" class="align-self-center mb-6">
              <v-icon icon="mdi-car" color="primary" size="32" />
            </v-avatar>
            <p class="text-overline text-medium-emphasis mb-1">Oklahoma Christian</p>
            <h1 class="text-h4 mb-3">Vehicle Scheduling</h1>
            <p class="text-body-1 text-medium-emphasis mb-8">
              Sign in with your OC Google account.
            </p>
            <GoogleSignIn />
            <p class="text-body-2 text-medium-emphasis mt-6">
              Use an @eagles.oc.edu account. The first sign-in creates your account.
            </p>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.login-page {
  min-height: calc(100vh - var(--v-layout-top, 0px));
  display: flex;
  align-items: center;
}

.login-card-col {
  max-width: 440px;
}
</style>
