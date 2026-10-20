import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: false })],
  test: {
    environment: "jsdom",
    globals: true,
    env: {
      VITE_GOOGLE_CLIENT_ID: "test-client-id",
    },
    setupFiles: ["./tests/setup.js"],
    server: {
      deps: {
        inline: ["vuetify"],
      },
    },
  },
});
