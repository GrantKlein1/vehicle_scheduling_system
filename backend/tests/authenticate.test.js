/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { createSession, createUser, syncTestDatabase } from "./helpers.js";

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("API request includes session token", async () => {
      const user = await createUser({ role: "requestor" });
      const session = await createSession(user);

      const response = await request(app)
        .post("/vehicleScheduling/logout")
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Signed out." });
    });

    it("Expired or invalid session token", async () => {
      const user = await createUser({ role: "requestor" });
      const session = await createSession(user, { expired: false });
      await session.update({ expirationDate: new Date(Date.now() - 60 * 1000) });

      const response = await request(app)
        .post("/vehicleScheduling/logout")
        .set("Authorization", `Bearer ${session.token}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      const response = await request(app).post("/vehicleScheduling/logout");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });
});
