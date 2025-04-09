const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - user_type
 *       properties:
 *         user_id:
 *           type: integer
 *           description: The auto-generated ID of the user
 *         google_id:
 *           type: string
 *           description: Google ID for authentication
 *         user_type:
 *           type: string
 *           enum: [resident, staff]
 *           description: Type of user
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *           description: User account status
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the user was created
 *         last_login:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 */
const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    google_id: {
      type: DataTypes.STRING,
      allowNull: true, // Changed from false to true to allow null values
      unique: true,
    },
    user_type: {
      type: DataTypes.ENUM("resident", "staff"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      defaultValue: "active",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: false,
  },
)

module.exports = User
