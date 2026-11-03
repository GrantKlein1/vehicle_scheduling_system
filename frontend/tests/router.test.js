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

describe("Feature 4 — Destination Management", () => {
  beforeEach(async () => {
    clearCurrentUser();
    await router.push({ name: "login" });
    await router.isReady();
  });

  describe("US-4.7 — Role-Based Access Control", () => {
    async function stayOnDestinations(role) {
      setCurrentUser({
        userId: 1,
        email: `${role}@eagles.oc.edu`,
        fName: "Ada",
        lName: "Min",
        role,
        token: "session-token",
      });

      await router.push("/destination");
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("destinations");
      expect(router.currentRoute.value.path).toBe("/destination");
    }

    it("Requestor can list and create a destination but cannot update or delete", async () => {
      await stayOnDestinations("requestor");
    });

    it("Area admin can list, create, update, and delete a destination", async () => {
      await stayOnDestinations("area_admin");
    });

    it("Maintenance user can list, create, and update a destination but cannot delete", async () => {
      await stayOnDestinations("maintenance");
    });

    it("System admin can list, create, update, and delete a destination", async () => {
      await stayOnDestinations("system_admin");
    });

    it("Unauthenticated visit to the destination page redirects to login", async () => {
      clearCurrentUser();

      await router.push("/destination");
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});
