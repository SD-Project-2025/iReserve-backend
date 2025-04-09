const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const Event = require("./event")
const Resident = require("./resident")

/**
 * @swagger
 * components:
 *   schemas:
 *     EventRegistration:
 *       type: object
 *       required:
 *         - event_id
 *         - resident_id
 *       properties:
 *         registration_id:
 *           type: integer
 *           description: The auto-generated ID of the registration
 *         event_id:
 *           type: integer
 *           description: Reference to the event
 *         resident_id:
 *           type: integer
 *           description: Reference to the resident
 *         status:
 *           type: string
 *           enum: [registered, attended, cancelled, no-show]
 *           description: Registration status
 *         registration_date:
 *           type: string
 *           format: date-time
 *           description: When the registration was created
 *         payment_status:
 *           type: string
 *           enum: [pending, paid, refunded, not_required]
 *           description: Payment status
 *         notes:
 *           type: string
 *           description: Additional notes
 */
const EventRegistration = sequelize.define(
  "EventRegistration",
  {
    registration_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "events",
        key: "event_id",
      },
    },
    resident_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "residents",
        key: "resident_id",
      },
    },
    status: {
      type: DataTypes.ENUM("registered", "attended", "cancelled", "no-show"),
      defaultValue: "registered",
    },
    registration_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    payment_status: {
      type: DataTypes.ENUM("pending", "paid", "refunded", "not_required"),
      defaultValue: "pending",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "event_registrations",
    timestamps: false,
  },
)

// Define associations
EventRegistration.belongsTo(Event, { foreignKey: "event_id" })
EventRegistration.belongsTo(Resident, { foreignKey: "resident_id" })

module.exports = EventRegistration
