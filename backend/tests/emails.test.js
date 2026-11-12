/**
 * Feature 7 — Email Management
 * Spec: features/feature-7-email-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { createSession, createUser, syncTestDatabase } from "./helpers.js";
import { failMailFor, resetMailTransport } from "../app/services/mailTransport.js";
import { FROM_EMAIL } from "../app/models/email.model.js";

async function signIn(role, overrides = {}) {
  const user = await createUser({
    role,
    email: `${role}-${Date.now()}-${Math.random()}@eagles.oc.edu`,
    googleSub: `sub-${role}-${Date.now()}-${Math.random()}`,
    ...overrides,
  });
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

async function createVehicle() {
  return db.vehicle.create({
    category: "Van",
    make: "Ford",
    model: "Transit",
    year: 2022,
    vin: `1HGCR2F83HA${Math.floor(100000 + Math.random() * 900000)}`,
    purchasedDate: "2022-01-01",
    color: "White",
    passengerCapacity: 12,
    licensePlateNumber: `OK${Math.floor(1000 + Math.random() * 9000)}`,
    licensePlateExpirationMonth: 6,
    areaAssigned: "Athletics",
    status: "available",
  });
}

async function createAreaMailbox() {
  return db.area.create({
    name: `Athletics-${Date.now()}`,
    notificationEmail: "athletics-transport@eagles.oc.edu",
  });
}

const trip = {
  destinationName: "Edmond High School",
  start: "2026-12-02 08:00",
  end: "2026-12-02 12:00",
  purpose: "Campus visit",
  driverName: "Sam Driver",
  driverEmail: "sdriver@eagles.oc.edu",
};

async function storedEmails(reservationId) {
  return db.email.findAll({
    where: { reservationId },
    order: [["id", "ASC"]],
  });
}

describe("Feature 7 — Email Management", () => {
  beforeEach(async () => {
    resetMailTransport();
    await syncTestDatabase();
  });

  describe("US-7.1 — Email the requestor and administrators when a reservation is submitted", () => {
    it("Submitted reservation emails the requestor, each system admin, and the area", async () => {
      const area = await createAreaMailbox();
      const { user: firstAdmin } = await signIn("system_admin", {
        email: "admin@eagles.oc.edu",
        fName: "Alex",
        lName: "Admin",
      });
      const { user: secondAdmin } = await signIn("system_admin", {
        email: "second.admin@eagles.oc.edu",
        fName: "Sam",
        lName: "Admin",
      });
      const { token, user } = await signIn("requestor", {
        email: "jdoe@eagles.oc.edu",
        fName: "Jane",
        lName: "Doe",
      });
      const vehicle = await createVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        areaName: area.name,
        ...trip,
      });

      expect(res.status).toBe(201);
      expect(res.body.emails).toBeUndefined();
      expect(res.body.status).toBe("pending");

      const rows = await storedEmails(res.body.id);
      expect(rows.map((row) => row.recipientEmail)).toEqual([
        user.email,
        firstAdmin.email,
        secondAdmin.email,
        "athletics-transport@eagles.oc.edu",
      ]);
      expect(rows.map((row) => row.recipientRole)).toEqual([
        "requestor",
        "system_admin",
        "system_admin",
        "area",
      ]);
      expect(rows.every((row) => row.event === "submitted" && row.status === "sent")).toBe(true);
      expect(rows.every((row) => row.fromEmail === FROM_EMAIL)).toBe(true);
      expect(rows.every((row) => row.subject === "Vehicle request submitted")).toBe(true);
      expect(rows[0].body).toContain("Your vehicle request was submitted and is waiting for approval.");
      expect(rows[1].body).toContain("A vehicle request is waiting for your approval.");
      expect(rows[1].body).toContain("Email: jdoe@eagles.oc.edu");
      expect(rows[3].body).toContain(`A vehicle request is waiting for approval in ${area.name}.`);
      expect(rows.some((row) => row.recipientRole === "driver")).toBe(false);
    });

    it("Submitted reservation does not email the driver", async () => {
      const { token } = await signIn("requestor", { email: "jdoe@eagles.oc.edu" });
      const vehicle = await createVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        ...trip,
      });

      expect(res.status).toBe(201);
      const rows = await storedEmails(res.body.id);
      expect(rows.some((row) => row.recipientEmail === "sdriver@eagles.oc.edu")).toBe(false);
    });

    it("Client-supplied recipients are ignored", async () => {
      const { token } = await signIn("requestor", { email: "jdoe@eagles.oc.edu" });
      const vehicle = await createVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: trip.start,
        end: trip.end,
        recipients: ["other@eagles.oc.edu"],
      });

      expect(res.status).toBe(201);
      const rows = await storedEmails(res.body.id);
      expect(rows.some((row) => row.recipientEmail === "other@eagles.oc.edu")).toBe(false);
    });
  });

  describe("US-7.2 — Email the requestor and driver when a reservation is approved", () => {
    it("Approved reservation emails the requestor and the driver with pickup instructions", async () => {
      const area = await createAreaMailbox();
      const { token: adminToken } = await signIn("system_admin", { email: "admin@eagles.oc.edu" });
      const { user } = await signIn("requestor", {
        email: "jdoe@eagles.oc.edu",
        fName: "Jane",
        lName: "Doe",
      });
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        areaName: area.name,
        purpose: "Campus visit",
        driverName: "Sam Driver",
        driverEmail: "sdriver@eagles.oc.edu",
        status: "pending",
      });

      const res = await authed(adminToken).post(
        `/vehicleScheduling/reservations/${reservation.id}/approve`
      );

      expect(res.status).toBe(200);
      expect(res.body.emails).toBeUndefined();
      expect(res.body.status).toBe("approved");

      const rows = await storedEmails(reservation.id);
      const requestorMail = rows.find((row) => row.recipientRole === "requestor");
      const driverMail = rows.find((row) => row.recipientRole === "driver");
      const areaMail = rows.find((row) => row.recipientRole === "area");

      expect(requestorMail.subject).toBe("Vehicle request approved");
      expect(requestorMail.body).toContain("Your vehicle request was approved.");
      expect(requestorMail.body).toContain("Driver: Sam Driver");
      expect(requestorMail.body).toContain("Pickup instructions: contact athletics-transport@eagles.oc.edu.");
      expect(driverMail.recipientEmail).toBe("sdriver@eagles.oc.edu");
      expect(driverMail.subject).toBe("You are assigned to a vehicle request");
      expect(driverMail.body).toContain("You are the driver for this vehicle request.");
      expect(driverMail.body).toContain("Pickup instructions: contact athletics-transport@eagles.oc.edu.");
      expect(areaMail.recipientEmail).toBe("athletics-transport@eagles.oc.edu");
      expect(areaMail.body).not.toContain("Pickup instructions:");
      expect(rows.some((row) => row.recipientRole === "system_admin")).toBe(false);
    });

    it("Approved reservation with no driver email skips the driver", async () => {
      const area = await createAreaMailbox();
      const { token: adminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu" });
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        areaName: area.name,
        status: "pending",
      });

      const res = await authed(adminToken).post(
        `/vehicleScheduling/reservations/${reservation.id}/approve`
      );

      expect(res.status).toBe(200);
      const rows = await storedEmails(reservation.id);
      expect(rows.some((row) => row.recipientRole === "driver")).toBe(false);
      expect(rows.find((row) => row.recipientRole === "requestor").body).toContain(
        "Driver: No driver assigned."
      );
    });
  });

  describe("US-7.3 — Email the requestor when a reservation is denied", () => {
    it("Denied reservation emails the requestor with the reason", async () => {
      const { token: adminToken } = await signIn("system_admin", { email: "admin@eagles.oc.edu" });
      const { user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu", fName: "Jane", lName: "Doe" });
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        driverEmail: "sdriver@eagles.oc.edu",
        status: "pending",
      });

      const res = await authed(adminToken)
        .post(`/vehicleScheduling/reservations/${reservation.id}/deny`)
        .send({ reason: "The van is already booked." });

      expect(res.status).toBe(200);
      expect(res.body.emails).toBeUndefined();
      const rows = await storedEmails(reservation.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].recipientEmail).toBe("jdoe@eagles.oc.edu");
      expect(rows[0].recipientRole).toBe("requestor");
      expect(rows[0].subject).toBe("Vehicle request denied");
      expect(rows[0].body).toContain("Your vehicle request was denied.");
      expect(rows[0].body).toContain("Reason: The van is already booked.");
    });

    it("Rejected denial sends no email", async () => {
      const { token: adminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor");
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        status: "pending",
      });

      const res = await authed(adminToken)
        .post(`/vehicleScheduling/reservations/${reservation.id}/deny`)
        .send({ reason: "   " });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("A denial reason is required.");
      expect(await storedEmails(reservation.id)).toHaveLength(0);
    });
  });

  describe("US-7.4 — Email the other parties when a reservation is cancelled", () => {
    it("Requestor cancellation emails system admins, the area, and the driver", async () => {
      const area = await createAreaMailbox();
      const { user: admin } = await signIn("system_admin", { email: "admin@eagles.oc.edu" });
      const { token, user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu", fName: "Jane", lName: "Doe" });
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        areaName: area.name,
        driverEmail: "sdriver@eagles.oc.edu",
        status: "pending",
      });

      const res = await authed(token).post(`/vehicleScheduling/reservations/${reservation.id}/cancel`);

      expect(res.status).toBe(200);
      const rows = await storedEmails(reservation.id);
      expect(rows.map((row) => row.recipientEmail)).toEqual([
        admin.email,
        "athletics-transport@eagles.oc.edu",
        "sdriver@eagles.oc.edu",
      ]);
      expect(rows.every((row) => row.body.includes("The requestor cancelled this vehicle request."))).toBe(true);
      expect(rows.some((row) => row.recipientEmail === user.email)).toBe(false);
    });

    it("Admin cancellation emails the requestor and the driver", async () => {
      const area = await createAreaMailbox();
      const { token: adminToken, user: admin } = await signIn("system_admin", {
        email: "admin@eagles.oc.edu",
      });
      const { user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu", fName: "Jane", lName: "Doe" });
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        areaName: area.name,
        driverEmail: "sdriver@eagles.oc.edu",
        status: "approved",
      });

      const res = await authed(adminToken).post(
        `/vehicleScheduling/reservations/${reservation.id}/cancel`
      );

      expect(res.status).toBe(200);
      const rows = await storedEmails(reservation.id);
      expect(rows.map((row) => row.recipientRole)).toEqual(["requestor", "driver", "area"]);
      expect(rows.every((row) => row.body.includes("An administrator cancelled this vehicle request."))).toBe(true);
      expect(rows.some((row) => row.recipientEmail === admin.email)).toBe(false);
    });

    it("Cancellation with no driver emails only the required people", async () => {
      const { user: admin } = await signIn("system_admin", { email: "admin@eagles.oc.edu" });
      const { token, user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu" });
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        status: "approved",
      });

      const res = await authed(token).post(`/vehicleScheduling/reservations/${reservation.id}/cancel`);

      expect(res.status).toBe(200);
      const rows = await storedEmails(reservation.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].recipientEmail).toBe(admin.email);
      expect(rows[0].recipientRole).toBe("system_admin");
    });
  });

  describe("US-7.5 — Keep the reservation when email cannot be sent", () => {
    it("Mail failure still accepts the reservation and records failed", async () => {
      failMailFor(() => true);
      const { user: admin } = await signIn("system_admin", { email: "admin@eagles.oc.edu" });
      const { token, user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu" });
      const vehicle = await createVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: trip.start,
        end: trip.end,
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");
      const rows = await storedEmails(res.body.id);
      expect(rows.map((row) => row.recipientEmail)).toEqual([user.email, admin.email]);
      expect(rows.every((row) => row.status === "failed" && row.errorMessage === "Mail could not be sent.")).toBe(
        true
      );
    });

    it("One recipient fails and the other is sent", async () => {
      failMailFor((to) => to === "admin@eagles.oc.edu");
      await signIn("system_admin", { email: "admin@eagles.oc.edu" });
      const { token, user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu" });
      const vehicle = await createVehicle();

      const res = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: trip.start,
        end: trip.end,
      });

      expect(res.status).toBe(201);
      const rows = await storedEmails(res.body.id);
      expect(rows.find((row) => row.recipientEmail === user.email).status).toBe("sent");
      expect(rows.find((row) => row.recipientEmail === user.email).errorMessage).toBeNull();
      expect(rows.find((row) => row.recipientEmail === "admin@eagles.oc.edu").status).toBe("failed");
      expect(rows.find((row) => row.recipientEmail === "admin@eagles.oc.edu").errorMessage).toBe(
        "Mail could not be sent."
      );
    });

    it("Rejected transition records no email", async () => {
      const { token: adminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor");
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        status: "approved",
      });

      const res = await authed(adminToken).post(
        `/vehicleScheduling/reservations/${reservation.id}/approve`
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("This reservation cannot be approved.");
      expect(await storedEmails(reservation.id)).toHaveLength(0);
    });

    it("Owner can list emails for the reservation", async () => {
      const { token, user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu", fName: "Jane", lName: "Doe" });
      const vehicle = await createVehicle();
      const created = await authed(token).post("/vehicleScheduling/reservations").send({
        vehicleId: vehicle.id,
        destinationName: "Edmond High School",
        start: trip.start,
        end: trip.end,
      });

      const res = await authed(token).get(`/vehicleScheduling/reservations/${created.body.id}/emails`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          reservationId: created.body.id,
          recipientEmail: user.email,
          fromEmail: FROM_EMAIL,
          subject: "Vehicle request submitted",
          status: "sent",
          errorMessage: null,
        })
      );
      expect(res.body[0].body).toContain("Your vehicle request was submitted and is waiting for approval.");
      expect(res.body[0].sentAt).toBeTruthy();
    });

    it("Email records cannot be changed or deleted", async () => {
      const { token: adminToken } = await signIn("system_admin");
      const { user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu" });
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        status: "pending",
      });
      const email = await db.email.create({
        reservationId: reservation.id,
        event: "submitted",
        recipientEmail: user.email,
        recipientRole: "requestor",
        fromEmail: FROM_EMAIL,
        subject: "Vehicle request submitted",
        body: "original",
        status: "sent",
        errorMessage: null,
        sentAt: new Date(),
      });

      const put = await authed(adminToken).put(
        `/vehicleScheduling/reservations/${reservation.id}/emails/${email.id}`
      ).send({ body: "changed" });
      const del = await authed(adminToken).delete(
        `/vehicleScheduling/reservations/${reservation.id}/emails/${email.id}`
      );

      expect(put.status).toBe(404);
      expect(del.status).toBe(404);
      const saved = await db.email.findByPk(email.id);
      expect(saved.body).toBe("original");
    });
  });

  describe("US-7.6 — Keep email records private and out of the menu", () => {
    it("Another requestor cannot list the emails", async () => {
      const { user } = await signIn("requestor", { email: "jdoe@eagles.oc.edu" });
      const { token: otherToken } = await signIn("requestor", { email: "other@eagles.oc.edu" });
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        status: "pending",
      });

      const res = await authed(otherToken).get(`/vehicleScheduling/reservations/${reservation.id}/emails`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Reservation not found.");
    });

    it("Maintenance cannot list the emails", async () => {
      const { user } = await signIn("requestor");
      const { token } = await signIn("maintenance");
      const vehicle = await createVehicle();
      const reservation = await db.reservation.create({
        requestorId: user.id,
        vehicleId: vehicle.id,
        vehicleName: "2022 Ford Transit",
        destinationName: "Edmond High School",
        start: new Date("2026-12-02T14:00:00Z"),
        end: new Date("2026-12-02T18:00:00Z"),
        status: "pending",
      });

      const res = await authed(token).get(`/vehicleScheduling/reservations/${reservation.id}/emails`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Reservation not found.");
    });

    it("Missing token cannot list the emails", async () => {
      const res = await request(app).get("/vehicleScheduling/reservations/1/emails");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized! No token provided.");
    });
  });
});
