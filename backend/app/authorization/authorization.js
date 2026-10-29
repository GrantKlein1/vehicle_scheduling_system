import jwt from "jsonwebtoken";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized! No token provided." });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ message: "Unauthorized! No token provided." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, authConfig.secret);
  } catch {
    return res.status(401).json({ message: "Unauthorized! Invalid or expired token." });
  }

  const session = await db.session.findOne({ where: { token } });
  if (!session || new Date(session.expirationDate).getTime() <= Date.now()) {
    return res.status(401).json({ message: "Unauthorized! Invalid or expired token." });
  }

  if (Number(decoded?.id) !== Number(session.userId)) {
    return res.status(401).json({ message: "Unauthorized! Invalid or expired token." });
  }

  const user = await db.user.findByPk(session.userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized! Invalid or expired token." });
  }

  req.user = { id: user.id, role: user.role };
  return next();
}

function isFullAdmin(role) {
  // Feature 1 rewrites `admin` to `system_admin` in a shared database.
  return role === "admin" || role === "system_admin";
}

export function requireFleetAccess(req, res, next) {
  if (isFullAdmin(req.user?.role) || req.user?.role === "maintenance") {
    return next();
  }

  return res.status(403).json({ message: "Admin role required." });
}

export function requireAdmin(req, res, next) {
  if (isFullAdmin(req.user?.role)) {
    return next();
  }

  return res.status(403).json({ message: "Admin role required." });
}
