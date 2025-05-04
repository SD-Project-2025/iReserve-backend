const request = require('supertest');
const express = require('express');
const facilityRouter = require('../../../src/routes/facilities');
const facilityController = require('../../../src/controllers/facilityController');
const { protect, isStaff, isAdmin } = require('../../../src/middleware/auth');
const validate = require('../../../src/middleware/validate');
const facilityValidation = require('../../../src/validations/facilityValidation');

// Mock middleware and controller
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next()),
  isStaff: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next())
}));

jest.mock('../../../src/middleware/validate', () => jest.fn(() => (req, res, next) => next()));

jest.mock('../../../src/controllers/facilityController', () => ({
  getFacilities: jest.fn((req, res) => res.sendStatus(200)),
  getFacility: jest.fn((req, res) => res.sendStatus(200)),
  createFacility: jest.fn((req, res) => res.sendStatus(201)),
  updateFacility: jest.fn((req, res) => res.sendStatus(200)),
  deleteFacility: jest.fn((req, res) => res.sendStatus(200)),
  assignStaff: jest.fn((req, res) => res.sendStatus(201)),
  getAssignedStaff: jest.fn((req, res) => res.sendStatus(200)),
  getFacilitiesByStaffId: jest.fn((req, res) => res.sendStatus(200)),
  createFacilityRating: jest.fn((req, res) => res.sendStatus(201)),
  getRatingsByFacilityId: jest.fn((req, res) => res.sendStatus(200)),
  getFacilityRatings: jest.fn((req, res) => res.sendStatus(200))
}));

describe('Facility Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/facilities', facilityRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /facilities', () => {
    it('should call facilityController.getFacilities', async () => {
      await request(app).get('/facilities');
      expect(facilityController.getFacilities).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/facilities')
        .query({ type: 'gym', status: 'open', isIndoor: true });
      expect(facilityController.getFacilities).toHaveBeenCalled();
    });
  });

  describe('GET /facilities/:id', () => {
    it('should call facilityController.getFacility with id parameter', async () => {
      await request(app).get('/facilities/123');
      expect(facilityController.getFacility).toHaveBeenCalled();
    });
  });

  describe('POST /facilities', () => {
    const validFacility = {
      name: 'Test Facility',
      type: 'gym',
      location: 'Building A',
      capacity: 20,
      status: 'open'
    };

    it('should call protect and isStaff middleware', async () => {
      await request(app).post('/facilities').send(validFacility);
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call validate middleware with createFacilitySchema', async () => {
      await request(app).post('/facilities').send(validFacility);
      expect(validate).toHaveBeenCalledWith(facilityValidation.createFacilitySchema);
    });

    it('should call facilityController.createFacility', async () => {
      await request(app).post('/facilities').send(validFacility);
      expect(facilityController.createFacility).toHaveBeenCalled();
    });
  });

  describe('PUT /facilities/:id', () => {
    const facilityUpdate = { name: 'Updated Facility' };

    it('should call protect and isStaff middleware', async () => {
      await request(app).put('/facilities/1').send(facilityUpdate);
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call validate middleware with updateFacilitySchema', async () => {
      await request(app).put('/facilities/1').send(facilityUpdate);
      expect(validate).toHaveBeenCalledWith(facilityValidation.updateFacilitySchema);
    });

    it('should call facilityController.updateFacility', async () => {
      await request(app).put('/facilities/1').send(facilityUpdate);
      expect(facilityController.updateFacility).toHaveBeenCalled();
    });
  });

  describe('DELETE /facilities/:id', () => {
    it('should call protect and isAdmin middleware', async () => {
      await request(app).delete('/facilities/1');
      expect(protect).toHaveBeenCalled();
      expect(isAdmin).toHaveBeenCalled();
    });

    it('should call facilityController.deleteFacility', async () => {
      await request(app).delete('/facilities/1');
      expect(facilityController.deleteFacility).toHaveBeenCalled();
    });
  });

  describe('POST /facilities/:id/staff', () => {
    const staffAssignment = {
      staff_id: 1,
      role: 'manager',
      is_primary: true
    };

    it('should call protect and isAdmin middleware', async () => {
      await request(app).post('/facilities/1/staff').send(staffAssignment);
      expect(protect).toHaveBeenCalled();
      expect(isAdmin).toHaveBeenCalled();
    });

    it('should call validate middleware with assignStaffSchema', async () => {
      await request(app).post('/facilities/1/staff').send(staffAssignment);
      expect(validate).toHaveBeenCalledWith(facilityValidation.assignStaffSchema);
    });

    it('should call facilityController.assignStaff', async () => {
      await request(app).post('/facilities/1/staff').send(staffAssignment);
      expect(facilityController.assignStaff).toHaveBeenCalled();
    });
  });

  describe('GET /facilities/:id/staff', () => {
    it('should call protect and isStaff middleware', async () => {
      await request(app).get('/facilities/1/staff');
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call facilityController.getAssignedStaff', async () => {
      await request(app).get('/facilities/1/staff');
      expect(facilityController.getAssignedStaff).toHaveBeenCalled();
    });
  });

  describe('GET /facilities/staff/:staff_id', () => {
    it('should call protect and isStaff middleware', async () => {
      await request(app).get('/facilities/staff/1');
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call facilityController.getFacilitiesByStaffId', async () => {
      await request(app).get('/facilities/staff/1');
      expect(facilityController.getFacilitiesByStaffId).toHaveBeenCalled();
    });
  });

  describe('POST /facilities/ratings', () => {
    it('should call facilityController.createFacilityRating', async () => {
      await request(app).post('/facilities/ratings');
      expect(facilityController.createFacilityRating).toHaveBeenCalled();
    });
  });

  describe('GET /facilities/:id/ratings', () => {
    it('should call facilityController.getRatingsByFacilityId', async () => {
      await request(app).get('/facilities/1/ratings');
      expect(facilityController.getRatingsByFacilityId).toHaveBeenCalled();
    });
  });

  describe('GET /facilities/ratings', () => {
    it('should call facilityController.getFacilityRatings', async () => {
      await request(app).get('/facilities/ratings');
      expect(facilityController.getFacilityRatings).toHaveBeenCalled();
    });
  });
});