// tests/unit/middleware/roleCheck.test.js

const { isStaff, isAdmin, isResident, isAssignedToFacility } = require('../../../src/middleware/roleCheck');
const { Staff, Resident, StaffFacilityAssignment } = require('../../../src/models');

// Mock asyncHandler so errors don't break the tests (assuming asyncHandler just wraps async functions)
jest.mock('../../../src/utils/asyncHandler', () => (fn) => (req, res, next) => fn(req, res, next).catch(next));

jest.mock('../../../src/models', () => ({
  Staff: { findOne: jest.fn() },
  Resident: { findOne: jest.fn() },
  StaffFacilityAssignment: { findOne: jest.fn() },
}));

describe('roleCheck middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { user_id: 123 },
      params: { facilityId: 'f1' },
      staff: null,
      resident: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('isStaff', () => {
    it('should call next if staff found', async () => {
      const fakeStaff = { staff_id: 1, user_id: 123 };
      Staff.findOne.mockResolvedValue(fakeStaff);

      await isStaff(req, res, next);

      expect(Staff.findOne).toHaveBeenCalledWith({ where: { user_id: 123 } });
      expect(req.staff).toBe(fakeStaff);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if staff not found', async () => {
      Staff.findOne.mockResolvedValue(null);

      await isStaff(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access restricted to staff members',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isAdmin', () => {
    it('should call next if admin staff found', async () => {
      const fakeAdmin = { staff_id: 1, user_id: 123, is_admin: true };
      Staff.findOne.mockResolvedValue(fakeAdmin);

      await isAdmin(req, res, next);

      expect(Staff.findOne).toHaveBeenCalledWith({
        where: { user_id: 123, is_admin: true },
      });
      expect(req.staff).toBe(fakeAdmin);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if admin staff not found', async () => {
      Staff.findOne.mockResolvedValue(null);

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access restricted to administrators',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isResident', () => {
    it('should call next if resident found', async () => {
      const fakeResident = { resident_id: 1, user_id: 123 };
      Resident.findOne.mockResolvedValue(fakeResident);

      await isResident(req, res, next);

      expect(Resident.findOne).toHaveBeenCalledWith({ where: { user_id: 123 } });
      expect(req.resident).toBe(fakeResident);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if resident not found', async () => {
      Resident.findOne.mockResolvedValue(null);

      await isResident(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access restricted to residents',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isAssignedToFacility', () => {
    it('should call next if assigned to facility', async () => {
      req.staff = { staff_id: 1, is_admin: false };
      StaffFacilityAssignment.findOne.mockResolvedValue({ assignment_id: 1 });

      await isAssignedToFacility(req, res, next);

      expect(StaffFacilityAssignment.findOne).toHaveBeenCalledWith({
        where: {
          staff_id: 1,
          facility_id: 'f1',
        },
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next if staff is admin (even without assignment)', async () => {
      req.staff = { staff_id: 1, is_admin: true };
      StaffFacilityAssignment.findOne.mockResolvedValue(null);

      await isAssignedToFacility(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if not assigned and not admin', async () => {
      req.staff = { staff_id: 1, is_admin: false };
      StaffFacilityAssignment.findOne.mockResolvedValue(null);

      await isAssignedToFacility(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not assigned to this facility',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
