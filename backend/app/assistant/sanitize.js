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

function dateOnly(value) {
  if (value == null || value === "") {
    return null;
  }
  return String(value).slice(0, 10);
}

export function toFleetVehicle(vehicle) {
  return {
    id: vehicle.id,
    name: vehicleDisplayName(vehicle),
    category: vehicle.category,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin ?? null,
    purchasedDate: dateOnly(vehicle.purchasedDate),
    color: vehicle.color,
    status: vehicle.status,
    passengerCapacity: vehicle.passengerCapacity,
    areaAssigned: vehicle.areaAssigned,
    licensePlateNumber: vehicle.licensePlateNumber ?? null,
    licensePlateExpirationMonth: vehicle.licensePlateExpirationMonth ?? null,
  };
}

export function toMileageLog(log) {
  return {
    id: log.id,
    entryDate: dateOnly(log.entryDate),
    currentMileage: log.currentMileage,
  };
}

export function toServiceLog(log) {
  return {
    id: log.id,
    entryDate: dateOnly(log.entryDate),
    servicePerformed: log.servicePerformed,
    comments: log.comments ?? null,
  };
}

export function toDriver(driver) {
  return {
    id: driver.id,
    name: `${driver.firstName} ${driver.lastName}`.trim(),
    firstName: driver.firstName,
    lastName: driver.lastName,
    status: driver.status,
    approvedCategories: driver.approvedCategories ?? null,
    driverLicenseNumber: driver.driverLicenseNumber,
    driverLicenseExpDate: dateOnly(driver.driverLicenseExpDate),
    insuranceProvider: driver.insuranceProvider,
    insuranceNumber: driver.insuranceNumber,
    approvedDate: dateOnly(driver.approvedDate),
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

export function toArea(area, admins = []) {
  return {
    id: area.id,
    name: area.name,
    logo: area.logo ?? null,
    notificationEmail: area.notificationEmail ?? null,
    admins,
  };
}

export function toEmailSummary(email) {
  return {
    id: email.id,
    reservationId: email.reservationId,
    event: email.event,
    recipientRole: email.recipientRole,
    recipientEmail: email.recipientEmail,
    fromEmail: email.fromEmail,
    subject: email.subject,
    body: email.body,
    status: email.status,
    errorMessage: email.errorMessage ?? null,
    sentAt: toIso(email.sentAt),
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
