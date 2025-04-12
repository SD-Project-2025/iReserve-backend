const { Facility, StaffFacilityAssignment, Staff } = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")
const { Op } = require('sequelize');


exports.getFacilities = asyncHandler(async (req, res) => {
  const { type, status, isIndoor } = req.query

  
  const filter = {}
  if (type) filter.type = type
  if (status) filter.status = status
  if (isIndoor !== undefined) filter.is_indoor = isIndoor === "true"

  const facilities = await Facility.findAll({
    where: filter,
    order: [["name", "ASC"]],
  })

  res.status(200).json(responseFormatter.success(facilities, "Facilities retrieved successfully"))
})


exports.getFacility = asyncHandler(async (req, res) => {
  const facility = await Facility.findByPk(req.params.id)

  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }

  res.status(200).json(responseFormatter.success(facility, "Facility retrieved successfully"))
})

exports.createFacility = asyncHandler(async (req, res) => {
  const { name, type, location, capacity, image_url, is_indoor, description, open_time, close_time, status } = req.body


  const facility = await Facility.create({
    name,
    type,
    location,
    capacity,
    image_url,
    is_indoor,
    description,
    open_time,
    close_time,
    status: status || "open",
    created_by: req.staff.staff_id,
  })

  res.status(201).json(responseFormatter.success(facility, "Facility created successfully"))
})


exports.updateFacility = asyncHandler(async (req, res) => {
  let facility = await Facility.findByPk(req.params.id)

  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }


  facility = await facility.update(req.body)

  res.status(200).json(responseFormatter.success(facility, "Facility updated successfully"))
})


exports.deleteFacility = asyncHandler(async (req, res) => {
  const facility = await Facility.findByPk(req.params.id)

  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }

  await facility.destroy()

  res.status(200).json(responseFormatter.success(null, "Facility deleted successfully"))
})


exports.assignStaff = asyncHandler(async (req, res) => {
  const { staff_id, role, is_primary } = req.body


  const facility = await Facility.findByPk(req.params.id)
  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }

  const staff = await Staff.findByPk(staff_id)
  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    })
  }


  const existingAssignment = await StaffFacilityAssignment.findOne({
    where: {
      staff_id,
      facility_id: req.params.id,
    },
  })

  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      message: "Staff is already assigned to this facility",
    })
  }

  const assignment = await StaffFacilityAssignment.create({
    staff_id,
    facility_id: req.params.id,
    role,
    assigned_date: new Date(),
    is_primary: is_primary || false,
  })

  res.status(201).json(responseFormatter.success(assignment, "Staff assigned to facility successfully"))
})


exports.getAssignedStaff = asyncHandler(async (req, res) => {
  const assignments = await StaffFacilityAssignment.findAll({
    where: { facility_id: req.params.id },
    include: [
      {
        model: Staff,
        include: ["User"],
      },
    ],
  })

  res.status(200).json(responseFormatter.success(assignments, "Assigned staff retrieved successfully"))
})

exports.getFacilitiesByStaffId = async (req, res) => {
  const { staff_id } = req.params

  try {
    // Step 1: Get all facility_ids assigned to this staff member
    const assignments = await StaffFacilityAssignment.findAll({
      where: { staff_id },
      attributes: ["facility_id"],
    })

    if (assignments.length === 0) {
      return res.status(404).json({ message: "No facilities assigned to this staff member." })
    }

    const facilityIds = assignments.map((a) => a.facility_id)

    // Step 2: Get all facilities with those IDs
    const facilities = await Facility.findAll({
      where: {
        facility_id: {
          [Op.in]: facilityIds,
        },
      },
    })

    res.status(200).json(facilities)
  } catch (error) {
    console.error("Error fetching facilities by staff ID:", error)
    res.status(500).json({ message: "Server error" })
  }
}

module.exports = exports
