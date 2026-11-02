/**
 * System admin and area admin foundation.
 */
import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import {
  canAccessArea as frontendCanAccessArea,
  isAnyAdmin as frontendIsAnyAdmin,
  isSystemAdmin as frontendIsSystemAdmin,
} from "../../frontend/src/config/roles.js";
import {
  authenticate,
  canAccessArea,
  isAnyAdmin,
  isSystemAdmin,
  requireAnyAdmin,
  requireAreaAccess,
  requireSystemAdmin,
} from "../app/authorization/authorization.js";
import db from "../app/models/index.js";
import { createArea, createSession, createUser, insertLegacyAdmin, syncTestDatabase } from "./helpers.js";

function guardApp(user) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.get("/system", requireSystemAdmin, (_req, res) => res.json({ ok: true }));
  app.get("/admins", requireAnyAdmin, (_req, res) => res.json({ ok: true }));
  app.get("/areas/:areaKey", requireAreaAccess((req) => req.params.areaKey), (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/open-area", requireAreaAccess(undefined), (_req, res) => res.json({ ok: true }));
  return app;
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("Admin types", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("startup migration and seed", () => {
    it("turns legacy admin accounts into system admins and seeds placeholder areas", async () => {
      const biology = await createArea("Biology");
      await insertLegacyAdmin();
      await insertLegacyAdmin({
        email: "second-admin@eagles.oc.edu",
        fName: "Second",
        areaId: biology.id,
      });

      const migrated = await db.migrateLegacyAdmins();
      expect(migrated).toBe(2);

      const admins = await db.user.findAll({ order: [["email", "ASC"]] });
      expect(admins.map((user) => user.role)).toEqual(["system_admin", "system_admin"]);
      expect(admins.map((user) => user.areaId)).toEqual([null, null]);

      await db.migrateLegacyAdmins();
      expect(await db.user.count({ where: { role: "admin" } })).toBe(0);

      await db.prepareAdminTypes();
      const seededAdmin = await db.user.findOne({ where: { email: "admin@eagles.oc.edu" } });
      expect(seededAdmin.role).toBe("system_admin");
      expect(seededAdmin.fName).toBe("Admin");
      expect(await db.user.count({ where: { email: "admin@eagles.oc.edu" } })).toBe(1);

      const maintenance = await db.user.findOne({ where: { email: "maint@eagles.oc.edu" } });
      expect(maintenance.role).toBe("maintenance");
      expect(maintenance.areaId).toBeNull();

      const areas = await db.area.findAll({ order: [["name", "ASC"]] });
      expect(areas.map((area) => area.name)).toEqual([
        "Athletics",
        "Biology",
        "Maintenance",
        "Support Central",
      ]);

      await db.prepareAdminTypes();
      expect(await db.area.count()).toBe(4);
      expect(await db.user.count()).toBe(3);
    });

    it("adds the area table and areaId column when an existing database is missing them", async () => {
      await db.sequelize.getQueryInterface().dropTable("areas");
      await db.sequelize.getQueryInterface().removeColumn("users", "areaId");

      await db.ensureAdminTypeSchema();

      const biology = await db.area.create({ name: "Biology" });
      const user = await createUser({
        email: "blair@eagles.oc.edu",
        googleSub: "google-sub-blair",
        role: "area_admin",
        areaId: biology.id,
      });
      expect(user.role).toBe("area_admin");
      expect(user.areaId).toBe(biology.id);
    });
  });

  describe("area assignment rules", () => {
    it("requires an existing area for an area admin and no area for other roles", async () => {
      await expect(
        createUser({
          email: "area-admin@eagles.oc.edu",
          googleSub: "google-sub-area",
          role: "area_admin",
          areaId: null,
        })
      ).rejects.toThrow(/assigned to an area/);

      await expect(
        createUser({
          email: "missing-area@eagles.oc.edu",
          googleSub: "google-sub-missing",
          role: "area_admin",
          areaId: 404,
        })
      ).rejects.toThrow(/existing area/);

      const area = await createArea("Biology");
      await expect(
        createUser({
          role: "system_admin",
          areaId: area.id,
        })
      ).rejects.toThrow(/Only an area admin/);

      const areaAdmin = await createUser({
        email: "bio-admin@eagles.oc.edu",
        googleSub: "google-sub-bio",
        role: "area_admin",
        areaId: area.id,
      });
      expect(areaAdmin.areaId).toBe(area.id);
    });
  });

  describe("authorization checks", () => {
    const systemAdmin = { id: 1, role: "system_admin", areaId: null, areaName: null };
    const legacyAdmin = { id: 2, role: "admin", areaId: null, areaName: null };
    const areaAdmin = { id: 3, role: "area_admin", areaId: 5, areaName: "Athletics" };
    const requestor = { id: 4, role: "requestor", areaId: null, areaName: null };
    const maintenance = { id: 5, role: "maintenance", areaId: null, areaName: null };

    const cases = [
      { user: systemAdmin, area: "Biology", system: true, any: true, areaAccess: true },
      { user: systemAdmin, area: null, system: true, any: true, areaAccess: true },
      { user: legacyAdmin, area: { id: 9, name: "Biology" }, system: true, any: true, areaAccess: true },
      { user: areaAdmin, area: 5, system: false, any: true, areaAccess: true },
      { user: areaAdmin, area: " athletics ", system: false, any: true, areaAccess: true },
      { user: areaAdmin, area: { id: 5, name: "Athletics" }, system: false, any: true, areaAccess: true },
      { user: areaAdmin, area: { id: 5, name: "Biology" }, system: false, any: true, areaAccess: false },
      { user: areaAdmin, area: { id: 9, name: "Athletics" }, system: false, any: true, areaAccess: false },
      { user: areaAdmin, area: "Biology", system: false, any: true, areaAccess: false },
      { user: areaAdmin, area: null, system: false, any: true, areaAccess: false },
      { user: requestor, area: "Athletics", system: false, any: false, areaAccess: false },
      { user: maintenance, area: 5, system: false, any: false, areaAccess: false },
    ];

    it.each(cases)("matches frontend checks for $user.role and $area", ({ user, area, system, any, areaAccess }) => {
      expect(isSystemAdmin(user)).toBe(system);
      expect(isAnyAdmin(user)).toBe(any);
      expect(canAccessArea(user, area)).toBe(areaAccess);
      expect(frontendIsSystemAdmin(user)).toBe(isSystemAdmin(user));
      expect(frontendIsAnyAdmin(user)).toBe(isAnyAdmin(user));
      expect(frontendCanAccessArea(user, area)).toBe(canAccessArea(user, area));
    });

    it("middleware allows system admins through every guard and limits area admins to their area", async () => {
      const systemResponse = await request(guardApp(systemAdmin)).get("/areas/Biology");
      expect(systemResponse.status).toBe(200);

      const legacyResponse = await request(guardApp(legacyAdmin)).get("/system");
      expect(legacyResponse.status).toBe(200);

      const areaOwn = await request(guardApp(areaAdmin)).get("/areas/Athletics");
      expect(areaOwn.status).toBe(200);

      const areaOther = await request(guardApp(areaAdmin)).get("/areas/Biology");
      expect(areaOther.status).toBe(403);
      expect(areaOther.body).toEqual({ message: "You do not have access to this area." });

      const areaSystem = await request(guardApp(areaAdmin)).get("/system");
      expect(areaSystem.status).toBe(403);
      expect(areaSystem.body).toEqual({ message: "System admin role required." });

      const areaAny = await request(guardApp(areaAdmin)).get("/admins");
      expect(areaAny.status).toBe(200);

      const requestorAny = await request(guardApp(requestor)).get("/admins");
      expect(requestorAny.status).toBe(403);
      expect(requestorAny.body).toEqual({ message: "Admin role required." });

      const maintenanceArea = await request(guardApp(maintenance)).get("/areas/Athletics");
      expect(maintenanceArea.status).toBe(403);

      const unsigned = await request(guardApp(undefined)).get("/system");
      expect(unsigned.status).toBe(401);
      expect(unsigned.body).toEqual({ message: "Unauthorized! No token provided." });

      const systemOpen = await request(guardApp(systemAdmin)).get("/open-area");
      expect(systemOpen.status).toBe(200);
      const areaOpen = await request(guardApp(areaAdmin)).get("/open-area");
      expect(areaOpen.status).toBe(403);
    });

    it("authenticate attaches role and area for later checks", async () => {
      const area = await createArea("Athletics");
      const user = await createUser({
        email: "athletics-admin@eagles.oc.edu",
        googleSub: "google-sub-area",
        role: "area_admin",
        areaId: area.id,
      });
      const session = await createSession(user);
      const req = { headers: { authorization: `Bearer ${session.token}` } };
      const res = mockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual({
        id: user.id,
        role: "area_admin",
        areaId: area.id,
        areaName: "Athletics",
      });
      expect(canAccessArea(req.user, "Athletics")).toBe(true);
      expect(canAccessArea(req.user, "Biology")).toBe(false);
      expect(isSystemAdmin(req.user)).toBe(false);
      expect(isAnyAdmin(req.user)).toBe(true);
    });
  });
});
