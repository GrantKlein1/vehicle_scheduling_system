import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import dns from "dns";

dns.setDefaultResultOrder("verbatim");

export default () => {
  const baseURL = process.env.APP_ENV === "production" ? "/seiv2026/p4/t4/" : "/";
  return defineConfig({
    plugins: [vue(), vuetify({ autoImport: false })],
    server: {
      host: "localhost",
      port: 8082,
      headers: {
        // Google's sign-in popup posts the credential back with window.postMessage.
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
    },
    base: baseURL,
  });
};
