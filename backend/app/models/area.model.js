/**
 * Area catalog and user area assignment model.
 * Extended in Feature 5 with logo and notificationEmail.
 */
export default (sequelize, Sequelize) => {
  const Area = sequelize.define(
    "area",
    {
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [1, 50],
        },
      },
      logo: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      notificationEmail: {
        type: Sequelize.STRING(255),
        allowNull: true, // allowNull true at model level so seeds without it won't crash, controller validates presence on create/update
        validate: {
          isEmail: true,
        },
      },
    },
    {
      tableName: "areas",
      timestamps: true,
      hooks: {
        beforeValidate(area) {
          if (typeof area.name === "string") {
            area.name = area.name.trim();
          }
          if (typeof area.notificationEmail === "string") {
            area.notificationEmail = area.notificationEmail.trim();
          }
          if (typeof area.logo === "string") {
            const trimmed = area.logo.trim();
            area.logo = trimmed === "" ? null : trimmed;
          }
        },
      },
    }
  );

  return Area;
};
