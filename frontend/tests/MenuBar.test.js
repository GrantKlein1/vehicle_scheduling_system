/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import { clearCurrentUser, setCurrentUser } from "../src/config/session.js";
import { logout } from "../src/services/authServices.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
}));

const catalogLabels = ["Vehicle", "Driver", "Destination", "Area", "Reservation"];

function userWithRole(role) {
  return {
    userId: 1,
    email: "person@eagles.oc.edu",
    fName: "Jane",
    lName: "Doe",
    role,
    token: "session-token",
  };
}

async function mountApp(path, user = null) {
  clearCurrentUser();
  if (user) {
    setCurrentUser(user);
  }
  const router = await createTestRouter(path);
  const mounted = await mountWithPlugins(App, { router });
  return { ...mounted, router };
}

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCurrentUser();
    logout.mockReset();
    logout.mockResolvedValue({ data: { message: "Signed out." } });
  });

  describe("US-1.4 — Sign out", () => {
    it("User signs out", async () => {
      const { wrapper, router } = await mountApp("/", userWithRole("requestor"));

      const button = wrapper.findAll("button").find((node) => node.text().includes("Sign out"));
      await button.trigger("click");
      await flushPromises();

      expect(logout).toHaveBeenCalled();
      expect(localStorage.getItem("user")).toBeNull();
      expect(router.currentRoute.value.name).toBe("login");
      expect(wrapper.find(".menu-bar").exists()).toBe(true);
      expect(wrapper.text()).not.toContain("Sign out");
    });
  });

  describe("US-1.6 — Role-based MenuBar", () => {
    it("MenuBar is visible on the login page", async () => {
      const { wrapper } = await mountApp("/login");

      expect(wrapper.find(".menu-bar").exists()).toBe(true);
      expect(wrapper.text()).not.toContain("Sign out");
      for (const label of catalogLabels) {
        expect(wrapper.text()).not.toContain(label);
      }
    });

    it("Signed-in user sees Sign out in MenuBar", async () => {
      const { wrapper } = await mountApp("/", userWithRole("requestor"));

      expect(wrapper.find(".menu-bar").exists()).toBe(true);
      expect(wrapper.text()).toContain("Sign out");
      expect(wrapper.text()).toContain("Jane Doe");
    });

    it("Requestor MenuBar in Feature 1 has Sign out but no catalog links yet", async () => {
      const { wrapper } = await mountApp("/", userWithRole("requestor"));

      expect(wrapper.text()).toContain("Sign out");
      for (const label of catalogLabels) {
        expect(wrapper.text()).not.toContain(label);
      }
    });

    it("Admin MenuBar in Feature 1 has Sign out but no catalog links yet", async () => {
      const { wrapper } = await mountApp("/", userWithRole("admin"));

      expect(wrapper.text()).toContain("Sign out");
      for (const label of catalogLabels) {
        expect(wrapper.text()).not.toContain(label);
      }
    });

    it("Maintenance MenuBar in Feature 1 has Sign out but no catalog links yet", async () => {
      const { wrapper } = await mountApp("/", userWithRole("maintenance"));

      expect(wrapper.text()).toContain("Sign out");
      for (const label of catalogLabels) {
        expect(wrapper.text()).not.toContain(label);
      }
    });
  });
});
