export default (sequelize, Sequelize) => {
  const ServiceLog = sequelize.define(
    "serviceLog",
    {
      entryDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      servicePerformed: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
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
