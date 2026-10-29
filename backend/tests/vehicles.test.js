/**
 * Feature 2 — Vehicle Management
 * Spec: features/feature-2-vehicle-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { createSession, createUser, syncTestDatabase } from "./helpers.js";

function vehicleBody(overrides = {}) {
  return {
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
    ...overrides,
  };
}

async function signIn(role) {
  const user = await createUser({
    role,
    email: `${role}@eagles.oc.edu`,
    googleSub: `google-sub-${role}`,
  });
  const session = await createSession(user);
  return session.token;
}

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function seedVehicleFour() {
  await db.vehicle.bulkCreate([
    vehicleBody({ vin: "1FTFW1E50NFA00002", licensePlateNumber: "P1" }),
    vehicleBody({ vin: "1FTFW1E50NFA00003", licensePlateNumber: "P2" }),
    vehicleBody({ vin: "1FTFW1E50NFA00004", licensePlateNumber: "P3" }),
    vehicleBody(),
  ]);
}

function authed(token) {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    get: (url) => request(app).get(url).set(headers),
    post: (url) => request(app).post(url).set(headers),
    put: (url) => request(app).put(url).set(headers),
    patch: (url) => request(app).patch(url).set(headers),
    delete: (url) => request(app).delete(url).set(headers),
  };
}

describe("Feature 2 — Vehicle Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-2.2 — Create Vehicle", () => {
    it("Signed-in admin creates a new vehicle", async () => {
      const token = await signIn("admin");

      const response = await authed(token).post("/api/vehicle/vehicles").send(vehicleBody());

      expect(response.status).toBe(201);
      expect(response.body.make).toBe("Ford");
      expect(response.body.model).toBe("F-150");
      expect(response.body.category).toBe("Truck");
      expect(response.body.userId).toBeUndefined();
    });

    it("Create without VIN is rejected", async () => {
      const token = await signIn("admin");
      const body = vehicleBody();
      delete body.vin;

      const response = await authed(token).post("/api/vehicle/vehicles").send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "VIN cannot be empty." });
    });

    it("Create with a duplicate VIN is rejected", async () => {
      const token = await signIn("admin");
      await db.vehicle.create(vehicleBody());

      const response = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(vehicleBody({ licensePlateNumber: "OC2002" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "VIN already exists." });
    });

    it("Golf cart is stored without VIN or license plate", async () => {
      const token = await signIn("admin");
      const golfCart = vehicleBody({
        category: "Golf Cart",
        make: "Club Car",
        model: "Onward",
        vin: "SHOULD-BE-DROPPED",
        licensePlateNumber: "NO-PLATE",
        licensePlateExpirationMonth: 9,
      });

      const first = await authed(token).post("/api/vehicle/vehicles").send(golfCart);
      const second = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(
          vehicleBody({
            category: "Golf Cart",
            make: "Yamaha",
            model: "Drive2",
            vin: undefined,
            licensePlateNumber: undefined,
            licensePlateExpirationMonth: undefined,
          })
        );

      expect(first.status).toBe(201);
      expect(first.body).toEqual(
        expect.objectContaining({
          category: "Golf Cart",
          vin: null,
          licensePlateNumber: null,
          licensePlateExpirationMonth: null,
        })
      );
      expect(second.status).toBe(201);
      expect(second.body.vin).toBeNull();
      expect(second.body.licensePlateNumber).toBeNull();
    });

    it("Create with a duplicate license plate is rejected", async () => {
      const token = await signIn("admin");
      await db.vehicle.create(vehicleBody());

      const response = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(vehicleBody({ vin: "1FTFW1E50NFA00002" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "License Plate Number already exists." });
    });

    it("Create with an invalid VIN is rejected", async () => {
      const token = await signIn("admin");

      const response = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(vehicleBody({ vin: "1FTFW1E50NFA0000I" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "VIN must be a valid 17-character VIN." });
      expect(await db.vehicle.count()).toBe(0);
    });

    it("Create with an invalid license plate is rejected", async () => {
      const token = await signIn("admin");

      const response = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(vehicleBody({ licensePlateNumber: "OC-1001" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "License Plate Number must be 2 to 8 letters or digits.",
      });
      expect(await db.vehicle.count()).toBe(0);
    });

    it("Create with a future purchased date is rejected", async () => {
      const token = await signIn("admin");

      const response = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(vehicleBody({ purchasedDate: "2099-01-01" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Date cannot be in the future." });
      expect(await db.vehicle.count()).toBe(0);
    });

    it("Create with the current day as purchased date is accepted", async () => {
      const token = await signIn("admin");

      const response = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(vehicleBody({ purchasedDate: localToday() }));

      expect(response.status).toBe(201);
      expect(response.body.purchasedDate).toBe(localToday());
    });

    it("Create with a make and model that are not on the standard list", async () => {
      const token = await signIn("admin");

      const response = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(
          vehicleBody({
            category: "Car",
            make: "Tesla",
            model: "Model 3",
            vin: "5YJ3E1EA7KF000001",
            licensePlateNumber: "OC3003",
          })
        );

      expect(response.status).toBe(201);
      expect(response.body.make).toBe("Tesla");
      expect(response.body.model).toBe("Model 3");
    });

    it("Supplied userId is ignored", async () => {
      const token = await signIn("admin");

      const response = await authed(token)
        .post("/api/vehicle/vehicles")
        .send({ ...vehicleBody(), userId: 99 });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBeUndefined();

      const columns = await db.sequelize.getQueryInterface().describeTable("vehicles");
      expect(columns.userId).toBeUndefined();
      const stored = await db.vehicle.findByPk(response.body.id);
      expect(stored.toJSON().userId).toBeUndefined();
    });
  });

  describe("US-2.3 — Read Vehicle Catalog", () => {
    it("Signed-in admin views the vehicle catalog", async () => {
      const token = await signIn("admin");
      await db.vehicle.create(
        vehicleBody({
          category: "Car",
          make: "Chevrolet",
          model: "Malibu",
          vin: "1G1ZD5ST5NF000001",
          licensePlateNumber: "OC4004",
        })
      );
      await db.vehicle.create(vehicleBody());

      const response = await authed(token).get("/api/vehicle/vehicles");

      expect(response.status).toBe(200);
      const labels = response.body.map((vehicle) => `${vehicle.make} ${vehicle.model}`);
      expect(labels).toEqual(expect.arrayContaining(["Chevrolet Malibu", "Ford F-150"]));
    });

    it("Vehicle list is sorted by make", async () => {
      const token = await signIn("admin");
      await db.vehicle.create(vehicleBody());
      await db.vehicle.create(
        vehicleBody({
          category: "Car",
          make: "Chevrolet",
          model: "Malibu",
          vin: "1G1ZD5ST5NF000001",
          licensePlateNumber: "OC4004",
        })
      );

      const response = await authed(token).get("/api/vehicle/vehicles");

      expect(response.status).toBe(200);
      expect(response.body.map((vehicle) => `${vehicle.make} ${vehicle.model}`)).toEqual([
        "Chevrolet Malibu",
        "Ford F-150",
      ]);
    });

    it("Maintenance views logs for a vehicle", async () => {
      const token = await signIn("maintenance");
      await seedVehicleFour();
      await db.mileageLog.create({
        vehicleId: 4,
        entryDate: "2026-10-01",
        currentMileage: 15000,
      });
      await db.serviceLog.create({
        vehicleId: 4,
        entryDate: "2026-09-01",
        servicePerformed: "Oil change",
      });

      const response = await authed(token).get("/api/vehicle/vehicles/4");

      expect(response.status).toBe(200);
      expect(response.body.mileageLogs).toEqual([
        expect.objectContaining({
          vehicleId: 4,
          entryDate: "2026-10-01",
          currentMileage: 15000,
        }),
      ]);
      expect(response.body.serviceLogs).toEqual([
        expect.objectContaining({
          vehicleId: 4,
          entryDate: "2026-09-01",
          servicePerformed: "Oil change",
        }),
      ]);
    });
  });

  describe("US-2.5 — Edit Vehicle", () => {
    it("Signed-in admin updates vehicle details", async () => {
      const token = await signIn("admin");
      const vehicle = await db.vehicle.create(vehicleBody({ color: "White" }));

      const response = await authed(token)
        .put(`/api/vehicle/vehicles/${vehicle.id}`)
        .send(vehicleBody({ color: "Blue" }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Vehicle was updated successfully." });
      const stored = await db.vehicle.findByPk(vehicle.id);
      expect(stored.color).toBe("Blue");
    });

    it("Update of an unknown vehicle is rejected", async () => {
      const token = await signIn("admin");

      const response = await authed(token).put("/api/vehicle/vehicles/9999").send(vehicleBody());

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle with id=9999 not found." });
    });
  });

  describe("US-2.6 — Delete Vehicle", () => {
    it("Signed-in admin deletes a vehicle with confirmation", async () => {
      const token = await signIn("admin");
      const vehicle = await db.vehicle.create(vehicleBody());
      await db.mileageLog.create({
        vehicleId: vehicle.id,
        entryDate: "2026-10-01",
        currentMileage: 15000,
      });
      await db.serviceLog.create({
        vehicleId: vehicle.id,
        entryDate: "2026-09-01",
        servicePerformed: "Oil change",
      });

      const response = await authed(token).delete(`/api/vehicle/vehicles/${vehicle.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Vehicle was deleted successfully!" });
      expect(await db.vehicle.findByPk(vehicle.id)).toBeNull();
      expect(await db.mileageLog.count({ where: { vehicleId: vehicle.id } })).toBe(0);
      expect(await db.serviceLog.count({ where: { vehicleId: vehicle.id } })).toBe(0);
    });
  });

  describe("US-2.7 — Role-Based Access Control", () => {
    it("Requestor vehicle access is restricted", async () => {
      const token = await signIn("requestor");
      const vehicle = await db.vehicle.create(vehicleBody());
      const before = vehicle.toJSON();

      const calls = [
        authed(token).get("/api/vehicle/vehicles"),
        authed(token).post("/api/vehicle/vehicles").send(vehicleBody({ vin: "1FTFW1E50NFA00009", licensePlateNumber: "NEW1" })),
        authed(token).put(`/api/vehicle/vehicles/${vehicle.id}`).send(vehicleBody({ color: "Blue" })),
        authed(token).delete(`/api/vehicle/vehicles/${vehicle.id}`),
        authed(token)
          .post(`/api/vehicle/vehicles/${vehicle.id}/mileage-logs`)
          .send({ entryDate: "2026-10-01", currentMileage: 15000 }),
        authed(token)
          .post(`/api/vehicle/vehicles/${vehicle.id}/service-logs`)
          .send({ entryDate: "2026-09-01", servicePerformed: "Oil change" }),
        authed(token)
          .patch(`/api/vehicle/vehicles/${vehicle.id}/service-logs/1`)
          .send({ comments: "Note" }),
      ];

      for (const call of calls) {
        const response = await call;
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "Admin role required." });
      }

      const stored = await db.vehicle.findByPk(vehicle.id);
      expect(stored.toJSON()).toEqual(before);
      expect(await db.mileageLog.count()).toBe(0);
      expect(await db.serviceLog.count()).toBe(0);
      expect(await db.vehicle.count()).toBe(1);
    });

    it("Maintenance cannot create, update, or delete a vehicle", async () => {
      const token = await signIn("maintenance");
      const vehicle = await db.vehicle.create(vehicleBody());
      const before = vehicle.toJSON();

      const writes = [
        authed(token).post("/api/vehicle/vehicles").send(vehicleBody({ vin: "1FTFW1E50NFA00009", licensePlateNumber: "NEW1" })),
        authed(token).put(`/api/vehicle/vehicles/${vehicle.id}`).send(vehicleBody({ color: "Blue" })),
        authed(token).delete(`/api/vehicle/vehicles/${vehicle.id}`),
      ];

      for (const call of writes) {
        const response = await call;
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "Admin role required." });
      }

      const stored = await db.vehicle.findByPk(vehicle.id);
      expect(stored.toJSON()).toEqual(before);
      expect(await db.vehicle.count()).toBe(1);

      const list = await authed(token).get("/api/vehicle/vehicles");
      expect(list.status).toBe(200);
    });

    it("System admin can read and create vehicles", async () => {
      const token = await signIn("system_admin");

      const created = await authed(token).post("/api/vehicle/vehicles").send(vehicleBody());
      expect(created.status).toBe(201);

      const list = await authed(token).get("/api/vehicle/vehicles");
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
    });

    it("Unauthenticated visit to the vehicle page redirects to login", async () => {
      const response = await request(app).get("/api/vehicle/vehicles");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });

  describe("US-2.8 — Log Mileage and Service", () => {
    it("Maintenance logs mileage on a vehicle", async () => {
      const token = await signIn("maintenance");
      const vehicle = await db.vehicle.create(vehicleBody());

      const response = await authed(token)
        .post(`/api/vehicle/vehicles/${vehicle.id}/mileage-logs`)
        .send({ entryDate: "2026-10-01", currentMileage: 15000 });

      expect(response.status).toBe(201);
      expect(response.body.currentMileage).toBe(15000);
      expect(response.body.vehicleId).toBe(vehicle.id);
      expect(response.body.entryDate).toBe("2026-10-01");
    });

    it("Maintenance logs a service on a vehicle", async () => {
      const token = await signIn("maintenance");
      const vehicle = await db.vehicle.create(vehicleBody());

      const response = await authed(token)
        .post(`/api/vehicle/vehicles/${vehicle.id}/service-logs`)
        .send({ entryDate: "2026-09-01", servicePerformed: "Oil change" });

      expect(response.status).toBe(201);
      expect(response.body.servicePerformed).toBe("Oil change");
      expect(response.body.comments).toBeNull();
      expect(response.body.vehicleId).toBe(vehicle.id);
      expect(response.body.entryDate).toBe("2026-09-01");
    });

    it("Mileage log without current mileage is rejected", async () => {
      const token = await signIn("maintenance");
      await seedVehicleFour();

      const response = await authed(token)
        .post("/api/vehicle/vehicles/4/mileage-logs")
        .send({ entryDate: "2026-10-01" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Current mileage must be zero or greater." });
    });

    it("Mileage that is not above the previous mileage is rejected", async () => {
      const token = await signIn("maintenance");
      const vehicle = await db.vehicle.create(vehicleBody());

      const first = await authed(token)
        .post(`/api/vehicle/vehicles/${vehicle.id}/mileage-logs`)
        .send({ entryDate: "2026-10-01", currentMileage: 15000 });
      expect(first.status).toBe(201);

      const same = await authed(token)
        .post(`/api/vehicle/vehicles/${vehicle.id}/mileage-logs`)
        .send({ entryDate: "2026-10-02", currentMileage: 15000 });
      expect(same.status).toBe(400);
      expect(same.body).toEqual({
        message: "Current mileage must be greater than the previous mileage of 15000.",
      });

      const lower = await authed(token)
        .post(`/api/vehicle/vehicles/${vehicle.id}/mileage-logs`)
        .send({ entryDate: "2026-10-03", currentMileage: 14999 });
      expect(lower.status).toBe(400);
      expect(lower.body).toEqual({
        message: "Current mileage must be greater than the previous mileage of 15000.",
      });

      const higher = await authed(token)
        .post(`/api/vehicle/vehicles/${vehicle.id}/mileage-logs`)
        .send({ entryDate: "2026-10-04", currentMileage: 15001 });
      expect(higher.status).toBe(201);
      expect(higher.body.currentMileage).toBe(15001);
      expect(await db.mileageLog.count({ where: { vehicleId: vehicle.id } })).toBe(2);
    });

    it("Maintenance logs a custom service on a vehicle", async () => {
      const token = await signIn("maintenance");
      const vehicle = await db.vehicle.create(vehicleBody());

      const response = await authed(token)
        .post(`/api/vehicle/vehicles/${vehicle.id}/service-logs`)
        .send({ entryDate: "2026-09-01", servicePerformed: "Windshield chip repair" });

      expect(response.status).toBe(201);
      expect(response.body.servicePerformed).toBe("Windshield chip repair");
      expect(response.body.comments).toBeNull();
    });

    it("Maintenance logs a service with a comment", async () => {
      const token = await signIn("maintenance");
      const vehicle = await db.vehicle.create(vehicleBody());

      const response = await authed(token)
        .post(`/api/vehicle/vehicles/${vehicle.id}/service-logs`)
        .send({
          entryDate: "2026-09-01",
          servicePerformed: "Tire rotation",
          comments: "  Rotated front to back.  ",
        });

      expect(response.status).toBe(201);
      expect(response.body.servicePerformed).toBe("Tire rotation");
      expect(response.body.comments).toBe("Rotated front to back.");
    });

    it("Service log with a too-long service name is rejected", async () => {
      const token = await signIn("maintenance");
      await seedVehicleFour();

      const response = await authed(token)
        .post("/api/vehicle/vehicles/4/service-logs")
        .send({ entryDate: "2026-09-01", servicePerformed: "x".repeat(81) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Service performed cannot exceed 80 characters." });
      expect(await db.serviceLog.count()).toBe(0);
    });

    it("Maintenance adds a comment to an existing service", async () => {
      const token = await signIn("maintenance");
      const vehicle = await db.vehicle.create(vehicleBody());
      const log = await db.serviceLog.create({
        vehicleId: vehicle.id,
        entryDate: "2026-09-01",
        servicePerformed: "Oil change",
      });

      const response = await authed(token)
        .patch(`/api/vehicle/vehicles/${vehicle.id}/service-logs/${log.id}`)
        .send({ comments: "Used 5W-30." });

      expect(response.status).toBe(200);
      expect(response.body.comments).toBe("Used 5W-30.");
      expect(response.body.servicePerformed).toBe("Oil change");

      const cleared = await authed(token)
        .patch(`/api/vehicle/vehicles/${vehicle.id}/service-logs/${log.id}`)
        .send({ comments: "   " });
      expect(cleared.status).toBe(200);
      expect(cleared.body.comments).toBeNull();
    });

    it("Service comment that is too long is rejected", async () => {
      const token = await signIn("maintenance");
      const vehicle = await db.vehicle.create(vehicleBody());
      const log = await db.serviceLog.create({
        vehicleId: vehicle.id,
        entryDate: "2026-09-01",
        servicePerformed: "Oil change",
        comments: "Keep this.",
      });

      const response = await authed(token)
        .patch(`/api/vehicle/vehicles/${vehicle.id}/service-logs/${log.id}`)
        .send({ comments: "x".repeat(501) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Comments cannot exceed 500 characters." });
      const stored = await db.serviceLog.findByPk(log.id);
      expect(stored.comments).toBe("Keep this.");
    });

    it("Comment update for an unknown service log is rejected", async () => {
      const token = await signIn("maintenance");
      await seedVehicleFour();

      const response = await authed(token)
        .patch("/api/vehicle/vehicles/4/service-logs/9999")
        .send({ comments: "Note" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Service log with id=9999 not found." });
    });

    it("Mileage log with a future date is rejected", async () => {
      const token = await signIn("maintenance");
      await seedVehicleFour();

      const response = await authed(token)
        .post("/api/vehicle/vehicles/4/mileage-logs")
        .send({ entryDate: "2099-01-01", currentMileage: 15000 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Date cannot be in the future." });
      expect(await db.mileageLog.count()).toBe(0);
    });

    it("Mileage log for the current day is accepted", async () => {
      const token = await signIn("maintenance");
      await seedVehicleFour();
      const today = localToday();

      const response = await authed(token)
        .post("/api/vehicle/vehicles/4/mileage-logs")
        .send({ entryDate: today, currentMileage: 15000 });

      expect(response.status).toBe(201);
      expect(response.body.entryDate).toBe(today);
    });

    it("Service log with a future date is rejected", async () => {
      const token = await signIn("maintenance");
      await seedVehicleFour();

      const response = await authed(token)
        .post("/api/vehicle/vehicles/4/service-logs")
        .send({ entryDate: "2099-01-01", servicePerformed: "Oil change" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Date cannot be in the future." });
      expect(await db.serviceLog.count()).toBe(0);
    });

    it("Service log for the current day is accepted", async () => {
      const token = await signIn("maintenance");
      await seedVehicleFour();
      const today = localToday();

      const response = await authed(token)
        .post("/api/vehicle/vehicles/4/service-logs")
        .send({ entryDate: today, servicePerformed: "Oil change" });

      expect(response.status).toBe(201);
      expect(response.body.entryDate).toBe(today);
    });

    it("Mileage log for an unknown vehicle is rejected", async () => {
      const token = await signIn("maintenance");

      const response = await authed(token)
        .post("/api/vehicle/vehicles/9999/mileage-logs")
        .send({ entryDate: "2026-10-01", currentMileage: 15000 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle with id=9999 not found." });
    });

    it("Requestor cannot log mileage", async () => {
      const token = await signIn("requestor");
      await seedVehicleFour();

      const response = await authed(token)
        .post("/api/vehicle/vehicles/4/mileage-logs")
        .send({ entryDate: "2026-10-01", currentMileage: 15000 });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin role required." });
      expect(await db.mileageLog.count()).toBe(0);
    });
  });

  describe("Vehicle status", () => {
    it("Vehicle status is stored, updated, and shown", async () => {
      const token = await signIn("admin");

      const created = await authed(token).post("/api/vehicle/vehicles").send(vehicleBody());
      expect(created.status).toBe(201);
      expect(created.body.status).toBe("available");

      const blank = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(
          vehicleBody({
            status: "   ",
            vin: "1FTFW1E50NFA00008",
            licensePlateNumber: "OC8008",
          })
        );
      expect(blank.status).toBe(201);
      expect(blank.body.status).toBe("available");

      const supplied = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(
          vehicleBody({
            status: " checked_out ",
            vin: "1FTFW1E50NFA00002",
            licensePlateNumber: "OC2002",
          })
        );
      expect(supplied.status).toBe(201);
      expect(supplied.body.status).toBe("checked_out");

      const rejected = await authed(token)
        .post("/api/vehicle/vehicles")
        .send(
          vehicleBody({
            status: "reserved",
            vin: "1FTFW1E50NFA00003",
            licensePlateNumber: "OC3003",
          })
        );
      expect(rejected.status).toBe(400);
      expect(rejected.body).toEqual({
        message: "Status must be available, checked_out, in_repair, or out_of_service.",
      });

      const list = await authed(token).get("/api/vehicle/vehicles");
      expect(list.status).toBe(200);
      expect(list.body.find((vehicle) => vehicle.id === supplied.body.id).status).toBe("checked_out");

      const fetched = await authed(token).get(`/api/vehicle/vehicles/${supplied.body.id}`);
      expect(fetched.status).toBe(200);
      expect(fetched.body.status).toBe("checked_out");

      const updated = await authed(token)
        .put(`/api/vehicle/vehicles/${supplied.body.id}`)
        .send(
          vehicleBody({
            status: "in_repair",
            vin: "1FTFW1E50NFA00002",
            licensePlateNumber: "OC2002",
          })
        );
      expect(updated.status).toBe(200);
      expect((await db.vehicle.findByPk(supplied.body.id)).status).toBe("in_repair");

      const preserved = await authed(token)
        .put(`/api/vehicle/vehicles/${supplied.body.id}`)
        .send(
          vehicleBody({
            color: "Blue",
            vin: "1FTFW1E50NFA00002",
            licensePlateNumber: "OC2002",
          })
        );
      expect(preserved.status).toBe(200);
      const stored = await db.vehicle.findByPk(supplied.body.id);
      expect(stored.status).toBe("in_repair");
      expect(stored.color).toBe("Blue");
    });

    it("Adds status when an existing vehicles table does not have the column", async () => {
      await db.vehicle.create(vehicleBody());
      await db.sequelize.getQueryInterface().removeColumn("vehicles", "status");

      await db.backfillVehicleStatuses();

      const columns = await db.sequelize.getQueryInterface().describeTable("vehicles");
      expect(columns.status.allowNull).toBe(false);
      const stored = await db.vehicle.findAll();
      expect(stored).toHaveLength(1);
      expect(stored[0].status).toBe("available");
    });

    it("Blank vehicle status is backfilled to available", async () => {
      const blank = await db.vehicle.create(vehicleBody());
      const kept = await db.vehicle.create(
        vehicleBody({
          vin: "1FTFW1E50NFA00002",
          licensePlateNumber: "OC2002",
          status: "out_of_service",
        })
      );
      await db.sequelize.query("UPDATE vehicles SET status = '' WHERE id = :id", {
        replacements: { id: blank.id },
      });

      await db.backfillVehicleStatuses();

      expect((await db.vehicle.findByPk(blank.id)).status).toBe("available");
      expect((await db.vehicle.findByPk(kept.id)).status).toBe("out_of_service");

      const columns = await db.sequelize.getQueryInterface().describeTable("vehicles");
      expect(columns.status.allowNull).toBe(false);
      expect(String(columns.status.defaultValue ?? "").replace(/'/g, "")).toBe("available");
    });
  });
});
