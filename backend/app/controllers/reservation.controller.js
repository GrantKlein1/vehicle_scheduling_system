import fs from "fs";
import path from "path";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { dispatchReservationEmail } from "../services/reservationEmail.js";
import {
  canSeeReservation,
  reservationScopeWhere,
  validateReservationInput,
  vehicleDisplayName,
} from "../services/reservationQueries.js";

export async function createReservation(req, res) {
  try {
    const validated = await validateReservationInput(req.body);
    if (validated.error) {
      return res.status(validated.error.status).json({ message: validated.error.message });
    }

    const { start, end, purpose, driverName, driverEmail, passengers, notes } = req.body ?? {};
    const {
      vehicle,
      startDate,
      endDate,
      destinationName: finalDestination,
      areaName: finalAreaName,
      passengers: storedPassengers,
      purpose: storedPurpose,
      driverName: storedDriverName,
      driverEmail: storedDriverEmail,
      notes: storedNotes,
    } = validated.value;
    const vehicleName = vehicleDisplayName(vehicle);
    const passengerCount = passengers ? parseInt(passengers, 10) : 1;

    const reservation = await db.reservation.create({
      requestorId: req.user.id,
      status: "pending",
      vehicleId: vehicle.id,
      vehicleName,
      destinationName: finalDestination,
      start: startDate,
      end: endDate,
      areaName: finalAreaName,
      purpose: storedPurpose,
      driverName: storedDriverName,
      driverEmail: storedDriverEmail,
      passengers: storedPassengers,
      notes: storedNotes,
      denialReason: null,
      summaryFilePath: null,
    });

    // FR-011: Text summary file generation
    try {
      const storageDir = path.resolve(process.cwd(), "storage", "reservations");
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      const summaryFileName = `reservation-${reservation.id}.txt`;
      const summaryFilePath = path.join(storageDir, summaryFileName);
      const user = await db.user.findByPk(req.user.id);
      const requestorName = user
        ? `${user.fName || ""} ${user.lName || ""}`.trim()
        : `User ${req.user.id}`;
      const requestorEmail = user?.email || "";
      const textContent = [
        `Reservation ID: ${reservation.id}`,
        `Requestor: ${requestorName} (${requestorEmail})`,
        `Vehicle: ${vehicleName}`,
        `Destination: ${finalDestination}`,
        `Start Time: ${start}`,
        `End Time: ${end}`,
        `Area: ${finalAreaName || "None"}`,
        `Driver: ${driverName || "No driver assigned"}${driverEmail ? ` (${driverEmail})` : ""}`,
        `Purpose: ${purpose || "None"}`,
        `Passengers: ${passengerCount}`,
        `Notes: ${notes || "None"}`,
        `Status: pending`,
      ].join("\n");

      fs.writeFileSync(summaryFilePath, textContent, "utf8");
      reservation.summaryFilePath = `storage/reservations/${summaryFileName}`;
      await reservation.save();
    } catch (fsErr) {
      logger.warn(`Failed to generate summary file: ${fsErr.message}`);
    }

    await dispatchReservationEmail({ reservation, event: "submitted", actor: req.user });

    return res.status(201).json(reservation);
  } catch (err) {
    logger.error(`Error creating reservation: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
}

export async function listReservations(req, res) {
  try {
    const whereClause = reservationScopeWhere(req.user);
    if (!whereClause) {
      return res.status(403).json({ message: "Admin role required." });
    }

    const reservations = await db.reservation.findAll({
      where: whereClause,
      order: [
        ["start", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.json(reservations);
  } catch (err) {
    logger.error(`Error listing reservations: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
}

export async function getReservation(req, res) {
  try {
    const reservation = await db.reservation.findByPk(req.params.id);
    if (!reservation || !canSeeReservation(req.user, reservation)) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    return res.json(reservation);
  } catch (err) {
    logger.error(`Error fetching reservation: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
}

export async function approveReservation(req, res) {
  try {
    if (
      req.user.role !== "system_admin" &&
      req.user.role !== "admin" &&
      req.user.role !== "area_admin"
    ) {
      return res.status(403).json({ message: "Admin role required." });
    }

    const reservation = await db.reservation.findByPk(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    if (req.user.role === "area_admin" && reservation.areaName !== req.user.areaName) {
      return res.status(403).json({ message: "Area admin access restricted." });
    }

    if (reservation.status !== "pending") {
      return res.status(400).json({ message: "This reservation cannot be approved." });
    }

    reservation.status = "approved";
    await reservation.save();
    await dispatchReservationEmail({ reservation, event: "approved", actor: req.user });

    return res.json(reservation);
  } catch (err) {
    logger.error(`Error approving reservation: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
}

export async function denyReservation(req, res) {
  try {
    if (
      req.user.role !== "system_admin" &&
      req.user.role !== "admin" &&
      req.user.role !== "area_admin"
    ) {
      return res.status(403).json({ message: "Admin role required." });
    }

    const reason = req.body.reason ? String(req.body.reason).trim() : "";
    if (!reason) {
      return res.status(400).json({ message: "A denial reason is required." });
    }

    const reservation = await db.reservation.findByPk(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    if (req.user.role === "area_admin" && reservation.areaName !== req.user.areaName) {
      return res.status(403).json({ message: "Area admin access restricted." });
    }

    if (reservation.status !== "pending") {
      return res.status(400).json({ message: "This reservation cannot be denied." });
    }

    reservation.status = "denied";
    reservation.denialReason = reason;
    await reservation.save();
    await dispatchReservationEmail({ reservation, event: "denied", actor: req.user });

    return res.json(reservation);
  } catch (err) {
    logger.error(`Error denying reservation: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
}

export async function cancelReservation(req, res) {
  try {
    const reservation = await db.reservation.findByPk(req.params.id);
    if (!reservation || !canSeeReservation(req.user, reservation)) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    if (reservation.status === "denied" || reservation.status === "cancelled") {
      return res.status(400).json({ message: "This reservation cannot be cancelled." });
    }

    reservation.status = "cancelled";
    await reservation.save();
    await dispatchReservationEmail({ reservation, event: "cancelled", actor: req.user });

    return res.json(reservation);
  } catch (err) {
    logger.error(`Error cancelling reservation: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
}
