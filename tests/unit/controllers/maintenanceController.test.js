const maintenanceController = require('../../../src/controllers/maintenanceController');
const { MaintenanceReport, Facility, Resident, StaffFacilityAssignment } = require('../../../src/models');
const responseFormatter = require('../../../src/utils/responseFormatter');

// Mock the models and dependencies
jest.mock('../../../src/models', () => {
  const Sequelize = require('sequelize');
  return {
    MaintenanceReport: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
    },
    Facility: {
      findByPk: jest.fn(),
    },
    Resident: {
      findOne: jest.fn(),
    },
    Staff: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
    StaffFacilityAssignment: {
      findAll: jest.fn(),
    },
    Sequelize,
    Op: Sequelize.Op
  };
});

jest.mock('../../../src/utils/responseFormatter', () => ({
  success: jest.fn().mockImplementation((data, message) => ({ success: true, data, message })),
  error: jest.fn().mockImplementation((message) => ({ success: false, message }))
}));

jest.mock('../../../src/services/encryptionService', () => ({
  decrypt: jest.fn().mockImplementation((value) => value ? `decrypted_${value}` : null)
}));

jest.mock('date-fns', () => ({
  startOfToday: jest.fn(() => new Date('2023-01-01T00:00:00Z')),
  subDays: jest.fn((date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  })
}));

describe('Maintenance Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: {},
      staff: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getMaintenanceReports', () => {
    it('should retrieve maintenance reports with default filters', async () => {
      const mockReports = [{
        report_id: 1,
        title: 'Leak',
        status: 'reported',
        get: jest.fn().mockReturnValue({
          report_id: 1,
          title: 'Leak',
          status: 'reported',
          residentReporter: null,
          staffReporter: { staff_id: 1, name: 'encrypted_name', email: 'encrypted_email' },
          assignedStaff: { staff_id: 2, name: 'encrypted_staff', email: 'encrypted_staff_email' },
          Facility: { facility_id: 1, name: 'Pool' }
        })
      }];

      MaintenanceReport.findAll.mockResolvedValue(mockReports);

      await maintenanceController.getMaintenanceReports(req, res);

      expect(MaintenanceReport.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseFormatter.success).toHaveBeenCalled();
    });

    it('should handle staff permissions with assigned facilities', async () => {
      req.user = { user_type: 'staff' };
      req.staff = { staff_id: 1, is_admin: false };
      const mockAssignments = [{ facility_id: 1 }, { facility_id: 2 }];
      StaffFacilityAssignment.findAll.mockResolvedValue(mockAssignments);

      await maintenanceController.getMaintenanceReports(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalled();
      expect(MaintenanceReport.findAll).toHaveBeenCalled();
    });
  });

  describe('getMyMaintenanceReports', () => {
    it('should retrieve reports for resident', async () => {
      req.user = { user_id: 1, user_type: 'resident' };
      const mockResident = { resident_id: 1 };
      Resident.findOne.mockResolvedValue(mockResident);
      MaintenanceReport.findAll.mockResolvedValue([]);

      await maintenanceController.getMyMaintenanceReports(req, res);

      expect(Resident.findOne).toHaveBeenCalled();
      expect(MaintenanceReport.findAll).toHaveBeenCalled();
    });

    it('should return 404 if resident not found', async () => {
      req.user = { user_id: 999, user_type: 'resident' };
      Resident.findOne.mockResolvedValue(null);

      await maintenanceController.getMyMaintenanceReports(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(responseFormatter.error).toHaveBeenCalledWith('Resident not found');
    });
  });

  describe('getMaintenanceReport', () => {
    it('should retrieve a specific report', async () => {
      req.params.id = 1;
      const mockReport = {
        report_id: 1,
        get: jest.fn().mockReturnValue({ report_id: 1 })
      };
      MaintenanceReport.findByPk.mockResolvedValue(mockReport);

      await maintenanceController.getMaintenanceReport(req, res);

      expect(MaintenanceReport.findByPk).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if report not found', async () => {
      req.params.id = 999;
      MaintenanceReport.findByPk.mockResolvedValue(null);

      await maintenanceController.getMaintenanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createMaintenanceReport', () => {
    it('should create a new report', async () => {
      req.body = {
        facility_id: 1,
        title: 'Leak',
        description: 'Water leak',
        priority: 'high',
        userType: 'resident',
        user_id: 1
      };
      Facility.findByPk.mockResolvedValue({ facility_id: 1 });
      MaintenanceReport.create.mockResolvedValue({ report_id: 1 });

      await maintenanceController.createMaintenanceReport(req, res);

      expect(Facility.findByPk).toHaveBeenCalled();
      expect(MaintenanceReport.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if facility not found', async () => {
      req.body = { facility_id: 999 };
      Facility.findByPk.mockResolvedValue(null);

      await maintenanceController.createMaintenanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateMaintenanceStatus', () => {
    it('should update report status', async () => {
      req.params.id = 1;
      req.body = { status: 'in_progress' };
      const mockReport = {
        update: jest.fn().mockResolvedValue({ report_id: 1, status: 'in_progress' })
      };
      MaintenanceReport.findByPk.mockResolvedValue(mockReport);

      await maintenanceController.updateMaintenanceStatus(req, res);

      expect(mockReport.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if report not found', async () => {
      req.params.id = 999;
      MaintenanceReport.findByPk.mockResolvedValue(null);

      await maintenanceController.updateMaintenanceStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});