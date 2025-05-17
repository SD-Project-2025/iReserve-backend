const { StaffFacilityAssignment, Staff, Facility } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const responseFormatter = require("../utils/responseFormatter");

// 1. Assign staff to facility
exports.assignStaffToFacility = asyncHandler(async (req, res) => {
  const { staff_id, facility_id, role, assigned_date, is_primary, notes } = req.body;

  // Validate staff and facility existence
  const [staff, facility] = await Promise.all([
    Staff.findByPk(staff_id),
    Facility.findByPk(facility_id)
  ]);

  if (!staff) return responseFormatter.error(res, "Staff not found", 404);
  if (!facility) return responseFormatter.error(res, "Facility not found", 404);

  const assignment = await StaffFacilityAssignment.create({
    staff_id,
    facility_id,
    role,
    assigned_date: assigned_date || new Date().toISOString().split('T')[0],
    is_primary: is_primary || false,
    notes
  });

  responseFormatter.success(res, assignment, "Staff assigned successfully", 201);
});

// 2. Unassign staff from facility
exports.unassignStaffFromFacility = asyncHandler(async (req, res) => {
  const { assignment_id } = req.params;
  const assignment = await StaffFacilityAssignment.findByPk(assignment_id);
  
  if (!assignment) return responseFormatter.error(res, "Assignment not found", 404);
  
  await assignment.destroy();
  responseFormatter.success(res, null, "Assignment removed successfully");
});

// 3. Get staff assignments (admin)
exports.getStaffAssignments = asyncHandler(async (req, res) => {
  const { staff_id } = req.params;
  const assignments = await StaffFacilityAssignment.findAll({
    where: { staff_id },
    include: [{
      model: Facility,
      attributes: ['facility_id', 'name', 'type', 'location']
    }]
  });

  if (!assignments.length) return responseFormatter.error(res, "No assignments found", 404);
  responseFormatter.success(res, assignments, "Assignments retrieved successfully");
});

// 4. Get current staff assignments
exports.getMyAssignments = asyncHandler(async (req, res) => {
  const assignments = await StaffFacilityAssignment.findAll({
    where: { staff_id: req.staff.staff_id },
    include: [{
      model: Facility,
      attributes: ['facility_id', 'name', 'type', 'location']
    }]
  });

  if (!assignments.length) return responseFormatter.error(res, "No assignments found", 404);
  responseFormatter.success(res, assignments, "Your assignments retrieved successfully");
});