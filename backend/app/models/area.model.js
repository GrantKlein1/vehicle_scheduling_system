/**
 * Placeholder area catalog. Feature 5 (area management) owns logos,
 * notification email, and area editing. This table is only the identity
 * an area admin is assigned to. Names match the campus areas that catalog
 * uses: Athletics, Support Central, and Maintenance.
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
    },
    {
      tableName: "areas",
      timestamps: false,
      hooks: {
        beforeValidate(area) {
          if (typeof area.name === "string") {
            area.name = area.name.trim();
          }
        },
      },
    }
  );

  return Area;
};
