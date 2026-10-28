export default (sequelize, Sequelize) => {
  const MileageLog = sequelize.define(
    "mileageLog",
    {
      entryDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      currentMileage: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      vehicleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "mileage_logs",
      timestamps: false,
    }
  );

  return MileageLog;
};
