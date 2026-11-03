export const DRIVER_STATUSES = ["valid", "expired"];

export default (sequelize, Sequelize) => {
  const Driver = sequelize.define(
    "driver",
    {
      firstName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      driverLicenseNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      driverLicenseExpDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      insuranceProvider: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      insuranceNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      approvedDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isIn: [DRIVER_STATUSES],
        },
      },
    },
    {
      tableName: "drivers",
      timestamps: false,
    }
  );

  return Driver;
};
