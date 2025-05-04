const bookingController = require('../../../src/controllers/bookingController');
const { Booking, Facility, Resident, Staff } = require('../../../src/models');
const { Op } = require("sequelize");
// Mock the models
jest.mock('../../../src/models', () => {
  const originalModule = jest.requireActual('../../../src/models');
  return {
    ...originalModule,
    Booking: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn()
    },
    Facility: {
      findByPk: jest.fn()
    }
  };
});

describe('Booking Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { user_type: 'staff' }, // Default to staff for broader access
      resident: { resident_id: 1 },
      staff: { staff_id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getBookings', () => {
    it('should retrieve all future bookings with default filters', async () => {
      const mockBookings = [
        { booking_id: 1, date: '2023-12-01', facility_id: 1 },
        { booking_id: 2, date: '2023-12-02', facility_id: 2 }
      ];
      Booking.findAll.mockResolvedValue(mockBookings);

      await bookingController.getBookings(req, res);

      expect(Booking.findAll).toHaveBeenCalledWith({
        where: {
          date: {
            [Op.gte]: expect.any(String)
          }
        },
        include: [
          {
            model: Facility,
            attributes: ['facility_id', 'name', 'type', 'location']
          },
          {
            model: Resident,
            attributes: ['resident_id']
          },
          {
            model: Staff,
            as: 'approver',
            attributes: ['staff_id', 'employee_id']
          }
        ],
        order: [
          ['date', 'ASC'],
          ['start_time', 'ASC']
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBookings,
        message: 'Bookings retrieved successfully'
      });
    });

    it('should filter by status and facility_id when provided', async () => {
      req.query = { status: 'approved', facility_id: '1' };
      const mockBookings = [{ booking_id: 1, status: 'approved', facility_id: 1 }];
      Booking.findAll.mockResolvedValue(mockBookings);

      await bookingController.getBookings(req, res);

      expect(Booking.findAll).toHaveBeenCalledWith({
        where: {
          date: {
            [Op.gte]: expect.any(String)
          },
          status: 'approved',
          facility_id: '1'
        },
        include: expect.any(Array),
        order: expect.any(Array)
      });
    });
  });

  describe('getMyBookings', () => {
    it('should retrieve bookings for the current resident', async () => {
      const mockBookings = [
        { booking_id: 1, resident_id: 1 },
        { booking_id: 2, resident_id: 1 }
      ];
      Booking.findAll.mockResolvedValue(mockBookings);

      await bookingController.getMyBookings(req, res);

      expect(Booking.findAll).toHaveBeenCalledWith({
        where: { resident_id: 1 },
        include: [
          {
            model: Facility,
            attributes: ['facility_id', 'name', 'type', 'location']
          }
        ],
        order: [
          ['date', 'DESC'],
          ['start_time', 'ASC']
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBookings,
        message: 'Your bookings retrieved successfully'
      });
    });
  });

  describe('getBooking', () => {
    it('should retrieve a single booking by ID', async () => {
      req.params.id = 1;
      const mockBooking = {
        booking_id: 1,
        resident_id: 1,
        approver: null
      };
      Booking.findByPk.mockResolvedValue(mockBooking);

      await bookingController.getBooking(req, res);

      expect(Booking.findByPk).toHaveBeenCalledWith(1, {
        include: expect.any(Array)
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBooking,
        message: 'Booking retrieved successfully'
      });
    });

    it('should return 404 if booking not found', async () => {
      req.params.id = 999;
      Booking.findByPk.mockResolvedValue(null);

      await bookingController.getBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking not found'
      });
    });

    it('should return 403 if resident tries to access another resident\'s booking', async () => {
      req.params.id = 1;
      req.user.user_type = 'resident';
      const mockBooking = {
        booking_id: 1,
        resident_id: 2 // Different from req.resident.resident_id
      };
      Booking.findByPk.mockResolvedValue(mockBooking);

      await bookingController.getBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to view this booking'
      });
    });
  });

  describe('createBooking', () => {
    it('should create a new booking when all conditions are met', async () => {
      req.body = {
        facility_id: 1,
        date: '2023-12-01',
        start_time: '09:00',
        end_time: '10:00',
        purpose: 'Meeting',
        attendees: 5
      };

      const mockFacility = {
        facility_id: 1,
        status: 'open',
        capacity: 10
      };
      const mockBooking = {
        booking_id: 1,
        ...req.body,
        resident_id: 1,
        status: 'pending'
      };

      Facility.findByPk.mockResolvedValue(mockFacility);
      Booking.findOne.mockResolvedValue(null);
      Booking.create.mockResolvedValue(mockBooking);

      await bookingController.createBooking(req, res);

      expect(Facility.findByPk).toHaveBeenCalledWith(1);
      expect(Booking.findOne).toHaveBeenCalledWith({
        where: expect.any(Object)
      });
      expect(Booking.create).toHaveBeenCalledWith({
        facility_id: 1,
        resident_id: 1,
        date: '2023-12-01',
        start_time: '09:00',
        end_time: '10:00',
        purpose: 'Meeting',
        attendees: 5,
        status: 'pending'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBooking,
        message: 'Booking created successfully'
      });
    });

    it('should return 404 if facility not found', async () => {
      req.body = { facility_id: 999 };
      Facility.findByPk.mockResolvedValue(null);

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Facility not found'
      });
    });

    it('should return 400 if facility is not open', async () => {
      req.body = { facility_id: 1 };
      const mockFacility = {
        facility_id: 1,
        status: 'closed'
      };
      Facility.findByPk.mockResolvedValue(mockFacility);

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Facility is currently closed'
      });
    });

    it('should return 400 if attendees exceed capacity', async () => {
      req.body = {
        facility_id: 1,
        attendees: 15
      };
      const mockFacility = {
        facility_id: 1,
        status: 'open',
        capacity: 10
      };
      Facility.findByPk.mockResolvedValue(mockFacility);

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Number of attendees exceeds facility capacity of 10'
      });
    });

    it('should return 400 if time slot is already booked', async () => {
      req.body = {
        facility_id: 1,
        date: '2023-12-01',
        start_time: '09:00',
        end_time: '10:00',
        attendees: 5
      };
      const mockFacility = {
        facility_id: 1,
        status: 'open',
        capacity: 10
      };
      const conflictingBooking = {
        booking_id: 2,
        facility_id: 1,
        date: '2023-12-01',
        start_time: '09:30',
        end_time: '10:30',
        status: 'approved'
      };

      Facility.findByPk.mockResolvedValue(mockFacility);
      Booking.findOne.mockResolvedValue(conflictingBooking);

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'The selected time slot conflicts with an existing booking'
      });
    });
  });

  describe('updateBookingStatus', () => {
    it('should update booking status when authorized', async () => {
      req.params.id = 1;
      req.body = { status: 'approved' };
      const mockBooking = {
        booking_id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      Booking.findByPk.mockResolvedValue(mockBooking);

      await bookingController.updateBookingStatus(req, res);

      expect(Booking.findByPk).toHaveBeenCalledWith(1);
      expect(mockBooking.update).toHaveBeenCalledWith({
        status: 'approved',
        approved_by: 1,
        approval_date: expect.any(Date)
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBooking,
        message: 'Booking approved successfully'
      });
    });

    it('should return 404 if booking not found', async () => {
      req.params.id = 999;
      Booking.findByPk.mockResolvedValue(null);

      await bookingController.updateBookingStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking not found'
      });
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking when authorized', async () => {
      req.params.id = 1;
      const mockBooking = {
        booking_id: 1,
        resident_id: 1,
        status: 'approved',
        update: jest.fn().mockResolvedValue(true)
      };
      Booking.findByPk.mockResolvedValue(mockBooking);

      await bookingController.cancelBooking(req, res);

      expect(Booking.findByPk).toHaveBeenCalledWith(1);
      expect(mockBooking.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Booking cancelled successfully'
      });
    });

    it('should return 404 if booking not found', async () => {
      req.params.id = 999;
      Booking.findByPk.mockResolvedValue(null);

      await bookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking not found'
      });
    });

    it('should return 403 if resident tries to cancel another resident\'s booking', async () => {
      req.params.id = 1;
      const mockBooking = {
        booking_id: 1,
        resident_id: 2 // Different from req.resident.resident_id
      };
      Booking.findByPk.mockResolvedValue(mockBooking);

      await bookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to cancel this booking'
      });
    });

    it('should return 400 if booking is already cancelled', async () => {
      req.params.id = 1;
      const mockBooking = {
        booking_id: 1,
        resident_id: 1,
        status: 'cancelled'
      };
      Booking.findByPk.mockResolvedValue(mockBooking);

      await bookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking is already cancelled'
      });
    });
  });
});