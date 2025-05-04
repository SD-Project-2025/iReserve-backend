const request = require('supertest');
const express = require('express');
const bookingsRouter = require('../../../src/routes/bookings');
const bookingController = require('../../../src/controllers/bookingController');
const { protect, isStaff, isResident } = require('../../../src/middleware/auth');
const validate = require('../../../src/middleware/validate');
const bookingValidation = require('../../../src/validations/bookingValidation');

// Mock middleware and controller
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next()),
  isStaff: jest.fn((req, res, next) => next()),
  isResident: jest.fn((req, res, next) => next())
}));

jest.mock('../../../src/middleware/validate', () => jest.fn(() => (req, res, next) => next()));
    //console.log(schema)

jest.mock('../../../src/controllers/bookingController', () => ({
  getBookings: jest.fn((req, res) => res.sendStatus(200)),
  getMyBookings: jest.fn((req, res) => res.sendStatus(200)),
  getBooking: jest.fn((req, res) => res.sendStatus(200)),
  createBooking: jest.fn((req, res) => res.sendStatus(201)),
  updateBookingStatus: jest.fn((req, res) => res.sendStatus(200)),
  cancelBooking: jest.fn((req, res) => res.sendStatus(200))
}));

describe('Booking Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/bookings', bookingsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /bookings', () => {
    it('should call protect and isStaff middleware', async () => {
      await request(app).get('/bookings');
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call bookingController.getBookings', async () => {
      await request(app).get('/bookings');
      expect(bookingController.getBookings).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/bookings')
        .query({ status: 'approved', facility_id: 1, date: '2023-01-01' });
      
      expect(bookingController.getBookings).toHaveBeenCalled();
    });
  });

  describe('GET /bookings/my-bookings', () => {
    it('should call protect and isResident middleware', async () => {
      await request(app).get('/bookings/my-bookings');
      expect(protect).toHaveBeenCalled();
      expect(isResident).toHaveBeenCalled();
    });

    it('should call bookingController.getMyBookings', async () => {
      await request(app).get('/bookings/my-bookings');
      expect(bookingController.getMyBookings).toHaveBeenCalled();
    });
  });

  describe('GET /bookings/:id', () => {
    it('should call protect middleware', async () => {
      await request(app).get('/bookings/1');
      expect(protect).toHaveBeenCalled();
    });

    it('should call bookingController.getBooking with id parameter', async () => {
      await request(app).get('/bookings/123');
      expect(bookingController.getBooking).toHaveBeenCalled();
      // You can add more specific assertions about the req.params.id
    });
  });

  describe('POST /bookings', () => {
    const validBooking = {
      facility_id: 1,
      date: '2025-01-01',
      start_time: '09:00',
      end_time: '10:00',
      purpose: 'Meeting',
      attendees: 5
    };

    it('should call protect and isResident middleware', async () => {
      await request(app).post('/bookings').send(validBooking);
      expect(protect).toHaveBeenCalled();
      expect(isResident).toHaveBeenCalled();
    });

    it('should call validate middleware with createBookingSchema', async () => {
      await request(app).post('/bookings').send(validBooking);
      expect(validate).toHaveBeenCalledWith(bookingValidation.createBookingSchema);
    });

    it('should call bookingController.createBooking', async () => {
      await request(app).post('/bookings').send(validBooking);
      expect(bookingController.createBooking).toHaveBeenCalled();
    });
  });

  describe('PUT /bookings/:id/status', () => {
    const statusUpdate = { status: 'approved' };

    it('should call protect and isStaff middleware', async () => {
      await request(app).put('/bookings/1/status').send(statusUpdate);
      expect(protect).toHaveBeenCalled();
      expect(isStaff).toHaveBeenCalled();
    });

    it('should call validate middleware with updateBookingStatusSchema', async () => {
      await request(app).put('/bookings/1/status').send(statusUpdate);
      expect(validate).toHaveBeenCalledWith(bookingValidation.updateBookingStatusSchema);
    });

    it('should call bookingController.updateBookingStatus', async () => {
      await request(app).put('/bookings/1/status').send(statusUpdate);
      expect(bookingController.updateBookingStatus).toHaveBeenCalled();
    });
  });

  describe('PUT /bookings/:id/cancel', () => {
    it('should call protect and isResident middleware', async () => {
      await request(app).put('/bookings/1/cancel');
      expect(protect).toHaveBeenCalled();
      expect(isResident).toHaveBeenCalled();
    });

    it('should call bookingController.cancelBooking', async () => {
      await request(app).put('/bookings/1/cancel');
      expect(bookingController.cancelBooking).toHaveBeenCalled();
    });
  });
});