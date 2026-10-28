/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { jest } from "@jest/globals";
import request from "supertest";
import db from "../app/models/index.js";
import { syncTestDatabase } from "./helpers.js";

const verifyGoogleCredential = jest.fn();

jest.unstable_mockModule("../app/services/googleAuth.js", () => ({
  verifyGoogleCredential,
}));

const { default: app } = await import("../server.js");

function mockGoogleProfile({ sub, email, fName, lName }) {
  verifyGoogleCredential.mockResolvedValue({
    ok: true,
    profile: { sub, email, fName, lName },
  });
}

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
    verifyGoogleCredential.mockReset();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-1.1 — Registration", () => {
    it("First Google Sign in", async () => {
      mockGoogleProfile({
        sub: "google-sub-jane",
        email: "jdoe@eagles.oc.edu",
        fName: "Jane",
        lName: "Doe",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-jane",
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          userId: expect.any(Number),
          email: "jdoe@eagles.oc.edu",
          fName: "Jane",
          lName: "Doe",
          role: "requestor",
          areaId: null,
          areaName: null,
          token: expect.any(String),
        })
      );

      const users = await db.user.findAll();
      expect(users).toHaveLength(1);
      expect(users[0].googleSub).toBe("google-sub-jane");
      expect(users[0].email).toBe("jdoe@eagles.oc.edu");
      expect(users[0].fName).toBe("Jane");
      expect(users[0].lName).toBe("Doe");
      expect(users[0].role).toBe("requestor");
      expect(users[0].areaId).toBeNull();

      const sessions = await db.session.findAll({ where: { userId: users[0].id } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].token).toBe(response.body.token);
      const lifetime = new Date(sessions[0].expirationDate).getTime() - Date.now();
      expect(lifetime).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(lifetime).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });

    it("Seeded admin sign-in binds Google subject", async () => {
      const seeded = await db.user.create({
        email: "admin@eagles.oc.edu",
        fName: "Admin",
        lName: "User",
        role: "system_admin",
        areaId: null,
        googleSub: null,
      });

      mockGoogleProfile({
        sub: "google-sub-admin",
        email: "admin@eagles.oc.edu",
        fName: "Alex",
        lName: "Admin",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-admin",
      });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe("system_admin");
      expect(response.body.areaId).toBeNull();
      expect(response.body.areaName).toBeNull();
      expect(response.body.userId).toBe(seeded.id);

      const users = await db.user.findAll();
      expect(users).toHaveLength(1);
      expect(users[0].googleSub).toBe("google-sub-admin");
      expect(users[0].role).toBe("system_admin");
      expect(users[0].fName).toBe("Alex");
      expect(users[0].lName).toBe("Admin");
      expect(users[0].email).toBe("admin@eagles.oc.edu");
    });

    it("Seeded maintenance sign-in binds Google subject", async () => {
      const seeded = await db.user.create({
        email: "maint@eagles.oc.edu",
        fName: "Maintenance",
        lName: "User",
        role: "maintenance",
        googleSub: null,
      });

      mockGoogleProfile({
        sub: "google-sub-maint",
        email: "maint@eagles.oc.edu",
        fName: "Morgan",
        lName: "Maint",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-maint",
      });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe("maintenance");
      expect(response.body.userId).toBe(seeded.id);

      const users = await db.user.findAll();
      expect(users).toHaveLength(1);
      expect(users[0].googleSub).toBe("google-sub-maint");
      expect(users[0].role).toBe("maintenance");
      expect(users[0].fName).toBe("Morgan");
      expect(users[0].lName).toBe("Maint");
      expect(users[0].email).toBe("maint@eagles.oc.edu");
    });

    it("Client-supplied role is ignored", async () => {
      mockGoogleProfile({
        sub: "google-sub-jane",
        email: "jdoe@eagles.oc.edu",
        fName: "Jane",
        lName: "Doe",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-jane",
        role: "system_admin",
        areaId: 4,
        areaName: "Biology",
      });

      expect(response.status).toBe(201);
      expect(response.body.role).toBe("requestor");
      expect(response.body.areaId).toBeNull();
      expect(response.body.areaName).toBeNull();

      const user = await db.user.findOne({ where: { email: "jdoe@eagles.oc.edu" } });
      expect(user.role).toBe("requestor");
      expect(user.areaId).toBeNull();
    });

    it("Legacy admin sign-in becomes a system admin", async () => {
      await db.sequelize.query(
        "INSERT INTO users (fName, lName, email, googleSub, role, areaId) VALUES (?, ?, ?, ?, ?, ?)",
        {
          replacements: ["Admin", "User", "admin@eagles.oc.edu", null, "admin", null],
        }
      );

      mockGoogleProfile({
        sub: "google-sub-admin",
        email: "admin@eagles.oc.edu",
        fName: "Alex",
        lName: "Admin",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-admin",
        role: "requestor",
        areaId: 9,
      });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe("system_admin");
      expect(response.body.areaId).toBeNull();
      expect(response.body.areaName).toBeNull();

      const users = await db.user.findAll();
      expect(users).toHaveLength(1);
      expect(users[0].googleSub).toBe("google-sub-admin");
      expect(users[0].role).toBe("system_admin");
      expect(users[0].areaId).toBeNull();
      expect(users[0].fName).toBe("Alex");
      expect(users[0].lName).toBe("Admin");
    });
  });

  describe("US-1.2 — Returning Google sign-in", () => {
    it("Returning Google sign-in reuses the user", async () => {
      const existing = await db.user.create({
        fName: "Jane",
        lName: "Doe",
        email: "jdoe@eagles.oc.edu",
        googleSub: "google-sub-jane",
        role: "requestor",
      });
      const existingSession = await db.session.create({
        token: "existing-session-token",
        email: existing.email,
        expirationDate: new Date(Date.now() + 60 * 60 * 1000),
        userId: existing.id,
      });

      mockGoogleProfile({
        sub: "google-sub-jane",
        email: "jdoe@eagles.oc.edu",
        fName: "Jane",
        lName: "Doe",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-jane",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          userId: existing.id,
          email: "jdoe@eagles.oc.edu",
          fName: "Jane",
          lName: "Doe",
          role: "requestor",
          areaId: null,
          areaName: null,
          token: existingSession.token,
        })
      );

      expect(await db.user.count()).toBe(1);
      const sessions = await db.session.findAll({ where: { userId: existing.id } });
      expect(sessions).toHaveLength(1);
    });

    it("Returning sign-in keeps the stored role", async () => {
      await db.user.create({
        fName: "Admin",
        lName: "User",
        email: "admin@eagles.oc.edu",
        googleSub: "google-sub-admin",
        role: "system_admin",
        areaId: null,
      });

      mockGoogleProfile({
        sub: "google-sub-admin",
        email: "admin@eagles.oc.edu",
        fName: "Alex",
        lName: "Admin",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-admin",
      });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe("system_admin");
      expect(response.body.areaId).toBeNull();
      expect(await db.user.count()).toBe(1);

      const user = await db.user.findOne({ where: { googleSub: "google-sub-admin" } });
      expect(user.role).toBe("system_admin");
      expect(user.areaId).toBeNull();
    });

    it("Area admin sign-in keeps the assigned area", async () => {
      const area = await db.area.create({ name: "Athletics" });
      const existing = await db.user.create({
        fName: "Avery",
        lName: "Athlete",
        email: "athletics-admin@eagles.oc.edu",
        googleSub: "google-sub-area",
        role: "area_admin",
        areaId: area.id,
      });

      mockGoogleProfile({
        sub: "google-sub-area",
        email: "athletics-admin@eagles.oc.edu",
        fName: "Avery",
        lName: "Coach",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-area",
        role: "system_admin",
        areaId: 999,
        areaName: "Biology",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          userId: existing.id,
          email: "athletics-admin@eagles.oc.edu",
          fName: "Avery",
          lName: "Coach",
          role: "area_admin",
          areaId: area.id,
          areaName: "Athletics",
          token: expect.any(String),
        })
      );
      expect(await db.user.count()).toBe(1);

      const user = await db.user.findByPk(existing.id);
      expect(user.role).toBe("area_admin");
      expect(user.areaId).toBe(area.id);
      expect(user.lName).toBe("Coach");
    });

    it("Invalid Google credential stays on login", async () => {
      verifyGoogleCredential.mockResolvedValue({
        ok: false,
        message: "Google sign-in failed",
      });

      const response = await request(app).post("/vehicleScheduling/login").send({
        credential: "not-a-google-credential",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Google sign-in failed" });
      expect(await db.user.count()).toBe(0);
    });
  });

  describe("US-1.4 — Sign out", () => {
    it("User signs out", async () => {
      mockGoogleProfile({
        sub: "google-sub-jane",
        email: "jdoe@eagles.oc.edu",
        fName: "Jane",
        lName: "Doe",
      });

      const loginResponse = await request(app).post("/vehicleScheduling/login").send({
        credential: "google-credential-jane",
      });
      const token = loginResponse.body.token;

      const logoutResponse = await request(app)
        .post("/vehicleScheduling/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(logoutResponse.status).toBe(200);
      expect(await db.session.count({ where: { token } })).toBe(0);

      const reuse = await request(app)
        .post("/vehicleScheduling/logout")
        .set("Authorization", `Bearer ${token}`);
      expect(reuse.status).toBe(401);
      expect(reuse.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });
  });
});
