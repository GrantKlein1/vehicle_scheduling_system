import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import Login from "./views/Login.vue";
import Vehicles from "./views/Vehicles.vue";
import Drivers from "./views/Drivers.vue";
import Utils from "./config/utils.js";
import { isAnyAdmin, ROLES } from "./config/roles.js";

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
      path: "/driver",
      name: "drivers",
      component: Drivers,
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
    if (user.role !== "admin" && user.role !== "system_admin" && user.role !== "maintenance") {
      return { name: "home" };
    }
  }

  if (to.name === "drivers") {
    if (!signedIn) {
      return { name: "login" };
    }
    if (!isAnyAdmin(user) && user.role !== ROLES.MAINTENANCE) {
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
