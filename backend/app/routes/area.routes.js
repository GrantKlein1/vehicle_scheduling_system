import { Router } from "express";
import { authenticate, requireSystemAdmin } from "../authorization/authorization.js";
import {
  assignAreaAdmin,
  createArea,
  deleteArea,
  getArea,
  listAreaAdmins,
  listAreas,
  removeAreaAdmin,
  updateArea,
} from "../controllers/area.controller.js";

const router = Router();

router.use(authenticate);
router.use(requireSystemAdmin);

router.post("/areas", createArea);
router.get("/areas", listAreas);
router.get("/areas/:areaId", getArea);
router.put("/areas/:areaId", updateArea);
router.delete("/areas/:areaId", deleteArea);

router.get("/areas/:areaId/admins", listAreaAdmins);
router.post("/areas/:areaId/admins", assignAreaAdmin);
router.delete("/areas/:areaId/admins/:userId", removeAreaAdmin);

export default router;

