import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import Login from "./views/Login.vue";
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
      path: "/:pathMatch(.*)*",
      redirect: { name: "home" },
    },
  ],
});

router.beforeEach((to) => {
  const user = Utils.getStore("user");
  const signedIn = Boolean(user?.token);

  if (to.name === "home" && !signedIn) {
    return { name: "login" };
  }

  if (to.name === "login" && signedIn) {
    return { name: "home" };
  }

  return true;
});

export default router;
