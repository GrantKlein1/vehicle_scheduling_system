import axios from "axios";
import { clearCurrentUser } from "../config/session.js";
import Utils from "../config/utils.js";
import router from "../router.js";

function createClient(baseURL) {
  const client = axios.create({
    baseURL,
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const user = Utils.getStore("user");

    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const message = error.response?.data?.message || "";
      const url = error.config?.url || "";
      const isLoginAttempt = url.includes("login");

      if (!isLoginAttempt && (error.response?.status === 401 || /Unauthorized/i.test(message))) {
        clearCurrentUser();
        if (router.hasRoute("login") && router.currentRoute.value.name !== "login") {
          router.push({ name: "login" });
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

const apiClient = createClient(
  import.meta.env.DEV ? "http://localhost:3200/api/" : "/api/"
);

const schedulingClient = createClient(
  import.meta.env.DEV ? "http://localhost:3200/vehicleScheduling/" : "/vehicleScheduling/"
);

export { apiClient };
export default schedulingClient;
