const maintenanceController = require('../../../src/controllers/maintenanceController');
const { MaintenanceReport, Facility, Resident, Staff } = require('../../../src/models');
const { Op } = require('sequelize');
//const { subDays, startOfToday } = require('date-fns');

// Mock the models and date-fns
jest.mock('../../../src/models', () => {
  const originalModule = jest.requireActual('../../../src/models');
  return {
    ...originalModule,
    MaintenanceReport: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    Facility: {
      findByPk: jest.fn()
    },
    Resident: {
      findOne: jest.fn()
    },
    Staff: {
      findOne: jest.fn(),
      findByPk: jest.fn()
    }
  };
});

jest.mock('date-fns', () => ({
  startOfToday: jest.fn(() => new Date('2023-01-10')),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000))
}));

describe('Maintenance Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: {
        user_id: 1,
        user_type: 'staff',
        resident_id: 1
      }
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
      const mockReports = [
        { report_id: 1, status: 'reported' },
        { report_id: 2, status: 'in_progress' }
      ];
      MaintenanceReport.findAll.mockResolvedValue(mockReports);

      await maintenanceController.getMaintenanceReports(req, res);

      expect(MaintenanceReport.findAll).toHaveBeenCalledWith({
        where: {
          [Op.or]: [
            { status: { [Op.ne]: 'completed' } },
            {
              status: 'completed',
              completion_date: { [Op.gte]: new Date('2023-01-05') }
            }
          ]
        },
        include: expect.any(Array),
        order: [
          ['priority', 'DESC'],
          ['reported_date', 'DESC']
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReports,
        message: 'Maintenance reports retrieved successfully'
      });
    });

    it('should filter by status, priority, and facility_id when provided', async () => {
      req.query = {
        status: 'in_progress',
        priority: 'high',
        facility_id: '1'
      };
      const mockReports = [{ report_id: 1, status: 'in_progress', priority: 'high', facility_id: 1 }];
      MaintenanceReport.findAll.mockResolvedValue(mockReports);

      await maintenanceController.getMaintenanceReports(req, res);

      expect(MaintenanceReport.findAll).toHaveBeenCalledWith({
        where: {
          status: 'in_progress',
          priority: 'high',
          facility_id: '1',
          [Op.or]: expect.any(Array)
        },
        include: expect.any(Array),
        order: expect.any(Array)
      });
    });
  });

  describe('getMyMaintenanceReports', () => {
    it('should retrieve reports for resident', async () => {
      req.user.user_type = 'resident';
      const mockResident = { resident_id: 1 };
      const mockReports = [
        { report_id: 1, reported_by_resident: 1 },
        { report_id: 2, reported_by_resident: 1 }
      ];

      Resident.findOne.mockResolvedValue(mockResident);
      MaintenanceReport.findAll.mockResolvedValue(mockReports);

      await maintenanceController.getMyMaintenanceReports(req, res);

      expect(Resident.findOne).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(MaintenanceReport.findAll).toHaveBeenCalledWith({
        where: { reported_by_resident: 1 },
        include: expect.any(Array),
        order: [['reported_date', 'DESC']]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReports,
        message: 'Your maintenance reports retrieved successfully'
      });
    });

    it('should retrieve reports for staff', async () => {
      req.user.user_type = 'staff';
      const mockStaff = { staff_id: 1 };
      const mockReports = [
        { report_id: 1, reported_by_staff: 1 },
        { report_id: 2, reported_by_staff: 1 }
      ];

      Staff.findOne.mockResolvedValue(mockStaff);
      MaintenanceReport.findAll.mockResolvedValue(mockReports);

      await maintenanceController.getMyMaintenanceReports(req, res);

      expect(Staff.findOne).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(MaintenanceReport.findAll).toHaveBeenCalledWith({
        where: { reported_by_staff: 1 },
        include: expect.any(Array),
        order: [['reported_date', 'DESC']]
      });
    });

    it('should return 404 if resident not found', async () => {
      req.user.user_type = 'resident';
      Resident.findOne.mockResolvedValue(null);

      await maintenanceController.getMyMaintenanceReports(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Resident not found',
        data: null
      });
    });

    it('should return 404 if staff not found', async () => {
      req.user.user_type = 'staff';
      Staff.findOne.mockResolvedValue(null);

      await maintenanceController.getMyMaintenanceReports(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Staff member not found',
        data: null
      });
    });

    it('should return 403 for invalid user type', async () => {
      req.user.user_type = 'admin';

      await maintenanceController.getMyMaintenanceReports(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid user type',
        data: null
      });
    });
  });

  describe('getMaintenanceReport', () => {
    it('should retrieve a single maintenance report', async () => {
      req.params.id = 1;
      const mockReport = {
        report_id: 1,
        reported_by_resident: null,
        reported_by_staff: 1
      };
      MaintenanceReport.findByPk.mockResolvedValue(mockReport);

      await maintenanceController.getMaintenanceReport(req, res);

      expect(MaintenanceReport.findByPk).toHaveBeenCalledWith(1, {
        include: expect.any(Array)
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Maintenance report retrieved successfully'
      });
    });

    it('should return 404 if report not found', async () => {
      req.params.id = 999;
      MaintenanceReport.findByPk.mockResolvedValue(null);

      await maintenanceController.getMaintenanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Maintenance report not found'
      });
    });

    it('should return 403 if resident tries to access another resident\'s report', async () => {
      req.params.id = 1;
      req.user.user_type = 'resident';
      const mockReport = {
        report_id: 1,
        reported_by_resident: 2, // Different from req.user.resident_id
        reported_by_staff: null
      };
      MaintenanceReport.findByPk.mockResolvedValue(mockReport);

      await maintenanceController.getMaintenanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to view this report'
      });
    });
  });

  describe('createMaintenanceReport', () => {
    it('should create a new maintenance report for resident', async () => {
      req.body = {
        facility_id: 1,
        title: 'Leaky faucet',
        description: 'Kitchen faucet is leaking',
        priority: 'medium',
        userType: 'resident',
        user_id: 1
      };
      const mockFacility = { facility_id: 1 };
      const mockReport = {
        report_id: 1,
        ...req.body,
        status: 'reported'
      };

      Facility.findByPk.mockResolvedValue(mockFacility);
      MaintenanceReport.create.mockResolvedValue(mockReport);

      await maintenanceController.createMaintenanceReport(req, res);

      expect(Facility.findByPk).toHaveBeenCalledWith(1);
      expect(MaintenanceReport.create).toHaveBeenCalledWith({
        facility_id: 1,
        title: 'Leaky faucet',
        description: 'Kitchen faucet is leaking',
        priority: 'medium',
        status: 'reported',
        reported_date: expect.any(Date),
        reported_by_resident: 1,
        reported_by_staff: null
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Maintenance report created successfully'
      });
    });

    it('should create a new maintenance report for staff', async () => {
      req.body = {
        facility_id: 1,
        title: 'Broken elevator',
        description: 'Elevator stuck between floors',
        priority: 'high',
        userType: 'staff',
        user_id: 1
      };
      const mockFacility = { facility_id: 1 };
      const mockReport = {
        report_id: 1,
        ...req.body,
        status: 'reported'
      };

      Facility.findByPk.mockResolvedValue(mockFacility);
      MaintenanceReport.create.mockResolvedValue(mockReport);

      await maintenanceController.createMaintenanceReport(req, res);

      expect(MaintenanceReport.create).toHaveBeenCalledWith({
        facility_id: 1,
        title: 'Broken elevator',
        description: 'Elevator stuck between floors',
        priority: 'high',
        status: 'reported',
        reported_date: expect.any(Date),
        reported_by_resident: null,
        reported_by_staff: 1
      });
    });

    it('should return 404 if facility not found', async () => {
      req.body = { facility_id: 999 };
      Facility.findByPk.mockResolvedValue(null);

      await maintenanceController.createMaintenanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Facility not found'
      });
    });
  });

  describe('updateMaintenanceStatus', () => {
    it('should update maintenance report status', async () => {
      req.params.id = 1;
      req.body = {
        status: 'in_progress',
        assigned_to: 1,
        scheduled_date: '2023-01-15',
        feedback: 'Will be handled ASAP'
      };
      const mockReport = {
        report_id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      const mockStaff = { staff_id: 1 };

      MaintenanceReport.findByPk.mockResolvedValue(mockReport);
      Staff.findByPk.mockResolvedValue(mockStaff);

      await maintenanceController.updateMaintenanceStatus(req, res);

      expect(MaintenanceReport.findByPk).toHaveBeenCalledWith(1);
      expect(Staff.findByPk).toHaveBeenCalledWith(1);
      expect(mockReport.update).toHaveBeenCalledWith({
        status: 'in_progress',
        assigned_to: 1,
        scheduled_date: '2023-01-15',
        feedback: 'Will be handled ASAP'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Maintenance report updated successfully'
      });
    });

    it('should set completion_date when status is completed', async () => {
      req.params.id = 1;
      req.body = { status: 'completed' };
      const mockReport = {
        report_id: 1,
        update: jest.fn().mockResolvedValue(true)
      };

      MaintenanceReport.findByPk.mockResolvedValue(mockReport);

      await maintenanceController.updateMaintenanceStatus(req, res);

      expect(mockReport.update).toHaveBeenCalledWith({
        status: 'completed',
        completion_date: expect.any(Date)
      });
    });

    it('should return 404 if report not found', async () => {
      req.params.id = 999;
      MaintenanceReport.findByPk.mockResolvedValue(null);

      await maintenanceController.updateMaintenanceStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Maintenance report not found'
      });
    });

    it('should return 404 if assigned staff not found', async () => {
      req.params.id = 1;
      req.body = { assigned_to: 999 };
      const mockReport = {
        report_id: 1,
        update: jest.fn().mockResolvedValue(true)
      };

      MaintenanceReport.findByPk.mockResolvedValue(mockReport);
      Staff.findByPk.mockResolvedValue(null);

      await maintenanceController.updateMaintenanceStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Assigned staff not found'
      });
    });
  });
});