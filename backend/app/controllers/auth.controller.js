import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import logger from "../config/logger.js";
import { verifyGoogleCredential } from "../services/googleAuth.js";

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

function sessionPayload(user, token) {
  return {
    userId: user.id,
    email: user.email,
    fName: user.fName,
    lName: user.lName,
    role: user.role,
    token,
  };
}

export async function login(req, res) {
  try {
    const result = await verifyGoogleCredential(req.body?.credential);
    if (!result.ok) {
      return res.status(401).json({ message: result.message });
    }

    const { profile } = result;
    let user = await db.user.findOne({ where: { googleSub: profile.sub } });

    if (!user) {
      user = await db.user.findOne({ where: { email: profile.email } });
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
      await user.update(updates);
    } else {
      user = await db.user.create({
        fName: profile.fName,
        lName: profile.lName,
        email: profile.email,
        googleSub: profile.sub,
        role: "requestor",
      });
      created = true;
    }

    const session = await getOrCreateSession(user);
    return res.status(created ? 201 : 200).json(sessionPayload(user, session.token));
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
