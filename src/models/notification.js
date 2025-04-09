const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const User = require("./user")

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - user_id
 *         - title
 *         - message
 *         - type
 *       properties:
 *         notification_id:
 *           type: integer
 *           description: The auto-generated ID of the notification
 *         user_id:
 *           type: integer
 *           description: Reference to the user
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message
 *         type:
 *           type: string
 *           enum: [booking, maintenance, event, weather, system, assignment]
 *           description: Notification type
 *         related_id:
 *           type: integer
 *           description: ID of related entity
 *         related_type:
 *           type: string
 *           description: Type of related entity
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the notification was created
 *         read:
 *           type: boolean
 *           description: Whether the notification has been read
 *         read_at:
 *           type: string
 *           format: date-time
 *           description: When the notification was read
 */
const Notification = sequelize.define(
  "Notification",
  {
    notification_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("booking", "maintenance", "event", "weather", "system", "assignment"),
      allowNull: false,
    },
    related_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    related_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "notifications",
    timestamps: false,
  },
)

//Foreign key constraint
Notification.belongsTo(User, { foreignKey: "user_id" })

module.exports = Notification
