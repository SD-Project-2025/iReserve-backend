const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

/**
 * @swagger
 * components:
 *   schemas:
 *     Email:
 *       type: object
 *       required:
 *         - to
 *         - subject
 *         - body
 *         - status
 *       properties:
 *         email_id:
 *           type: integer
 *           description: Auto-generated email ID
 *         to:
 *           type: string
 *           format: email
 *           description: Recipient email address
 *         subject:
 *           type: string
 *           description: Email subject
 *         body:
 *           type: string
 *           description: The email message content
 *         status:
 *           type: string
 *           enum: [sent, failed]
 *           description: Status of the email
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Date and time the email was sent
 */

const Email = sequelize.define(
  "Email",
  {
    email_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    to: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("sent", "failed"),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "emails",
    timestamps: false,
  }
)

module.exports = Email
