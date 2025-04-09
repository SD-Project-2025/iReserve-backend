const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const Staff = require("./staff")
const Facility = require("./facility")

/**
 * @swagger
 * components:
 *   schemas:
 *     StaffFacilityAssignment:
 *       type: object
 *       required:
 *         - staff_id
 *         - facility_id
 *         - role
 *         - assigned_date
 *       properties:
 *         assignment_id:
 *           type: integer
 *           description: The auto-generated ID of the assignment
 *         staff_id:
 *           type: integer
 *           description: Reference to the staff
 *         facility_id:
 *           type: integer
 *           description: Reference to the facility
 *         role:
 *           type: string
 *           description: Role at the facility
 *         assigned_date:
 *           type: string
 *           format: date
 *           description: When the assignment started
 *         is_primary:
 *           type: boolean
 *           description: Whether this is the staff's primary facility
 *         notes:
 *           type: string
 *           description: Additional notes
 */
const StaffFacilityAssignment = sequelize.define(
  "StaffFacilityAssignment",
  {
    assignment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "staff",
        key: "staff_id",
      },
    },
    facility_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "facilities",
        key: "facility_id",
      },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assigned_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "staff_facility_assignments",
    timestamps: false,
  },
)

//FK
StaffFacilityAssignment.belongsTo(Staff, { foreignKey: "staff_id" })
StaffFacilityAssignment.belongsTo(Facility, { foreignKey: "facility_id" })

module.exports = StaffFacilityAssignment
