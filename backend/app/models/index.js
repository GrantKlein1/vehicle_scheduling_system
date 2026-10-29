import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import vehicleModel, { DEFAULT_VEHICLE_STATUS } from "./vehicle.model.js";
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

function tableNameList(tables) {
  return tables.map((table) => {
    if (typeof table === "string") {
      return table.toLowerCase();
    }
    const name = table.tableName || table.table_name || table.name || "";
    return String(name).toLowerCase();
  });
}

db.backfillVehicleStatuses = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tables = tableNameList(await queryInterface.showAllTables());
  if (!tables.includes("vehicles")) {
    return;
  }

  const columns = await queryInterface.describeTable("vehicles");
  const columnNames = Object.keys(columns).map((name) => name.toLowerCase());
  if (!columnNames.includes("status")) {
    await queryInterface.addColumn("vehicles", "status", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: DEFAULT_VEHICLE_STATUS,
    });
  }

  await db.vehicle.update(
    { status: DEFAULT_VEHICLE_STATUS },
    {
      where: {
        [Sequelize.Op.or]: [{ status: null }, { status: "" }],
      },
    }
  );
};

export default db;
