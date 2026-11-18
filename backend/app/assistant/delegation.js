import jwt from "jsonwebtoken";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";

const AUDIENCE = "assistant-tools";
const ISSUER = "vehicle-scheduling-api";
const UNAUTHORIZED = { message: "Unauthorized! Invalid or expired token." };

export function signToolToken(userId) {
  return jwt.sign({}, authConfig.secret, {
    subject: String(userId),
    audience: AUDIENCE,
    issuer: ISSUER,
    expiresIn: 120,
  });
}

export function verifyToolToken(token) {
  const decoded = jwt.verify(token, authConfig.secret, {
    audience: AUDIENCE,
    issuer: ISSUER,
  });
  const userId = Number(decoded.sub);
  if (!Number.isInteger(userId)) {
    throw new Error("Invalid tool token subject.");
  }
  return userId;
}

export async function authenticateToolToken(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json(UNAUTHORIZED);
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json(UNAUTHORIZED);
    }

    const userId = verifyToolToken(token);
    const user = await db.user.findByPk(userId, {
      include: [{ model: db.area }],
    });
    if (!user) {
      return res.status(401).json(UNAUTHORIZED);
    }

    req.user = {
      id: user.id,
      role: user.role,
      areaId: user.areaId ?? null,
      areaName: user.areaId != null ? user.area?.name ?? null : null,
    };
    return next();
  } catch {
    return res.status(401).json(UNAUTHORIZED);
  }
}
