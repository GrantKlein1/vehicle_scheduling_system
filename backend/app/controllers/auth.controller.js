import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import logger from "../config/logger.js";
import { verifyGoogleCredential } from "../services/googleAuth.js";
import { ROLES } from "../authorization/roles.js";

const SESSION_MS = 24 * 60 * 60 * 1000;

async function getOrCreateSession(user) {
  const existing = await db.session.findOne({
    where: {
      userId: user.id,
      expirationDate: { [Op.gt]: new Date() },
    },
    order: [["id", "DESC"]],
  });

  if (existing) {
    return existing;
  }

  const token = jwt.sign({ id: user.id }, authConfig.secret, { expiresIn: "24h" });
  const expirationDate = new Date(Date.now() + SESSION_MS);

  return db.session.create({
    token,
    email: user.email,
    expirationDate,
    userId: user.id,
  });
}

function sessionPayload(user, token, areaName) {
  return {
    userId: user.id,
    email: user.email,
    fName: user.fName,
    lName: user.lName,
    role: user.role,
    areaId: user.areaId ?? null,
    areaName: user.areaId != null ? areaName ?? null : null,
    token,
  };
}

async function resolveAreaName(user) {
  if (user.areaId == null) {
    return null;
  }
  if (user.area?.name) {
    return user.area.name;
  }
  const area = await db.area.findByPk(user.areaId);
  return area?.name ?? null;
}

export async function login(req, res) {
  try {
    const result = await verifyGoogleCredential(req.body?.credential);
    if (!result.ok) {
      return res.status(401).json({ message: result.message });
    }

    const { profile } = result;
    const withArea = { include: [{ model: db.area }] };
    let user = await db.user.findOne({ where: { googleSub: profile.sub }, ...withArea });

    if (!user) {
      user = await db.user.findOne({ where: { email: profile.email }, ...withArea });
    }

    let created = false;

    if (user) {
      const updates = {
        fName: profile.fName,
        lName: profile.lName,
      };
      if (!user.googleSub) {
        updates.googleSub = profile.sub;
      }
      if (user.role === ROLES.LEGACY_ADMIN) {
        updates.role = ROLES.SYSTEM_ADMIN;
        updates.areaId = null;
      }
      await user.update(updates);
    } else {
      user = await db.user.create({
        fName: profile.fName,
        lName: profile.lName,
        email: profile.email,
        googleSub: profile.sub,
        role: ROLES.REQUESTOR,
        areaId: null,
      });
      created = true;
    }

    const session = await getOrCreateSession(user);
    const areaName = await resolveAreaName(user);
    return res.status(created ? 201 : 200).json(sessionPayload(user, session.token, areaName));
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    return res.status(500).json({ message: "Sign-in could not be completed." });
  }
}

export async function logout(req, res) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

    await db.session.destroy({
      where: {
        token,
        userId: req.user.id,
      },
    });

    return res.status(200).json({ message: "Signed out." });
  } catch (error) {
    logger.error(`Logout failed: ${error.message}`);
    return res.status(500).json({ message: "Sign-out could not be completed." });
  }
}
