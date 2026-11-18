/**
 * Feature 9 — AI Assistant
 * Spec: features/feature-9-ai-assistant.md
 */
import fs from "fs";
import path from "path";
import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import authConfig from "../app/config/auth.config.js";
import logger from "../app/config/logger.js";
import { signToolToken } from "../app/assistant/delegation.js";
import { manifestForRole } from "../app/assistant/tools.registry.js";
import { resetAssistantRateLimit } from "../app/assistant/rateLimit.js";
import {
  createArea,
  createSession,
  createUser,
  insertLegacyAdmin,
  syncTestDatabase,
} from "./helpers.js";

const RESERVATION_FIELDS = [
  "id",
  "status",
  "requestorId",
  "requestorName",
  "vehicleId",
  "vehicleName",
  "destinationName",
  "start",
  "end",
  "areaName",
  "purpose",
  "driverName",
  "driverEmail",
  "passengers",
  "notes",
  "denialReason",
].sort();

async function signIn(role, overrides = {}) {
  const userOverrides = {
    role,
    fName: "Jane",
    lName: "Doe",
    email: `${role}-${Date.now()}-${Math.random()}@eagles.oc.edu`,
    googleSub: `sub-${role}-${Date.now()}-${Math.random()}`,
    ...overrides,
  };
  if (role === "area_admin" && !userOverrides.areaId) {
    const area = await createArea(`Area-${Date.now()}-${Math.random()}`);
    userOverrides.areaId = area.id;
  }
  const user = await createUser(userOverrides);
  const session = await createSession(user);
  return { token: session.token, user };
}

function tool(token) {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    post: (name) => request(app).post(`/api/assistant/tools/${name}`).set(headers),
  };
}

async function createVehicle(overrides = {}) {
  return db.vehicle.create({
    category: "Van",
    make: "Ford",
    model: "Transit",
    year: 2020,
    vin: `1HGCR2F83HA${Math.floor(100000 + Math.random() * 900000)}`,
    purchasedDate: "2022-01-01",
    color: "White",
    passengerCapacity: 8,
    licensePlateNumber: `OK${Math.floor(1000 + Math.random() * 9000)}`,
    licensePlateExpirationMonth: 6,
    areaAssigned: "Athletics",
    status: "available",
    ...overrides,
  });
}

async function createReservation(owner, vehicle, overrides = {}) {
  return db.reservation.create({
    requestorId: owner.id,
    vehicleId: vehicle.id,
    vehicleName: "2020 Ford Transit",
    destinationName: "Edmond High School",
    start: new Date("2026-11-20T14:00:00.000Z"),
    end: new Date("2026-11-20T18:00:00.000Z"),
    areaName: "Athletics",
    status: "pending",
    passengers: 1,
    ...overrides,
  });
}

function summaryFiles() {
  const dir = path.resolve(process.cwd(), "storage", "reservations");
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).sort();
}

describe("Feature 9 — AI Assistant", () => {
  beforeEach(async () => {
    resetAssistantRateLimit();
    await syncTestDatabase();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("US-9.1", () => {
    it("Requestor tool call returns only own reservations", async () => {
      const info = jest.spyOn(logger, "info").mockImplementation(() => {});
      const { user: jane } = await signIn("requestor", {
        fName: "Jane",
        lName: "Doe",
        email: "jane-secret@eagles.oc.edu",
      });
      const { user: bob } = await signIn("requestor", {
        fName: "Bob",
        lName: "Smith",
        email: "bob-secret@eagles.oc.edu",
      });
      const vehicle = await createVehicle();
      const janes = await createReservation(jane, vehicle, {
        destinationName: "Jane Destination",
        driverEmail: "jane.driver@eagles.oc.edu",
        summaryFilePath: "storage/reservations/secret-summary.txt",
        purpose: "Game",
        notes: "NOT-IN-LOGS",
        denialReason: null,
      });
      await createReservation(bob, vehicle, {
        destinationName: "Bob Destination",
        driverEmail: "bob.driver@eagles.oc.edu",
        start: new Date("2026-11-21T14:00:00.000Z"),
        end: new Date("2026-11-21T18:00:00.000Z"),
        areaName: "Support Central",
      });

      const token = signToolToken(jane.id);
      const res = await tool(token).post("list_reservations").send({});

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body.every((row) => row.requestorId === jane.id)).toBe(true);
      expect(res.body.some((row) => row.requestorId === bob.id)).toBe(false);
      expect(res.body[0].driverEmail).toBe("jane.driver@eagles.oc.edu");
      expect(res.body[0].requestorName).toBe("Jane Doe");
      expect(Object.keys(res.body[0]).sort()).toEqual(RESERVATION_FIELDS);
      expect(JSON.stringify(res.body)).not.toContain("summaryFilePath");
      expect(JSON.stringify(res.body)).not.toContain("bob-secret@eagles.oc.edu");
      expect(JSON.stringify(res.body)).not.toContain("jane-secret@eagles.oc.edu");

      const detail = await tool(token).post("get_reservation").send({ id: janes.id });
      expect(detail.status).toBe(200);
      expect(detail.body.id).toBe(janes.id);
      expect(Object.keys(detail.body).sort()).toEqual(RESERVATION_FIELDS);

      const logged = info.mock.calls.map((call) => call.map(String).join(" ")).join("\n");
      expect(logged).toContain(
        `assistant tool userId=${jane.id} role=requestor tool=list_reservations status=200`
      );
      expect(logged).not.toContain("NOT-IN-LOGS");
      expect(logged).not.toContain(token);
    });

    it("Requestor cannot read another reservation", async () => {
      const { user: jane } = await signIn("requestor", { fName: "Jane", lName: "Doe" });
      const { user: bob } = await signIn("requestor", { fName: "Bob", lName: "Smith" });
      const vehicle = await createVehicle();
      const bobs = await createReservation(bob, vehicle, { destinationName: "Bob Destination" });

      const res = await tool(signToolToken(jane.id)).post("get_reservation").send({ id: bobs.id });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Reservation not found." });

      const emails = await tool(signToolToken(jane.id))
        .post("list_reservation_emails")
        .send({ reservationId: bobs.id });
      expect(emails.status).toBe(404);
      expect(emails.body).toEqual({ message: "Reservation not found." });
    });
  });

  describe("US-9.2", () => {
    it("Area admin tool call returns only that area", async () => {
      const athletics = await createArea("Athletics");
      await createArea("Support Central");
      const { user: admin } = await signIn("area_admin", { areaId: athletics.id, fName: "Avery" });
      const { user: owner } = await signIn("requestor");
      const vehicle = await createVehicle();
      await createReservation(owner, vehicle, { areaName: "Athletics", destinationName: "Gym" });
      await createReservation(owner, vehicle, {
        areaName: "Support Central",
        destinationName: "Office",
        start: new Date("2026-11-21T14:00:00.000Z"),
        end: new Date("2026-11-21T18:00:00.000Z"),
      });

      const res = await tool(signToolToken(admin.id)).post("list_reservations").send({});
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((row) => row.areaName === "Athletics")).toBe(true);
      expect(res.body.some((row) => row.areaName === "Support Central")).toBe(false);

      const areas = await tool(signToolToken(admin.id)).post("list_areas").send({});
      expect(areas.status).toBe(403);
      expect(areas.body).toEqual({ message: "You do not have access to this information." });
    });

    it("System admin tool call returns every reservation", async () => {
      const { user: admin } = await signIn("system_admin", { fName: "Alex", lName: "Admin" });
      const { user: owner } = await signIn("requestor");
      const vehicle = await createVehicle();
      await createReservation(owner, vehicle, { areaName: "Athletics" });
      await createReservation(owner, vehicle, {
        areaName: "Support Central",
        start: new Date("2026-11-21T14:00:00.000Z"),
        end: new Date("2026-11-21T18:00:00.000Z"),
      });

      const res = await tool(signToolToken(admin.id)).post("list_reservations").send({});
      expect(res.status).toBe(200);
      const areas = res.body.map((row) => row.areaName);
      expect(areas).toContain("Athletics");
      expect(areas).toContain("Support Central");
    });
  });

  describe("US-9.3", () => {
    it("Available vehicles exclude repair and overlapping bookings", async () => {
      const { user: jane } = await signIn("requestor");
      const booked = await createVehicle({
        year: 2020,
        make: "Ford",
        model: "Transit",
        status: "available",
        passengerCapacity: 8,
      });
      const repair = await createVehicle({
        year: 2018,
        make: "Ford",
        model: "Transit",
        status: "in_repair",
        passengerCapacity: 8,
      });
      const outOfService = await createVehicle({
        year: 2017,
        make: "Dodge",
        model: "Caravan",
        status: "out_of_service",
      });
      const free = await createVehicle({
        year: 2021,
        make: "Honda",
        model: "Odyssey",
        status: "available",
        passengerCapacity: 7,
        areaAssigned: "Support Central",
      });
      const checkedOut = await createVehicle({
        year: 2019,
        make: "Chevrolet",
        model: "Express",
        status: "checked_out",
        category: "Van",
      });
      const endsAtStart = await createVehicle({
        year: 2016,
        make: "Toyota",
        model: "Sienna",
        status: "available",
      });
      await createReservation(jane, booked, {
        status: "approved",
        start: new Date("2026-11-20 08:00"),
        end: new Date("2026-11-20 12:00"),
      });
      await createReservation(jane, free, {
        status: "denied",
        start: new Date("2026-11-20 10:00"),
        end: new Date("2026-11-20 14:00"),
      });
      await createReservation(jane, endsAtStart, {
        status: "approved",
        start: new Date("2026-11-20 08:00"),
        end: new Date("2026-11-20 10:00"),
      });

      const res = await tool(signToolToken(jane.id)).post("check_vehicle_availability").send({
        start: "2026-11-20 10:00",
        end: "2026-11-20 14:00",
      });

      expect(res.status).toBe(200);
      const names = res.body.map((row) => row.name);
      expect(names).not.toContain("2020 Ford Transit");
      expect(names).not.toContain("2018 Ford Transit");
      expect(names).not.toContain("2017 Dodge Caravan");
      expect(names).toContain("2021 Honda Odyssey");
      expect(names).toContain("2019 Chevrolet Express");
      expect(names).toContain("2016 Toyota Sienna");
      expect(res.body.find((row) => row.id === repair.id)).toBeUndefined();
      expect(res.body.find((row) => row.id === outOfService.id)).toBeUndefined();
      const included = res.body.find((row) => row.name === "2021 Honda Odyssey");
      expect(Object.keys(included).sort()).toEqual(
        ["areaAssigned", "category", "id", "name", "passengerCapacity"].sort()
      );
      expect(included.passengerCapacity).toBe(7);
      expect(included.areaAssigned).toBe("Support Central");
      expect(JSON.stringify(res.body)).not.toContain("vin");
    });

    it("Requestor can check availability without the vehicle catalog", async () => {
      const { token, user: jane } = await signIn("requestor");
      await createVehicle({ status: "available" });

      const catalog = await request(app)
        .get("/api/vehicle/vehicles")
        .set("Authorization", `Bearer ${token}`);
      expect(catalog.status).toBe(403);

      const availability = await tool(signToolToken(jane.id))
        .post("check_vehicle_availability")
        .send({ start: "2026-11-20T10:00:00-06:00", end: "2026-11-20T14:00:00-06:00" });
      expect(availability.status).toBe(200);
      expect(Array.isArray(availability.body)).toBe(true);

      const fleet = await tool(signToolToken(jane.id)).post("list_vehicles").send({});
      expect(fleet.status).toBe(403);
      expect(fleet.body).toEqual({ message: "You do not have access to this information." });
    });
  });

  describe("US-9.4", () => {
    it("Draft reservation does not create a row", async () => {
      const { user: jane } = await signIn("requestor", { fName: "Jane", lName: "Doe" });
      const vehicle = await createVehicle({
        year: 2020,
        make: "Ford",
        model: "Transit",
        areaAssigned: "Athletics",
        status: "available",
      });
      const before = await db.reservation.count();
      const emailsBefore = await db.email.count();
      const filesBefore = summaryFiles();

      const res = await tool(signToolToken(jane.id)).post("draft_reservation").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: "2026-11-20T14:00:00.000Z",
        end: "2026-11-20T18:00:00.000Z",
      });

      expect(res.status).toBe(200);
      expect(res.body.draft.vehicleName).toBe("2020 Ford Transit");
      expect(res.body.draft.destinationName).toBe("Edmond High School");
      expect(res.body.draft.start).toBe("2026-11-20T14:00:00.000Z");
      expect(res.body.draft.end).toBe("2026-11-20T18:00:00.000Z");
      expect(res.body.draft.areaName).toBe("Athletics");
      expect(res.body.draft.passengers).toBe(1);
      expect(res.body.draft.driverName).toBeNull();
      expect(res.body.draft.driverEmail).toBeNull();
      expect(res.body.draft.purpose).toBeNull();
      expect(res.body.draft.notes).toBeNull();
      expect(await db.reservation.count()).toBe(before);
      expect(await db.email.count()).toBe(emailsBefore);
      expect(summaryFiles()).toEqual(filesBefore);
    });

    it("Draft uses the Feature 6 validation messages", async () => {
      const { user: jane } = await signIn("requestor");
      const vehicle = await createVehicle();
      const before = await db.reservation.count();

      const res = await tool(signToolToken(jane.id)).post("draft_reservation").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: "2020-01-01 08:00",
        end: "2020-01-01 12:00",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Reservation start time cannot be in the past." });
      expect(await db.reservation.count()).toBe(before);
    });
  });

  describe("US-9.5", () => {
    it("Maintenance cannot call list_reservations", async () => {
      const { user } = await signIn("maintenance", { fName: "Morgan", lName: "Maint" });
      const names = manifestForRole(user).map((entry) => entry.name);
      expect(names).not.toContain("list_reservations");
      expect(names).toEqual(["list_vehicles", "list_drivers", "list_destinations"]);

      const res = await tool(signToolToken(user.id)).post("list_reservations").send({});
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: "You do not have access to this information." });
    });

    it("Tool token rejected on GET /reservations", async () => {
      const { user } = await signIn("requestor");
      const token = signToolToken(user.id);

      const res = await request(app).get("/api/reservations").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Unauthorized! Invalid or expired token." });

      const production = await request(app)
        .get("/vehicle-t4/reservations")
        .set("Authorization", `Bearer ${token}`);
      expect(production.status).toBe(401);
      expect(production.body).toEqual({ message: "Unauthorized! Invalid or expired token." });

      const tools = await request(app)
        .post("/vehicle-t4/assistant/tools/list_drivers")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(tools.status).toBe(200);
      expect(Array.isArray(tools.body)).toBe(true);
    });

    it("Expired tool token is rejected", async () => {
      const { user } = await signIn("requestor");
      const token = jwt.sign({}, authConfig.secret, {
        subject: String(user.id),
        audience: "assistant-tools",
        issuer: "vehicle-scheduling-api",
        expiresIn: -10,
      });

      const res = await request(app)
        .post("/api/assistant/tools/list_drivers")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });

    it("Tool results omit secrets and other users' emails", async () => {
      const { user: admin } = await signIn("system_admin", { fName: "Alex", lName: "Admin" });
      const { user: owner } = await signIn("requestor", {
        email: "owner-secret@eagles.oc.edu",
        fName: "Jane",
        lName: "Doe",
      });
      await db.driver.create({
        firstName: "Sam",
        lastName: "Driver",
        driverLicenseNumber: "SECRET-LICENSE-1",
        driverLicenseExpDate: "2030-01-01",
        insuranceProvider: "Secret Insurance Co",
        insuranceNumber: "SECRET-POLICY-1",
        approvedDate: "2026-01-01",
        approvedCategories: "Van,Car",
        status: "valid",
      });
      await db.driver.create({
        firstName: "Old",
        lastName: "Driver",
        driverLicenseNumber: "SECRET-LICENSE-2",
        driverLicenseExpDate: "2020-01-01",
        insuranceProvider: "Secret Insurance Co",
        insuranceNumber: "SECRET-POLICY-2",
        approvedDate: "2020-01-01",
        approvedCategories: "Van",
        status: "expired",
      });
      const vehicle = await createVehicle({
        vin: "SECRETVIN1234567",
        licensePlateNumber: "PLATE123",
        year: 2020,
        make: "Ford",
        model: "Transit",
      });
      const reservation = await createReservation(owner, vehicle, {
        driverEmail: "driver-visible@eagles.oc.edu",
      });
      await db.email.create({
        reservationId: reservation.id,
        event: "approved",
        recipientEmail: "hidden-recipient@eagles.oc.edu",
        recipientRole: "requestor",
        fromEmail: "vehicle-scheduling@eagles.oc.edu",
        subject: "Later notice",
        body: "SECRET EMAIL BODY",
        status: "sent",
        errorMessage: "secret failure",
        sentAt: new Date("2026-11-02T00:00:00.000Z"),
      });
      await db.email.create({
        reservationId: reservation.id,
        event: "submitted",
        recipientEmail: "another-hidden@eagles.oc.edu",
        recipientRole: "system_admin",
        fromEmail: "vehicle-scheduling@eagles.oc.edu",
        subject: "Earlier notice",
        body: "SECRET EMAIL BODY TWO",
        status: "failed",
        errorMessage: null,
        sentAt: new Date("2026-11-01T00:00:00.000Z"),
      });
      await db.area.create({
        name: "Athletics Mail",
        notificationEmail: "athletics-notify@eagles.oc.edu",
      });

      const token = signToolToken(admin.id);
      const drivers = await tool(token).post("list_drivers").send({});
      const vehicles = await tool(token).post("list_vehicles").send({});
      const emails = await tool(token)
        .post("list_reservation_emails")
        .send({ reservationId: reservation.id });

      expect(drivers.status).toBe(200);
      expect(drivers.body.map((row) => row.name)).toEqual(["Old Driver", "Sam Driver"]);
      for (const row of drivers.body) {
        expect(Object.keys(row).sort()).toEqual(["approvedCategories", "id", "name", "status"].sort());
      }
      expect(drivers.body.find((row) => row.name === "Sam Driver").approvedCategories).toBe("Van,Car");

      expect(vehicles.status).toBe(200);
      const fleet = vehicles.body.find((row) => row.id === vehicle.id);
      expect(Object.keys(fleet).sort()).toEqual(
        ["areaAssigned", "category", "id", "licensePlateNumber", "name", "passengerCapacity", "status"].sort()
      );
      expect(fleet.licensePlateNumber).toBe("PLATE123");
      expect(JSON.stringify(fleet)).not.toContain("vin");

      const secretBlob = JSON.stringify({ drivers: drivers.body, vehicles: vehicles.body });
      expect(secretBlob).not.toContain("SECRET-LICENSE-1");
      expect(secretBlob).not.toContain("SECRET-POLICY-1");
      expect(secretBlob).not.toContain("SECRETVIN1234567");
      expect(secretBlob).not.toContain("owner-secret@eagles.oc.edu");

      expect(emails.status).toBe(200);
      expect(emails.body.map((row) => row.subject)).toEqual(["Earlier notice", "Later notice"]);
      for (const row of emails.body) {
        expect(Object.keys(row).sort()).toEqual(
          ["eventType", "recipientRole", "sentAt", "status", "subject"].sort()
        );
        expect(row.body).toBeUndefined();
        expect(row.recipientEmail).toBeUndefined();
        expect(row.event).toBeUndefined();
      }
      expect(emails.body[0].eventType).toBe("submitted");
      expect(emails.body[1].eventType).toBe("approved");
      const emailBlob = JSON.stringify(emails.body);
      expect(emailBlob).not.toContain("SECRET EMAIL BODY");
      expect(emailBlob).not.toContain("hidden-recipient@eagles.oc.edu");
      expect(emailBlob).not.toContain("another-hidden@eagles.oc.edu");

      const areas = await tool(token).post("list_areas").send({});
      expect(areas.status).toBe(200);
      expect(areas.body.find((row) => row.name === "Athletics Mail").notificationEmail).toBe(
        "athletics-notify@eagles.oc.edu"
      );
      expect(Object.keys(areas.body[0]).sort()).toEqual(["id", "name", "notificationEmail"].sort());
    });
  });

  describe("US-9.5 extra cases", () => {
    it("Legacy admin tool call returns every reservation", async () => {
      const admin = await insertLegacyAdmin({
        email: `legacy-${Date.now()}@eagles.oc.edu`,
        googleSub: null,
      });
      const { user: owner } = await signIn("requestor");
      const vehicle = await createVehicle();
      await createReservation(owner, vehicle, { areaName: "Athletics" });
      await createReservation(owner, vehicle, {
        areaName: "Support Central",
        start: new Date("2026-11-22T14:00:00.000Z"),
        end: new Date("2026-11-22T18:00:00.000Z"),
      });

      expect(manifestForRole(admin).map((entry) => entry.name)).toEqual(
        manifestForRole({ role: "system_admin" }).map((entry) => entry.name)
      );
      const res = await tool(signToolToken(admin.id)).post("list_reservations").send({});
      expect(res.status).toBe(200);
      expect(res.body.map((row) => row.areaName).sort()).toEqual(["Athletics", "Support Central"]);
    });

    it("Unknown assistant tool returns 404", async () => {
      const { user } = await signIn("system_admin");
      const res = await tool(signToolToken(user.id)).post("not_a_real_tool").send({});
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Unknown assistant tool." });
    });

    it("Wrong-audience token is rejected", async () => {
      const { user } = await signIn("requestor");
      const wrongAudience = jwt.sign({}, authConfig.secret, {
        subject: String(user.id),
        audience: "vehicle-session",
        issuer: "vehicle-scheduling-api",
        expiresIn: 120,
      });
      const wrongIssuer = jwt.sign({}, authConfig.secret, {
        subject: String(user.id),
        audience: "assistant-tools",
        issuer: "someone-else",
        expiresIn: 120,
      });

      const audience = await request(app)
        .post("/api/assistant/tools/list_drivers")
        .set("Authorization", `Bearer ${wrongAudience}`)
        .send({});
      expect(audience.status).toBe(401);
      expect(audience.body).toEqual({ message: "Unauthorized! Invalid or expired token." });

      const issuer = await request(app)
        .post("/api/assistant/tools/list_drivers")
        .set("Authorization", `Bearer ${wrongIssuer}`)
        .send({});
      expect(issuer.status).toBe(401);
      expect(issuer.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });

    it("Session token on the tool route is rejected", async () => {
      const { token } = await signIn("requestor");
      const res = await request(app)
        .post("/api/assistant/tools/list_drivers")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Unauthorized! Invalid or expired token." });

      const missing = await request(app).post("/api/assistant/tools/list_drivers").send({});
      expect(missing.status).toBe(401);
      expect(missing.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });

    it("Draft rejects an unavailable vehicle and too many passengers", async () => {
      const { user: jane } = await signIn("requestor");
      const repair = await createVehicle({ status: "in_repair", passengerCapacity: 8 });
      const retired = await createVehicle({ status: "out_of_service", passengerCapacity: 8 });
      const small = await createVehicle({ status: "available", passengerCapacity: 8 });
      const before = await db.reservation.count();
      const window = {
        destinationName: "Edmond High School",
        start: "2026-12-01T14:00:00.000Z",
        end: "2026-12-01T18:00:00.000Z",
      };

      const repairRes = await tool(signToolToken(jane.id))
        .post("draft_reservation")
        .send({ vehicleId: repair.id, ...window });
      expect(repairRes.status).toBe(400);
      expect(repairRes.body).toEqual({ message: "This vehicle is not available for reservation." });

      const retiredRes = await tool(signToolToken(jane.id))
        .post("draft_reservation")
        .send({ vehicleId: retired.id, ...window });
      expect(retiredRes.status).toBe(400);
      expect(retiredRes.body).toEqual({ message: "This vehicle is not available for reservation." });

      const over = await tool(signToolToken(jane.id))
        .post("draft_reservation")
        .send({ vehicleId: small.id, passengers: 9, ...window });
      expect(over.status).toBe(400);
      expect(over.body).toEqual({ message: "Passenger count exceeds this vehicle's capacity." });

      const exact = await tool(signToolToken(jane.id))
        .post("draft_reservation")
        .send({ vehicleId: small.id, passengers: 8, ...window });
      expect(exact.status).toBe(200);
      expect(exact.body.draft.passengers).toBe(8);
      expect(await db.reservation.count()).toBe(before);
    });

    it("Draft maps unknown vehicles to 400 and create keeps 404", async () => {
      const { token, user } = await signIn("requestor");
      const before = await db.reservation.count();
      const future = {
        destinationName: "Edmond High School",
        start: "2026-12-02T14:00:00.000Z",
        end: "2026-12-02T18:00:00.000Z",
      };

      const draft = await tool(signToolToken(user.id))
        .post("draft_reservation")
        .send({ vehicleId: 999999, ...future });
      expect(draft.status).toBe(400);
      expect(draft.body).toEqual({ message: "Vehicle not found." });

      const created = await request(app)
        .post("/api/reservations")
        .set("Authorization", `Bearer ${token}`)
        .send({ vehicleId: 999999, ...future });
      expect(created.status).toBe(404);
      expect(created.body).toEqual({ message: "Vehicle not found." });

      const longName = "D".repeat(256);
      const longDraft = await tool(signToolToken(user.id))
        .post("draft_reservation")
        .send({ vehicleId: 999999, ...future, destinationName: longName });
      expect(longDraft.status).toBe(400);
      expect(longDraft.body).toEqual({
        message: "Destination cannot be longer than 255 characters.",
      });

      const vehicle = await createVehicle();
      const maxName = "D".repeat(255);
      const maxDraft = await tool(signToolToken(user.id))
        .post("draft_reservation")
        .send({ vehicleId: vehicle.id, ...future, destinationName: maxName });
      expect(maxDraft.status).toBe(200);
      expect(maxDraft.body.draft.destinationName).toHaveLength(255);

      const longCreate = await request(app)
        .post("/api/reservations")
        .set("Authorization", `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, ...future, destinationName: longName });
      expect(longCreate.status).toBe(400);
      expect(longCreate.body).toEqual({
        message: "Destination cannot be longer than 255 characters.",
      });
      expect(await db.reservation.count()).toBe(before);
    });

    it("list_reservations rejects a bad limit or status", async () => {
      const { user } = await signIn("requestor");
      const vehicle = await createVehicle();
      const rows = [];
      for (let index = 0; index < 51; index += 1) {
        rows.push({
          requestorId: user.id,
          vehicleId: vehicle.id,
          vehicleName: "2020 Ford Transit",
          destinationName: `Trip ${index}`,
          start: new Date(Date.UTC(2026, 10, 20, 8, index)),
          end: new Date(Date.UTC(2026, 10, 20, 9, index)),
          areaName: "Athletics",
          status: "pending",
          passengers: 1,
        });
      }
      rows.push({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2020 Ford Transit",
        destinationName: "Denied trip",
        start: new Date("2026-12-01T15:00:00.000Z"),
        end: new Date("2026-12-01T16:00:00.000Z"),
        areaName: "Athletics",
        status: "denied",
        passengers: 1,
      });
      await db.reservation.bulkCreate(rows);
      const token = signToolToken(user.id);

      const defaults = await tool(token).post("list_reservations").send({});
      expect(defaults.status).toBe(200);
      expect(defaults.body).toHaveLength(25);

      const capped = await tool(token).post("list_reservations").send({ limit: 80 });
      expect(capped.status).toBe(200);
      expect(capped.body).toHaveLength(50);
      expect(capped.body[0].destinationName).toBe("Denied trip");

      const denied = await tool(token).post("list_reservations").send({ status: "denied" });
      expect(denied.status).toBe(200);
      expect(denied.body).toHaveLength(1);
      expect(denied.body[0].destinationName).toBe("Denied trip");

      const badStatus = await tool(token).post("list_reservations").send({ status: "booked" });
      expect(badStatus.status).toBe(400);
      expect(badStatus.body).toEqual({
        message: "Status must be pending, approved, denied, or cancelled.",
      });

      const zero = await tool(token).post("list_reservations").send({ limit: 0 });
      expect(zero.status).toBe(400);
      expect(zero.body).toEqual({ message: "Limit must be an integer of at least 1." });

      const badFrom = await tool(token).post("list_reservations").send({ from: "not-a-date" });
      expect(badFrom.status).toBe(400);
      expect(badFrom.body).toEqual({ message: "from must be a valid date-time." });

      const reversed = await tool(token).post("list_reservations").send({
        from: "2026-12-02T00:00:00.000Z",
        to: "2026-12-01T00:00:00.000Z",
      });
      expect(reversed.status).toBe(400);
      expect(reversed.body).toEqual({ message: "from must be on or before to." });

      const window = await tool(token).post("list_reservations").send({
        from: "2026-12-01T15:00:00.000Z",
        to: "2026-12-01T15:00:00.000Z",
      });
      expect(window.status).toBe(200);
      expect(window.body.map((row) => row.destinationName)).toEqual(["Denied trip"]);
    });

    it("Availability filters by category and passengers", async () => {
      const { user } = await signIn("requestor");
      await createVehicle({ category: "Van", passengerCapacity: 8, status: "available" });
      await createVehicle({
        category: "Car",
        passengerCapacity: 4,
        status: "available",
        make: "Honda",
        model: "Civic",
      });

      const vans = await tool(signToolToken(user.id)).post("check_vehicle_availability").send({
        start: "2026-12-03T14:00:00.000Z",
        end: "2026-12-03T18:00:00.000Z",
        category: "Van",
        passengers: 5,
      });
      expect(vans.status).toBe(200);
      expect(vans.body.every((row) => row.category === "Van")).toBe(true);
      expect(vans.body.every((row) => row.passengerCapacity >= 5)).toBe(true);
      expect(vans.body.length).toBeGreaterThan(0);

      const badCategory = await tool(signToolToken(user.id)).post("check_vehicle_availability").send({
        start: "2026-12-03T14:00:00.000Z",
        end: "2026-12-03T18:00:00.000Z",
        category: "Bus",
      });
      expect(badCategory.status).toBe(400);
      expect(badCategory.body).toEqual({
        message: "Category must be Golf Cart, Truck, Car, or Van.",
      });

      const badPassengers = await tool(signToolToken(user.id)).post("check_vehicle_availability").send({
        start: "2026-12-03T14:00:00.000Z",
        end: "2026-12-03T18:00:00.000Z",
        passengers: 0,
      });
      expect(badPassengers.status).toBe(400);
      expect(badPassengers.body).toEqual({ message: "Passengers must be a positive integer." });

      const missing = await tool(signToolToken(user.id)).post("check_vehicle_availability").send({});
      expect(missing.status).toBe(400);
      expect(missing.body).toEqual({ message: "Start and end times are required." });

      const backwards = await tool(signToolToken(user.id)).post("check_vehicle_availability").send({
        start: "2026-12-03T18:00:00.000Z",
        end: "2026-12-03T14:00:00.000Z",
      });
      expect(backwards.status).toBe(400);
      expect(backwards.body).toEqual({ message: "End time must be after start time." });
    });

    it("Requestor and maintenance see only valid drivers", async () => {
      const { user: jane } = await signIn("requestor");
      const { user: maint } = await signIn("maintenance");
      await db.driver.create({
        firstName: "Valid",
        lastName: "Driver",
        driverLicenseNumber: "L1",
        driverLicenseExpDate: "2030-01-01",
        insuranceProvider: "Acme",
        insuranceNumber: "P1",
        approvedDate: "2026-01-01",
        approvedCategories: "Van",
        status: "valid",
      });
      await db.driver.create({
        firstName: "Expired",
        lastName: "Driver",
        driverLicenseNumber: "L2",
        driverLicenseExpDate: "2020-01-01",
        insuranceProvider: "Acme",
        insuranceNumber: "P2",
        approvedDate: "2020-01-01",
        approvedCategories: "Van",
        status: "expired",
      });

      const requestor = await tool(signToolToken(jane.id)).post("list_drivers").send({});
      const maintenance = await tool(signToolToken(maint.id)).post("list_drivers").send({});
      expect(requestor.status).toBe(200);
      expect(maintenance.status).toBe(200);
      expect(requestor.body.map((row) => row.name)).toEqual(["Valid Driver"]);
      expect(maintenance.body.map((row) => row.name)).toEqual(["Valid Driver"]);
    });
  });
});
