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

vi.mock("../src/services/vehicleServices.js", () => ({
  listVehicles: vi.fn().mockResolvedValue({ data: [] }),
  getVehicle: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
  logMileage: vi.fn(),
  logService: vi.fn(),
}));

const catalogLabels = ["Vehicle", "Driver", "Destination", "Area", "Reservation"];

function userWithRole(role, extra = {}) {
  return {
    userId: 1,
    email: "person@eagles.oc.edu",
    fName: "Jane",
    lName: "Doe",
    role,
    areaId: null,
    areaName: null,
    token: "session-token",
    ...extra,
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
      expect(wrapper.text()).toContain("Requestor");
    });

    it("Requestor MenuBar in Feature 1 has Sign out but no catalog links yet", async () => {
      const { wrapper } = await mountApp("/", userWithRole("requestor"));

      expect(wrapper.text()).toContain("Sign out");
      for (const label of catalogLabels) {
        expect(wrapper.text()).not.toContain(label);
      }
    });

    it("System admin MenuBar shows the role label, Sign out, and Vehicle", async () => {
      const { wrapper } = await mountApp("/", userWithRole("system_admin"));

      expect(wrapper.text()).toContain("Sign out");
      expect(wrapper.text()).toContain("System Admin");
      expect(wrapper.text()).toContain("Vehicle");
      for (const label of catalogLabels.filter((item) => item !== "Vehicle")) {
        expect(wrapper.text()).not.toContain(label);
      }
    });

    it("Legacy admin MenuBar is shown as System Admin", async () => {
      const { wrapper } = await mountApp("/", userWithRole("admin"));

      expect(wrapper.text()).toContain("System Admin");
      expect(wrapper.text()).toContain("Sign out");
      expect(wrapper.text()).toContain("Vehicle");
      for (const label of catalogLabels.filter((item) => item !== "Vehicle")) {
        expect(wrapper.text()).not.toContain(label);
      }
    });

    it("Area admin MenuBar shows the assigned area and no catalog links yet", async () => {
      const { wrapper } = await mountApp(
        "/",
        userWithRole("area_admin", { areaId: 5, areaName: "Athletics" })
      );

      expect(wrapper.text()).toContain("Sign out");
      expect(wrapper.text()).toContain("Area Admin · Athletics");
      const buttonText = wrapper.findAll("button").map((node) => node.text());
      for (const label of catalogLabels) {
        expect(buttonText.some((text) => text.trim() === label)).toBe(false);
      }
    });

    it("Maintenance MenuBar in Feature 1 has Sign out but no catalog links yet", async () => {
      const { wrapper } = await mountApp("/", userWithRole("maintenance"));

      expect(wrapper.text()).toContain("Sign out");
      expect(wrapper.text()).toContain("Vehicle");
      for (const label of catalogLabels.filter((item) => item !== "Vehicle")) {
        expect(wrapper.text()).not.toContain(label);
      }
    });
  });
});

describe("Feature 2 — Vehicle Management", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCurrentUser();
    logout.mockReset();
    logout.mockResolvedValue({ data: { message: "Signed out." } });
  });

  describe("US-2.1 — View Vehicle List Page", () => {
    it("Requestor does not see Vehicle in the menu", async () => {
      const { wrapper } = await mountApp("/", userWithRole("requestor"));

      expect(wrapper.text()).not.toContain("Vehicle");
    });

    it("Admin sees their name and Sign out on the vehicle page", async () => {
      const { wrapper } = await mountApp("/vehicle", userWithRole("admin"));

      expect(wrapper.find(".menu-bar__nav").exists()).toBe(true);
      expect(wrapper.find(".menu-bar__session").text()).toContain("Jane Doe");
      expect(wrapper.find(".menu-bar__session").text()).toContain("Sign out");
      const labels = wrapper.findAll(".menu-bar__item").map((item) => item.text());
      expect(labels).toEqual(["Vehicle", "Sign out"]);
    });

    it("Maintenance sees their name and Sign out on the vehicle page", async () => {
      const { wrapper } = await mountApp("/vehicle", userWithRole("maintenance"));

      expect(wrapper.find(".menu-bar__session").text()).toContain("Jane Doe");
      expect(wrapper.find(".menu-bar__session").text()).toContain("Sign out");
      expect(wrapper.find(".menu-bar__nav").text()).toContain("Vehicle");
    });

    it("Requestor keeps their name and Sign out with no catalog links", async () => {
      const { wrapper } = await mountApp("/", userWithRole("requestor"));

      expect(wrapper.find(".menu-bar__session").text()).toContain("Jane Doe");
      expect(wrapper.find(".menu-bar__session").text()).toContain("Sign out");
      expect(wrapper.find(".menu-bar__nav").text()).not.toContain("Vehicle");
    });
  });

  describe("US-2.7 — Role-Based Access Control", () => {
    it("Requestor vehicle access is restricted", async () => {
      const { wrapper } = await mountApp("/", userWithRole("requestor"));

      expect(wrapper.text()).not.toContain("Vehicle");
    });
  });
});
