import { Router } from "express";
import { authenticate } from "../authorization/authorization.js";
import {
  createReservation,
  listReservations,
  getReservation,
  approveReservation,
  denyReservation,
  cancelReservation,
} from "../controllers/reservation.controller.js";

const router = Router();

router.use(authenticate);

router.post("/reservations", createReservation);
router.get("/reservations", listReservations);
router.get("/reservations/:id", getReservation);
router.post("/reservations/:id/approve", approveReservation);
router.post("/reservations/:id/deny", denyReservation);
router.post("/reservations/:id/cancel", cancelReservation);

export default router;
