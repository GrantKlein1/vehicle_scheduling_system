export default (sequelize, Sequelize) => {
  const User = sequelize.define(
    "user",
    {
      fName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      googleSub: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: {
          isIn: [["requestor", "admin", "maintenance"]],
        },
      },
    },
    {
      tableName: "users",
      timestamps: false,
    }
  );

  return User;
};
