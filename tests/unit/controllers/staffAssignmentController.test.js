// const staffFacilityAssignmentController = require('../../../src/controllers/staffFacilityAssignmentController');
const staffFacilityAssignmentController = require('../../../src/controllers/staffAssignmentController')
const { StaffFacilityAssignment, Staff, Facility } = require('../../../src/models');
const responseFormatter = require('../../../src/utils/responseFormatter');

// Mocks
jest.mock('../../../src/models', () => ({
  StaffFacilityAssignment: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn()
  },
  Staff: {
    findByPk: jest.fn()
  },
  Facility: {
    findByPk: jest.fn()
  }
}));

jest.mock('../../../src/utils/responseFormatter', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

describe('StaffFacilityAssignmentController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      staff: { staff_id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });

  // 1. Assign staff to facility
  describe('assignStaffToFacility', () => {
    it('should assign staff to facility', async () => {
      req.body = {
        staff_id: 1,
        facility_id: 2,
        role: 'Doctor',
        assigned_date: '2023-10-01',
        is_primary: true,
        notes: 'First assignment'
      };

      Staff.findByPk.mockResolvedValue({ staff_id: 1 });
      Facility.findByPk.mockResolvedValue({ facility_id: 2 });
      const mockAssignment = { id: 1, ...req.body };
      StaffFacilityAssignment.create.mockResolvedValue(mockAssignment);

      await staffFacilityAssignmentController.assignStaffToFacility(req, res);

      expect(Staff.findByPk).toHaveBeenCalledWith(1);
      expect(Facility.findByPk).toHaveBeenCalledWith(2);
      expect(StaffFacilityAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
        staff_id: 1,
        facility_id: 2,
        role: 'Doctor',
        assigned_date: '2023-10-01',
        is_primary: true,
        notes: 'First assignment'
      }));
      expect(responseFormatter.success).toHaveBeenCalledWith(res, mockAssignment, "Staff assigned successfully", 201);
    });

    it('should return 404 if staff not found', async () => {
      req.body = { staff_id: 999, facility_id: 1 };
      Staff.findByPk.mockResolvedValue(null);

      await staffFacilityAssignmentController.assignStaffToFacility(req, res);

      expect(responseFormatter.error).toHaveBeenCalledWith(res, "Staff not found", 404);
    });

    it('should return 404 if facility not found', async () => {
      req.body = { staff_id: 1, facility_id: 999 };
      Staff.findByPk.mockResolvedValue({ staff_id: 1 });
      Facility.findByPk.mockResolvedValue(null);

      await staffFacilityAssignmentController.assignStaffToFacility(req, res);

      expect(responseFormatter.error).toHaveBeenCalledWith(res, "Facility not found", 404);
    });
  });

  // 2. Unassign staff from facility
  describe('unassignStaffFromFacility', () => {
    it('should delete assignment by id', async () => {
      req.params.assignment_id = 1;
      const mockAssignment = { destroy: jest.fn().mockResolvedValue(true) };
      StaffFacilityAssignment.findByPk.mockResolvedValue(mockAssignment);

      await staffFacilityAssignmentController.unassignStaffFromFacility(req, res);

      expect(StaffFacilityAssignment.findByPk).toHaveBeenCalledWith(1);
      expect(mockAssignment.destroy).toHaveBeenCalled();
      expect(responseFormatter.success).toHaveBeenCalledWith(res, null, "Assignment removed successfully");
    });

    it('should return 404 if assignment not found', async () => {
      req.params.assignment_id = 999;
      StaffFacilityAssignment.findByPk.mockResolvedValue(null);

      await staffFacilityAssignmentController.unassignStaffFromFacility(req, res);

      expect(responseFormatter.error).toHaveBeenCalledWith(res, "Assignment not found", 404);
    });
  });

  // 3. Get staff assignments
  describe('getStaffAssignments', () => {
    it('should retrieve assignments for a staff member', async () => {
      req.params.staff_id = 1;
      const mockAssignments = [{
        staff_id: 1,
        Facility: { name: "Clinic A", type: "Clinic", location: "Zone 1" }
      }];
      StaffFacilityAssignment.findAll.mockResolvedValue(mockAssignments);

      await staffFacilityAssignmentController.getStaffAssignments(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { staff_id: 1 },
        include: expect.any(Array)
      }));
      expect(responseFormatter.success).toHaveBeenCalledWith(res, mockAssignments, "Assignments retrieved successfully");
    });

    it('should return 404 if no assignments found', async () => {
      req.params.staff_id = 2;
      StaffFacilityAssignment.findAll.mockResolvedValue([]);

      await staffFacilityAssignmentController.getStaffAssignments(req, res);

      expect(responseFormatter.error).toHaveBeenCalledWith(res, "No assignments found", 404);
    });
  });

  // 4. Get my assignments
  describe('getMyAssignments', () => {
    it('should return current user assignments', async () => {
      const mockAssignments = [{
        staff_id: 1,
        Facility: { name: "Hospital X", type: "Hospital", location: "City Y" }
      }];
      StaffFacilityAssignment.findAll.mockResolvedValue(mockAssignments);

      await staffFacilityAssignmentController.getMyAssignments(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { staff_id: 1 },
        include: expect.any(Array)
      }));
      expect(responseFormatter.success).toHaveBeenCalledWith(res, mockAssignments, "Your assignments retrieved successfully");
    });

    it('should return 404 if no current assignments found', async () => {
      StaffFacilityAssignment.findAll.mockResolvedValue([]);

      await staffFacilityAssignmentController.getMyAssignments(req, res);

      expect(responseFormatter.error).toHaveBeenCalledWith(res, "No assignments found", 404);
    });
  });
});
