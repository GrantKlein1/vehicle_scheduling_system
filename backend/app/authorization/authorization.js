import jwt from "jsonwebtoken";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import { canAccessArea, isAnyAdmin, isSystemAdmin } from "./roles.js";

export { canAccessArea, isAnyAdmin, isAreaAdmin, isSystemAdmin, ROLES } from "./roles.js";

const NO_TOKEN = { message: "Unauthorized! No token provided." };

function forbid(res, message) {
  return res.status(403).json({ message });
}

function requireSignedIn(req, res) {
  if (!req.user?.id) {
    res.status(401).json(NO_TOKEN);
    return false;
  }
  return true;
}

/** Full access. Area admins do not pass. Legacy role `admin` passes. */
export function requireSystemAdmin(req, res, next) {
  if (!requireSignedIn(req, res)) {
    return undefined;
  }
  if (isSystemAdmin(req.user)) {
    return next();
  }
  return forbid(res, "System admin role required.");
}

/** System admins and area admins. Requestors and maintenance do not pass. */
export function requireAnyAdmin(req, res, next) {
  if (!requireSignedIn(req, res)) {
    return undefined;
  }
  if (isAnyAdmin(req.user)) {
    return next();
  }
  return forbid(res, "Admin role required.");
}

/**
 * System admins pass for every area. Area admins pass only for their own area.
 * `resolveArea` may be an id, a name, an `{ id, name }` object, or a function of req.
 */
export function requireAreaAccess(resolveArea) {
  return (req, res, next) => {
    if (!requireSignedIn(req, res)) {
      return undefined;
    }
    const area = typeof resolveArea === "function" ? resolveArea(req) : resolveArea;
    if (canAccessArea(req.user, area)) {
      return next();
    }
    return forbid(res, "You do not have access to this area.");
  };
}

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

  const user = await db.user.findByPk(session.userId, {
    include: [{ model: db.area }],
  });
  if (!user) {
    return res.status(401).json({ message: "Unauthorized! Invalid or expired token." });
  }

  req.user = {
    id: user.id,
    role: user.role,
    areaId: user.areaId ?? null,
    areaName: user.areaId != null ? user.area?.name ?? null : null,
  };
  return next();
}
