const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

/**
 * @swagger
 * components:
 *   schemas:
 *     Facility:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - location
 *         - capacity
 *         - open_time
 *         - close_time
 *       properties:
 *         facility_id:
 *           type: integer
 *           description: The auto-generated ID of the facility
 *         name:
 *           type: string
 *           description: Facility name
 *         type:
 *           type: string
 *           description: Type of facility
 *         location:
 *           type: string
 *           description: Location description
 *         capacity:
 *           type: integer
 *           description: Maximum capacity
 *         image_url:
 *           type: string
 *           description: URL to facility image
 *         is_indoor:
 *           type: boolean
 *           description: Whether the facility is indoor
 *         description:
 *           type: string
 *           description: Detailed description
 *         open_time:
 *           type: string
 *           format: time
 *           description: Opening time
 *         close_time:
 *           type: string
 *           format: time
 *           description: Closing time
 *         status:
 *           type: string
 *           enum: [open, closed, maintenance]
 *           description: Current facility status
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the facility was created
 *         created_by:
 *           type: integer
 *           description: Staff ID who created the facility
 */
const Facility = sequelize.define(
  "Facility",
  {
    facility_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_indoor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    open_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    close_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("open", "closed", "maintenance"),
      defaultValue: "open",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "staff",
        key: "staff_id",
      },
    },
  },
  {
    tableName: "facilities",
    timestamps: false,
  },
)



module.exports = Facility
