const request = require('supertest');
const express = require('express');
const eventRouter = require('../../../src/routes/events');
const eventController = require('../../../src/controllers/eventController');
const { protect, isStaff, isResident } = require('../../../src/middleware/auth');
const validate = require('../../../src/middleware/validate');
const eventValidation = require('../../../src/validations/eventValidation');

// Mock middleware and controller
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next()),
  isStaff: jest.fn((req, res, next) => next()),
  isResident: jest.fn((req, res, next) => next())
}));

jest.mock('../../../src/middleware/validate', () => jest.fn(() => (req, res, next) => next()));

jest.mock('../../../src/controllers/eventController', () => ({
  getEvents: jest.fn((req, res) => res.sendStatus(200)),
  getEvent: jest.fn((req, res) => res.sendStatus(200)),
  createEvent: jest.fn((req, res) => res.sendStatus(201)),
  updateEvent: jest.fn((req, res) => res.sendStatus(200)),
  deleteEvent: jest.fn((req, res) => res.sendStatus(200)),
  registerForEvent: jest.fn((req, res) => res.sendStatus(201)),
  cancelRegistration: jest.fn((req, res) => res.sendStatus(200)),
  getRegistrationStatus: jest.fn((req, res) => res.sendStatus(200))
}));

describe('Event Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/events', eventRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /events', () => {
    it('should call eventController.getEvents', async () => {
      await request(app).get('/events');
      expect(eventController.getEvents).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/events')
        .query({ status: 'upcoming', facility_id: 1 });
      expect(eventController.getEvents).toHaveBeenCalled();
    });
  });

  describe('GET /events/:id', () => {
    it('should call eventController.getEvent with id parameter', async () => {
      await request(app).get('/events/123');
      expect(eventController.getEvent).toHaveBeenCalled();
    });
  });

  describe('POST /events', () => {
    const validEvent = {
      title: 'Test Event',
      description: 'Test Description',
      facility_id: 1,
      start_date: '2025-01-01',
      end_date: '2025-01-01',
      start_time: '09:00',
      end_time: '10:00',
      capacity: 10,
      is_public: true
    };

    it('should call protect and isStaff middleware', async () => {
      await request(app).post('/events').send(validEvent);
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call validate middleware with createEventSchema', async () => {
      await request(app).post('/events').send(validEvent);
      expect(validate).toHaveBeenCalledWith(eventValidation.createEventSchema);
    });

    it('should call eventController.createEvent', async () => {
      await request(app).post('/events').send(validEvent);
      expect(eventController.createEvent).toHaveBeenCalled();
    });
  });

  describe('PUT /events/:id', () => {
    const eventUpdate = { title: 'Updated Event' };

    it('should call protect and isStaff middleware', async () => {
      await request(app).put('/events/1').send(eventUpdate);
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call validate middleware with updateEventSchema', async () => {
      await request(app).put('/events/1').send(eventUpdate);
      expect(validate).toHaveBeenCalledWith(eventValidation.updateEventSchema);
    });

    it('should call eventController.updateEvent', async () => {
      await request(app).put('/events/1').send(eventUpdate);
      expect(eventController.updateEvent).toHaveBeenCalled();
    });
  });

  describe('DELETE /events/:id', () => {
    it('should call protect and isStaff middleware', async () => {
      await request(app).delete('/events/1');
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call eventController.deleteEvent', async () => {
      await request(app).delete('/events/1');
      expect(eventController.deleteEvent).toHaveBeenCalled();
    });
  });

  describe('POST /events/:id/register', () => {
    it('should call protect and isResident middleware', async () => {
      await request(app).post('/events/1/register');
      expect(protect).toHaveBeenCalled();
      expect(isResident).toHaveBeenCalled();
    });

    it('should call eventController.registerForEvent', async () => {
      await request(app).post('/events/1/register');
      expect(eventController.registerForEvent).toHaveBeenCalled();
    });
  });

  describe('PUT /events/:id/cancel-registration', () => {
    it('should call protect and isResident middleware', async () => {
      await request(app).put('/events/1/cancel-registration');
      expect(protect).toHaveBeenCalled();
      expect(isResident).toHaveBeenCalled();
    });

    it('should call eventController.cancelRegistration', async () => {
      await request(app).put('/events/1/cancel-registration');
      expect(eventController.cancelRegistration).toHaveBeenCalled();
    });
  });

  describe('GET /events/:id/status/:userID', () => {
    it('should call protect and isResident middleware', async () => {
      await request(app).get('/events/1/status/1');
      expect(protect).toHaveBeenCalled();
      expect(isResident).toHaveBeenCalled();
    });

    it('should call eventController.getRegistrationStatus', async () => {
      await request(app).get('/events/1/status/1');
      expect(eventController.getRegistrationStatus).toHaveBeenCalled();
    });
  });
});