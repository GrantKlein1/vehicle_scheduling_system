import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import Login from "./views/Login.vue";
import Vehicles from "./views/Vehicles.vue";
import Utils from "./config/utils.js";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: Home,
    },
    {
      path: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/vehicle",
      name: "vehicles",
      component: Vehicles,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "home" },
    },
  ],
});

router.beforeEach((to) => {
  const user = Utils.getStore("user");
  const signedIn = Boolean(user?.token);

  if (to.name === "vehicles") {
    if (!signedIn) {
      return { name: "login" };
    }
    if (user.role !== "admin" && user.role !== "maintenance") {
      return { name: "home" };
    }
  }

  if (to.name === "home" && !signedIn) {
    return { name: "login" };
  }

  if (to.name === "login" && signedIn) {
    return { name: "home" };
  }

  return true;
});

export default router;
