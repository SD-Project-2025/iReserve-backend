const maintenanceController = require('../../../src/controllers/maintenanceController');
const { MaintenanceReport, Facility, Resident, Staff } = require('../../../src/models');

// Mock the models
jest.mock('../../../src/models', () => ({
  MaintenanceReport: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Facility: {
    findByPk: jest.fn(),
  },
  Staff: {
    findByPk: jest.fn(),
  },
  Resident: {
    // Mock as needed
  }
}));

describe('Maintenance Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { user_type: 'staff' },
      staff: { staff_id: 1 },
      resident: { resident_id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getMaintenanceReports', () => {
    it('should retrieve all maintenance reports with no filters', async () => {
      const mockReports = [{ title: 'Leaky faucet' }, { title: 'Broken window' }];
      MaintenanceReport.findAll.mockResolvedValue(mockReports);

      await maintenanceController.getMaintenanceReports(req, res);

      expect(MaintenanceReport.findAll).toHaveBeenCalledWith({
        where: {},
        include: expect.arrayContaining([
          expect.objectContaining({ model: Facility }),
          expect.objectContaining({ model: Resident, as: 'residentReporter' }),
          expect.objectContaining({ model: Staff, as: 'staffReporter' }),
          expect.objectContaining({ model: Staff, as: 'assignedStaff' })
        ]),
        order: [
          ["priority", "DESC"],
          ["reported_date", "DESC"],
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should filter reports by status, priority and facility_id', async () => {
      req.query = { status: 'open', priority: 'high', facility_id: '1' };
      const mockReports = [{ title: 'Urgent repair' }];
      MaintenanceReport.findAll.mockResolvedValue(mockReports);

      await maintenanceController.getMaintenanceReports(req, res);

      expect(MaintenanceReport.findAll).toHaveBeenCalledWith({
        where: { status: 'open', priority: 'high', facility_id: '1' },
        include: expect.any(Array),
        order: expect.any(Array)
      });
    });
  });

  describe('getMyMaintenanceReports', () => {
    it('should retrieve reports for the current resident', async () => {
      req.user.user_type = 'resident';
      const mockReports = [{ title: 'My report' }];
      MaintenanceReport.findAll.mockResolvedValue(mockReports);

      await maintenanceController.getMyMaintenanceReports(req, res);

      expect(MaintenanceReport.findAll).toHaveBeenCalledWith({
        where: { reported_by_resident: 1 },
        include: expect.arrayContaining([
          expect.objectContaining({ model: Facility }),
          expect.objectContaining({ model: Staff, as: 'assignedStaff' })
        ]),
        order: [["reported_date", "DESC"]]
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMaintenanceReport', () => {
    it('should retrieve a single report', async () => {
      req.params.id = 1;
      const mockReport = { 
        report_id: 1,
        reported_by_resident: null,
        reported_by_staff: 1
      };
      MaintenanceReport.findByPk.mockResolvedValue(mockReport);

      await maintenanceController.getMaintenanceReport(req, res);

      expect(MaintenanceReport.findByPk).toHaveBeenCalledWith(1, {
        include: expect.arrayContaining([
          expect.objectContaining({ model: Facility }),
          expect.objectContaining({ model: Resident, as: 'residentReporter' }),
          expect.objectContaining({ model: Staff, as: 'staffReporter' }),
          expect.objectContaining({ model: Staff, as: 'assignedStaff' })
        ])
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if resident tries to access another resident\'s report', async () => {
      req.params.id = 1;
      req.user.user_type = 'resident';
      const mockReport = { 
        report_id: 1,
        reported_by_resident: 2, // Different from req.resident.resident_id
        reported_by_staff: null
      };
      MaintenanceReport.findByPk.mockResolvedValue(mockReport);

      await maintenanceController.getMaintenanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('createMaintenanceReport', () => {
    it('should create a new report as resident', async () => {
      req.user.user_type = 'resident';
      req.body = {
        facility_id: 1,
        title: 'Broken door',
        description: 'Door handle is broken',
        priority: 'medium'
      };
      Facility.findByPk.mockResolvedValue({ facility_id: 1 });
      MaintenanceReport.create.mockResolvedValue({ report_id: 1 });

      await maintenanceController.createMaintenanceReport(req, res);

      expect(MaintenanceReport.create).toHaveBeenCalledWith(expect.objectContaining({
        reported_by_resident: 1,
        reported_by_staff: null
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should create a new report as staff', async () => {
      req.user.user_type = 'staff';
      req.body = {
        facility_id: 1,
        title: 'Broken window',
        description: 'Window in hallway is cracked',
        priority: 'high'
      };
      Facility.findByPk.mockResolvedValue({ facility_id: 1 });
      MaintenanceReport.create.mockResolvedValue({ report_id: 1 });

      await maintenanceController.createMaintenanceReport(req, res);

      expect(MaintenanceReport.create).toHaveBeenCalledWith(expect.objectContaining({
        reported_by_resident: null,
        reported_by_staff: 1
      }));
    });

    it('should return 404 if facility not found', async () => {
      req.body = { facility_id: 999 };
      Facility.findByPk.mockResolvedValue(null);

      await maintenanceController.createMaintenanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateMaintenanceStatus', () => {
    it('should update report status and assign staff', async () => {
      req.params.id = 1;
      req.body = {
        status: 'in_progress',
        assigned_to: 2,
        scheduled_date: '2023-12-15'
      };
      const mockReport = {
        report_id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      MaintenanceReport.findByPk.mockResolvedValue(mockReport);
      Staff.findByPk.mockResolvedValue({ staff_id: 2 });

      await maintenanceController.updateMaintenanceStatus(req, res);

      expect(Staff.findByPk).toHaveBeenCalledWith(2);
      expect(mockReport.update).toHaveBeenCalledWith({
        status: 'in_progress',
        assigned_to: 2,
        scheduled_date: '2023-12-15'
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should set completion date when status is completed', async () => {
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
    });

    it('should return 404 if assigned staff not found', async () => {
      req.params.id = 1;
      req.body = { assigned_to: 999 };
      MaintenanceReport.findByPk.mockResolvedValue({ report_id: 1 });
      Staff.findByPk.mockResolvedValue(null);

      await maintenanceController.updateMaintenanceStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});