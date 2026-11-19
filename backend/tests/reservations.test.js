/**
 * Feature 6 — Reservation Management
 * Spec: features/feature-6-reservation-management.md
 */
import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  createArea,
  createSession,
  createUser,
  syncTestDatabase,
} from "./helpers.js";

async function signIn(role, overrides = {}) {
  const userOverrides = {
    role,
    email: `${role}-${Date.now()}@eagles.oc.edu`,
    googleSub: `sub-${role}-${Date.now()}`,
    ...overrides,
  };

  if (role === "area_admin" && !userOverrides.areaId) {
    const area = await createArea(`Area-${Date.now()}`);
    userOverrides.areaId = area.id;
  }

  const user = await createUser(userOverrides);
  const session = await createSession(user);
  return { token: session.token, user };
}

function authed(token) {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    get: (url) => request(app).get(url).set(headers),
    post: (url) => request(app).post(url).set(headers),
    put: (url) => request(app).put(url).set(headers),
    delete: (url) => request(app).delete(url).set(headers),
  };
}

async function createTestVehicle(overrides = {}) {
  const randomVin = "1HGCR2F83HA" + Math.floor(100000 + Math.random() * 900000);
  const randomPlate = "OK" + Math.floor(1000 + Math.random() * 9000);
  return db.vehicle.create({
    category: "Van",
    make: "Ford",
    model: "Transit",
    year: 2022,
    vin: randomVin,
    purchasedDate: "2022-01-01",
    color: "White",
    passengerCapacity: 12,
    licensePlateNumber: randomPlate,
    licensePlateExpirationMonth: 6,
    areaAssigned: "Athletics",
    status: "available",
    ...overrides,
  });
}

async function createTestDriver(overrides = {}) {
  return db.driver.create({
    firstName: "Sam",
    lastName: "Driver",
    driverLicenseNumber: "DL" + Math.floor(100000 + Math.random() * 900000),
    driverLicenseExpDate: "2030-01-01",
    insuranceProvider: "StateFarm",
    insuranceNumber: "POL" + Math.floor(100000 + Math.random() * 900000),
    approvedDate: "2026-01-01",
    approvedCategories: "Van,Car,Truck,Golf Cart",
    status: "valid",
    ...overrides,
  });
}

describe("Feature 6 — Reservation Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-6.1 — View Reservations List", () => {
    it("Requestor sees only own reservations", async () => {
      const { token: janeToken, user: jane } = await signIn("requestor", {
        fName: "Jane",
        lName: "Doe",
        email: "jane@eagles.oc.edu",
      });
      const { user: bob } = await signIn("requestor", {
        fName: "Bob",
        lName: "Smith",
        email: "bob@eagles.oc.edu",
      });
      const vehicle = await createTestVehicle();

      await db.reservation.create({
        requestorId: jane.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Jane Destination",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "pending",
      });

      await db.reservation.create({
        requestorId: bob.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Bob Destination",
        start: new Date("2026-11-03T08:00:00Z"),
        end: new Date("2026-11-03T12:00:00Z"),
        status: "pending",
      });

      const res = await authed(janeToken).get("/vehicleScheduling/reservations");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].destinationName).toBe("Jane Destination");
    });

    it("Area admin sees reservations for assigned area", async () => {
      const athleticsArea = await createArea("Athletics");
      const supportArea = await createArea("Support Central");

      const { token: areaAdminToken } = await signIn("area_admin", {
        areaId: athleticsArea.id,
      });
      const { user: reqUser } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      await db.reservation.create({
        requestorId: reqUser.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Athletics Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        areaName: "Athletics",
        status: "pending",
      });

      await db.reservation.create({
        requestorId: reqUser.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Support Trip",
        start: new Date("2026-11-03T08:00:00Z"),
        end: new Date("2026-11-03T12:00:00Z"),
        areaName: "Support Central",
        status: "pending",
      });

      const res = await authed(areaAdminToken).get("/vehicleScheduling/reservations");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].destinationName).toBe("Athletics Trip");
    });

    it("System administrator sees all reservations", async () => {
      const { token: sysAdminToken } = await signIn("system_admin");
      const { user: reqUser1 } = await signIn("requestor");
      const { user: reqUser2 } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      await db.reservation.create({
        requestorId: reqUser1.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip 1",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        areaName: "Athletics",
        status: "pending",
      });

      await db.reservation.create({
        requestorId: reqUser2.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip 2",
        start: new Date("2026-11-03T08:00:00Z"),
        end: new Date("2026-11-03T12:00:00Z"),
        areaName: "Support Central",
        status: "approved",
      });

      const res = await authed(sysAdminToken).get("/vehicleScheduling/reservations");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe("US-6.2 — Submit Reservation Request", () => {
    it("Successful reservation submission", async () => {
      const { token, user } = await signIn("requestor", {
        fName: "Jane",
        lName: "Doe",
        email: "jdoe@eagles.oc.edu",
      });
      const vehicle = await createTestVehicle({ category: "Van" });
      await createTestDriver({
        firstName: "Sam",
        lastName: "Driver",
        approvedCategories: "Van,Car",
      });

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: "2026-11-02 08:00",
        end: "2026-11-02 12:00",
        driverName: "Sam Driver",
        driverEmail: "sdriver@eagles.oc.edu",
        areaName: "Athletics",
        passengers: 4,
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");
      expect(res.body.requestorId).toBe(user.id);
      expect(res.body.destinationName).toBe("Edmond High School");
      expect(res.body.vehicleName).toContain("Transit");
    });

    it("Successful reservation submission with newly entered destination", async () => {
      const { token } = await signIn("requestor");
      const vehicle = await createTestVehicle();
      await createTestDriver({ firstName: "Sam", lastName: "Driver" });

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Guthrie High School",
        start: "2026-11-02 08:00",
        end: "2026-11-02 12:00",
        driverName: "Sam Driver",
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");
      expect(res.body.destinationName).toBe("Guthrie High School");
    });

    it("End time before start time is rejected", async () => {
      const { token } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: "2026-11-02 12:00",
        end: "2026-11-02 08:00",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("End time must be after start time.");
    });

    it("Start time in the past is rejected", async () => {
      const { token } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: "2020-01-01 08:00",
        end: "2020-01-01 12:00",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Reservation start time cannot be in the past.");
    });

    it("Conflicting vehicle reservation is rejected", async () => {
      const { token: userToken, user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Existing Trip",
        start: new Date("2026-11-02 08:00"),
        end: new Date("2026-11-02 12:00"),
        status: "approved",
      });

      const res = await authed(userToken).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "New Trip",
        start: "2026-11-02 10:00",
        end: "2026-11-02 14:00",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "The requested vehicle is not available for the selected dates."
      );
    });

    it("Unapproved driver category is rejected", async () => {
      const { token } = await signIn("requestor");
      const vehicle = await createTestVehicle({ category: "Van" });
      await createTestDriver({
        firstName: "Alex",
        lastName: "Smith",
        approvedCategories: "Golf Cart",
      });

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: "2026-11-02 08:00",
        end: "2026-11-02 12:00",
        driverName: "Alex Smith",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Driver is not approved to drive this vehicle type.");
    });
  });

  describe("US-6.3 — View Reservation Details", () => {
    it("Owner reads own reservation details", async () => {
      const { token, user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Destination Details",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "pending",
      });

      const res = await authed(token).get(`/vehicleScheduling/reservations/${reservation.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(reservation.id);
      expect(res.body.destinationName).toBe("Destination Details");
    });

    it("Area admin reads reservation for their area", async () => {
      const area = await createArea("Athletics");
      const { token: areaAdminToken } = await signIn("area_admin", {
        areaId: area.id,
      });
      const { user: reqUser } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: reqUser.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Area Reservation",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        areaName: "Athletics",
        status: "pending",
      });

      const res = await authed(areaAdminToken).get(
        `/vehicleScheduling/reservations/${reservation.id}`
      );
      expect(res.status).toBe(200);
      expect(res.body.areaName).toBe("Athletics");
    });

    it("Unauthorized caller receives 404 for reservation", async () => {
      const supportArea = await createArea("Support Central");
      const athleticsArea = await createArea("Athletics");

      const { user: jane } = await signIn("requestor");
      const { token: otherToken } = await signIn("requestor");
      const { token: athleticsAdminToken } = await signIn("area_admin", {
        areaId: athleticsArea.id,
      });
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: jane.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Secret Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        areaName: "Support Central",
        status: "pending",
      });

      const resOther = await authed(otherToken).get(
        `/vehicleScheduling/reservations/${reservation.id}`
      );
      expect(resOther.status).toBe(404);
      expect(resOther.body.message).toBe("Reservation not found.");

      const resAdmin = await authed(athleticsAdminToken).get(
        `/vehicleScheduling/reservations/${reservation.id}`
      );
      expect(resAdmin.status).toBe(404);
      expect(resAdmin.body.message).toBe("Reservation not found.");
    });
  });

  describe("US-6.4 — Approve Reservation", () => {
    it("System admin approves pending reservation", async () => {
      const { token: sysAdminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "pending",
      });

      const res = await authed(sysAdminToken).post(
        `/vehicleScheduling/reservations/${reservation.id}/approve`
      );
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("approved");
    });

    it("Area admin approves pending reservation in their area", async () => {
      const area = await createArea("Athletics");
      const { token: areaAdminToken } = await signIn("area_admin", {
        areaId: area.id,
      });
      const { user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        areaName: "Athletics",
        status: "pending",
      });

      const res = await authed(areaAdminToken).post(
        `/vehicleScheduling/reservations/${reservation.id}/approve`
      );
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("approved");
    });

    it("Approving non-pending reservation is rejected", async () => {
      const { token: sysAdminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "approved",
      });

      const res = await authed(sysAdminToken).post(
        `/vehicleScheduling/reservations/${reservation.id}/approve`
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("This reservation cannot be approved.");
    });

    it("Requestor cannot approve reservation", async () => {
      const { token } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations/10/approve");
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Admin role required.");
    });
  });

  describe("US-6.5 — Deny Reservation", () => {
    it("Administrator denies pending reservation with reason", async () => {
      const { token: sysAdminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "pending",
      });

      const res = await authed(sysAdminToken)
        .post(`/vehicleScheduling/reservations/${reservation.id}/deny`)
        .send({ reason: "The van is already booked." });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("denied");
      expect(res.body.denialReason).toBe("The van is already booked.");
    });

    it("Denying without reason is rejected", async () => {
      const { token: sysAdminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "pending",
      });

      const res = await authed(sysAdminToken)
        .post(`/vehicleScheduling/reservations/${reservation.id}/deny`)
        .send({ reason: "   " });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("A denial reason is required.");
    });

    it("Denying non-pending reservation is rejected", async () => {
      const { token: sysAdminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "cancelled",
      });

      const res = await authed(sysAdminToken)
        .post(`/vehicleScheduling/reservations/${reservation.id}/deny`)
        .send({ reason: "Already cancelled" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("This reservation cannot be denied.");
    });
  });

  describe("US-6.6 — Cancel Reservation", () => {
    it("Requestor cancels own pending reservation", async () => {
      const { token, user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "pending",
      });

      const res = await authed(token).post(
        `/vehicleScheduling/reservations/${reservation.id}/cancel`
      );
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cancelled");
    });

    it("System admin cancels approved reservation", async () => {
      const { token: sysAdminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "approved",
      });

      const res = await authed(sysAdminToken).post(
        `/vehicleScheduling/reservations/${reservation.id}/cancel`
      );
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cancelled");
    });

    it("Cancelling already cancelled or denied reservation is rejected", async () => {
      const { token, user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "cancelled",
      });

      const res = await authed(token).post(
        `/vehicleScheduling/reservations/${reservation.id}/cancel`
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("This reservation cannot be cancelled.");
    });
  });

  describe("US-6.7 — Generate Reservation Text Summary File", () => {
    it("Text summary file created upon reservation creation", async () => {
      const { token } = await signIn("requestor", {
        fName: "Jane",
        lName: "Doe",
        email: "jdoe@eagles.oc.edu",
      });
      const vehicle = await createTestVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Summary Test Destination",
        start: "2026-11-02 08:00",
        end: "2026-11-02 12:00",
      });

      expect(res.status).toBe(201);
      expect(res.body.summaryFilePath).toBeDefined();

      const expectedPath = path.resolve(process.cwd(), res.body.summaryFilePath);
      expect(fs.existsSync(expectedPath)).toBe(true);

      const fileContent = fs.readFileSync(expectedPath, "utf8");
      expect(fileContent).toContain("Jane Doe");
      expect(fileContent).toContain("Summary Test Destination");
      expect(fileContent).toContain("2026-11-02 08:00");
    });
  });

  describe("US-6.8 — Role-Based Access Control & Ownership Isolation", () => {
    it("Unauthenticated caller receives 401", async () => {
      const res = await request(app).get("/vehicleScheduling/reservations");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized! No token provided.");
    });

    it("Maintenance user receives 404 for individual reservation", async () => {
      const { token: maintToken } = await signIn("maintenance");
      const { user } = await signIn("requestor");
      const vehicle = await createTestVehicle();

      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Trip",
        start: new Date("2026-11-02T08:00:00Z"),
        end: new Date("2026-11-02T12:00:00Z"),
        status: "pending",
      });

      const res = await authed(maintToken).get(
        `/vehicleScheduling/reservations/${reservation.id}`
      );
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Reservation not found.");
    });
  });
});
