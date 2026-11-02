/**
 * Feature 3 — Driver Management
 * Spec: features/feature-3-driver-management.md
 */
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import Drivers from "../src/views/Drivers.vue";
import { clearCurrentUser, setCurrentUser } from "../src/config/session.js";
import router from "../src/router.js";
import { createDriver, deleteDriver, listDrivers, updateDriver } from "../src/services/driverServices.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/driverServices.js", () => ({
  listDrivers: vi.fn(),
  createDriver: vi.fn(),
  updateDriver: vi.fn(),
  deleteDriver: vi.fn(),
}));

function localToday(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addCalendarYears(dateOnlyValue, years) {
  const [year, month, day] = dateOnlyValue.split("-").map(Number);
  const shifted = new Date(Date.UTC(year + years, month - 1, day));
  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, "0");
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function statusForApprovedDate(approvedDate, today = localToday()) {
  const anniversary = addCalendarYears(approvedDate, 1);
  return today >= anniversary ? "expired" : "valid";
}

function savedDriver(body, previous = {}) {
  return {
    ...previous,
    ...body,
    status: statusForApprovedDate(body.approvedDate ?? previous.approvedDate),
  };
}

const jaxen = {
  id: 1,
  firstName: "Jaxen",
  lastName: "Roden",
  driverLicenseNumber: "11111111",
  driverLicenseExpDate: "2030-09-20",
  insuranceProvider: "root",
  insuranceNumber: "11111111",
  approvedDate: localToday(),
  status: "valid",
};

const amy = {
  id: 2,
  firstName: "Amy",
  lastName: "Adams",
  driverLicenseNumber: "22222222",
  driverLicenseExpDate: "2030-09-20",
  insuranceProvider: "root",
  insuranceNumber: "22222222",
  approvedDate: localToday(),
  status: "valid",
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
  const fields = [
    ...wrapper.findAllComponents({ name: "VTextField" }),
    ...wrapper.findAllComponents({ name: "VSelect" }),
  ];
  return fields.find((field) => field.props("label") === label);
}

async function setLabeled(wrapper, label, value) {
  const field = labeled(wrapper, label);
  if (!field) {
    throw new Error(`Missing field ${label}`);
  }
  const select = wrapper
    .findAllComponents({ name: "VSelect" })
    .find((item) => item.props("label") === label);
  if (select) {
    const items = select.props("items") ?? [];
    if (!items.includes(value)) {
      throw new Error(`Missing option ${value} for ${label}`);
    }
    select.vm.$emit("update:modelValue", value);
    await flushPromises();
    return;
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
  const button = [...row.querySelectorAll("button")].find((node) => node.textContent.trim() === action);
  if (!button) {
    throw new Error(`Missing ${action} on ${name}`);
  }
  button.click();
  await flushPromises();
}

function rowFor(name) {
  return [...document.querySelectorAll("tbody tr")].find((entry) => entry.textContent.includes(name));
}

async function mountDrivers() {
  const memoryRouter = await createTestRouter("/driver");
  const mounted = await mountWithPlugins(Drivers, {
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

async function fillDriver(wrapper, driver) {
  await setLabeled(wrapper, "First Name", driver.firstName);
  await setLabeled(wrapper, "Last Name", driver.lastName);
  await setLabeled(wrapper, "Driver License Number", driver.driverLicenseNumber);
  await setLabeled(wrapper, "Driver License Expiration Date", driver.driverLicenseExpDate);
  await setLabeled(wrapper, "Insurance Provider", driver.insuranceProvider);
  await setLabeled(wrapper, "Insurance Number", driver.insuranceNumber);
  await setLabeled(wrapper, "Approved Date", driver.approvedDate);
}

describe("Feature 3 — Driver Management", () => {
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
    listDrivers.mockReset();
    listDrivers.mockImplementation(async () => ({ data: [...catalog] }));
    createDriver.mockReset();
    updateDriver.mockReset();
    deleteDriver.mockReset();
    await router.push({ name: "login" });
    await router.isReady();
  });

  describe("US-3.1 — View Driver List Page", () => {
    it("Signed-in system admin navigates to the driver page", async () => {
      const { wrapper } = await mountAppAt("/", "system_admin");

      await clickControl("Driver");

      expect(router.currentRoute.value.path).toBe("/driver");
      expect(wrapper.find("table").exists()).toBe(true);
      expect(pageText()).toContain("Add Driver");
    });

    it("Signed-in maintenance user navigates to the driver page", async () => {
      const { wrapper } = await mountAppAt("/", "maintenance");

      await clickControl("Driver");

      expect(router.currentRoute.value.path).toBe("/driver");
      expect(wrapper.find("table").exists()).toBe(true);
      expect(pageText()).not.toContain("Add Driver");
    });

    it("Signed-in area admin navigates to the driver page", async () => {
      const { wrapper } = await mountAppAt("/", "area_admin", { areaId: 5, areaName: "Athletics" });

      await clickControl("Driver");

      expect(router.currentRoute.value.path).toBe("/driver");
      expect(wrapper.find("table").exists()).toBe(true);
      expect(pageText()).toContain("Add Driver");
    });
  });

  describe("US-3.2 — Create Driver", () => {
    it("Signed-in system admin creates a new driver", async () => {
      setCurrentUser(userWithRole("system_admin"));
      createDriver.mockImplementation(async (body) => {
        const saved = { id: 1, ...savedDriver(body) };
        catalog = [saved];
        return { status: 201, data: saved };
      });
      const { wrapper } = await mountDrivers();

      await clickControl("Add Driver");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Add Driver");
      expect(pageText()).toContain("Status is set from the approved date.");
      expect(labeled(wrapper, "Status")).toBeUndefined();
      await fillDriver(wrapper, jaxen);
      await clickDialogButton("Save");

      const result = await createDriver.mock.results[0].value;
      expect(result.status).toBe(201);
      expect(result.data.lastName).toBe("Roden");
      expect(result.data.status).toBe("valid");
      expect(result.data.userId).toBeUndefined();
      expect(createDriver.mock.calls[0][0].status).toBeUndefined();
      expect(createDriver.mock.calls[0][0].userId).toBeUndefined();
      expect(rowFor("Jaxen Roden").textContent).toContain("valid");
      expect(pageText()).toContain("Driver added successfully!");
    });

    it("Signed-in area admin creates a new driver", async () => {
      setCurrentUser(userWithRole("area_admin", { areaId: 5, areaName: "Athletics" }));
      createDriver.mockImplementation(async (body) => {
        const saved = { id: 2, ...savedDriver(body) };
        catalog = [saved];
        return { status: 201, data: saved };
      });
      const { wrapper } = await mountDrivers();

      await clickControl("Add Driver");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Add Driver");
      await fillDriver(wrapper, amy);
      await clickDialogButton("Save");

      const result = await createDriver.mock.results[0].value;
      expect(result.status).toBe(201);
      expect(result.data.lastName).toBe("Adams");
      expect(result.data.status).toBe("valid");
      expect(result.data.userId).toBeUndefined();
      expect(rowFor("Amy Adams").textContent).toContain("valid");
      expect(pageText()).toContain("Driver added successfully!");
    });

    it("Empty required field shows Required field", async () => {
      setCurrentUser(userWithRole("system_admin"));
      await mountDrivers();

      await clickControl("Add Driver");
      await clickDialogButton("Save");

      expect(pageText()).toContain("Required field");
      expect(createDriver).not.toHaveBeenCalled();
    });
  });

  describe("US-3.3 — Row Action Icons", () => {
    it("Row action buttons visible for system admin", async () => {
      setCurrentUser(userWithRole("system_admin"));
      catalog = [jaxen, amy];

      await mountDrivers();

      const rows = [...document.querySelectorAll("tbody tr")];
      expect(rows.length).toBe(2);
      for (const row of rows) {
        const labels = [...row.querySelectorAll("button")].map((node) => node.textContent.trim());
        expect(labels).toContain("Edit");
        expect(labels).toContain("Delete");
      }
    });

    it("Maintenance row has no edit or delete", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [jaxen];

      await mountDrivers();

      expect(rowFor("Jaxen Roden")).toBeTruthy();
      expect(pageText()).not.toContain("Edit");
      expect(pageText()).not.toContain("Delete");
    });

    it("Area admin row shows edit and delete", async () => {
      setCurrentUser(userWithRole("area_admin", { areaId: 5, areaName: "Athletics" }));
      catalog = [jaxen];

      await mountDrivers();

      const labels = [...rowFor("Jaxen Roden").querySelectorAll("button")].map((node) =>
        node.textContent.trim()
      );
      expect(labels).toContain("Edit");
      expect(labels).toContain("Delete");
    });
  });

  describe("US-3.4 — Edit Driver", () => {
    it("Signed-in system admin updates driver details", async () => {
      setCurrentUser(userWithRole("system_admin"));
      catalog = [{ ...jaxen }];
      updateDriver.mockImplementation(async (id, body) => {
        catalog = catalog.map((driver) =>
          driver.id === id ? { ...driver, ...savedDriver(body, driver) } : driver
        );
        return { status: 200, data: { message: "Driver was updated successfully." } };
      });
      const { wrapper } = await mountDrivers();

      await clickRowAction("Jaxen Roden", "Edit");
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog.textContent).toContain("Edit Driver");
      expect(labeled(wrapper, "Driver License Expiration Date").find("input").element.value).toBe(
        "2030-09-20"
      );
      expect(labeled(wrapper, "Status")).toBeUndefined();
      await setLabeled(wrapper, "Driver License Expiration Date", "2031-01-15");
      await setLabeled(wrapper, "Approved Date", addCalendarYears(localToday(), -2));
      await clickDialogButton("Update Driver");

      const result = await updateDriver.mock.results[0].value;
      expect(result.data).toEqual({ message: "Driver was updated successfully." });
      expect(rowFor("Jaxen Roden").textContent).toContain("2031-01-15");
      expect(rowFor("Jaxen Roden").textContent).toContain("expired");
    });

    it("Signed-in area admin updates driver details", async () => {
      setCurrentUser(userWithRole("area_admin", { areaId: 5, areaName: "Athletics" }));
      catalog = [{ ...amy }];
      updateDriver.mockImplementation(async (id, body) => {
        catalog = catalog.map((driver) =>
          driver.id === id ? { ...driver, ...savedDriver(body, driver) } : driver
        );
        return { status: 200, data: { message: "Driver was updated successfully." } };
      });
      const { wrapper } = await mountDrivers();

      await clickRowAction("Amy Adams", "Edit");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Edit Driver");
      expect(labeled(wrapper, "Driver License Expiration Date").find("input").element.value).toBe(
        "2030-09-20"
      );
      expect(labeled(wrapper, "Status")).toBeUndefined();
      await setLabeled(wrapper, "Driver License Expiration Date", "2031-01-15");
      await setLabeled(wrapper, "Approved Date", addCalendarYears(localToday(), -2));
      await clickDialogButton("Update Driver");

      const result = await updateDriver.mock.results[0].value;
      expect(result.data).toEqual({ message: "Driver was updated successfully." });
      expect(rowFor("Amy Adams").textContent).toContain("2031-01-15");
      expect(rowFor("Amy Adams").textContent).toContain("expired");
    });
  });

  describe("US-3.5 — Delete Driver", () => {
    it("Signed-in system admin deletes a driver with confirmation", async () => {
      setCurrentUser(userWithRole("system_admin"));
      catalog = [{ ...jaxen }];
      deleteDriver.mockImplementation(async (id) => {
        catalog = catalog.filter((driver) => driver.id !== id);
        return { status: 200, data: { message: "Driver was deleted successfully." } };
      });
      await mountDrivers();

      await clickRowAction("Jaxen Roden", "Delete");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Delete this driver?");
      await clickDialogButton("Delete");

      const result = await deleteDriver.mock.results[0].value;
      expect(result.data).toEqual({ message: "Driver was deleted successfully." });
      expect(rowFor("Jaxen Roden")).toBeUndefined();
    });

    it("Signed-in area admin deletes a driver with confirmation", async () => {
      setCurrentUser(userWithRole("area_admin", { areaId: 5, areaName: "Athletics" }));
      catalog = [{ ...amy }];
      deleteDriver.mockImplementation(async (id) => {
        catalog = catalog.filter((driver) => driver.id !== id);
        return { status: 200, data: { message: "Driver was deleted successfully." } };
      });
      await mountDrivers();

      await clickRowAction("Amy Adams", "Delete");
      expect(document.querySelector('[role="dialog"]').textContent).toContain("Delete this driver?");
      await clickDialogButton("Delete");

      const result = await deleteDriver.mock.results[0].value;
      expect(result.data).toEqual({ message: "Driver was deleted successfully." });
      expect(rowFor("Amy Adams")).toBeUndefined();
    });

    it("Cancelled delete leaves the driver", async () => {
      setCurrentUser(userWithRole("system_admin"));
      catalog = [{ ...jaxen }];
      await mountDrivers();

      await clickRowAction("Jaxen Roden", "Delete");
      await clickDialogButton("Cancel");

      expect(deleteDriver).not.toHaveBeenCalled();
      expect(rowFor("Jaxen Roden")).toBeTruthy();
    });
  });

  describe("US-3.7 — Role-Based Access Control", () => {
    it("Requestor can list drivers but cannot change them", async () => {
      setCurrentUser(userWithRole("requestor"));

      await router.push("/driver");
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("home");
    });
  });
});
