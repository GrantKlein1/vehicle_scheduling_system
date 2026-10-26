/**
 * Feature 2 — Vehicle Management
 * Spec: features/feature-2-vehicle-management.md
 */
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import Vehicles from "../src/views/Vehicles.vue";
import { clearCurrentUser, setCurrentUser } from "../src/config/session.js";
import router from "../src/router.js";
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  logMileage,
  logService,
  updateServiceComment,
  updateVehicle,
} from "../src/services/vehicleServices.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/vehicleServices.js", () => ({
  listVehicles: vi.fn(),
  getVehicle: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
  logMileage: vi.fn(),
  logService: vi.fn(),
  updateServiceComment: vi.fn(),
}));

const ford = {
  id: 4,
  category: "Truck",
  make: "Ford",
  model: "F-150",
  year: 2022,
  vin: "1FTFW1E50NFA00001",
  purchasedDate: "2022-06-01",
  color: "White",
  passengerCapacity: 5,
  licensePlateNumber: "OC1001",
  licensePlateExpirationMonth: 6,
  areaAssigned: "Athletics",
  createdAt: "2026-10-15T12:00:00.000Z",
  updatedAt: "2026-10-15T12:00:00.000Z",
};

const malibu = {
  ...ford,
  id: 2,
  category: "Car",
  make: "Chevrolet",
  model: "Malibu",
  vin: "1G1ZD5ST5NF000001",
  licensePlateNumber: "OC4004",
  color: "Black",
};

let catalog = [];
const wrappers = [];

function userWithRole(role) {
  return {
    userId: 1,
    email: `${role}@eagles.oc.edu`,
    fName: "Ada",
    lName: "Min",
    role,
    token: "session-token",
  };
}

function pageText() {
  return document.body.textContent.replace(/\s+/g, " ");
}

function labeled(wrapper, name, label) {
  return wrapper.findAllComponents({ name }).find((field) => field.props("label") === label);
}

async function setLabeled(wrapper, label, value) {
  const select = labeled(wrapper, "VSelect", label);
  if (select) {
    const items = select.vm.filteredItems ?? [];
    const item = items.find((entry) => entry.value === value || entry.title === String(value));
    if (!item) {
      throw new Error(`Missing option ${value} for ${label}`);
    }
    select.vm.select(item);
    await flushPromises();
    return;
  }

  const field =
    labeled(wrapper, "VCombobox", label) ??
    labeled(wrapper, "VTextField", label) ??
    labeled(wrapper, "VTextarea", label);
  if (!field) {
    throw new Error(`Missing field ${label}`);
  }
  const input = field.find("input");
  const target = input.exists() ? input : field.find("textarea");
  await target.setValue(String(value));
  await flushPromises();
}

async function setDialogLabeled(wrapper, label, value) {
  const dialog = document.querySelector('[role="dialog"]');
  const field = wrapper
    .findAllComponents({ name: "VTextarea" })
    .find((item) => item.props("label") === label && dialog?.contains(item.element));
  if (!field) {
    throw new Error(`Missing dialog field ${label}`);
  }
  await field.find("textarea").setValue(String(value));
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

async function mountVehicles() {
  const memoryRouter = await createTestRouter("/vehicle");
  const mounted = await mountWithPlugins(Vehicles, {
    router: memoryRouter,
    attachTo: document.body,
  });
  wrappers.push(mounted.wrapper);
  await flushPromises();
  return mounted;
}

async function mountAppHome(role) {
  setCurrentUser(userWithRole(role));
  await router.push({ name: "home" });
  await router.isReady();
  const mounted = await mountWithPlugins(App, {
    router,
    attachTo: document.body,
  });
  wrappers.push(mounted.wrapper);
  await flushPromises();
  return mounted;
}

describe("Feature 2 — Vehicle Management", () => {
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
    listVehicles.mockReset();
    listVehicles.mockImplementation(async () => ({ data: [...catalog] }));
    getVehicle.mockReset();
    getVehicle.mockImplementation(async (id) => ({
      data: {
        ...catalog.find((vehicle) => vehicle.id === id),
        mileageLogs: [],
        serviceLogs: [],
      },
    }));
    createVehicle.mockReset();
    updateVehicle.mockReset();
    deleteVehicle.mockReset();
    logMileage.mockReset();
    logService.mockReset();
    updateServiceComment.mockReset();
    await router.push({ name: "login" });
    await router.isReady();
  });

  describe("US-2.1 — View Vehicle List Page", () => {
    it("Signed-in admin navigates to the vehicle page", async () => {
      const { wrapper } = await mountAppHome("admin");

      await clickControl("Vehicle");

      expect(router.currentRoute.value.path).toBe("/vehicle");
      expect(wrapper.text()).toContain("Vehicles");
      expect(pageText()).toContain("Add Vehicle");
    });

    it("Signed-in maintenance user navigates to the vehicle page", async () => {
      const { wrapper } = await mountAppHome("maintenance");

      await clickControl("Vehicle");

      expect(router.currentRoute.value.path).toBe("/vehicle");
      expect(wrapper.text()).toContain("Vehicles");
      expect(pageText()).not.toContain("Add Vehicle");
    });
  });

  describe("US-2.2 — Create Vehicle", () => {
    it("Signed-in admin creates a new vehicle", async () => {
      setCurrentUser(userWithRole("admin"));
      createVehicle.mockImplementation(async (body) => {
        const saved = {
          id: 1,
          ...body,
          createdAt: ford.createdAt,
          updatedAt: ford.updatedAt,
        };
        catalog = [saved];
        return { status: 201, data: saved };
      });
      const { wrapper } = await mountVehicles();

      await clickControl("Add Vehicle");
      await setLabeled(wrapper, "Category", "Truck");
      await setLabeled(wrapper, "Make", "Ford");
      await setLabeled(wrapper, "Model", "F-150");
      await setLabeled(wrapper, "Year", "2022");
      await setLabeled(wrapper, "VIN", "1FTFW1E50NFA00001");
      await setLabeled(wrapper, "Purchased Date", "2022-06-01");
      await setLabeled(wrapper, "Color", "White");
      await setLabeled(wrapper, "Number of passengers", "5");
      await setLabeled(wrapper, "License Plate Number", "OC1001");
      await setLabeled(wrapper, "License Plate Expiration Month", 6);
      await setLabeled(wrapper, "Area Assigned", "Athletics");
      await clickDialogButton("Add Vehicle");

      expect(createVehicle).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "Truck",
          make: "Ford",
          model: "F-150",
        })
      );
      expect(createVehicle.mock.calls[0][0].userId).toBeUndefined();
      expect(pageText()).toContain("Ford F-150");
      expect(pageText()).toContain("Ford F-150 added successfully!");
    });

    it("Golf cart form omits VIN and license plate", async () => {
      setCurrentUser(userWithRole("admin"));
      createVehicle.mockImplementation(async (body) => {
        const saved = {
          id: 3,
          ...body,
          createdAt: ford.createdAt,
          updatedAt: ford.updatedAt,
        };
        catalog = [saved];
        return { status: 201, data: saved };
      });
      const { wrapper } = await mountVehicles();

      await clickControl("Add Vehicle");
      await setLabeled(wrapper, "Category", "Truck");
      await setLabeled(wrapper, "VIN", "1FTFW1E50NFA00001");
      await setLabeled(wrapper, "License Plate Number", "OC1001");
      await setLabeled(wrapper, "License Plate Expiration Month", 6);
      await setLabeled(wrapper, "Category", "Golf Cart");

      expect(labeled(wrapper, "VTextField", "VIN")).toBeUndefined();
      expect(labeled(wrapper, "VTextField", "License Plate Number")).toBeUndefined();
      expect(labeled(wrapper, "VSelect", "License Plate Expiration Month")).toBeUndefined();

      await setLabeled(wrapper, "Make", "Club Car");
      await setLabeled(wrapper, "Model", "Onward");
      await setLabeled(wrapper, "Year", "2024");
      await setLabeled(wrapper, "Purchased Date", "2024-03-01");
      await setLabeled(wrapper, "Color", "Green");
      await setLabeled(wrapper, "Number of passengers", "4");
      await setLabeled(wrapper, "Area Assigned", "Athletics");
      await clickDialogButton("Add Vehicle");

      expect(createVehicle).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "Golf Cart",
          make: "Club Car",
          model: "Onward",
          vin: null,
          licensePlateNumber: null,
          licensePlateExpirationMonth: null,
        })
      );
      expect(pageText()).toContain("Club Car Onward added successfully!");
    });

    it("Invalid VIN shows the format message", async () => {
      setCurrentUser(userWithRole("admin"));
      const { wrapper } = await mountVehicles();

      await clickControl("Add Vehicle");
      await setLabeled(wrapper, "Category", "Truck");
      await setLabeled(wrapper, "VIN", "1FTFW1E50NFA0000I");
      await clickDialogButton("Add Vehicle");

      expect(pageText()).toContain("VIN must be a valid 17-character VIN.");
      expect(createVehicle).not.toHaveBeenCalled();
    });

    it("Invalid license plate shows the format message", async () => {
      setCurrentUser(userWithRole("admin"));
      const { wrapper } = await mountVehicles();

      await clickControl("Add Vehicle");
      await setLabeled(wrapper, "Category", "Truck");
      await setLabeled(wrapper, "License Plate Number", "OC-1001");
      await clickDialogButton("Add Vehicle");

      expect(pageText()).toContain("License Plate Number must be 2 to 8 letters or digits.");
      expect(createVehicle).not.toHaveBeenCalled();
    });

    it("Future purchased date shows the date message", async () => {
      setCurrentUser(userWithRole("admin"));
      const { wrapper } = await mountVehicles();

      await clickControl("Add Vehicle");
      await setLabeled(wrapper, "Purchased Date", "2099-01-01");
      await clickDialogButton("Add Vehicle");

      expect(pageText()).toContain("Date cannot be in the future.");
      expect(createVehicle).not.toHaveBeenCalled();
    });

    it("Empty required field shows Required field", async () => {
      setCurrentUser(userWithRole("admin"));
      const { wrapper } = await mountVehicles();

      await clickControl("Add Vehicle");
      await clickDialogButton("Add Vehicle");

      expect(pageText()).toContain("Required field");
      expect(createVehicle).not.toHaveBeenCalled();
    });

    it("Invalid year shows under the field when left", async () => {
      setCurrentUser(userWithRole("admin"));
      const { wrapper } = await mountVehicles();

      await clickControl("Add Vehicle");
      await setLabeled(wrapper, "Year", "1920");
      labeled(wrapper, "VTextField", "Year").vm.$emit("update:focused", false);
      await flushPromises();

      expect(pageText()).toContain("Year must be from 1950 through 2027.");
      expect(createVehicle).not.toHaveBeenCalled();
    });
  });

  describe("US-2.3 — Read Vehicle Catalog", () => {
    it("Signed-in admin views the vehicle catalog", async () => {
      setCurrentUser(userWithRole("admin"));
      catalog = [malibu, ford];

      await mountVehicles();

      expect(listVehicles).toHaveBeenCalled();
      expect(pageText()).toContain("Chevrolet");
      expect(pageText()).toContain("Malibu");
      expect(pageText()).toContain("Ford");
      expect(pageText()).toContain("F-150");
      expect(getVehicle).toHaveBeenCalledWith(2);
    });

    it("Maintenance views logs for a vehicle", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      getVehicle.mockResolvedValue({
        data: {
          ...ford,
          mileageLogs: [{ id: 1, vehicleId: 4, entryDate: "2026-10-01", currentMileage: 15000 }],
          serviceLogs: [{ id: 1, vehicleId: 4, entryDate: "2026-09-01", servicePerformed: "Oil change" }],
        },
      });
      await mountVehicles();

      const item = [...document.querySelectorAll(".vehicle-list-item")].find((node) =>
        node.textContent.includes("F-150")
      );
      item.click();
      await flushPromises();

      expect(pageText()).toContain("15,000 mi");
      expect(pageText()).toContain("Oil change");
    });
  });

  describe("US-2.4 — Row Action Icons", () => {
    it("Row action buttons visible for admin", async () => {
      setCurrentUser(userWithRole("admin"));
      catalog = [ford];
      await mountVehicles();

      expect(document.querySelectorAll('[aria-label="Edit vehicle"]')).toHaveLength(1);
      expect(document.querySelectorAll('[aria-label="Delete vehicle"]')).toHaveLength(1);
      expect(document.querySelectorAll('[aria-label="Log mileage"]')).toHaveLength(1);
      expect(document.querySelectorAll('[aria-label="Log service"]')).toHaveLength(1);
    });

    it("Maintenance row shows log actions only", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      await mountVehicles();

      expect(document.querySelectorAll('[aria-label="Log mileage"]')).toHaveLength(1);
      expect(document.querySelectorAll('[aria-label="Log service"]')).toHaveLength(1);
      expect(document.querySelectorAll('[aria-label="Edit vehicle"]')).toHaveLength(0);
      expect(document.querySelectorAll('[aria-label="Delete vehicle"]')).toHaveLength(0);
    });
  });

  describe("US-2.5 — Edit Vehicle", () => {
    it("Signed-in admin updates vehicle details", async () => {
      setCurrentUser(userWithRole("admin"));
      catalog = [{ ...ford, color: "White" }];
      updateVehicle.mockImplementation(async (_id, body) => {
        catalog = [{ ...catalog[0], ...body }];
        return { data: { message: "Vehicle was updated successfully." } };
      });
      const { wrapper } = await mountVehicles();

      await clickControl("Edit vehicle");
      expect(pageText()).toContain("Edit Vehicle");
      await setLabeled(wrapper, "Color", "Blue");
      await clickDialogButton("Update Vehicle");

      expect(pageText()).toContain("Blue");
      expect(pageText()).toContain("Ford F-150 updated successfully!");
    });
  });

  describe("US-2.6 — Delete Vehicle", () => {
    it("Signed-in admin deletes a vehicle with confirmation", async () => {
      setCurrentUser(userWithRole("admin"));
      catalog = [ford];
      deleteVehicle.mockImplementation(async () => {
        catalog = [];
        return { data: { message: "Vehicle was deleted successfully!" } };
      });
      await mountVehicles();

      await clickControl("Delete vehicle");
      expect(pageText()).toContain("Delete this vehicle?");
      await clickDialogButton("Delete");

      expect(pageText()).not.toContain("F-150");
      expect(pageText()).toContain("Vehicle deleted successfully!");
    });

    it("Cancelled delete leaves the vehicle", async () => {
      setCurrentUser(userWithRole("admin"));
      catalog = [ford];
      await mountVehicles();

      await clickControl("Delete vehicle");
      await clickDialogButton("Cancel");

      expect(pageText()).toContain("F-150");
      expect(deleteVehicle).not.toHaveBeenCalled();
    });
  });

  describe("US-2.7 — Role-Based Access Control", () => {
    it("Requestor vehicle access is restricted", async () => {
      setCurrentUser(userWithRole("requestor"));

      await router.push("/vehicle");
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("home");
    });
  });

  describe("US-2.8 — Log Mileage and Service", () => {
    it("Maintenance logs mileage on a vehicle", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      logMileage.mockResolvedValue({
        status: 201,
        data: { id: 1, vehicleId: 4, entryDate: "2026-10-01", currentMileage: 15000 },
      });
      getVehicle.mockResolvedValueOnce({
        data: { ...ford, mileageLogs: [], serviceLogs: [] },
      });
      getVehicle.mockResolvedValueOnce({
        data: {
          ...ford,
          mileageLogs: [{ id: 1, vehicleId: 4, entryDate: "2026-10-01", currentMileage: 15000 }],
          serviceLogs: [],
        },
      });
      const { wrapper } = await mountVehicles();

      await setLabeled(wrapper, "Mileage date", "2026-10-01");
      await setLabeled(wrapper, "Current mileage", "15000");
      await clickControl("Log mileage");

      expect(logMileage).toHaveBeenCalledWith(4, { entryDate: "2026-10-01", currentMileage: 15000 });
      expect(pageText()).toContain("Mileage logged successfully!");
      expect(pageText()).toContain("15,000 mi");
    });

    it("Maintenance logs a service on a vehicle", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      logService.mockResolvedValue({
        status: 201,
        data: { id: 1, vehicleId: 4, entryDate: "2026-09-01", servicePerformed: "Oil change" },
      });
      getVehicle.mockResolvedValueOnce({
        data: { ...ford, mileageLogs: [], serviceLogs: [] },
      });
      getVehicle.mockResolvedValueOnce({
        data: {
          ...ford,
          mileageLogs: [],
          serviceLogs: [{ id: 1, vehicleId: 4, entryDate: "2026-09-01", servicePerformed: "Oil change" }],
        },
      });
      const { wrapper } = await mountVehicles();

      await setLabeled(wrapper, "Service date", "2026-09-01");
      await setLabeled(wrapper, "Service performed", "Oil change");
      await clickControl("Log service");
      expect(logService).not.toHaveBeenCalled();
      expect(pageText()).toContain("Optional comment for Oil change");
      await clickDialogButton("Log service");

      expect(logService).toHaveBeenCalledWith(4, {
        entryDate: "2026-09-01",
        servicePerformed: "Oil change",
      });
      expect(pageText()).toContain("Service logged successfully!");
      expect(pageText()).toContain("Oil change");
    });

    it("Mileage that is not above the previous mileage shows the mileage message", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      getVehicle.mockResolvedValue({
        data: {
          ...ford,
          mileageLogs: [{ id: 1, vehicleId: 4, entryDate: "2026-10-01", currentMileage: 15000 }],
          serviceLogs: [],
        },
      });
      const { wrapper } = await mountVehicles();

      await setLabeled(wrapper, "Current mileage", "15000");
      await clickControl("Log mileage");

      expect(pageText()).toContain("Current mileage must be greater than the previous mileage of 15000.");
      expect(pageText()).toContain("Must be greater than 15,000 mi");
      expect(logMileage).not.toHaveBeenCalled();
    });

    it("Maintenance logs a custom service with a comment", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      logService.mockResolvedValue({
        status: 201,
        data: {
          id: 1,
          vehicleId: 4,
          entryDate: "2026-09-01",
          servicePerformed: "Windshield chip repair",
          comments: "Small chip on the driver side.",
        },
      });
      getVehicle.mockResolvedValueOnce({
        data: { ...ford, mileageLogs: [], serviceLogs: [] },
      });
      getVehicle.mockResolvedValueOnce({
        data: {
          ...ford,
          mileageLogs: [],
          serviceLogs: [
            {
              id: 1,
              vehicleId: 4,
              entryDate: "2026-09-01",
              servicePerformed: "Windshield chip repair",
              comments: "Small chip on the driver side.",
            },
          ],
        },
      });
      const { wrapper } = await mountVehicles();

      await setLabeled(wrapper, "Service date", "2026-09-01");
      await setLabeled(wrapper, "Service performed", "Windshield chip repair");
      await clickControl("Log service");
      expect(logService).not.toHaveBeenCalled();
      await setDialogLabeled(wrapper, "Comments", "Small chip on the driver side.");
      await clickDialogButton("Log service");

      expect(logService).toHaveBeenCalledWith(4, {
        entryDate: "2026-09-01",
        servicePerformed: "Windshield chip repair",
        comments: "Small chip on the driver side.",
      });
      expect(pageText()).toContain("Service logged successfully!");
      expect(pageText()).toContain("Windshield chip repair");
      expect(pageText()).toContain("Small chip on the driver side.");
    });

    it("Maintenance adds a comment to an existing service", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      const serviceLogs = [
        {
          id: 1,
          vehicleId: 4,
          entryDate: "2026-09-01",
          servicePerformed: "Oil change",
          comments: null,
        },
      ];
      getVehicle.mockImplementation(async () => ({
        data: { ...ford, mileageLogs: [], serviceLogs: serviceLogs.map((entry) => ({ ...entry })) },
      }));
      updateServiceComment.mockImplementation(async (_vehicleId, _logId, body) => {
        serviceLogs[0] = { ...serviceLogs[0], comments: body.comments };
        return { data: { ...serviceLogs[0] } };
      });
      const { wrapper } = await mountVehicles();

      expect(pageText()).toContain("No comment");
      await clickControl("Add comment for Oil change");
      expect(pageText()).toContain("Oil change on");
      await setDialogLabeled(wrapper, "Comments", "Used 5W-30.");
      await clickDialogButton("Save comment");

      expect(updateServiceComment).toHaveBeenCalledWith(4, 1, { comments: "Used 5W-30." });
      expect(pageText()).toContain("Comment saved.");
      expect(pageText()).toContain("Used 5W-30.");
    });

    it("Future mileage date shows the date message", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      const { wrapper } = await mountVehicles();

      await setLabeled(wrapper, "Mileage date", "2099-01-01");
      await setLabeled(wrapper, "Current mileage", "15000");
      await clickControl("Log mileage");

      expect(pageText()).toContain("Date cannot be in the future.");
      expect(logMileage).not.toHaveBeenCalled();
    });

    it("Future service date shows the date message", async () => {
      setCurrentUser(userWithRole("maintenance"));
      catalog = [ford];
      const { wrapper } = await mountVehicles();

      await setLabeled(wrapper, "Service date", "2099-01-01");
      await setLabeled(wrapper, "Service performed", "Oil change");
      await clickControl("Log service");

      expect(pageText()).toContain("Date cannot be in the future.");
      expect(logService).not.toHaveBeenCalled();
    });
  });
});
