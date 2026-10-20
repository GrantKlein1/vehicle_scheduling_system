import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.user = userModel(sequelize, Sequelize);
db.session = sessionModel(sequelize, Sequelize);

db.user.hasMany(db.session, { foreignKey: "userId", onDelete: "CASCADE" });
db.session.belongsTo(db.user, { foreignKey: "userId" });

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
