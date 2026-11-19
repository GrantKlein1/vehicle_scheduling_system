/**
 * Feature 9 — AI Assistant trip form
 * Spec: features/feature-9-ai-assistant.md
 */
import { jest } from "@jest/globals";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { resetAssistantRateLimit } from "../app/assistant/rateLimit.js";
import { createArea, createSession, createUser, syncTestDatabase } from "./helpers.js";

const WINDOW = {
  start: "2026-12-02T14:00:00.000Z",
  end: "2026-12-02T18:00:00.000Z",
};

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

function postTrip(token, body) {
  const req = request(app).post("/api/assistant/trip");
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send(body);
}

describe("Feature 9 — trip form", () => {
  beforeEach(async () => {
    resetAssistantRateLimit();
    await syncTestDatabase();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Requires destination, vehicle type, and passengers", async () => {
    const { token } = await signIn("requestor");
    const destination = await postTrip(token, { ...WINDOW, category: "Van", passengers: 2 });
    expect(destination.status).toBe(400);
    expect(destination.body.message).toBe("Destination is required.");

    const category = await postTrip(token, {
      ...WINDOW,
      destinationName: "Memorial Road",
      passengers: 2,
    });
    expect(category.status).toBe(400);
    expect(category.body.message).toBe("Vehicle type is required.");

    const passengers = await postTrip(token, {
      ...WINDOW,
      destinationName: "Memorial Road",
      category: "Van",
    });
    expect(passengers.status).toBe(400);
    expect(passengers.body.message).toBe("Passengers are required.");
  });

  it("Lists only the requested vehicle type and drafts that destination", async () => {
    const { token } = await signIn("requestor");
    const van = await createVehicle();
    await createVehicle({ category: "Car", make: "Toyota", model: "Camry", passengerCapacity: 5 });

    const found = await postTrip(token, {
      ...WINDOW,
      destinationName: "Memorial Road",
      category: "Van",
      passengers: 4,
    });
    expect(found.status).toBe(200);
    expect(found.body.draft).toBeNull();
    expect(found.body.vehicles.map((vehicle) => vehicle.id)).toEqual([van.id]);
    expect(await db.reservation.count()).toBe(0);

    const drafted = await postTrip(token, {
      ...WINDOW,
      destinationName: "Memorial Road",
      category: "Van",
      passengers: 4,
      vehicleId: van.id,
    });
    expect(drafted.status).toBe(200);
    expect(drafted.body.draft.destinationName).toBe("Memorial Road");
    expect(drafted.body.draft.passengers).toBe(4);
    expect(drafted.body.draft.vehicleId).toBe(van.id);
    expect(await db.reservation.count()).toBe(0);
  });

  it("Rejects a vehicle outside the requested type", async () => {
    const { token } = await signIn("requestor");
    const car = await createVehicle({ category: "Car", make: "Toyota", model: "Camry" });
    const res = await postTrip(token, {
      ...WINDOW,
      destinationName: "Memorial Road",
      category: "Van",
      passengers: 2,
      vehicleId: car.id,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("That vehicle is not available for this trip.");
    expect(await db.reservation.count()).toBe(0);
  });

  it("Maintenance cannot plan a trip", async () => {
    const { token } = await signIn("maintenance");
    const res = await postTrip(token, {
      ...WINDOW,
      destinationName: "Memorial Road",
      category: "Van",
      passengers: 2,
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("You do not have access to this information.");
  });
});
