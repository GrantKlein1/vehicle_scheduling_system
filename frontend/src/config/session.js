import { ref } from "vue";
import Utils from "./utils.js";

function readStoredUser() {
  const user = Utils.getStore("user");
  if (!user?.token) {
    return null;
  }
  return user;
}

export const currentUser = ref(readStoredUser());

export function setCurrentUser(user) {
  if (!user?.token) {
    clearCurrentUser();
    return;
  }

  Utils.setStore("user", user);
  currentUser.value = user;
}

export function clearCurrentUser() {
  Utils.removeItem("user");
  currentUser.value = null;
}
