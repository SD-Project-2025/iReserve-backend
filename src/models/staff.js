const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const User = require("./user")

/**
 * @swagger
 * components:
 *   schemas:
 *     Staff:
 *       type: object
 *       required:
 *         - user_id
 *         - employee_id
 *         - position
 *         - department
 *       properties:
 *         staff_id:
 *           type: integer
 *           description: The auto-generated ID of the staff
 *         user_id:
 *           type: integer
 *           description: Reference to the user
 *         employee_id:
 *           type: string
 *           description: Unique employee identifier
 *         position:
 *           type: string
 *           description: Staff position
 *         department:
 *           type: string
 *           description: Department
 *         is_admin:
 *           type: boolean
 *           description: Whether the staff has admin privileges
 */
const Staff = sequelize.define(
  "Staff",
  {
    staff_id: {
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
    employee_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "staff",
    timestamps: false,
  },
)

//FK
Staff.belongsTo(User, { foreignKey: "user_id" })

module.exports = Staff
