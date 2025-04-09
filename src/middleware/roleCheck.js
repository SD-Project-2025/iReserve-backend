const { Staff, Resident, StaffFacilityAssignment } = require("../models")
const asyncHandler = require("../utils/asyncHandler")

// Check if user is staff
exports.isStaff = asyncHandler(async (req, res, next) => {
  const staff = await Staff.findOne({ where: { user_id: req.user.user_id } })

  if (!staff) {
    return res.status(403).json({
      success: false,
      message: "Access restricted to staff members",
    })
  }

  req.staff = staff
  next()
})

// Check if the user is the admin from the staff table
exports.isAdmin = asyncHandler(async (req, res, next) => {
  const staff = await Staff.findOne({
    where: {
      user_id: req.user.user_id,
      is_admin: true,
    },
  })

  if (!staff) {
    return res.status(403).json({
      success: false,
      message: "Access restricted to administrators",
    })
  }

  req.staff = staff
  next()
})

// Check if user is resident - Works fine
exports.isResident = asyncHandler(async (req, res, next) => {
  const resident = await Resident.findOne({ where: { user_id: req.user.user_id } })

  if (!resident) {
    return res.status(403).json({
      success: false,
      message: "Access restricted to residents",
    })
  }

  req.resident = resident
  next()
})

// Check if user is assigned to facility for staff only- had issues debugging this if there is issues
exports.isAssignedToFacility = asyncHandler(async (req, res, next) => {
  const { facilityId } = req.params

  const assignment = await StaffFacilityAssignment.findOne({
    where: {
      staff_id: req.staff.staff_id,
      facility_id: facilityId,
    },
  })

  if (!assignment && !req.staff.is_admin) {
    return res.status(403).json({
      success: false,
      message: "You are not assigned to this facility",
    })
  }

  next()
})

module.exports = exports
