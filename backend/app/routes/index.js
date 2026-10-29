import { Router } from "express";
import authRoutes from "./auth.routes.js";
import vehicleRoutes from "./vehicle.routes.js";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use(authRoutes);
apiRouter.use("/vehicle", vehicleRoutes);

const vehicleSchedulingRouter = Router();
vehicleSchedulingRouter.use(authRoutes);

export { apiRouter, vehicleSchedulingRouter };
