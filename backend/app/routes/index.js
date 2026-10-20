import { Router } from "express";
import authRoutes from "./auth.routes.js";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const vehicleSchedulingRouter = Router();
vehicleSchedulingRouter.use(authRoutes);

export { apiRouter, vehicleSchedulingRouter };
