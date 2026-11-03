import { Router } from "express";
import { authenticate, requireAnyAdmin } from "../authorization/authorization.js";
import {
  createDriver,
  deleteDriver,
  listDrivers,
  updateDriver,
} from "../controllers/driver.controller.js";

const router = Router();

router.post("/drivers", authenticate, requireAnyAdmin, createDriver);
router.get("/drivers", authenticate, listDrivers);
router.put("/drivers/:driverId", authenticate, requireAnyAdmin, updateDriver);
router.delete("/drivers/:driverId", authenticate, requireAnyAdmin, deleteDriver);

export default router;
