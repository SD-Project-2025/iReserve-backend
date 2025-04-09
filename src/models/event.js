const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const Facility = require("./facility")
const Staff = require("./staff")

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - facility_id
 *         - start_date
 *         - end_date
 *         - start_time
 *         - end_time
 *         - organizer_staff_id
 *         - capacity
 *       properties:
 *         event_id:
 *           type: integer
 *           description: The auto-generated ID of the event
 *         title:
 *           type: string
 *           description: Event title
 *         description:
 *           type: string
 *           description: Detailed description
 *         facility_id:
 *           type: integer
 *           description: Reference to the facility
 *         start_date:
 *           type: string
 *           format: date
 *           description: Start date
 *         end_date:
 *           type: string
 *           format: date
 *           description: End date
 *         start_time:
 *           type: string
 *           format: time
 *           description: Start time
 *         end_time:
 *           type: string
 *           format: time
 *           description: End time
 *         organizer_staff_id:
 *           type: integer
 *           description: Staff ID organizing the event
 *         status:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *           description: Event status
 *         capacity:
 *           type: integer
 *           description: Maximum capacity
 *         image_url:
 *           type: string
 *           description: URL to event image
 *         is_public:
 *           type: boolean
 *           description: Whether the event is public
 *         registration_deadline:
 *           type: string
 *           format: date
 *           description: Deadline for registration
 *         fee:
 *           type: number
 *           format: float
 *           description: Event fee
 */
const Event = sequelize.define(
  "Event",
  {
    event_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    facility_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "facilities",
        key: "facility_id",
      },
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
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
    organizer_staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "staff",
        key: "staff_id",
      },
    },
    status: {
      type: DataTypes.ENUM("upcoming", "ongoing", "completed", "cancelled"),
      defaultValue: "upcoming",
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    registration_deadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      allowNull: true,
    },
  },
  {
    tableName: "events",
    timestamps: false,
  },
)
//Foreign key associations
Event.belongsTo(Facility, { foreignKey: "facility_id" })
Event.belongsTo(Staff, { foreignKey: "organizer_staff_id", as: "organizer" })

module.exports = Event
