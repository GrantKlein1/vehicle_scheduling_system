/**
 * Feature 3 — Driver Management
 * Spec: features/feature-3-driver-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  addCalendarYears,
  localToday,
  statusForApprovedDate,
} from "../app/controllers/driver.controller.js";
import { createArea, createSession, createUser, syncTestDatabase } from "./helpers.js";

function driverBody(overrides = {}) {
  return {
    firstName: "Jaxen",
    lastName: "Roden",
    driverLicenseNumber: "11111111",
    driverLicenseExpDate: "2030-09-20",
    insuranceProvider: "root",
    insuranceNumber: "11111111",
    approvedDate: localToday(),
    status: "valid",
    ...overrides,
  };
}

function amyAdams(overrides = {}) {
  return driverBody({
    firstName: "Amy",
    lastName: "Adams",
    driverLicenseNumber: "22222222",
    insuranceNumber: "22222222",
    ...overrides,
  });
}

async function signIn(role) {
  const overrides = {
    role,
    email: `${role}@eagles.oc.edu`,
    googleSub: `google-sub-${role}`,
  };

  if (role === "area_admin") {
    const area = await createArea("Athletics");
    overrides.areaId = area.id;
  }

  const user = await createUser(overrides);
  const session = await createSession(user);
  return session.token;
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

function fullName(driver) {
  return `${driver.firstName} ${driver.lastName}`;
}

describe("Feature 3 — Driver Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-3.1 — View Driver List Page", () => {
    it("Area admin sees every driver", async () => {
      const token = await signIn("area_admin");
      await db.driver.create(driverBody());
      await db.driver.create(
        amyAdams({
          approvedDate: addCalendarYears(localToday(), -2),
          status: "expired",
        })
      );

      const response = await authed(token).get("/api/driver/drivers");

      expect(response.status).toBe(200);
      const names = response.body.map(fullName);
      expect(names).toContain("Jaxen Roden");
      expect(names).toContain("Amy Adams");
      expect(response.body.find((driver) => fullName(driver) === "Amy Adams").status).toBe(
        "expired"
      );
    });

    it("System admin sees expired drivers", async () => {
      const token = await signIn("system_admin");
      await db.driver.create(driverBody());
      await db.driver.create(
        amyAdams({
          approvedDate: addCalendarYears(localToday(), -2),
          status: "expired",
        })
      );

      const response = await authed(token).get("/api/driver/drivers");

      expect(response.status).toBe(200);
      const names = response.body.map(fullName);
      expect(names).toContain("Jaxen Roden");
      expect(names).toContain("Amy Adams");
      expect(response.body.find((driver) => fullName(driver) === "Amy Adams").status).toBe(
        "expired"
      );
    });

    it("Maintenance list omits expired drivers", async () => {
      const token = await signIn("maintenance");
      await db.driver.create(driverBody());
      const expired = await db.driver.create(
        amyAdams({
          approvedDate: addCalendarYears(localToday(), -2),
          status: "valid",
        })
      );

      const response = await authed(token).get("/api/driver/drivers");

      expect(response.status).toBe(200);
      expect(response.body.map(fullName)).toEqual(["Jaxen Roden"]);
      const stored = await db.driver.findByPk(expired.id);
      expect(stored.status).toBe("expired");
    });

    it("Driver list is sorted by last name", async () => {
      const token = await signIn("system_admin");
      await db.driver.create(driverBody());
      await db.driver.create(amyAdams());

      const response = await authed(token).get("/api/driver/drivers");

      expect(response.status).toBe(200);
      const names = response.body.map(fullName);
      expect(names.indexOf("Amy Adams")).toBeLessThan(names.indexOf("Jaxen Roden"));
    });

    it("Drivers who share a last name are sorted by first name", async () => {
      const token = await signIn("system_admin");
      await db.driver.create(driverBody());
      await db.driver.create(
        driverBody({
          firstName: "Amy",
          driverLicenseNumber: "33333333",
          insuranceNumber: "33333333",
        })
      );

      const response = await authed(token).get("/api/driver/drivers");

      expect(response.status).toBe(200);
      const names = response.body.map(fullName);
      expect(names.indexOf("Amy Roden")).toBeLessThan(names.indexOf("Jaxen Roden"));
    });
  });

  describe("US-3.2 — Create Driver", () => {
    it("Signed-in system admin creates a new driver", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token).post("/api/driver/drivers").send(driverBody());

      expect(response.status).toBe(201);
      expect(response.body.lastName).toBe("Roden");
      expect(response.body.status).toBe("valid");
      expect(response.body.userId).toBeUndefined();
    });

    it("Signed-in area admin creates a new driver", async () => {
      const token = await signIn("area_admin");

      const response = await authed(token).post("/api/driver/drivers").send(amyAdams());

      expect(response.status).toBe(201);
      expect(response.body.lastName).toBe("Adams");
      expect(response.body.status).toBe("valid");
      expect(response.body.userId).toBeUndefined();
    });

    it("Create without last name is rejected", async () => {
      const token = await signIn("system_admin");
      const body = driverBody();
      delete body.lastName;

      const response = await authed(token).post("/api/driver/drivers").send(body);

      expect(response.status).toBe(400);
      expect(await db.driver.count()).toBe(0);
    });

    it("Create with a last name that is too long is rejected", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token)
        .post("/api/driver/drivers")
        .send(driverBody({ lastName: "R".repeat(51) }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Last Name cannot exceed 50 characters." });
      expect(await db.driver.count()).toBe(0);
    });

    it("Supplied status is ignored", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token)
        .post("/api/driver/drivers")
        .send(driverBody({ status: "suspended" }));

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("valid");
      const stored = await db.driver.findByPk(response.body.id);
      expect(stored.status).toBe("valid");
    });

    it("Driver status expires one year after the approved date", async () => {
      const token = await signIn("system_admin");
      expect(statusForApprovedDate("2025-10-30", "2026-10-29")).toBe("valid");
      expect(statusForApprovedDate("2025-10-30", "2026-10-30")).toBe("expired");
      expect(statusForApprovedDate("2024-02-29", "2025-02-28")).toBe("valid");
      expect(statusForApprovedDate("2024-02-29", "2025-03-01")).toBe("expired");

      const expired = await authed(token)
        .post("/api/driver/drivers")
        .send(driverBody({ approvedDate: addCalendarYears(localToday(), -2), status: "valid" }));

      expect(expired.status).toBe(201);
      expect(expired.body.status).toBe("expired");

      const current = await authed(token)
        .post("/api/driver/drivers")
        .send(
          driverBody({
            firstName: "Amy",
            lastName: "Adams",
            driverLicenseNumber: "22222222",
            insuranceNumber: "22222222",
            approvedDate: localToday(),
            status: "expired",
          })
        );

      expect(current.status).toBe(201);
      expect(current.body.status).toBe("valid");
    });

    it("Listing drivers refreshes a status that has reached its anniversary", async () => {
      const token = await signIn("system_admin");
      const driver = await db.driver.create(
        driverBody({
          approvedDate: addCalendarYears(localToday(), -2),
          status: "valid",
        })
      );

      const response = await authed(token).get("/api/driver/drivers");

      expect(response.status).toBe(200);
      expect(response.body[0].status).toBe("expired");
      const stored = await db.driver.findByPk(driver.id);
      expect(stored.status).toBe("expired");
    });

    it("Create with an invalid expiration date is rejected", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token)
        .post("/api/driver/drivers")
        .send(driverBody({ driverLicenseExpDate: "2030-13-40" }));

      expect(response.status).toBe(400);
      expect(await db.driver.count()).toBe(0);
    });

    it("Two drivers may share a last name", async () => {
      const token = await signIn("system_admin");
      await db.driver.create(driverBody());

      const response = await authed(token)
        .post("/api/driver/drivers")
        .send(
          driverBody({
            firstName: "Amy",
            driverLicenseNumber: "44444444",
            insuranceNumber: "44444444",
          })
        );

      expect(response.status).toBe(201);
    });

    it("Supplied userId is ignored", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token)
        .post("/api/driver/drivers")
        .send({ ...driverBody(), userId: 99 });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBeUndefined();

      const columns = await db.sequelize.getQueryInterface().describeTable("drivers");
      expect(columns.userId).toBeUndefined();
      const stored = await db.driver.findByPk(response.body.id);
      expect(stored.toJSON().userId).toBeUndefined();
    });

    it("Input strings are trimmed", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token)
        .post("/api/driver/drivers")
        .send(driverBody({ firstName: " Jaxen " }));

      expect(response.status).toBe(201);
      expect(response.body.firstName).toBe("Jaxen");
    });
  });

  describe("US-3.4 — Edit Driver", () => {
    it("Signed-in system admin updates driver details", async () => {
      const token = await signIn("system_admin");
      const driver = await db.driver.create(driverBody());

      const response = await authed(token)
        .put(`/api/driver/drivers/${driver.id}`)
        .send(
          driverBody({
            driverLicenseExpDate: "2031-01-15",
            approvedDate: addCalendarYears(localToday(), -2),
            status: "valid",
          })
        );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Driver was updated successfully." });

      const stored = await db.driver.findByPk(driver.id);
      expect(String(stored.driverLicenseExpDate).slice(0, 10)).toBe("2031-01-15");
      expect(stored.status).toBe("expired");
    });

    it("Signed-in area admin updates driver details", async () => {
      const token = await signIn("area_admin");
      const driver = await db.driver.create(amyAdams());

      const response = await authed(token)
        .put(`/api/driver/drivers/${driver.id}`)
        .send(
          amyAdams({
            driverLicenseExpDate: "2031-01-15",
            approvedDate: addCalendarYears(localToday(), -2),
            status: "valid",
          })
        );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Driver was updated successfully." });

      const stored = await db.driver.findByPk(driver.id);
      expect(String(stored.driverLicenseExpDate).slice(0, 10)).toBe("2031-01-15");
      expect(stored.status).toBe("expired");
    });

    it("Update of an unknown driver is rejected", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token).put("/api/driver/drivers/9999").send(driverBody());

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Driver with id=9999 not found." });
    });
  });

  describe("US-3.5 — Delete Driver", () => {
    it("Signed-in system admin deletes a driver with confirmation", async () => {
      const token = await signIn("system_admin");
      const driver = await db.driver.create(driverBody());

      const response = await authed(token).delete(`/api/driver/drivers/${driver.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Driver was deleted successfully." });
      expect(await db.driver.findByPk(driver.id)).toBeNull();
    });

    it("Signed-in area admin deletes a driver with confirmation", async () => {
      const token = await signIn("area_admin");
      const driver = await db.driver.create(amyAdams());

      const response = await authed(token).delete(`/api/driver/drivers/${driver.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Driver was deleted successfully." });
      expect(await db.driver.findByPk(driver.id)).toBeNull();
    });

    it("Delete of an unknown driver is rejected", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token).delete("/api/driver/drivers/9999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Driver with id=9999 not found." });
    });
  });

  describe("US-3.7 — Role-Based Access Control", () => {
    it("Requestor can list drivers but cannot change them", async () => {
      const token = await signIn("requestor");
      await db.driver.create(driverBody());
      await db.driver.create(amyAdams());
      const before = (await db.driver.findAll({ order: [["id", "ASC"]] })).map((driver) =>
        driver.toJSON()
      );

      const created = await authed(token).post("/api/driver/drivers").send(driverBody());
      const updated = await authed(token).put("/api/driver/drivers/1").send(driverBody());
      const removed = await authed(token).delete("/api/driver/drivers/1");

      expect(created.status).toBe(403);
      expect(created.body).toEqual({ message: "Admin role required." });
      expect(updated.status).toBe(403);
      expect(updated.body).toEqual({ message: "Admin role required." });
      expect(removed.status).toBe(403);
      expect(removed.body).toEqual({ message: "Admin role required." });

      const after = (await db.driver.findAll({ order: [["id", "ASC"]] })).map((driver) =>
        driver.toJSON()
      );
      expect(after).toEqual(before);

      const listed = await authed(token).get("/api/driver/drivers");
      expect(listed.status).toBe(200);
      const names = listed.body.map(fullName);
      expect(names).toContain("Jaxen Roden");
      expect(names).toContain("Amy Adams");
    });

    it("Requestor list omits expired drivers", async () => {
      const token = await signIn("requestor");
      await db.driver.create(driverBody());
      await db.driver.create(
        amyAdams({
          approvedDate: addCalendarYears(localToday(), -2),
          status: "expired",
        })
      );

      const response = await authed(token).get("/api/driver/drivers");

      expect(response.status).toBe(200);
      expect(response.body.map(fullName)).toEqual(["Jaxen Roden"]);
    });

    it("Maintenance cannot create, update, or delete a driver", async () => {
      const token = await signIn("maintenance");
      await db.driver.create(driverBody());
      const before = (await db.driver.findAll({ order: [["id", "ASC"]] })).map((driver) =>
        driver.toJSON()
      );

      const created = await authed(token).post("/api/driver/drivers").send(amyAdams());
      const updated = await authed(token).put("/api/driver/drivers/1").send(driverBody());
      const removed = await authed(token).delete("/api/driver/drivers/1");

      expect(created.status).toBe(403);
      expect(created.body).toEqual({ message: "Admin role required." });
      expect(updated.status).toBe(403);
      expect(updated.body).toEqual({ message: "Admin role required." });
      expect(removed.status).toBe(403);
      expect(removed.body).toEqual({ message: "Admin role required." });

      const after = (await db.driver.findAll({ order: [["id", "ASC"]] })).map((driver) =>
        driver.toJSON()
      );
      expect(after).toEqual(before);

      const listed = await authed(token).get("/api/driver/drivers");
      expect(listed.status).toBe(200);
    });

    it("Unauthenticated visit to the driver page redirects to login", async () => {
      const response = await request(app).get("/api/driver/drivers");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Invalid token is rejected", async () => {
      const response = await request(app)
        .get("/api/driver/drivers")
        .set("Authorization", "Bearer not-a-valid-token");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });
  });
});
