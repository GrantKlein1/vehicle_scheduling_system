import { Sequelize } from "sequelize";
import { ROLES } from "../authorization/roles.js";

function tableNames(tables) {
  return tables.map((table) => {
    if (typeof table === "string") {
      return table.toLowerCase();
    }
    const name = table.tableName || table.table_name || table.name || "";
    return String(name).toLowerCase();
  });
}

/**
 * Add the placeholder areas table and users.areaId when sequelize.sync
 * did not alter an existing database. Safe to run on every startup.
 */
export async function ensureAdminTypeSchema(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const tables = tableNames(await queryInterface.showAllTables());

  if (!tables.includes("areas")) {
    await queryInterface.createTable("areas", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
    });
  }

  const areaColumns = await queryInterface.describeTable("areas");
  const areaColumnNames = Object.keys(areaColumns).map((name) => name.toLowerCase());
  if (!areaColumnNames.includes("logo")) {
    await queryInterface.addColumn("areas", "logo", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  }
  if (!areaColumnNames.includes("notificationemail")) {
    await queryInterface.addColumn("areas", "notificationEmail", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  }
  if (!areaColumnNames.includes("createdat")) {
    await queryInterface.addColumn("areas", "createdAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }
  if (!areaColumnNames.includes("updatedat")) {
    await queryInterface.addColumn("areas", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }

  const columns = await queryInterface.describeTable("users");
  const columnNames = Object.keys(columns).map((name) => name.toLowerCase());
  if (!columnNames.includes("areaid")) {
    await queryInterface.addColumn("users", "areaId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  }

  if (tables.includes("drivers")) {
    const driverColumns = await queryInterface.describeTable("drivers");
    const driverColumnNames = Object.keys(driverColumns).map((name) => name.toLowerCase());
    if (!driverColumnNames.includes("approvedcategories")) {
      await queryInterface.addColumn("drivers", "approvedCategories", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  }
}

/** Rewrite stored `admin` rows to system admins with no area assignment. */
export async function migrateLegacyAdmins(userModel) {
  const [count] = await userModel.update(
    { role: ROLES.SYSTEM_ADMIN, areaId: null },
    {
      where: { role: ROLES.LEGACY_ADMIN },
      validate: false,
      hooks: false,
    }
  );
  return count;
}
