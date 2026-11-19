import { Router } from "express";
import { authenticate } from "../authorization/authorization.js";
import { authenticateToolToken } from "../assistant/delegation.js";
import { assistantRateLimit } from "../assistant/rateLimit.js";
import { chat } from "../assistant/gateway.controller.js";
import { planTrip } from "../assistant/trip.controller.js";
import { runTool } from "../assistant/tools.controller.js";

const router = Router();

router.post("/chat", authenticate, assistantRateLimit, chat);
router.post("/trip", authenticate, assistantRateLimit, planTrip);
router.post("/tools/:name", authenticateToolToken, runTool);

export default router;
