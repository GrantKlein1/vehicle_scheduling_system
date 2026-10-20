import { Router } from "express";
import { login, logout } from "../controllers/auth.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.post("/login", login);
router.post("/logout", authenticate, logout);

export default router;
