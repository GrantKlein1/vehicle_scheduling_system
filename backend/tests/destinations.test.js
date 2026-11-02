/**
 * Feature 4 — Destination Management
 * Spec: features/feature-4-destination-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { createArea, createSession, createUser, insertLegacyAdmin, syncTestDatabase } from "./helpers.js";

function destinationBody(overrides = {}) {
  return {
    name: "Garvey Center",
    addressLine1: "2501 E Memorial Rd",
    addressLine2: "Suite 100",
    city: "Edmond",
    state: "OK",
    zip: "73013",
    ...overrides,
  };
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

async function storedRows() {
  const rows = await db.destination.findAll({ order: [["id", "ASC"]] });
  return rows.map((row) => row.toJSON());
}

describe("Feature 4 — Destination Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-4.1 — View Destination List Page", () => {
    it("Destination list is sorted by name", async () => {
      const token = await signIn("requestor");
      await db.destination.create(destinationBody({ name: "Garvey Center" }));
      await db.destination.create(destinationBody({ name: "Chapel", addressLine2: null }));

      const response = await authed(token).get("/api/vehicle/destinations");

      expect(response.status).toBe(200);
      const names = response.body.map((destination) => destination.name);
      expect(names.indexOf("Chapel")).toBeLessThan(names.indexOf("Garvey Center"));
    });

    it("Destinations that share a name are sorted by city", async () => {
      const token = await signIn("requestor");
      await db.destination.create(destinationBody({ name: "Field House", city: "Yukon" }));
      await db.destination.create(destinationBody({ name: "Field House", city: "Edmond" }));

      const response = await authed(token).get("/api/vehicle/destinations");

      expect(response.status).toBe(200);
      const cities = response.body.map((destination) => destination.city);
      expect(cities.indexOf("Edmond")).toBeLessThan(cities.indexOf("Yukon"));
    });
  });

  describe("US-4.2 — Create Destination", () => {
    it("Requestor creates a new destination", async () => {
      const token = await signIn("requestor");

      const response = await authed(token).post("/api/vehicle/destinations").send(destinationBody());

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Garvey Center");
      expect(response.body.city).toBe("Edmond");
      expect(response.body.state).toBe("OK");
      expect(response.body.userId).toBeUndefined();
    });

    it("Create without address line 2 stores null", async () => {
      const token = await signIn("requestor");
      const body = destinationBody();
      delete body.addressLine2;

      const response = await authed(token).post("/api/vehicle/destinations").send(body);

      expect(response.status).toBe(201);
      expect(response.body.addressLine2).toBeNull();
      expect(Object.prototype.hasOwnProperty.call(response.body, "addressLine2")).toBe(true);
    });

    it("Create without name is rejected", async () => {
      const token = await signIn("requestor");
      const body = destinationBody();
      delete body.name;

      const response = await authed(token).post("/api/vehicle/destinations").send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name cannot be empty." });
      expect(await db.destination.count()).toBe(0);
    });

    it("Create with a name that is too long is rejected", async () => {
      const token = await signIn("requestor");

      const response = await authed(token)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ name: "a".repeat(101) }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name cannot exceed 100 characters." });
      expect(await db.destination.count()).toBe(0);
    });

    it("Create with an invalid state is rejected", async () => {
      const token = await signIn("requestor");

      const response = await authed(token)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ state: "Oklahoma" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "State must be a 2-letter abbreviation." });
      expect(await db.destination.count()).toBe(0);
    });

    it("Create with an invalid zip is rejected", async () => {
      const token = await signIn("requestor");

      const response = await authed(token)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ zip: "7301" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Zip must be 5 digits or ZIP+4." });
      expect(await db.destination.count()).toBe(0);
    });

    it("State is stored uppercase", async () => {
      const token = await signIn("requestor");

      const response = await authed(token)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ state: "ok" }));

      expect(response.status).toBe(201);
      expect(response.body.state).toBe("OK");
    });

    it("Zip plus four is accepted", async () => {
      const token = await signIn("requestor");

      const response = await authed(token)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ zip: "73013-1234" }));

      expect(response.status).toBe(201);
      expect(response.body.zip).toBe("73013-1234");
    });

    it("Two destinations may share a name", async () => {
      const token = await signIn("requestor");
      await db.destination.create(destinationBody({ name: "Field House", city: "Edmond" }));

      const response = await authed(token)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ name: "Field House", city: "Yukon" }));

      expect(response.status).toBe(201);
    });

    it("Supplied userId is ignored", async () => {
      const token = await signIn("requestor");

      const response = await authed(token)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ userId: 99 }));

      expect(response.status).toBe(201);
      expect(response.body.userId).toBeUndefined();
      const stored = await db.destination.findByPk(response.body.id);
      expect(stored.toJSON().userId).toBeUndefined();
    });

    it("Input strings are trimmed", async () => {
      const token = await signIn("requestor");

      const response = await authed(token)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ name: " Garvey Center " }));

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Garvey Center");
    });
  });

  describe("US-4.4 — Edit Destination", () => {
    it("System admin updates destination details", async () => {
      const token = await signIn("system_admin");
      const destination = await db.destination.create(
        destinationBody({ name: "Garvey Center", city: "Edmond" })
      );

      const response = await authed(token)
        .put(`/api/vehicle/destinations/${destination.id}`)
        .send(destinationBody({ city: "Oklahoma City", zip: "73101" }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Destination was updated successfully." });
      const stored = await db.destination.findByPk(destination.id);
      expect(stored.city).toBe("Oklahoma City");
      expect(stored.zip).toBe("73101");
    });

    it("Update of an unknown destination is rejected", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token)
        .put("/api/vehicle/destinations/9999")
        .send(destinationBody());

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Destination with id=9999 not found." });
    });
  });

  describe("US-4.5 — Delete Destination", () => {
    it("System admin deletes a destination with confirmation", async () => {
      const token = await signIn("system_admin");
      const destination = await db.destination.create(
        destinationBody({ name: "Chapel", addressLine2: null })
      );

      const response = await authed(token).delete(`/api/vehicle/destinations/${destination.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Destination was deleted successfully." });
      expect(await db.destination.findByPk(destination.id)).toBeNull();
    });

    it("Delete of an unknown destination is rejected", async () => {
      const token = await signIn("system_admin");

      const response = await authed(token).delete("/api/vehicle/destinations/9999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Destination with id=9999 not found." });
    });
  });

  describe("US-4.7 — Role-Based Access Control", () => {
    it("Requestor can list and create a destination but cannot update or delete", async () => {
      const token = await signIn("requestor");

      const created = await authed(token).post("/api/vehicle/destinations").send(destinationBody());
      expect(created.status).toBe(201);

      const listed = await authed(token).get("/api/vehicle/destinations");
      expect(listed.status).toBe(200);
      expect(listed.body.map((destination) => destination.name)).toContain("Garvey Center");

      const before = await storedRows();
      const updated = await authed(token).put("/api/vehicle/destinations/1").send(destinationBody());
      expect(updated.status).toBe(403);
      expect(updated.body).toEqual({ message: "Requestors cannot update or delete destinations." });
      expect(await storedRows()).toEqual(before);

      const removed = await authed(token).delete("/api/vehicle/destinations/1");
      expect(removed.status).toBe(403);
      expect(removed.body).toEqual({ message: "Requestors cannot update or delete destinations." });
      expect(await storedRows()).toEqual(before);
    });

    it("Area admin can list, create, update, and delete a destination", async () => {
      const token = await signIn("area_admin");

      const created = await authed(token).post("/api/vehicle/destinations").send(destinationBody());
      expect(created.status).toBe(201);

      const listed = await authed(token).get("/api/vehicle/destinations");
      expect(listed.status).toBe(200);
      expect(listed.body.map((destination) => destination.name)).toContain("Garvey Center");

      const updated = await authed(token).put("/api/vehicle/destinations/1").send(destinationBody());
      expect(updated.status).toBe(200);
      expect(updated.body).toEqual({ message: "Destination was updated successfully." });

      const removed = await authed(token).delete("/api/vehicle/destinations/1");
      expect(removed.status).toBe(200);
      expect(removed.body).toEqual({ message: "Destination was deleted successfully." });
    });

    it("Maintenance user can list, create, and update a destination but cannot delete", async () => {
      const token = await signIn("maintenance");

      const created = await authed(token).post("/api/vehicle/destinations").send(destinationBody());
      expect(created.status).toBe(201);

      const listed = await authed(token).get("/api/vehicle/destinations");
      expect(listed.status).toBe(200);
      expect(listed.body.map((destination) => destination.name)).toContain("Garvey Center");

      const updated = await authed(token).put("/api/vehicle/destinations/1").send(destinationBody());
      expect(updated.status).toBe(200);
      expect(updated.body).toEqual({ message: "Destination was updated successfully." });

      const before = await storedRows();
      const removed = await authed(token).delete("/api/vehicle/destinations/1");
      expect(removed.status).toBe(403);
      expect(removed.body).toEqual({ message: "Maintenance cannot delete destinations." });
      expect(await storedRows()).toEqual(before);
    });

    it("System admin can list, create, update, and delete a destination", async () => {
      const token = await signIn("system_admin");

      const created = await authed(token).post("/api/vehicle/destinations").send(destinationBody());
      expect(created.status).toBe(201);

      const listed = await authed(token).get("/api/vehicle/destinations");
      expect(listed.status).toBe(200);
      expect(listed.body.map((destination) => destination.name)).toContain("Garvey Center");

      const updated = await authed(token).put("/api/vehicle/destinations/1").send(destinationBody());
      expect(updated.status).toBe(200);
      expect(updated.body).toEqual({ message: "Destination was updated successfully." });

      const removed = await authed(token).delete("/api/vehicle/destinations/1");
      expect(removed.status).toBe(200);
      expect(removed.body).toEqual({ message: "Destination was deleted successfully." });
    });

    it("Legacy admin can update and delete a destination", async () => {
      const user = await insertLegacyAdmin();
      const session = await createSession(user);
      await db.destination.create(destinationBody());

      const updated = await authed(session.token)
        .put("/api/vehicle/destinations/1")
        .send(destinationBody({ city: "Oklahoma City" }));
      expect(updated.status).toBe(200);
      expect(updated.body).toEqual({ message: "Destination was updated successfully." });

      const removed = await authed(session.token).delete("/api/vehicle/destinations/1");
      expect(removed.status).toBe(200);
      expect(removed.body).toEqual({ message: "Destination was deleted successfully." });
    });

    it("A requestor's destination is in the shared list", async () => {
      const requestor = await signIn("requestor");
      await authed(requestor)
        .post("/api/vehicle/destinations")
        .send(destinationBody({ name: "Chapel", addressLine2: null }));

      const admin = await signIn("system_admin");
      const response = await authed(admin).get("/api/vehicle/destinations");

      expect(response.status).toBe(200);
      expect(response.body.map((destination) => destination.name)).toContain("Chapel");
    });

    it("Unauthenticated visit to the destination page redirects to login", async () => {
      const response = await request(app).get("/api/vehicle/destinations");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Invalid token is rejected", async () => {
      const response = await request(app)
        .get("/api/vehicle/destinations")
        .set("Authorization", "Bearer not-a-valid-token");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });
  });
});
