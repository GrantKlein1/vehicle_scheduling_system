import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import vehicleModel from "./vehicle.model.js";
import mileageLogModel from "./mileageLog.model.js";
import serviceLogModel from "./serviceLog.model.js";

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.user = userModel(sequelize, Sequelize);
db.session = sessionModel(sequelize, Sequelize);
db.vehicle = vehicleModel(sequelize, Sequelize);
db.mileageLog = mileageLogModel(sequelize, Sequelize);
db.serviceLog = serviceLogModel(sequelize, Sequelize);

db.user.hasMany(db.session, { foreignKey: "userId", onDelete: "CASCADE" });
db.session.belongsTo(db.user, { foreignKey: "userId" });

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

const SEEDED_ROLE_USERS = [
  {
    email: "admin@eagles.oc.edu",
    fName: "Admin",
    lName: "User",
    role: "admin",
    googleSub: null,
  },
  {
    email: "maint@eagles.oc.edu",
    fName: "Maintenance",
    lName: "User",
    role: "maintenance",
    googleSub: null,
  },
];

db.seedRoleUsers = async () => {
  for (const seed of SEEDED_ROLE_USERS) {
    const existing = await db.user.findOne({ where: { email: seed.email } });
    if (!existing) {
      await db.user.create(seed);
    }
  }
};

export default db;
