const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const User = require("./user")

/**
 * @swagger
 * components:
 *   schemas:
 *     Resident:
 *       type: object
 *       required:
 *         - user_id
 *       properties:
 *         resident_id:
 *           type: integer
 *           description: The auto-generated ID of the resident
 *         user_id:
 *           type: integer
 *           description: Reference to the user
 *         encrypted_address:
 *           type: string
 *           description: Encrypted physical address
 *         membership_type:
 *           type: string
 *           enum: [standard, premium, family]
 *           description: Type of membership
 *         membership_start_date:
 *           type: string
 *           format: date
 *           description: When the membership started
 *         membership_end_date:
 *           type: string
 *           format: date
 *           description: When the membership ends
 */
const Resident = sequelize.define(
  "Resident",
  {
    resident_id: {
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
    encrypted_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    membership_type: {
      type: DataTypes.ENUM("standard", "premium", "family"),
      defaultValue: "standard",
    },
    membership_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    membership_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: "residents",
    timestamps: false,
  },
)
//FK
Resident.belongsTo(User, { foreignKey: "user_id" })

module.exports = Resident
