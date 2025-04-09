const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const Facility = require("./facility")
const Resident = require("./resident")
const Staff = require("./staff")

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       required:
 *         - facility_id
 *         - resident_id
 *         - date
 *         - start_time
 *         - end_time
 *         - purpose
 *         - attendees
 *       properties:
 *         booking_id:
 *           type: integer
 *           description: The auto-generated ID of the booking
 *         facility_id:
 *           type: integer
 *           description: Reference to the facility
 *         resident_id:
 *           type: integer
 *           description: Reference to the resident
 *         date:
 *           type: string
 *           format: date
 *           description: Date of booking
 *         start_time:
 *           type: string
 *           format: time
 *           description: Start time
 *         end_time:
 *           type: string
 *           format: time
 *           description: End time
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *           description: Booking status
 *         purpose:
 *           type: string
 *           description: Purpose of booking
 *         attendees:
 *           type: integer
 *           description: Number of attendees
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the booking was created
 *         approved_by:
 *           type: integer
 *           description: Staff ID who approved the booking
 *         approval_date:
 *           type: string
 *           format: date-time
 *           description: When the booking was approved
 */
const Booking = sequelize.define(
  "Booking",
  {
    booking_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    facility_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "facilities",
        key: "facility_id",
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "cancelled"),
      defaultValue: "pending",
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    attendees: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "staff",
        key: "staff_id",
      },
    },
    approval_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "bookings",
    timestamps: false,
  },
)

//Associations - Foreign Keys relationships in the database
Booking.belongsTo(Facility, { foreignKey: "facility_id" })
Booking.belongsTo(Resident, { foreignKey: "resident_id" })
Booking.belongsTo(Staff, { foreignKey: "approved_by", as: "approver" })

module.exports = Booking
