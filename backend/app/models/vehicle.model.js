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
    },
    {
      tableName: "vehicles",
    }
  );

  return Vehicle;
};
