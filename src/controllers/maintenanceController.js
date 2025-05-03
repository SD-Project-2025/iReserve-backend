const { MaintenanceReport, Facility, Resident, Staff } = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")


exports.getMaintenanceReports = asyncHandler(async (req, res) => {
  const { status, priority, facility_id } = req.query


  const filter = {}
  if (status) filter.status = status
  if (priority) filter.priority = priority
  if (facility_id) filter.facility_id = facility_id

  const reports = await MaintenanceReport.findAll({
    where: filter,
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location"],
      },
      {
        model: Resident,
        as: "residentReporter",
        attributes: ["resident_id"],
      },
      {
        model: Staff,
        as: "staffReporter",
        attributes: ["staff_id", "employee_id"],
      },
      {
        model: Staff,
        as: "assignedStaff",
        attributes: ["staff_id", "employee_id", "position"],
      },
    ],
    order: [
      ["priority", "DESC"],
      ["reported_date", "DESC"],
    ],
  })

  res.status(200).json(responseFormatter.success(reports, "Maintenance reports retrieved successfully"))
})


exports.getMyMaintenanceReports = asyncHandler(async (req, res) => {
  const reports = await MaintenanceReport.findAll({
    where: { reported_by_resident: req.resident.resident_id },
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location"],
      },
      {
        model: Staff,
        as: "assignedStaff",
        attributes: ["staff_id", "employee_id", "position"],
      },
    ],
    order: [["reported_date", "DESC"]],
  })

  res.status(200).json(responseFormatter.success(reports, "Your maintenance reports retrieved successfully"))
})


exports.getMaintenanceReport = asyncHandler(async (req, res) => {
  const report = await MaintenanceReport.findByPk(req.params.id, {
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location"],
      },
      {
        model: Resident,
        as: "residentReporter",
        attributes: ["resident_id"],
      },
      {
        model: Staff,
        as: "staffReporter",
        attributes: ["staff_id", "employee_id"],
      },
      {
        model: Staff,
        as: "assignedStaff",
        attributes: ["staff_id", "employee_id", "position"],
      },
    ],
  })

  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Maintenance report not found",
    })
  }

  if (req.user.user_type === "resident" && report.reported_by_resident !== req.resident.resident_id) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to view this report",
    })
  }

  res.status(200).json(responseFormatter.success(report, "Maintenance report retrieved successfully"))
})


exports.createMaintenanceReport = asyncHandler(async (req, res) => {
  const { facility_id, title, description, priority , userType, user_id } = req.body


  const facility = await Facility.findByPk(facility_id)
  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }


  const reportData = {
    facility_id,
    title,
    description,
    priority,
    status: "reported",
    reported_date: new Date(),
    reported_by_resident: userType === "resident" ? user_id : null,
    reported_by_staff: userType === "staff" ? user_id : null,

  };


  const report = await MaintenanceReport.create(reportData)

  res.status(201).json(responseFormatter.success(report, "Maintenance report created successfully"))
})


exports.updateMaintenanceStatus = asyncHandler(async (req, res) => {
  const { status, assigned_to, scheduled_date, feedback } = req.body

  const report = await MaintenanceReport.findByPk(req.params.id)

  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Maintenance report not found",
    })
  }


  const updateData = { status }

  if (assigned_to) {
  
    const staff = await Staff.findByPk(assigned_to)
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Assigned staff not found",
      })
    }
    updateData.assigned_to = assigned_to
  }

  if (scheduled_date) {
    updateData.scheduled_date = scheduled_date
  }

  if (feedback) {
    updateData.feedback = feedback
  }

  
  if (status === "completed") {
    updateData.completion_date = new Date()
  }

  await report.update(updateData)

  res.status(200).json(responseFormatter.success(report, "Maintenance report updated successfully"))
})

module.exports = exports
