import apiClient from "./services.js";

export function loginWithGoogle(credential, extra = {}) {
  return apiClient.post("login", { credential, ...extra });
}

export function logout() {
  return apiClient.post("logout");
}
