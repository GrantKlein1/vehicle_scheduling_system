import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { vuetify } from "./testUtils.js";
import Reservations from "../src/views/Reservations.vue";
import * as reservationServices from "../src/services/reservationServices.js";
import * as vehicleServices from "../src/services/vehicleServices.js";
import * as destinationServices from "../src/services/destinationServices.js";
import * as driverServices from "../src/services/driverServices.js";
import * as areaServices from "../src/services/areaServices.js";
import { setCurrentUser, clearCurrentUser } from "../src/config/session.js";

vi.mock("../src/services/reservationServices.js", () => ({
  listReservations: vi.fn(),
  getReservation: vi.fn(),
  createReservation: vi.fn(),
  approveReservation: vi.fn(),
  denyReservation: vi.fn(),
  cancelReservation: vi.fn(),
}));

vi.mock("../src/services/vehicleServices.js", () => ({
  listVehicles: vi.fn(),
}));

vi.mock("../src/services/destinationServices.js", () => ({
  listDestinations: vi.fn(),
}));

vi.mock("../src/services/driverServices.js", () => ({
  listDrivers: vi.fn(),
}));

vi.mock("../src/services/areaServices.js", () => ({
  listAreas: vi.fn(),
}));

describe("Feature 6 — Reservation Management Frontend", () => {
  const sampleReservations = [
    {
      id: 1,
      requestorId: 10,
      status: "pending",
      vehicleId: 1,
      vehicleName: "2022 Ford Transit",
      destinationName: "Edmond High School",
      start: "2026-11-02T08:00:00.000Z",
      end: "2026-11-02T12:00:00.000Z",
      areaName: "Athletics",
      purpose: "Campus visit",
      driverName: "Sam Driver",
      driverEmail: "sdriver@eagles.oc.edu",
      passengers: 4,
      denialReason: null,
      notes: "Need keys early",
      createdAt: "2026-10-29T12:00:00.000Z",
    },
    {
      id: 2,
      requestorId: 10,
      status: "approved",
      vehicleId: 2,
      vehicleName: "2023 Chevy Malibu",
      destinationName: "Guthrie High School",
      start: "2026-11-03T09:00:00.000Z",
      end: "2026-11-03T15:00:00.000Z",
      areaName: "Support Central",
      purpose: "Recruiting",
      driverName: null,
      driverEmail: null,
      passengers: 2,
      denialReason: null,
      notes: null,
      createdAt: "2026-10-29T12:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    clearCurrentUser();
    setCurrentUser({
      userId: 1,
      email: "admin@eagles.oc.edu",
      fName: "System",
      lName: "Admin",
      role: "system_admin",
      token: "jwt-token",
    });

    reservationServices.listReservations.mockResolvedValue({ data: sampleReservations });
    vehicleServices.listVehicles.mockResolvedValue({
      data: [{ id: 1, make: "Ford", model: "Transit", year: 2022, areaAssigned: "Athletics", category: "Van" }],
    });
    destinationServices.listDestinations.mockResolvedValue({
      data: [{ id: 1, name: "Edmond High School" }],
    });
    driverServices.listDrivers.mockResolvedValue({
      data: [{ id: 1, firstName: "Sam", lastName: "Driver" }],
    });
    areaServices.listAreas.mockResolvedValue({
      data: [{ id: 1, name: "Athletics" }],
    });
  });

  function mountView() {
    return mount(Reservations, {
      global: {
        plugins: [vuetify],
      },
      attachTo: document.body,
    });
  }

  it("Empty reservations display empty state", async () => {
    reservationServices.listReservations.mockResolvedValue({ data: [] });
    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.text()).toContain("No reservations yet.");
  });

  it("Renders reservation items and filters by search text", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.text()).toContain("Edmond High School");
    expect(wrapper.text()).toContain("Guthrie High School");

    wrapper.vm.search = "Edmond";
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Edmond High School");
    expect(wrapper.text()).not.toContain("Guthrie High School");
  });

  it("Admin sees Approve, Deny, and Cancel actions for pending reservation", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.vm.canApproveOrDeny).toBe(true);
    expect(wrapper.vm.canCancel).toBe(true);
    expect(wrapper.text()).toContain("Approve");
    expect(wrapper.text()).toContain("Deny");
    expect(wrapper.text()).toContain("Cancel Reservation");
  });

  it("Approve calls approveReservation and reloads", async () => {
    reservationServices.approveReservation.mockResolvedValue({
      data: { ...sampleReservations[0], status: "approved" },
    });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    await wrapper.vm.handleApprove();
    expect(reservationServices.approveReservation).toHaveBeenCalledWith(1);
  });

  it("Deny dialog validates reason and calls denyReservation", async () => {
    reservationServices.denyReservation.mockResolvedValue({
      data: { ...sampleReservations[0], status: "denied", denialReason: "Vehicle under repair" },
    });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    wrapper.vm.openDenyDialog();
    expect(wrapper.vm.isDenyDialogOpen).toBe(true);

    // Empty reason should fail validation
    wrapper.vm.denialReason = "";
    await wrapper.vm.handleDeny();
    expect(wrapper.vm.denialReasonError).toBe("A denial reason is required.");
    expect(reservationServices.denyReservation).not.toHaveBeenCalled();

    // Valid reason calls service
    wrapper.vm.denialReason = "Vehicle under repair";
    await wrapper.vm.handleDeny();
    expect(reservationServices.denyReservation).toHaveBeenCalledWith(1, {
      reason: "Vehicle under repair",
    });
    expect(wrapper.vm.isDenyDialogOpen).toBe(false);
  });

  it("Cancel dialog calls cancelReservation", async () => {
    reservationServices.cancelReservation.mockResolvedValue({
      data: { ...sampleReservations[0], status: "cancelled" },
    });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    wrapper.vm.openCancelDialog();
    expect(wrapper.vm.isCancelDialogOpen).toBe(true);

    await wrapper.vm.handleCancel();
    expect(reservationServices.cancelReservation).toHaveBeenCalledWith(1);
    expect(wrapper.vm.isCancelDialogOpen).toBe(false);
  });

  it("Submitting create form calls createReservation with payload", async () => {
    reservationServices.createReservation.mockResolvedValue({
      data: {
        id: 3,
        requestorId: 1,
        status: "pending",
        vehicleId: 1,
        vehicleName: "2022 Ford Transit",
        destinationName: "Guthrie High School",
        start: "2026-11-02 08:00",
        end: "2026-11-02 12:00",
      },
    });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    wrapper.vm.openCreateDialog();
    expect(wrapper.vm.isCreateDialogOpen).toBe(true);

    wrapper.vm.reservationForm.vehicleId = 1;
    wrapper.vm.reservationForm.destinationName = "Guthrie High School";
    wrapper.vm.reservationForm.start = "2026-11-02 08:00";
    wrapper.vm.reservationForm.end = "2026-11-02 12:00";

    await wrapper.vm.handleCreateReservation();

    expect(reservationServices.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 1,
        destinationName: "Guthrie High School",
        start: "2026-11-02 08:00",
        end: "2026-11-02 12:00",
      })
    );
    expect(wrapper.vm.isCreateDialogOpen).toBe(false);
  });
});
