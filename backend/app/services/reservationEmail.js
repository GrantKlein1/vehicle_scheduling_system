import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { isSystemAdmin } from "../authorization/roles.js";
import { FROM_EMAIL } from "../models/email.model.js";
import { sendMail } from "./mailTransport.js";

const FAILURE_MESSAGE = "Mail could not be sent.";

function formatWhen(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value ?? "");
  }
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fullName(user) {
  return `${user?.fName || ""} ${user?.lName || ""}`.trim();
}

function detailLines(reservation, requestor, { includeEmail = false, includeDriver = false, includeReason = false, includePickup = false, areaEmail = null } = {}) {
  const lines = [];
  if (includeReason && reservation.denialReason) {
    lines.push(`Reason: ${reservation.denialReason}`);
  }
  lines.push(`Requestor: ${fullName(requestor)}`);
  if (includeEmail) {
    lines.push(`Email: ${requestor.email}`);
  }
  lines.push(`Destination: ${reservation.destinationName}`);
  if (reservation.areaName) {
    lines.push(`Area: ${reservation.areaName}`);
  }
  lines.push(`Vehicle: ${reservation.vehicleName}`);
  if (includeDriver) {
    const driverName = reservation.driverName && String(reservation.driverName).trim();
    lines.push(`Driver: ${driverName || "No driver assigned."}`);
  }
  if (reservation.purpose && String(reservation.purpose).trim()) {
    lines.push(`Purpose: ${String(reservation.purpose).trim()}`);
  }
  lines.push(`Start: ${formatWhen(reservation.start)}`);
  lines.push(`End: ${formatWhen(reservation.end)}`);
  if (includePickup && areaEmail) {
    lines.push(`Pickup instructions: contact ${areaEmail}.`);
  }
  return lines;
}

function renderMessage(event, role, reservation, requestor, areaEmail, actorIsAdmin) {
  const details = (options) => detailLines(reservation, requestor, options).join("\n");

  if (event === "submitted" && role === "requestor") {
    return {
      subject: "Vehicle request submitted",
      body: `Your vehicle request was submitted and is waiting for approval.\n${details()}`,
    };
  }
  if (event === "submitted" && role === "system_admin") {
    return {
      subject: "Vehicle request submitted",
      body: `A vehicle request is waiting for your approval.\n${details({ includeEmail: true })}`,
    };
  }
  if (event === "submitted" && role === "area") {
    return {
      subject: "Vehicle request submitted",
      body: `A vehicle request is waiting for approval in ${reservation.areaName}.\n${details({ includeEmail: true })}`,
    };
  }
  if (event === "approved" && role === "requestor") {
    return {
      subject: "Vehicle request approved",
      body: `Your vehicle request was approved.\n${details({ includeDriver: true, includePickup: true, areaEmail })}`,
    };
  }
  if (event === "approved" && role === "driver") {
    return {
      subject: "You are assigned to a vehicle request",
      body: `You are the driver for this vehicle request.\n${details({ includePickup: true, areaEmail })}`,
    };
  }
  if (event === "approved" && role === "area") {
    return {
      subject: "Vehicle request approved",
      body: `A vehicle request for your area was approved.\n${details({ includeEmail: true, includeDriver: true })}`,
    };
  }
  if (event === "denied") {
    return {
      subject: "Vehicle request denied",
      body: `Your vehicle request was denied.\n${details({ includeReason: true })}`,
    };
  }
  if (event === "cancelled" && !actorIsAdmin) {
    return {
      subject: "Vehicle request cancelled",
      body: `The requestor cancelled this vehicle request.\n${details({ includeEmail: true })}`,
    };
  }
  return {
    subject: "Vehicle request cancelled",
    body: `An administrator cancelled this vehicle request.\n${details({ includeEmail: true })}`,
  };
}

async function areaNotificationEmail(areaName) {
  if (!areaName || !String(areaName).trim()) {
    return null;
  }
  const wanted = String(areaName).trim().toLowerCase();
  const areas = await db.area.findAll();
  const match = areas.find((area) => String(area.name || "").trim().toLowerCase() === wanted);
  const email = match?.notificationEmail ? String(match.notificationEmail).trim() : "";
  return email || null;
}

async function systemAdmins() {
  return db.user.findAll({
    where: { role: { [Op.in]: ["system_admin", "admin"] } },
    order: [["id", "ASC"]],
  });
}

function pushRecipient(list, seen, email, role) {
  const address = email ? String(email).trim() : "";
  if (!address) {
    return;
  }
  const key = address.toLowerCase();
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  list.push({ email: address, role });
}

async function buildRecipients(reservation, event, actor, areaEmail) {
  const requestor = await db.user.findByPk(reservation.requestorId);
  const admins = await systemAdmins();
  const driverEmail = reservation.driverEmail ? String(reservation.driverEmail).trim() : "";
  const actorIsAdmin = Boolean(actor && (isSystemAdmin(actor) || actor.role === "area_admin"));
  const actorEmail = actor?.email ? String(actor.email).trim().toLowerCase() : "";
  const list = [];
  const seen = new Set();

  const add = (email, role) => pushRecipient(list, seen, email, role);

  if (event === "submitted") {
    add(requestor?.email, "requestor");
    for (const admin of admins) {
      add(admin.email, "system_admin");
    }
    add(areaEmail, "area");
  } else if (event === "approved") {
    add(requestor?.email, "requestor");
    add(driverEmail, "driver");
    add(areaEmail, "area");
  } else if (event === "denied") {
    add(requestor?.email, "requestor");
  } else if (event === "cancelled" && !actorIsAdmin) {
    for (const admin of admins) {
      add(admin.email, "system_admin");
    }
    add(areaEmail, "area");
    add(driverEmail, "driver");
  } else if (event === "cancelled") {
    add(requestor?.email, "requestor");
    add(driverEmail, "driver");
    if (isSystemAdmin(actor)) {
      add(areaEmail, "area");
    }
  }

  return {
    requestor,
    actorIsAdmin,
    recipients: list.filter((recipient) => recipient.email.toLowerCase() !== actorEmail || event !== "cancelled"),
  };
}

export async function dispatchReservationEmail({ reservation, event, actor }) {
  try {
    const areaEmail = await areaNotificationEmail(reservation.areaName);
    const { requestor, actorIsAdmin, recipients } = await buildRecipients(
      reservation,
      event,
      actor,
      areaEmail
    );
    if (!requestor) {
      return;
    }

    for (const recipient of recipients) {
      const message = renderMessage(event, recipient.role, reservation, requestor, areaEmail, actorIsAdmin);
      let status = "sent";
      let errorMessage = null;
      try {
        await sendMail({
          from: FROM_EMAIL,
          to: recipient.email,
          subject: message.subject,
          text: message.body,
        });
        logger.info(`Reservation ${reservation.id} ${event} email recorded for ${recipient.email}`);
      } catch (err) {
        status = "failed";
        errorMessage = FAILURE_MESSAGE;
        logger.warn(`Reservation ${reservation.id} email to ${recipient.email} failed: ${err.message}`);
      }

      await db.email.create({
        reservationId: reservation.id,
        event,
        recipientEmail: recipient.email,
        recipientRole: recipient.role,
        fromEmail: FROM_EMAIL,
        subject: message.subject,
        body: message.body,
        status,
        errorMessage,
        sentAt: new Date(),
      });
    }
  } catch (err) {
    logger.error(`Reservation email dispatch failed: ${err.message}`);
  }
}
