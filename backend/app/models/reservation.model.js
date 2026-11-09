export const RESERVATION_STATUSES = ["pending", "approved", "denied", "cancelled"];

export default (sequelize, Sequelize) => {
  const Reservation = sequelize.define(
    "reservation",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      requestorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: [RESERVATION_STATUSES],
        },
      },
      vehicleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "vehicles",
          key: "id",
        },
      },
      vehicleName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      destinationName: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      areaName: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      purpose: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      driverName: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      driverEmail: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      passengers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      denialReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      summaryFilePath: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "reservations",
      timestamps: true,
    }
  );

  return Reservation;
};
