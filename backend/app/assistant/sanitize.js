import { vehicleDisplayName } from "../services/reservationQueries.js";

const CHAT_ROLES = new Set(["user", "assistant"]);
const MAX_MESSAGES = 20;
const MAX_CONTENT = 2000;

function toIso(value) {
  if (value == null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}

export function toReservationSummary(reservation) {
  const requestor = reservation.requestor;
  const requestorName = `${requestor?.fName || ""} ${requestor?.lName || ""}`.trim();
  return {
    id: reservation.id,
    status: reservation.status,
    requestorId: reservation.requestorId,
    requestorName,
    vehicleId: reservation.vehicleId,
    vehicleName: reservation.vehicleName,
    destinationName: reservation.destinationName,
    start: toIso(reservation.start),
    end: toIso(reservation.end),
    areaName: reservation.areaName ?? null,
    purpose: reservation.purpose ?? null,
    driverName: reservation.driverName ?? null,
    driverEmail: reservation.driverEmail ?? null,
    passengers: reservation.passengers,
    notes: reservation.notes ?? null,
    denialReason: reservation.denialReason ?? null,
  };
}

export function toAvailableVehicle(vehicle) {
  return {
    id: vehicle.id,
    name: vehicleDisplayName(vehicle),
    category: vehicle.category,
    passengerCapacity: vehicle.passengerCapacity,
    areaAssigned: vehicle.areaAssigned,
  };
}

export function toFleetVehicle(vehicle) {
  return {
    id: vehicle.id,
    name: vehicleDisplayName(vehicle),
    category: vehicle.category,
    status: vehicle.status,
    passengerCapacity: vehicle.passengerCapacity,
    areaAssigned: vehicle.areaAssigned,
    licensePlateNumber: vehicle.licensePlateNumber ?? null,
  };
}

export function toDriver(driver) {
  return {
    id: driver.id,
    name: `${driver.firstName} ${driver.lastName}`.trim(),
    status: driver.status,
    approvedCategories: driver.approvedCategories ?? null,
  };
}

export function toDestination(destination) {
  return {
    id: destination.id,
    name: destination.name,
    addressLine1: destination.addressLine1,
    addressLine2: destination.addressLine2 ?? null,
    city: destination.city,
    state: destination.state,
    zip: destination.zip,
  };
}

export function toArea(area) {
  return {
    id: area.id,
    name: area.name,
    notificationEmail: area.notificationEmail ?? null,
  };
}

export function toEmailSummary(email) {
  return {
    recipientRole: email.recipientRole,
    eventType: email.event,
    status: email.status,
    sentAt: toIso(email.sentAt),
    subject: email.subject,
  };
}

/**
 * Drop non user/assistant roles, keep the last 20, and truncate each content to 2000 characters.
 * Returns null when the last kept message is not a non-empty user turn.
 */
export function sanitizeChatMessages(messages) {
  if (!Array.isArray(messages)) {
    return null;
  }

  const kept = [];
  for (const message of messages) {
    if (!message || typeof message !== "object" || !CHAT_ROLES.has(message.role)) {
      continue;
    }
    const content = typeof message.content === "string" ? message.content.slice(0, MAX_CONTENT) : "";
    kept.push({ role: message.role, content });
  }

  const limited = kept.slice(-MAX_MESSAGES);
  const last = limited[limited.length - 1];
  if (!last || last.role !== "user" || last.content.trim() === "") {
    return null;
  }
  return limited;
}
