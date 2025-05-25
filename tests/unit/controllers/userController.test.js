const userController = require('../../../src/controllers/userController');
const { 
  User, 
  Resident, 
  Staff,
  StaffFacilityAssignment,
  Facility
} = require('../../../src/models');
const responseFormatter = require('../../../src/utils/responseFormatter');
const encryptionService = require('../../../src/services/encryptionService');

// Mock the models and dependencies
jest.mock('../../../src/models', () => {
  const originalModule = jest.requireActual('../../../src/models');
  return {
    ...originalModule,
    User: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
    },
    Resident: {
      findOne: jest.fn(),
      findAll: jest.fn(),
    },
    Staff: {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    Facility: {
      findByPk: jest.fn(),
    },
    StaffFacilityAssignment: {
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
    },
    sequelize: {
      transaction: jest.fn().mockImplementation(callback => callback({
        commit: jest.fn(),
        rollback: jest.fn()
      })),
    }
  };
});

jest.mock('../../../src/utils/responseFormatter', () => ({
  success: jest.fn().mockImplementation((data, message) => ({ success: true, data, message })),
  error: jest.fn().mockImplementation((message, status) => ({ success: false, message, status }))
}));

jest.mock('../../../src/services/encryptionService', () => ({
  decrypt: jest.fn().mockImplementation((value) => value ? `decrypted_${value}` : null)
}));

describe('User Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should retrieve all users with decrypted information', async () => {
      const mockUsers = [
        {
          user_id: 1,
          user_type: 'resident',
          get: jest.fn().mockReturnValue({
            user_id: 1,
            user_type: 'resident',
            Resident: { name: 'encrypted_name', email: 'encrypted_email' }
          })
        },
        {
          user_id: 2,
          user_type: 'staff',
          get: jest.fn().mockReturnValue({
            user_id: 2,
            user_type: 'staff',
            Staff: { name: 'encrypted_staff', email: 'encrypted_staff_email', is_admin: true }
          })
        }
      ];

      User.findAll.mockResolvedValue(mockUsers);

      await userController.getAllUsers(req, res);

      expect(User.findAll).toHaveBeenCalledWith({
        include: [
          { model: Resident, attributes: ["resident_id", "name", "email"], required: false },
          { model: Staff, attributes: ["staff_id", "employee_id", "name", "email", "is_admin"], required: false }
        ]
      });
      expect(encryptionService.decrypt).toHaveBeenCalledTimes(4);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseFormatter.success).toHaveBeenCalled();
    });
  });

  describe('manageUserStatus', () => {
    it('should update user status', async () => {
      req.params = { userId: 1 };
      req.body = { status: 'suspended' };
      req.user = { user_id: 2 }; // Different user
      const mockUser = { user_id: 1, update: jest.fn() };

      User.findByPk.mockResolvedValue(mockUser);

      await userController.manageUserStatus(req, res);

      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(mockUser.update).toHaveBeenCalledWith({ status: 'suspended' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should prevent modifying own account', async () => {
      req.params = { userId: 1 };
      req.body = { status: 'suspended' };
      req.user = { user_id: 1 }; // Same user
      const mockUser = { user_id: 1 };

      User.findByPk.mockResolvedValue(mockUser);

      await userController.manageUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(responseFormatter.error).toHaveBeenCalledWith(
        "Cannot modify your own account", 
        403
      );
    });

    it('should return 400 for invalid status', async () => {
      req.params = { userId: 1 };
      req.body = { status: 'invalid' };

      await userController.manageUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(responseFormatter.error).toHaveBeenCalledWith(
        "Invalid status value", 
        400
      );
    });
  });

  describe('manageAdminStatus', () => {
    it('should update admin status', async () => {
      req.params = { userId: 1 };
      req.body = { is_admin: true };
      req.user = { user_id: 2 }; // Different user
      const mockUser = { user_id: 1, user_type: 'staff' };
      const mockStaff = { update: jest.fn() };

      User.findByPk.mockResolvedValue(mockUser);
      Staff.findOne.mockResolvedValue(mockStaff);

      await userController.manageAdminStatus(req, res);

      expect(Staff.findOne).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(mockStaff.update).toHaveBeenCalledWith({ is_admin: true });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should prevent modifying own admin status', async () => {
      req.params = { userId: 1 };
      req.body = { is_admin: true };
      req.user = { user_id: 1 }; // Same user
      const mockUser = { user_id: 1, user_type: 'staff' };

      User.findByPk.mockResolvedValue(mockUser);

      await userController.manageAdminStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(responseFormatter.error).toHaveBeenCalledWith(
        "Cannot modify your own admin status", 
        403
      );
    });
  });

  describe('upgradeToStaff', () => {
    it('should upgrade resident to staff', async () => {
      req.params = { userId: 1 };
      req.body = { employee_id: 'EMP123' };
      const mockUser = { user_id: 1, user_type: 'resident', update: jest.fn() };
      const mockResident = { name: 'encrypted_name', email: 'encrypted_email' };
      const mockStaff = {};

      User.findByPk.mockResolvedValue(mockUser);
      Resident.findOne.mockResolvedValue(mockResident);
      Staff.findOne.mockResolvedValue(null);
      Staff.create.mockResolvedValue(mockStaff);

      await userController.upgradeToStaff(req, res);

      expect(Staff.create).toHaveBeenCalledWith({
        user_id: 1,
        employee_id: 'EMP123',
        name: 'encrypted_name',
        email: 'encrypted_email',
        position: "New Staff",
        department: "General",
        is_admin: false
      }, expect.anything());
      expect(mockUser.update).toHaveBeenCalledWith({ user_type: "staff" }, expect.anything());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update existing staff record when upgrading', async () => {
      req.params = { userId: 1 };
      req.body = { employee_id: 'EMP123' };
      const mockUser = { user_id: 1, user_type: 'resident', update: jest.fn() };
      const mockResident = { name: 'encrypted_name', email: 'encrypted_email' };
      const mockStaff = { update: jest.fn() };

      User.findByPk.mockResolvedValue(mockUser);
      Resident.findOne.mockResolvedValue(mockResident);
      Staff.findOne.mockResolvedValue(mockStaff);

      await userController.upgradeToStaff(req, res);

      expect(mockStaff.update).toHaveBeenCalledWith({
        employee_id: 'EMP123',
        name: 'encrypted_name',
        email: 'encrypted_email',
        position: "New Staff",
        department: "General",
        is_admin: false
      }, expect.anything());
    });
  });

  describe('downgradeToResident', () => {
    it('should downgrade staff to resident', async () => {
      req.params = { userId: 1 };
      const mockUser = { user_id: 1, user_type: 'staff', update: jest.fn() };

      User.findByPk.mockResolvedValue(mockUser);

      await userController.downgradeToResident(req, res);

      expect(mockUser.update).toHaveBeenCalledWith({ user_type: "resident" }, expect.anything());
      expect(Staff.update).toHaveBeenCalledWith(
        { is_admin: false, position: "Former Staff" },
        { where: { user_id: 1 }, transaction: expect.anything() }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getStaffMembers', () => {
    it('should retrieve all staff members with decrypted info', async () => {
      const mockUsers = [
        {
          user_id: 1,
          status: 'active',
          get: jest.fn().mockReturnValue({
            user_id: 1,
            status: 'active',
            Staff: { name: 'encrypted_name', email: 'encrypted_email' }
          })
        }
      ];

      User.findAll.mockResolvedValue(mockUsers);

      await userController.getStaffMembers(req, res);

      expect(User.findAll).toHaveBeenCalledWith({
        where: { user_type: 'staff' },
        include: [{
          model: Staff,
          attributes: ['employee_id', 'position', 'department', 'is_admin', 'name', 'email'],
          required: true
        }]
      });
      expect(encryptionService.decrypt).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getResidents', () => {
    it('should retrieve all residents with decrypted info', async () => {
      const mockUsers = [
        {
          user_id: 1,
          status: 'active',
          get: jest.fn().mockReturnValue({
            user_id: 1,
            status: 'active',
            Resident: { name: 'encrypted_name', email: 'encrypted_email' }
          })
        }
      ];

      User.findAll.mockResolvedValue(mockUsers);

      await userController.getResidents(req, res);

      expect(User.findAll).toHaveBeenCalledWith({
        where: { user_type: 'resident' },
        include: [{
          model: Resident,
          attributes: ['membership_type', 'name', 'email'],
          required: true
        }]
      });
      expect(encryptionService.decrypt).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('assignStaff', () => {
    it('should assign staff to facility', async () => {
      req.body = { userId: 1, facilityId: 1 };
      const mockUser = { user_id: 1, user_type: 'staff' };
      const mockStaff = { staff_id: 1 };
      const mockFacility = { facility_id: 1 };
      const mockAssignment = { assignment_id: 1 };

      User.findByPk.mockResolvedValue(mockUser);
      Staff.findOne.mockResolvedValue(mockStaff);
      Facility.findByPk.mockResolvedValue(mockFacility);
      StaffFacilityAssignment.findOne.mockResolvedValue(null);
      StaffFacilityAssignment.create.mockResolvedValue(mockAssignment);

      await userController.assignStaff(req, res);

      expect(StaffFacilityAssignment.create).toHaveBeenCalledWith({
        staff_id: 1,
        facility_id: 1,
        role: "FacilityStaff",
        is_primary: true,
        assigned_date: expect.any(Date)
      }, expect.anything());
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if already assigned', async () => {
      req.body = { userId: 1, facilityId: 1 };
      const mockUser = { user_id: 1, user_type: 'staff' };
      const mockStaff = { staff_id: 1 };
      const mockFacility = { facility_id: 1 };
      const mockAssignment = { assignment_id: 1 };

      User.findByPk.mockResolvedValue(mockUser);
      Staff.findOne.mockResolvedValue(mockStaff);
      Facility.findByPk.mockResolvedValue(mockFacility);
      StaffFacilityAssignment.findOne.mockResolvedValue(mockAssignment);

      await userController.assignStaff(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(responseFormatter.error).toHaveBeenCalledWith(
        "Staff already assigned to this facility",
        400
      );
    });
  });

  describe('unassignStaff', () => {
    it('should unassign staff from facility', async () => {
      req.query = { userId: 1, facilityId: 1 };
      const mockUser = { user_id: 1, user_type: 'staff' };
      const mockStaff = { staff_id: 1 };
      const mockAssignment = { destroy: jest.fn() };

      User.findByPk.mockResolvedValue(mockUser);
      Staff.findOne.mockResolvedValue(mockStaff);
      StaffFacilityAssignment.findOne.mockResolvedValue(mockAssignment);

      await userController.unassignStaff(req, res);

      expect(mockAssignment.destroy).toHaveBeenCalledWith(expect.anything());
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getStaffAssignments', () => {
    it('should retrieve staff assignments', async () => {
      req.params = { userId: 1 };
      const mockStaff = { staff_id: 1 };
      const mockAssignment = {
        Facility: { 
          get: jest.fn().mockReturnValue({ facility_id: 1, name: 'Gym' })
        }
      };

      Staff.findOne.mockResolvedValue(mockStaff);
      StaffFacilityAssignment.findAll.mockResolvedValue([mockAssignment]);

      await userController.getStaffAssignments(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalledWith({
        where: { staff_id: 1 },
        include: [{
          model: Facility,
          attributes: [
            'facility_id', 'name', 'type', 'location', 'capacity',
            'status', 'open_time', 'close_time', 'image_url'
          ]
        }],
        transaction: expect.anything()
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});