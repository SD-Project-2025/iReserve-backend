const { MaintenanceReport, Facility, Resident, Staff,StaffFacilityAssignment } = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")
const encryptionService = require("../services/encryptionService");
// eslint-disable-next-line no-unused-vars
const { subDays, startOfToday } = require("date-fns");
const { Op } = require("sequelize");
//const a = startOfToday()
//console.log(a.toISOString().split("T")[0]) // YYYY-MM-DD format

exports.getMaintenanceReports = asyncHandler(async (req, res) => {
  const { status, priority, facility_id } = req.query;
  const today = startOfToday();
  const fiveDaysAgo = subDays(today, 5);

  const filter = {
    [Op.or]: [
      { status: { [Op.ne]: "completed" } },
      {
        status: "completed",
        completion_date: { [Op.gte]: fiveDaysAgo },
      },
    ],
  };

  // Handle staff permissions (non-admin)
  if (req.user?.user_type === 'staff' && !req.staff?.is_admin) {
    try {
      // Get staff's assigned facilities
      const assignments = await StaffFacilityAssignment.findAll({
        where: { staff_id: req.staff.staff_id },
        attributes: ['facility_id']
      });

      const assignedFacilityIds = assignments.map(a => a.facility_id);
      
      if (assignedFacilityIds.length > 0) {
        filter.facility_id = { [Op.in]: assignedFacilityIds };
      } else {
        return res.status(200).json(
          responseFormatter.success([], "No maintenance reports found - you are not assigned to any facilities")
        );
      }
    } catch (error) {
      console.error("Error fetching assignments:", error.message);
      return res.status(200).json(
        responseFormatter.success([], "No maintenance reports available for your assignments")
      );
    }
  }

  // Apply existing filters
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (facility_id) {
    if (filter.facility_id) {
      // Combine with existing facility filter from assignments
      filter.facility_id = { 
        [Op.and]: [
          { [Op.in]: filter.facility_id[Op.in] },
          facility_id 
        ]
      };
    } else {
      filter.facility_id = facility_id;
    }
  }

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
        attributes: ["resident_id", "name", "email"],
      },
      {
        model: Staff,
        as: "staffReporter",
        attributes: ["staff_id", "employee_id", "name", "email"],
      },
      {
        model: Staff,
        as: "assignedStaff",
        attributes: ["staff_id", "employee_id", "position", "name", "email"],
      },
    ],
    order: [
      ["priority", "DESC"],
      ["reported_date", "DESC"],
    ],
  });

  // Existing processing logic remains unchanged
  const safeDecrypt = (encryptedValue) => {
    if (!encryptedValue) return null;
    try {
      return encryptionService.decrypt(encryptedValue);
    } catch (error) {
      console.error("Decryption error:", error.message);
      return null;
    }
  };

  const processedReports = reports.map(report => {
    const reportData = report.get({ plain: true });

    let reporter = null;
    if (reportData.residentReporter) {
      reporter = {
        type: "resident",
        id: reportData.residentReporter.resident_id,
        name: safeDecrypt(reportData.residentReporter.name),
        email: safeDecrypt(reportData.residentReporter.email)
      };
      delete reportData.residentReporter;
    } else if (reportData.staffReporter) {
      reporter = {
        type: "staff",
        id: reportData.staffReporter.staff_id,
        employee_id: reportData.staffReporter.employee_id,
        name: safeDecrypt(reportData.staffReporter.name),
        email: safeDecrypt(reportData.staffReporter.email)
      };
      delete reportData.staffReporter;
    }

    if (reportData.assignedStaff) {
      reportData.assignedStaff = {
        ...reportData.assignedStaff,
        name: safeDecrypt(reportData.assignedStaff.name),
        email: safeDecrypt(reportData.assignedStaff.email)
      };
    }

    return {
      ...reportData,
      reporter,
    };
  });

  res.status(200).json(
    responseFormatter.success(
      processedReports,
      "Maintenance reports retrieved successfully"
    )
  );
});
exports.getMyMaintenanceReports = asyncHandler(async (req, res) => {
  const { user_id, user_type } = req.user; // must be set by JWT auth middleware

  let reports = [];

  if (user_type === "resident") {
    const resident = await Resident.findOne({ where: { user_id } });

    if (!resident) {
      return res.status(404).json(responseFormatter.error("Resident not found"));
    }

    reports = await MaintenanceReport.findAll({
      where: { reported_by_resident: resident.resident_id },
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
    });

  } else if (user_type === "staff") {
    const staff = await Staff.findOne({ where: { user_id } });

    if (!staff) {
      return res.status(404).json(responseFormatter.error("Staff member not found"));
    }

    reports = await MaintenanceReport.findAll({
      where: { reported_by_staff: staff.staff_id },
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
    });

  } else {
    return res.status(403).json(responseFormatter.error("Invalid user type"));
  }

  res.status(200).json(responseFormatter.success(reports, "Your maintenance reports retrieved successfully"));
});



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
