export default (sequelize, Sequelize) => {
  const Session = sequelize.define(
    "session",
    {
      token: {
        type: Sequelize.STRING(512),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      expirationDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "sessions",
      timestamps: false,
    }
  );

  return Session;
};
