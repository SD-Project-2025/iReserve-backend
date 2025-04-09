const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const Facility = require("./facility")
const Resident = require("./resident")
const Staff = require("./staff")

/**
 * @swagger
 * components:
 *   schemas:
 *     MaintenanceReport:
 *       type: object
 *       required:
 *         - facility_id
 *         - title
 *         - description
 *         - priority
 *       properties:
 *         report_id:
 *           type: integer
 *           description: The auto-generated ID of the report
 *         facility_id:
 *           type: integer
 *           description: Reference to the facility
 *         reported_by_resident:
 *           type: integer
 *           description: Resident ID who reported the issue
 *         reported_by_staff:
 *           type: integer
 *           description: Staff ID who reported the issue
 *         title:
 *           type: string
 *           description: Issue title
 *         description:
 *           type: string
 *           description: Detailed description
 *         status:
 *           type: string
 *           enum: [reported, in-progress, scheduled, completed]
 *           description: Current status
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *           description: Priority level
 *         reported_date:
 *           type: string
 *           format: date-time
 *           description: When the issue was reported
 *         assigned_to:
 *           type: integer
 *           description: Staff ID assigned to the issue
 *         scheduled_date:
 *           type: string
 *           format: date
 *           description: When maintenance is scheduled
 *         completion_date:
 *           type: string
 *           format: date-time
 *           description: When the issue was resolved
 *         feedback:
 *           type: string
 *           description: Feedback after completion
 */
const MaintenanceReport = sequelize.define(
  "MaintenanceReport",
  {
    report_id: {
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
    reported_by_resident: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "residents",
        key: "resident_id",
      },
    },
    reported_by_staff: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "staff",
        key: "staff_id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("reported", "in-progress", "scheduled", "completed"),
      defaultValue: "reported",
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      allowNull: false,
    },
    reported_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "staff",
        key: "staff_id",
      },
    },
    scheduled_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    completion_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "maintenance_reports",
    timestamps: false,
  },
)

// Define associations
MaintenanceReport.belongsTo(Facility, { foreignKey: "facility_id" })
MaintenanceReport.belongsTo(Resident, { foreignKey: "reported_by_resident", as: "residentReporter" })
MaintenanceReport.belongsTo(Staff, { foreignKey: "reported_by_staff", as: "staffReporter" })
MaintenanceReport.belongsTo(Staff, { foreignKey: "assigned_to", as: "assignedStaff" })

module.exports = MaintenanceReport
