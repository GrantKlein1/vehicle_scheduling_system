import jwt from "jsonwebtoken";
import db from "../app/models/index.js";
import authConfig from "../app/config/auth.config.js";

const DEV_DATABASE_NAME = "vehicle-scheduling-system-db";

/** Sync schema for tests. Refuses to force-sync the development MySQL database. */
export const syncTestDatabase = async () => {
  if (db.sequelize.getDialect() !== "sqlite") {
    const dbName = db.sequelize.config.database;
    if (!dbName || dbName === DEV_DATABASE_NAME) {
      throw new Error(`Refusing to force-sync database "${dbName || ""}" in tests.`);
    }
  }

  await db.sequelize.sync({ force: true });
};

export async function createArea(name = "Athletics") {
  return db.area.create({ name });
}

export async function createUser(overrides = {}) {
  return db.user.create({
    fName: "Jane",
    lName: "Doe",
    email: "jdoe@eagles.oc.edu",
    googleSub: "google-sub-jane",
    role: "requestor",
    areaId: null,
    ...overrides,
  });
}

/** Insert a pre-split admin row without model validation. */
export async function insertLegacyAdmin(overrides = {}) {
  const row = {
    fName: "Admin",
    lName: "User",
    email: "admin@eagles.oc.edu",
    googleSub: null,
    role: "admin",
    areaId: null,
    ...overrides,
  };

  await db.sequelize.query(
    "INSERT INTO users (fName, lName, email, googleSub, role, areaId) VALUES (?, ?, ?, ?, ?, ?)",
    {
      replacements: [row.fName, row.lName, row.email, row.googleSub, row.role, row.areaId],
    }
  );

  return db.user.findOne({ where: { email: row.email } });
}

export async function createSession(user, { expired = false } = {}) {
  const token = jwt.sign({ id: user.id }, authConfig.secret, {
    expiresIn: expired ? "-1s" : "24h",
  });
  const expirationDate = new Date(Date.now() + (expired ? -60 * 60 * 1000 : 24 * 60 * 60 * 1000));

  return db.session.create({
    token,
    email: user.email,
    expirationDate,
    userId: user.id,
  });
}
