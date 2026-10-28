import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import logger from "../config/logger.js";
import { ROLES } from "../authorization/roles.js";
import { ensureAdminTypeSchema, migrateLegacyAdmins } from "../migrations/adminTypes.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import areaModel from "./area.model.js";
import vehicleModel from "./vehicle.model.js";
import mileageLogModel from "./mileageLog.model.js";
import serviceLogModel from "./serviceLog.model.js";

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.area = areaModel(sequelize, Sequelize);
db.user = userModel(sequelize, Sequelize);
db.session = sessionModel(sequelize, Sequelize);
db.vehicle = vehicleModel(sequelize, Sequelize);
db.mileageLog = mileageLogModel(sequelize, Sequelize);
db.serviceLog = serviceLogModel(sequelize, Sequelize);

db.user.hasMany(db.session, { foreignKey: "userId", onDelete: "CASCADE" });
db.session.belongsTo(db.user, { foreignKey: "userId" });

<<<<<<< HEAD
db.area.hasMany(db.user, { foreignKey: "areaId", onDelete: "RESTRICT" });
db.user.belongsTo(db.area, { foreignKey: "areaId" });

db.user.addHook("beforeValidate", async (user) => {
  if (user.role === ROLES.LEGACY_ADMIN) {
    user.role = ROLES.SYSTEM_ADMIN;
    user.areaId = null;
  }

  if (user.role === ROLES.AREA_ADMIN) {
    if (user.areaId == null) {
      throw new Error("An area admin must be assigned to an area.");
    }
    const area = await db.area.findByPk(user.areaId);
    if (!area) {
      throw new Error("An area admin must be assigned to an existing area.");
    }
    return;
  }

  if (user.areaId != null) {
    throw new Error("Only an area admin can be assigned to an area.");
  }
});

const SEEDED_AREAS = ["Athletics", "Support Central", "Maintenance"];
=======
db.vehicle.hasMany(db.mileageLog, {
  foreignKey: "vehicleId",
  onDelete: "CASCADE",
  as: "mileageLogs",
});
db.mileageLog.belongsTo(db.vehicle, { foreignKey: "vehicleId" });

db.vehicle.hasMany(db.serviceLog, {
  foreignKey: "vehicleId",
  onDelete: "CASCADE",
  as: "serviceLogs",
});
db.serviceLog.belongsTo(db.vehicle, { foreignKey: "vehicleId" });
>>>>>>> dev

const SEEDED_ROLE_USERS = [
  {
    email: "admin@eagles.oc.edu",
    fName: "Admin",
    lName: "User",
    role: ROLES.SYSTEM_ADMIN,
    googleSub: null,
    areaId: null,
  },
  {
    email: "maint@eagles.oc.edu",
    fName: "Maintenance",
    lName: "User",
    role: ROLES.MAINTENANCE,
    googleSub: null,
    areaId: null,
  },
];

db.seedAreas = async () => {
  for (const name of SEEDED_AREAS) {
    const existing = await db.area.findOne({ where: { name } });
    if (!existing) {
      await db.area.create({ name });
    }
  }
};

db.seedRoleUsers = async () => {
  for (const seed of SEEDED_ROLE_USERS) {
    const existing = await db.user.findOne({ where: { email: seed.email } });
    if (!existing) {
      await db.user.create(seed);
    }
  }
};

db.ensureAdminTypeSchema = () => ensureAdminTypeSchema(db.sequelize);

db.migrateLegacyAdmins = async () => {
  const count = await migrateLegacyAdmins(db.user);
  if (count > 0) {
    logger.info(`Migrated ${count} legacy admin account(s) to system_admin.`);
  }
  return count;
};

/** Schema, legacy admin rewrite, area placeholders, then role seed. */
db.prepareAdminTypes = async () => {
  await db.ensureAdminTypeSchema();
  await db.migrateLegacyAdmins();
  await db.seedAreas();
  await db.seedRoleUsers();
};

export default db;
