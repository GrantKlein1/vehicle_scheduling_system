export const EMAIL_EVENTS = ["submitted", "approved", "denied", "cancelled"];
export const EMAIL_STATUSES = ["sent", "failed"];
export const FROM_EMAIL = "vehicle-scheduling@eagles.oc.edu";

export default (sequelize, Sequelize) => {
  const Email = sequelize.define(
    "email",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      reservationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      event: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      recipientEmail: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      recipientRole: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      fromEmail: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      errorMessage: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "emails",
      timestamps: false,
    }
  );

  return Email;
};
