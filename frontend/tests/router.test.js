/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { beforeEach, describe, expect, it } from "vitest";
import router from "../src/router.js";
import { clearCurrentUser, setCurrentUser } from "../src/config/session.js";

const signedInUser = {
  userId: 1,
  email: "jdoe@eagles.oc.edu",
  fName: "Jane",
  lName: "Doe",
  role: "requestor",
  token: "session-token",
};

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(async () => {
    clearCurrentUser();
    await router.push({ name: "login" });
    await router.isReady();
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Signed-in user visits login page", async () => {
      setCurrentUser(signedInUser);

      await router.push({ name: "home" });
      await router.push({ name: "login" });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("home");
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      clearCurrentUser();

      await router.push({ name: "home" });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});

describe("Feature 2 — Vehicle Management", () => {
  beforeEach(async () => {
    clearCurrentUser();
    await router.push({ name: "login" });
    await router.isReady();
  });

  describe("US-2.7 — Role-Based Access Control", () => {
    it("Unauthenticated visit to the vehicle page redirects to login", async () => {
      clearCurrentUser();

      await router.push("/vehicle");
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});

describe("Feature 3 — Driver Management", () => {
  beforeEach(async () => {
    clearCurrentUser();
    await router.push({ name: "login" });
    await router.isReady();
  });

  describe("US-3.7 — Role-Based Access Control", () => {
    it("Unauthenticated visit to the driver page redirects to login", async () => {
      clearCurrentUser();

      await router.push("/driver");
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});
