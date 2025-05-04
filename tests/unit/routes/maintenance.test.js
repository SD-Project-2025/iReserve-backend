const request = require('supertest');
const express = require('express');
const maintenanceRouter = require('../../../src/routes/maintenance');
const maintenanceController = require('../../../src/controllers/maintenanceController');
const { protect, isStaff } = require('../../../src/middleware/auth');
const validate = require('../../../src/middleware/validate');
const maintenanceValidation = require('../../../src/validations/maintenanceValidation');

// Mock middleware and controller
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next()),
  isStaff: jest.fn((req, res, next) => next())
}));

jest.mock('../../../src/middleware/validate', () => jest.fn(() => (req, res, next) => next()));

jest.mock('../../../src/controllers/maintenanceController', () => ({
  getMaintenanceReports: jest.fn((req, res) => res.sendStatus(200)),
  getMyMaintenanceReports: jest.fn((req, res) => res.sendStatus(200)),
  getMaintenanceReport: jest.fn((req, res) => res.sendStatus(200)),
  createMaintenanceReport: jest.fn((req, res) => res.sendStatus(201)),
  updateMaintenanceStatus: jest.fn((req, res) => res.sendStatus(200))
}));

describe('Maintenance Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/maintenance', maintenanceRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /maintenance', () => {
    it('should call protect and isStaff middleware', async () => {
      await request(app).get('/maintenance');
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call maintenanceController.getMaintenanceReports', async () => {
      await request(app).get('/maintenance');
      expect(maintenanceController.getMaintenanceReports).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/maintenance')
        .query({ status: 'in-progress', priority: 'high', facility_id: 1 });
      expect(maintenanceController.getMaintenanceReports).toHaveBeenCalled();
    });
  });

  describe('GET /maintenance/my-reports', () => {
    it('should call protect middleware', async () => {
      await request(app).get('/maintenance/my-reports');
      expect(protect).toHaveBeenCalled();
    });

    it('should call maintenanceController.getMyMaintenanceReports', async () => {
      await request(app).get('/maintenance/my-reports');
      expect(maintenanceController.getMyMaintenanceReports).toHaveBeenCalled();
    });
  });

  describe('GET /maintenance/:id', () => {
    it('should call protect middleware', async () => {
      await request(app).get('/maintenance/1');
      expect(protect).toHaveBeenCalled();
    });

    it('should call maintenanceController.getMaintenanceReport', async () => {
      await request(app).get('/maintenance/1');
      expect(maintenanceController.getMaintenanceReport).toHaveBeenCalled();
    });
  });

  describe('POST /maintenance', () => {
    const validReport = {
      facility_id: 1,
      title: 'Leaky faucet',
      description: 'Kitchen faucet is leaking',
      priority: 'medium'
    };

    it('should call protect middleware', async () => {
      await request(app).post('/maintenance').send(validReport);
      expect(protect).toHaveBeenCalled();
    });

    it('should call validate middleware with createMaintenanceReportSchema', async () => {
      await request(app).post('/maintenance').send(validReport);
      expect(validate).toHaveBeenCalledWith(maintenanceValidation.createMaintenanceReportSchema);
    });

    it('should call maintenanceController.createMaintenanceReport', async () => {
      await request(app).post('/maintenance').send(validReport);
      expect(maintenanceController.createMaintenanceReport).toHaveBeenCalled();
    });
  });

  describe('PUT /maintenance/:id/status', () => {
    const statusUpdate = {
      status: 'in-progress',
      assigned_to: 1,
      scheduled_date: '2025-01-15',
      feedback: 'Will be handled ASAP'
    };

    it('should call protect and isStaff middleware', async () => {
      await request(app).put('/maintenance/1/status').send(statusUpdate);
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call validate middleware with updateMaintenanceStatusSchema', async () => {
      await request(app).put('/maintenance/1/status').send(statusUpdate);
      expect(validate).toHaveBeenCalledWith(maintenanceValidation.updateMaintenanceStatusSchema);
    });

    it('should call maintenanceController.updateMaintenanceStatus', async () => {
      await request(app).put('/maintenance/1/status').send(statusUpdate);
      expect(maintenanceController.updateMaintenanceStatus).toHaveBeenCalled();
    });
  });
});