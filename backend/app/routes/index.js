import { Router } from "express";
import authRoutes from "./auth.routes.js";
import vehicleRoutes from "./vehicle.routes.js";
import driverRoutes from "./driver.routes.js";
import areaRoutes from "./area.routes.js";
import assistantRoutes from "./assistant.routes.js";
import reservationRoutes from "./reservation.routes.js";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use(authRoutes);
apiRouter.use("/vehicle", vehicleRoutes);
apiRouter.use("/driver", driverRoutes);
apiRouter.use("/area", areaRoutes);
// Assistant is mounted before reservation routes. reservation.routes.js authenticates
// every request that reaches it, which would reject a tool token on /assistant/tools.
apiRouter.use("/assistant", assistantRoutes);
apiRouter.use(reservationRoutes);

const vehicleSchedulingRouter = Router();
vehicleSchedulingRouter.use(authRoutes);
vehicleSchedulingRouter.use(reservationRoutes);

export { apiRouter, vehicleSchedulingRouter };
