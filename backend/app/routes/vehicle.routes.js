import { Router } from "express";
import { authenticate, requireAdmin, requireFleetAccess } from "../authorization/authorization.js";
import {
  createMileageLog,
  createServiceLog,
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} from "../controllers/vehicle.controller.js";

const router = Router();

router.post("/vehicles", authenticate, requireAdmin, createVehicle);
router.get("/vehicles", authenticate, requireFleetAccess, listVehicles);
router.get("/vehicles/:vehicleId", authenticate, requireFleetAccess, getVehicle);
router.put("/vehicles/:vehicleId", authenticate, requireAdmin, updateVehicle);
router.delete("/vehicles/:vehicleId", authenticate, requireAdmin, deleteVehicle);
router.post("/vehicles/:vehicleId/mileage-logs", authenticate, requireFleetAccess, createMileageLog);
router.post("/vehicles/:vehicleId/service-logs", authenticate, requireFleetAccess, createServiceLog);

export default router;
