import { Op } from "sequelize";
import db from "../models/index.js";
import { isSystemAdmin } from "../authorization/roles.js";

/** Feature 6 past-start threshold. Tests use a fixed clock; otherwise now minus 60 seconds. */
export function getPastThreshold() {
  const now = new Date();
  return process.env.NODE_ENV === "test"
    ? new Date("2026-10-28T00:00:00Z").getTime()
    : now.getTime() - 60000;
}

/**
 * List scope for Feature 6. Maintenance returns null so the caller can deny.
 * System admin, including a legacy admin, sees every row.
 */
export function reservationScopeWhere(user) {
  if (user?.role === "maintenance") {
    return null;
  }
  if (isSystemAdmin(user)) {
    return {};
  }
  if (user?.role === "area_admin") {
    return { areaName: user.areaName };
  }
  return { requestorId: user?.id };
}

/** Same visibility rules as getReservation. Maintenance and unknown roles cannot see a row. */
export function canSeeReservation(user, reservation) {
  if (!user || !reservation || user.role === "maintenance") {
    return false;
  }
  if (isSystemAdmin(user)) {
    return true;
  }
  if (user.role === "area_admin") {
    return reservation.areaName === user.areaName;
  }
  if (user.role === "requestor") {
    return reservation.requestorId === user.id;
  }
  return false;
}

/** Pending or approved reservations on the vehicle that overlap [start, end). */
export async function findConflicts(vehicleId, startDate, endDate) {
  const activeReservations = await db.reservation.findAll({
    where: {
      vehicleId,
      status: { [Op.in]: ["pending", "approved"] },
    },
  });

  return activeReservations.filter((reservation) => {
    const existingStart = new Date(reservation.start).getTime();
    const existingEnd = new Date(reservation.end).getTime();
    return existingStart < endDate.getTime() && existingEnd > startDate.getTime();
  });
}

export function vehicleDisplayName(vehicle) {
  return `${vehicle.year ? vehicle.year + " " : ""}${vehicle.make} ${vehicle.model}`.trim();
}

/**
 * Feature 6 create checks, in the same order, plus the 255-character destination limit.
 * Unknown vehicles stay status 404 so createReservation can keep that response.
 */
export async function validateReservationInput(body) {
  const source = body ?? {};
  const {
    vehicleId,
    destinationName,
    start,
    end,
    areaName,
    purpose,
    driverName,
    driverEmail,
    passengers,
    notes,
  } = source;

  if (!vehicleId) {
    return { error: { status: 400, message: "Vehicle is required." } };
  }

  if (!destinationName || typeof destinationName !== "string" || !destinationName.trim()) {
    return { error: { status: 400, message: "Destination cannot be empty." } };
  }

  const finalDestination = destinationName.trim();
  if (finalDestination.length > 255) {
    return {
      error: { status: 400, message: "Destination cannot be longer than 255 characters." },
    };
  }

  if (!start || !end) {
    return { error: { status: 400, message: "Start and end times are required." } };
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
    return { error: { status: 400, message: "End time must be after start time." } };
  }

  if (startDate.getTime() < getPastThreshold()) {
    return { error: { status: 400, message: "Reservation start time cannot be in the past." } };
  }

  const vehicle = await db.vehicle.findByPk(vehicleId);
  if (!vehicle) {
    return { error: { status: 404, message: "Vehicle not found." } };
  }

  const conflicts = await findConflicts(vehicleId, startDate, endDate);
  if (conflicts.length > 0) {
    return {
      error: {
        status: 400,
        message: "The requested vehicle is not available for the selected dates.",
      },
    };
  }

  if (driverName || driverEmail || source.driverId) {
    let driver = null;
    if (source.driverId) {
      driver = await db.driver.findByPk(source.driverId);
    }
    if (!driver && driverName) {
      const trimmedName = driverName.trim().toLowerCase();
      const allDrivers = await db.driver.findAll();
      driver = allDrivers.find((candidate) => {
        const full = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
        return (
          full === trimmedName ||
          candidate.firstName.toLowerCase() === trimmedName ||
          candidate.lastName.toLowerCase() === trimmedName
        );
      });
    }

    if (driver && driver.approvedCategories) {
      const approvedCategories = driver.approvedCategories
        .split(",")
        .map((category) => category.trim().toLowerCase());
      const vehicleCategory = (vehicle.category || "").trim().toLowerCase();
      if (!approvedCategories.includes(vehicleCategory)) {
        return {
          error: { status: 400, message: "Driver is not approved to drive this vehicle type." },
        };
      }
    }
  }

  const passengerCount = passengers ? parseInt(passengers, 10) : 1;
  const finalAreaName = (areaName && areaName.trim()) || vehicle.areaAssigned || null;

  return {
    value: {
      vehicle,
      startDate,
      endDate,
      destinationName: finalDestination,
      areaName: finalAreaName,
      passengers: isNaN(passengerCount) ? 1 : passengerCount,
      purpose: purpose ? purpose.trim() : null,
      driverName: driverName ? driverName.trim() : null,
      driverEmail: driverEmail ? driverEmail.trim() : null,
      notes: notes ? notes.trim() : null,
    },
  };
}
