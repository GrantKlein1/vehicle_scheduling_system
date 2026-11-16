export default (sequelize, Sequelize) => {
  const Destination = sequelize.define(
    "destination",
    {
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      addressLine1: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      addressLine2: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING(2),
        allowNull: false,
      },
      zip: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
    },
    {
      tableName: "destinations",
    }
  );

  return Destination;
};
