import db from "../models/index.js";
import logger from "../config/logger.js";
import { isSystemAdmin } from "../authorization/roles.js";

async function readableReservation(req) {
  if (req.user.role === "maintenance") {
    return null;
  }

  const reservation = await db.reservation.findByPk(req.params.id);
  if (!reservation) {
    return null;
  }

  if (isSystemAdmin(req.user)) {
    return reservation;
  }

  if (req.user.role === "area_admin") {
    return reservation.areaName === req.user.areaName ? reservation : null;
  }

  if (req.user.role === "requestor" && reservation.requestorId === req.user.id) {
    return reservation;
  }

  return null;
}

function present(row) {
  return {
    id: row.id,
    reservationId: row.reservationId,
    event: row.event,
    recipientEmail: row.recipientEmail,
    recipientRole: row.recipientRole,
    fromEmail: row.fromEmail,
    subject: row.subject,
    body: row.body,
    status: row.status,
    errorMessage: row.errorMessage,
    sentAt: row.sentAt,
  };
}

export async function listReservationEmails(req, res) {
  try {
    const reservation = await readableReservation(req);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found." });
    }

    const rows = await db.email.findAll({
      where: { reservationId: reservation.id },
      order: [
        ["sentAt", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json(rows.map(present));
  } catch (err) {
    logger.error(`Error listing reservation emails: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
}

export function rejectEmailMutation(_req, res) {
  return res.status(404).json({ message: "Not found." });
}
