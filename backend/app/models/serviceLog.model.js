export default (sequelize, Sequelize) => {
  const ServiceLog = sequelize.define(
    "serviceLog",
    {
      entryDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      servicePerformed: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      vehicleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "service_logs",
      timestamps: false,
    }
  );

  return ServiceLog;
};
