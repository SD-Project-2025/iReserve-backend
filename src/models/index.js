const User = require("./user")
const Resident = require("./resident")
const Staff = require("./staff")
const Facility = require("./facility")
const StaffFacilityAssignment = require("./staffFacilityAssignment")
const Booking = require("./booking")
const MaintenanceReport = require("./maintenanceReport")
const Event = require("./event")
const EventRegistration = require("./eventRegistration")
const Notification = require("./notification")
const Email = require("./Email")
const FacilityRating = require("./FacilityRating");
// Define additional associations if needed
User.hasOne(Resident, { foreignKey: "user_id" })
User.hasOne(Staff, { foreignKey: "user_id" })

Staff.hasMany(StaffFacilityAssignment, { foreignKey: "staff_id" })
Facility.hasMany(StaffFacilityAssignment, { foreignKey: "facility_id" })

Staff.hasMany(Facility, { foreignKey: "created_by" })
Resident.hasMany(Booking, { foreignKey: "resident_id" })
Facility.hasMany(Booking, { foreignKey: "facility_id" })
Staff.hasMany(Booking, { foreignKey: "approved_by" })

Facility.hasMany(MaintenanceReport, { foreignKey: "facility_id" })
Resident.hasMany(MaintenanceReport, { foreignKey: "reported_by_resident" })
Staff.hasMany(MaintenanceReport, { foreignKey: "reported_by_staff" })
Staff.hasMany(MaintenanceReport, { foreignKey: "assigned_to" })

Facility.hasMany(Event, { foreignKey: "facility_id" })
Staff.hasMany(Event, { foreignKey: "organizer_staff_id" })

Event.hasMany(EventRegistration, { foreignKey: "event_id" })
Resident.hasMany(EventRegistration, { foreignKey: "resident_id" })

User.hasMany(Notification, { foreignKey: "user_id" })

// Add FacilityRating associations
Facility.hasMany(FacilityRating, { foreignKey: "facility_id" });
User.hasMany(FacilityRating, { foreignKey: "user_id" });
FacilityRating.belongsTo(Facility, { foreignKey: "facility_id" });
FacilityRating.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
  User,
  Resident,
  Staff,
  Facility,
  StaffFacilityAssignment,
  Booking,
  MaintenanceReport,
  Event,
  EventRegistration,
  Notification,
  Email,
  FacilityRating,
}
