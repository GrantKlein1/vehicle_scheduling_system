/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../src/views/Login.vue";
import { clearCurrentUser } from "../src/config/session.js";
import { loginWithGoogle } from "../src/services/authServices.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
}));

const jane = {
  userId: 1,
  email: "jdoe@eagles.oc.edu",
  fName: "Jane",
  lName: "Doe",
  role: "requestor",
  token: "session-token",
};

function installGoogle(credential) {
  window.google = {
    accounts: {
      id: {
        initialize(config) {
          this.callback = config.callback;
        },
        renderButton(parent) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Sign in with Google";
          button.addEventListener("click", () => {
            this.callback({ credential });
          });
          parent.appendChild(button);
        },
      },
    },
  };
}

function googleButton(wrapper) {
  return wrapper.findAll("button").find((node) => node.text().includes("Sign in with Google"));
}

async function mountLogin() {
  const router = await createTestRouter("/login");
  const mounted = await mountWithPlugins(Login, { router });
  return { ...mounted, router };
}

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCurrentUser();
    vi.clearAllMocks();
    delete window.google;
  });

  describe("US-1.1 — Registration", () => {
    it("First Google Sign in", async () => {
      installGoogle("google-credential-jane");
      loginWithGoogle.mockResolvedValue({ data: jane });
      const { wrapper, router } = await mountLogin();

      const button = googleButton(wrapper);
      await button.trigger("click");
      await flushPromises();

      expect(loginWithGoogle).toHaveBeenCalledWith("google-credential-jane");
      expect(JSON.parse(localStorage.getItem("user"))).toEqual(jane);
      expect(router.currentRoute.value.name).toBe("home");
    });
  });

  describe("US-1.2 — Returning Google sign-in", () => {
    it("Invalid Google credential stays on login", async () => {
      installGoogle("not-a-google-credential");
      loginWithGoogle.mockRejectedValue({
        response: { status: 401, data: { message: "Google sign-in failed" } },
      });
      const { wrapper, router } = await mountLogin();

      const button = googleButton(wrapper);
      await button.trigger("click");
      await flushPromises();

      expect(router.currentRoute.value.name).toBe("login");
      const alert = wrapper.find(".v-alert");
      expect(alert.exists()).toBe(true);
      expect(alert.attributes("type") === "error" || alert.classes().some((name) => name.includes("error"))).toBe(
        true
      );
      expect(alert.text()).toContain("Google sign-in failed");
      expect(localStorage.getItem("user")).toBeNull();
    });
  });
});
