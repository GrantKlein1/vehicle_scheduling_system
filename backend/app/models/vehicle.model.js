// String codes, not a database enum, so a later feature can add a status without a column change.
export const VEHICLE_STATUSES = [
  "available",
  "checked_out",
  "in_repair",
  "out_of_service",
];

export const DEFAULT_VEHICLE_STATUS = "available";

export default (sequelize, Sequelize) => {
  const Vehicle = sequelize.define(
    "vehicle",
    {
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      make: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      model: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      vin: {
        type: Sequelize.STRING(17),
        allowNull: true,
        unique: true,
      },
      purchasedDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      color: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      passengerCapacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      licensePlateNumber: {
        type: Sequelize.STRING(8),
        allowNull: true,
        unique: true,
      },
      licensePlateExpirationMonth: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      areaAssigned: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: DEFAULT_VEHICLE_STATUS,
        validate: {
          isIn: [VEHICLE_STATUSES],
        },
      },
    },
    {
      tableName: "vehicles",
    }
  );

  return Vehicle;
};
