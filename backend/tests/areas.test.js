import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUser, createSession } from "./helpers.js";
import { ROLES } from "../app/authorization/roles.js";

async function signIn(role, areaId = null, email = null) {
  const userEmail = email || `${role}-${Date.now()}-${Math.random()}@eagles.oc.edu`;
  const overrides = {
    role,
    areaId,
    email: userEmail,
    googleSub: `sub-${userEmail}`,
  };

  const user = await createUser(overrides);
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

describe("Feature 5 — Area Management", () => {
  let systemAdminToken;
  let areaAdminToken;
  let requestorToken;
  let maintenanceToken;
  let athleticsArea;
  let maintenanceArea;
  let supportCentralArea;

  beforeEach(async () => {
    await syncTestDatabase();

    athleticsArea = await db.area.create({
      name: "Athletics",
      logo: "athletics.png",
      notificationEmail: "athletics@eagles.oc.edu",
    });
    maintenanceArea = await db.area.create({
      name: "Maintenance",
      logo: null,
      notificationEmail: "maint@eagles.oc.edu",
    });
    supportCentralArea = await db.area.create({
      name: "Support Central",
      logo: null,
      notificationEmail: "support@eagles.oc.edu",
    });

    const sysAdmin = await signIn(ROLES.SYSTEM_ADMIN);
    systemAdminToken = sysAdmin.token;

    const areaAdmin = await signIn(ROLES.AREA_ADMIN, athleticsArea.id);
    areaAdminToken = areaAdmin.token;

    const reqUser = await signIn(ROLES.REQUESTOR);
    requestorToken = reqUser.token;

    const maintUser = await signIn(ROLES.MAINTENANCE);
    maintenanceToken = maintUser.token;
  });

  describe("US-5.2 — Create Area", () => {
    it("System admin creates a valid area", async () => {
      const response = await authed(systemAdminToken)
        .post("/api/area/areas")
        .send({
          name: "Biology",
          notificationEmail: "biology@eagles.oc.edu",
          logo: "biology.png",
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Biology");
      expect(response.body.notificationEmail).toBe("biology@eagles.oc.edu");
      expect(response.body.logo).toBe("biology.png");
    });

    it("Create area with optional logo omitted", async () => {
      const response = await authed(systemAdminToken)
        .post("/api/area/areas")
        .send({
          name: "Engineering",
          notificationEmail: "engineering@eagles.oc.edu",
          logo: "",
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Engineering");
      expect(response.body.logo).toBeNull();
    });

    it("Create area with missing name is rejected", async () => {
      const response = await authed(systemAdminToken)
        .post("/api/area/areas")
        .send({
          name: "   ",
          notificationEmail: "valid@eagles.oc.edu",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Area name cannot be empty." });
    });

    it("Create area with invalid email is rejected", async () => {
      const response = await authed(systemAdminToken)
        .post("/api/area/areas")
        .send({
          name: "Campus Police",
          notificationEmail: "not-an-email",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Notification email must be a valid email address.",
      });
    });

    it("Create area with duplicate name is rejected", async () => {
      const response = await authed(systemAdminToken)
        .post("/api/area/areas")
        .send({
          name: "Athletics",
          notificationEmail: "other@eagles.oc.edu",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Area name already exists." });
    });
  });

  describe("US-5.3 — Read Area Catalog", () => {
    it("System admin reads area list in alphabetical order", async () => {
      const response = await authed(systemAdminToken).get("/api/area/areas");

      expect(response.status).toBe(200);
      const names = response.body.map((a) => a.name);
      expect(names).toEqual(["Athletics", "Maintenance", "Support Central"]);
    });
  });

  describe("US-5.5 — Edit Area", () => {
    it("System admin updates area details", async () => {
      const response = await authed(systemAdminToken)
        .put(`/api/area/areas/${athleticsArea.id}`)
        .send({
          name: "Athletics",
          notificationEmail: "new-athletics@eagles.oc.edu",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Area was updated successfully." });

      const fetched = await authed(systemAdminToken).get(`/api/area/areas/${athleticsArea.id}`);
      expect(fetched.body.notificationEmail).toBe("new-athletics@eagles.oc.edu");
    });

    it("Edit area with duplicate name of another area is rejected", async () => {
      const response = await authed(systemAdminToken)
        .put(`/api/area/areas/${maintenanceArea.id}`)
        .send({
          name: "Athletics",
          notificationEmail: "maint@eagles.oc.edu",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Area name already exists." });
    });

    it("Edit non-existent area returns 404", async () => {
      const response = await authed(systemAdminToken)
        .put("/api/area/areas/99999")
        .send({
          name: "Nonexistent",
          notificationEmail: "none@eagles.oc.edu",
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Area with id=99999 not found." });
    });
  });

  describe("US-5.6 — Delete Area", () => {
    it("System admin deletes an unassigned area after confirmation", async () => {
      const tempArea = await db.area.create({
        name: "Temporary Area",
        notificationEmail: "temp@eagles.oc.edu",
      });

      const response = await authed(systemAdminToken).delete(`/api/area/areas/${tempArea.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Area was deleted successfully!" });

      const check = await db.area.findByPk(tempArea.id);
      expect(check).toBeNull();
    });

    it("Deleting area assigned to vehicles or area admins is rejected", async () => {
      // 1. Vehicle assigned
      await db.vehicle.create({
        category: "Van",
        make: "Ford",
        model: "Transit",
        year: 2022,
        vin: "1FTNE3Y89NKA00001",
        purchasedDate: "2022-01-01",
        color: "White",
        passengerCapacity: 12,
        licensePlateNumber: "OCVAN1",
        licensePlateExpirationMonth: 5,
        areaAssigned: "Athletics",
      });

      const resVehicle = await authed(systemAdminToken).delete(`/api/area/areas/${athleticsArea.id}`);

      expect(resVehicle.status).toBe(400);
      expect(resVehicle.body).toEqual({
        message: "Cannot delete area currently assigned to vehicles or area admins.",
      });

      // 2. Area admin assigned
      const tempArea2 = await db.area.create({
        name: "Another Area",
        notificationEmail: "another@eagles.oc.edu",
      });
      await createUser({
        email: "coach2@eagles.oc.edu",
        role: ROLES.AREA_ADMIN,
        areaId: tempArea2.id,
      });

      const resAdmin = await authed(systemAdminToken).delete(`/api/area/areas/${tempArea2.id}`);

      expect(resAdmin.status).toBe(400);
      expect(resAdmin.body).toEqual({
        message: "Cannot delete area currently assigned to vehicles or area admins.",
      });
    });

    it("Delete non-existent area returns 404", async () => {
      const response = await authed(systemAdminToken).delete("/api/area/areas/99999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Area with id=99999 not found." });
    });
  });

  describe("US-5.7 — Role-Based Access Control", () => {
    it("Area admin cannot call area endpoints", async () => {
      const resGet = await authed(areaAdminToken).get("/api/area/areas");
      expect(resGet.status).toBe(403);
      expect(resGet.body).toEqual({ message: "System admin role required." });

      const resPost = await authed(areaAdminToken)
        .post("/api/area/areas")
        .send({ name: "Forbidden", notificationEmail: "f@eagles.oc.edu" });
      expect(resPost.status).toBe(403);

      const resPut = await authed(areaAdminToken)
        .put(`/api/area/areas/${athleticsArea.id}`)
        .send({ name: "Athletics", notificationEmail: "new@eagles.oc.edu" });
      expect(resPut.status).toBe(403);

      const resDel = await authed(areaAdminToken).delete(`/api/area/areas/${athleticsArea.id}`);
      expect(resDel.status).toBe(403);
    });

    it("Requestor cannot call area endpoints", async () => {
      const res = await authed(requestorToken).get("/api/area/areas");
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: "System admin role required." });
    });

    it("Maintenance user cannot call area endpoints", async () => {
      const res = await authed(maintenanceToken).get("/api/area/areas");
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: "System admin role required." });
    });

    it("Unauthenticated request returns 401", async () => {
      const res = await request(app).get("/api/area/areas");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });

  describe("US-5.8 — Manage Area Administrators", () => {
    it("System admin views area admins for an area", async () => {
      await createUser({
        fName: "Coach",
        lName: "Smith",
        email: "csmith@eagles.oc.edu",
        role: ROLES.AREA_ADMIN,
        areaId: athleticsArea.id,
      });

      const response = await authed(systemAdminToken).get(`/api/area/areas/${athleticsArea.id}/admins`);

      expect(response.status).toBe(200);
      const emails = response.body.map((u) => u.email);
      expect(emails).toContain("csmith@eagles.oc.edu");
    });

    it("System admin assigns a user as an area admin", async () => {
      const user = await createUser({
        email: "jane.assign@eagles.oc.edu",
        role: ROLES.REQUESTOR,
      });

      const response = await authed(systemAdminToken)
        .post(`/api/area/areas/${athleticsArea.id}/admins`)
        .send({ email: "jane.assign@eagles.oc.edu" });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe(ROLES.AREA_ADMIN);
      expect(response.body.user.areaId).toBe(athleticsArea.id);

      const refreshed = await db.user.findByPk(user.id);
      expect(refreshed.role).toBe(ROLES.AREA_ADMIN);
      expect(refreshed.areaId).toBe(athleticsArea.id);
    });

    it("Assigning non-existent user returns 404", async () => {
      const response = await authed(systemAdminToken)
        .post(`/api/area/areas/${athleticsArea.id}/admins`)
        .send({ email: "unknown@eagles.oc.edu" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "User not found." });
    });

    it("Assigning already assigned user returns 400", async () => {
      await createUser({
        email: "coach.dup@eagles.oc.edu",
        role: ROLES.AREA_ADMIN,
        areaId: athleticsArea.id,
      });

      const response = await authed(systemAdminToken)
        .post(`/api/area/areas/${athleticsArea.id}/admins`)
        .send({ email: "coach.dup@eagles.oc.edu" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "User is already an area admin for this area.",
      });
    });

    it("System admin removes an area admin", async () => {
      const coach = await createUser({
        email: "coach.remove@eagles.oc.edu",
        role: ROLES.AREA_ADMIN,
        areaId: athleticsArea.id,
      });

      const response = await authed(systemAdminToken).delete(
        `/api/area/areas/${athleticsArea.id}/admins/${coach.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Area admin removed successfully." });

      const refreshed = await db.user.findByPk(coach.id);
      expect(refreshed.role).toBe(ROLES.REQUESTOR);
      expect(refreshed.areaId).toBeNull();
    });
  });
});
