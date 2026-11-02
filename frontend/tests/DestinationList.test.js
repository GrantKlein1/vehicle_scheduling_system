/**
 * Feature 4 — Destination Management
 * Spec: features/feature-4-destination-management.md
 */
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import Destinations from "../src/views/Destinations.vue";
import { clearCurrentUser, setCurrentUser } from "../src/config/session.js";
import router from "../src/router.js";
import {
  createDestination,
  deleteDestination,
  listDestinations,
  updateDestination,
} from "../src/services/destinationServices.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/destinationServices.js", () => ({
  listDestinations: vi.fn(),
  createDestination: vi.fn(),
  updateDestination: vi.fn(),
  deleteDestination: vi.fn(),
}));

const garvey = {
  id: 1,
  name: "Garvey Center",
  addressLine1: "2501 E Memorial Rd",
  addressLine2: "Suite 100",
  city: "Edmond",
  state: "OK",
  zip: "73013",
};

const chapel = {
  id: 2,
  name: "Chapel",
  addressLine1: "2501 E Memorial Rd",
  addressLine2: null,
  city: "Edmond",
  state: "OK",
  zip: "73013",
};

let catalog = [];
const wrappers = [];

function userWithRole(role, extra = {}) {
  return {
    userId: 1,
    email: `${role}@eagles.oc.edu`,
    fName: "Ada",
    lName: "Min",
    role,
    areaId: null,
    areaName: null,
    token: "session-token",
    ...extra,
  };
}

function pageText() {
  return document.body.textContent.replace(/\s+/g, " ");
}

function labeled(wrapper, label) {
  return wrapper.findAllComponents({ name: "VTextField" }).find((field) => field.props("label") === label);
}

async function setLabeled(wrapper, label, value) {
  const field = labeled(wrapper, label);
  if (!field) {
    throw new Error(`Missing field ${label}`);
  }
  await field.find("input").setValue(String(value));
  await flushPromises();
}

async function clickControl(label) {
  const control = [...document.querySelectorAll("button, a")].find(
    (node) => node.textContent.trim() === label || node.getAttribute("aria-label") === label
  );
  if (!control) {
    throw new Error(`Missing control ${label}`);
  }
  control.click();
  await flushPromises();
}

async function clickDialogButton(label) {
  const dialog = document.querySelector('[role="dialog"]');
  const button = [...dialog.querySelectorAll("button")].find((node) => node.textContent.trim() === label);
  if (!button) {
    throw new Error(`Missing dialog button ${label}`);
  }
  button.click();
  await flushPromises();
}

async function clickRowAction(name, action) {
  const row = [...document.querySelectorAll("tbody tr")].find((entry) => entry.textContent.includes(name));
  if (!row) {
    throw new Error(`Missing row ${name}`);
  }
  const button = [...row.querySelectorAll("button")].find(
    (node) => node.getAttribute("aria-label") === action || node.textContent.trim() === action
  );
  if (!button) {
    throw new Error(`Missing ${action} on ${name}`);
  }
  button.click();
  await flushPromises();
}

function rowFor(name) {
  return [...document.querySelectorAll("tbody tr")].find((entry) => entry.textContent.includes(name));
}

async function mountDestinations() {
  const memoryRouter = await createTestRouter("/destination");
  const mounted = await mountWithPlugins(Destinations, {
    router: memoryRouter,
    attachTo: document.body,
  });
  wrappers.push(mounted.wrapper);
  await flushPromises();
  return mounted;
}

async function mountAppAt(path, role, extra = {}) {
  setCurrentUser(userWithRole(role, extra));
  await router.push(path);
  await router.isReady();
  const mounted = await mountWithPlugins(App, {
    router,
    attachTo: document.body,
  });
  wrappers.push(mounted.wrapper);
  await flushPromises();
  return mounted;
}

async function fillDestination(wrapper, destination) {
  await setLabeled(wrapper, "Name", destination.name);
  await setLabeled(wrapper, "Address Line 1", destination.addressLine1);
  await setLabeled(wrapper, "Address Line 2", destination.addressLine2 ?? "");
  await setLabeled(wrapper, "City", destination.city);
  await setLabeled(wrapper, "State", destination.state);
  await setLabeled(wrapper, "Zip", destination.zip);
}

describe("Feature 4 — Destination Management", () => {
  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop().unmount();
    }
    document.body.innerHTML = "";
  });

  beforeEach(async () => {
    localStorage.clear();
    clearCurrentUser();
    catalog = [];
    listDestinations.mockReset();
    listDestinations.mockImplementation(async () => ({ data: catalog.map((row) => ({ ...row })) }));
    createDestination.mockReset();
    updateDestination.mockReset();
    deleteDestination.mockReset();
    await router.push({ name: "login" });
    await router.isReady();
  });

  describe("US-4.1 — View Destination List Page", () => {
    it("Requestor opens the destination page", async () => {
      catalog = [{ ...chapel }];
      const { wrapper } = await mountAppAt("/destination", "requestor");

      expect(router.currentRoute.value.path).toBe("/destination");
      expect(wrapper.find("table").exists()).toBe(true);
      expect(pageText()).toContain("Add Destination");
      expect(document.querySelector('[aria-label="Edit"]')).toBeNull();
      expect(document.querySelector('[aria-label="Delete"]')).toBeNull();
    });

    it("System admin navigates to the destination page", async () => {
      catalog = [{ ...garvey }];
      const { wrapper } = await mountAppAt("/", "system_admin");

      await clickControl("Destination");

      expect(router.currentRoute.value.path).toBe("/destination");
      expect(wrapper.find("table").exists()).toBe(true);
      expect(pageText()).toContain("Add Destination");
      expect(document.querySelector('tbody [aria-label="Edit"] .mdi-pencil')).toBeTruthy();
      expect(document.querySelector('tbody [aria-label="Delete"] .mdi-delete')).toBeTruthy();
    });

    it("Area admin navigates to the destination page", async () => {
      catalog = [{ ...garvey }];
      const { wrapper } = await mountAppAt("/", "area_admin", { areaId: 5, areaName: "Athletics" });

      await clickControl("Destination");

      expect(router.currentRoute.value.path).toBe("/destination");
      expect(wrapper.find("table").exists()).toBe(true);
      expect(pageText()).toContain("Add Destination");
      expect(document.querySelector('tbody [aria-label="Edit"] .mdi-pencil')).toBeTruthy();
      expect(document.querySelector('tbody [aria-label="Delete"] .mdi-delete')).toBeTruthy();
    });

    it("Maintenance user navigates to the destination page", async () => {
      catalog = [{ ...garvey }];
      const { wrapper } = await mountAppAt("/", "maintenance");

      await clickControl("Destination");

      expect(router.currentRoute.value.path).toBe("/destination");
      expect(wrapper.find("table").exists()).toBe(true);
      expect(pageText()).toContain("Add Destination");
      expect(document.querySelector('tbody [aria-label="Edit"] .mdi-pencil')).toBeTruthy();
      expect(document.querySelector('[aria-label="Delete"]')).toBeNull();
    });
  });

  describe("US-4.2 — Create Destination", () => {
    it("Requestor creates a new destination", async () => {
      setCurrentUser(userWithRole("requestor"));
      createDestination.mockImplementation(async (body) => {
        const saved = { id: 1, addressLine2: body.addressLine2 || null, ...body, userId: undefined };
        delete saved.userId;
        catalog = [saved];
        return { status: 201, data: saved };
      });
      const { wrapper } = await mountDestinations();

      await clickControl("Add Destination");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Add Destination");
      await fillDestination(wrapper, garvey);
      await clickDialogButton("Save");

      const result = await createDestination.mock.results[0].value;
      expect(result.status).toBe(201);
      expect(result.data.name).toBe("Garvey Center");
      expect(result.data.city).toBe("Edmond");
      expect(result.data.state).toBe("OK");
      expect(result.data.userId).toBeUndefined();
      expect(rowFor("Garvey Center")).toBeTruthy();
      expect(pageText()).toContain("Destination added successfully!");
    });

    it("Empty required field shows Required field", async () => {
      setCurrentUser(userWithRole("requestor"));
      await mountDestinations();

      await clickControl("Add Destination");
      await clickDialogButton("Save");

      expect(pageText()).toContain("Required field");
      expect(createDestination).not.toHaveBeenCalled();
    });
  });

  describe("US-4.3 — Row Action Icons", () => {
    it("Row action buttons visible for a system admin", async () => {
      setCurrentUser(userWithRole("system_admin"));
      catalog = [{ ...garvey }, { ...chapel }];

      await mountDestinations();

      const rows = [...document.querySelectorAll("tbody tr")];
      expect(rows.length).toBe(2);
      for (const row of rows) {
        const labels = [...row.querySelectorAll("button")].map((node) => node.getAttribute("aria-label"));
        expect(labels).toContain("Edit");
        expect(labels).toContain("Delete");
        expect(row.querySelector(".mdi-pencil")).toBeTruthy();
        expect(row.querySelector(".mdi-delete")).toBeTruthy();
      }
    });

    it("Requestor does not see Edit or Delete", async () => {
      setCurrentUser(userWithRole("requestor"));
      catalog = [{ ...garvey }];

      await mountDestinations();

      expect(rowFor("Garvey Center")).toBeTruthy();
      expect(document.querySelector('[aria-label="Edit"]')).toBeNull();
      expect(document.querySelector('[aria-label="Delete"]')).toBeNull();
      expect(pageText()).toContain("Add Destination");
    });

    it("Maintenance user sees Edit and does not see Delete", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [{ ...garvey }];

      await mountDestinations();

      const row = rowFor("Garvey Center");
      const labels = [...row.querySelectorAll("button")].map((node) => node.getAttribute("aria-label"));
      expect(labels).toContain("Edit");
      expect(labels).not.toContain("Delete");
      expect(row.querySelector(".mdi-pencil")).toBeTruthy();
      expect(row.querySelector(".mdi-delete")).toBeNull();
    });
  });

  describe("US-4.4 — Edit Destination", () => {
    it("System admin updates destination details", async () => {
      setCurrentUser(userWithRole("system_admin"));
      catalog = [{ ...garvey }];
      updateDestination.mockImplementation(async (id, body) => {
        catalog = catalog.map((destination) =>
          destination.id === id ? { ...destination, ...body, addressLine2: body.addressLine2 || null } : destination
        );
        return { status: 200, data: { message: "Destination was updated successfully." } };
      });
      const { wrapper } = await mountDestinations();

      await clickRowAction("Garvey Center", "Edit");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Edit Destination");
      await setLabeled(wrapper, "City", "Oklahoma City");
      await setLabeled(wrapper, "Zip", "73101");
      await clickDialogButton("Update Destination");

      const result = await updateDestination.mock.results[0].value;
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ message: "Destination was updated successfully." });
      expect(rowFor("Garvey Center").textContent).toContain("Oklahoma City");
      expect(rowFor("Garvey Center").textContent).toContain("73101");
    });
  });

  describe("US-4.5 — Delete Destination", () => {
    it("System admin deletes a destination with confirmation", async () => {
      setCurrentUser(userWithRole("system_admin"));
      catalog = [{ ...chapel }];
      deleteDestination.mockImplementation(async (id) => {
        catalog = catalog.filter((destination) => destination.id !== id);
        return { status: 200, data: { message: "Destination was deleted successfully." } };
      });
      await mountDestinations();

      await clickRowAction("Chapel", "Delete");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Delete this destination?");
      await clickDialogButton("Delete");

      const result = await deleteDestination.mock.results[0].value;
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ message: "Destination was deleted successfully." });
      expect(rowFor("Chapel")).toBeUndefined();
    });

    it("Cancelled delete leaves the destination", async () => {
      setCurrentUser(userWithRole("system_admin"));
      catalog = [{ ...chapel }];
      await mountDestinations();

      await clickRowAction("Chapel", "Delete");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Delete this destination?");
      await clickDialogButton("Cancel");

      expect(deleteDestination).not.toHaveBeenCalled();
      expect(rowFor("Chapel")).toBeTruthy();
    });
  });
});
