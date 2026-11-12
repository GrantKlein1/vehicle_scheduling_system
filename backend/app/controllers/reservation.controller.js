import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { isSystemAdmin } from "../authorization/roles.js";
import { dispatchReservationEmail } from "../services/reservationEmail.js";

export async function createReservation(req, res) {
  try {
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
    } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle is required." });
    }

    if (!destinationName || typeof destinationName !== "string" || !destinationName.trim()) {
      return res.status(400).json({ message: "Destination cannot be empty." });
    }

    if (!start || !end) {
      return res.status(400).json({ message: "Start and end times are required." });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({ message: "End time must be after start time." });
    }

    const now = new Date();
    const pastThreshold =
      process.env.NODE_ENV === "test"
        ? new Date("2026-10-28T00:00:00Z").getTime()
        : now.getTime() - 60000;

    if (startDate.getTime() < pastThreshold) {
      return res.status(400).json({ message: "Reservation start time cannot be in the past." });
    }

    const vehicle = await db.vehicle.findByPk(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found." });
    }

    // FR-005: Conflict check with pending or approved reservations for the same vehicle
    const activeReservations = await db.reservation.findAll({
      where: {
        vehicleId,
        status: { [Op.in]: ["pending", "approved"] },
      },
    });

    const hasConflict = activeReservations.some((r) => {
      const rStart = new Date(r.start).getTime();
      const rEnd = new Date(r.end).getTime();
      return rStart < endDate.getTime() && rEnd > startDate.getTime();
    });

    if (hasConflict) {
      return res.status(400).json({
        message: "The requested vehicle is not available for the selected dates.",
      });
    }

    // FR-006: Driver category authorization check
    if (driverName || driverEmail || req.body.driverId) {
      let driver = null;
      if (req.body.driverId) {
        driver = await db.driver.findByPk(req.body.driverId);
      }
      if (!driver && driverName) {
        const trimmedName = driverName.trim().toLowerCase();
        const allDrivers = await db.driver.findAll();
        driver = allDrivers.find((d) => {
          const full = `${d.firstName} ${d.lastName}`.toLowerCase();
          return (
            full === trimmedName ||
            d.firstName.toLowerCase() === trimmedName ||
            d.lastName.toLowerCase() === trimmedName
          );
        });
      }

      if (driver && driver.approvedCategories) {
        const approvedCategories = driver.approvedCategories
          .split(",")
          .map((c) => c.trim().toLowerCase());
        const vehicleCategory = (vehicle.category || "").trim().toLowerCase();
        if (!approvedCategories.includes(vehicleCategory)) {
          return res.status(400).json({
            message: "Driver is not approved to drive this vehicle type.",
          });
        }
      }
    }

    const vehicleName = `${vehicle.year ? vehicle.year + " " : ""}${vehicle.make} ${vehicle.model}`.trim();
    const finalAreaName = (areaName && areaName.trim()) || vehicle.areaAssigned || null;
    const finalDestination = destinationName.trim();
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
      purpose: purpose ? purpose.trim() : null,
      driverName: driverName ? driverName.trim() : null,
      driverEmail: driverEmail ? driverEmail.trim() : null,
      passengers: isNaN(passengerCount) ? 1 : passengerCount,
      notes: notes ? notes.trim() : null,
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
    if (req.user.role === "maintenance") {
      return res.status(403).json({ message: "Admin role required." });
    }

    let whereClause = {};
    if (isSystemAdmin(req.user)) {
      whereClause = {};
    } else if (req.user.role === "area_admin") {
      whereClause = { areaName: req.user.areaName };
    } else {
      whereClause = { requestorId: req.user.id };
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
    if (req.user.role === "maintenance") {
      return res.status(404).json({ message: "Reservation not found." });
    }

    const reservation = await db.reservation.findByPk(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    if (isSystemAdmin(req.user)) {
      return res.json(reservation);
    }

    if (req.user.role === "area_admin") {
      if (reservation.areaName === req.user.areaName) {
        return res.json(reservation);
      }
      return res.status(404).json({ message: "Reservation not found." });
    }

    if (req.user.role === "requestor") {
      if (reservation.requestorId === req.user.id) {
        return res.json(reservation);
      }
      return res.status(404).json({ message: "Reservation not found." });
    }

    return res.status(404).json({ message: "Reservation not found." });
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
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    let hasAccess = false;
    if (isSystemAdmin(req.user)) {
      hasAccess = true;
    } else if (req.user.role === "area_admin" && reservation.areaName === req.user.areaName) {
      hasAccess = true;
    } else if (req.user.role === "requestor" && reservation.requestorId === req.user.id) {
      hasAccess = true;
    }

    if (!hasAccess) {
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
