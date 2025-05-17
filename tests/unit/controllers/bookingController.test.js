// const bookingController = require('../../../src/controllers/bookingController');
const bookingController = require('../../../src/controllers/bookingController')
const { Booking, Facility, StaffFacilityAssignment } = require('../../../src/models');
const responseFormatter = require('../../../src/utils/responseFormatter');
const encryptionService = require('../../../src/services/encryptionService');

// Mocks
jest.mock('../../../src/models');
jest.mock('../../../src/utils/responseFormatter');
jest.mock('../../../src/services/encryptionService');

describe('Booking Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { user_type: 'resident' },
      resident: { resident_id: 1 },
      staff: { staff_id: 2, is_admin: false }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });

  // === getBookings ===
  describe('getBookings', () => {
    it('should return bookings for admin/staff with facility filters', async () => {
      req.user.user_type = 'staff';
      req.staff.is_admin = true;
      req.query = { status: 'approved' };

      Booking.findAll.mockResolvedValue([]);

      await bookingController.getBookings(req, res);

      expect(Booking.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseFormatter.success).toHaveBeenCalledWith(expect.any(Array), expect.any(String));
    });

    it('should return no bookings if staff has no assigned facilities', async () => {
      req.user.user_type = 'staff';
      req.staff.is_admin = false;

      StaffFacilityAssignment.findAll.mockResolvedValue([]);

      await bookingController.getBookings(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseFormatter.success).toHaveBeenCalledWith([], expect.any(String));
    });

    it('should return decrypted resident and approver info', async () => {
      req.user.user_type = 'staff';
      req.staff.is_admin = true;

      Booking.findAll.mockResolvedValue([
        {
          get: () => ({
            booking_id: 1,
            date: '2025-01-01',
            Resident: { name: 'encryptedName' },
            approver: { name: 'encryptedApprover', email: 'encryptedEmail' }
          })
        }
      ]);

      encryptionService.decrypt.mockImplementation(str => `decrypted(${str})`);

      await bookingController.getBookings(req, res);

      expect(encryptionService.decrypt).toHaveBeenCalled();
      expect(responseFormatter.success).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            resident_name: 'decrypted(encryptedName)',
            approver: {
              name: 'decrypted(encryptedApprover)',
              email: 'decrypted(encryptedEmail)'
            }
          })
        ]),
        expect.any(String)
      );
    });
  });

  // === getMyBookings ===
  describe('getMyBookings', () => {
    it('should retrieve resident bookings', async () => {
      Booking.findAll.mockResolvedValue([{ booking_id: 1 }]);

      await bookingController.getMyBookings(req, res);

      expect(Booking.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { resident_id: 1 }
      }));
      expect(responseFormatter.success).toHaveBeenCalledWith(expect.any(Array), "Your bookings retrieved successfully");
    });
  });

  // === getBooking ===
  describe('getBooking', () => {
    it('should return booking details for allowed resident', async () => {
      req.params.id = 5;
      Booking.findByPk.mockResolvedValue({ resident_id: 1 });

      await bookingController.getBooking(req, res);

      expect(Booking.findByPk).toHaveBeenCalledWith(5, expect.any(Object));
      expect(responseFormatter.success).toHaveBeenCalled();
    });

    it('should reject access for unauthorized resident', async () => {
      req.params.id = 5;
      Booking.findByPk.mockResolvedValue({ resident_id: 99 });

      await bookingController.getBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if booking not found', async () => {
      Booking.findByPk.mockResolvedValue(null);

      await bookingController.getBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // === createBooking ===
  describe('createBooking', () => {
    beforeEach(() => {
      req.body = {
        facility_id: 1,
        date: '2025-01-01',
        start_time: '10:00',
        end_time: '11:00',
        purpose: 'Meeting',
        attendees: 5
      };
    });

    it('should reject if facility does not exist', async () => {
      Facility.findByPk.mockResolvedValue(null);

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should reject if facility is closed', async () => {
      Facility.findByPk.mockResolvedValue({ status: 'closed' });

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject if attendees exceed capacity', async () => {
      Facility.findByPk.mockResolvedValue({ status: 'open', capacity: 3 });

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject on conflicting booking', async () => {
      Facility.findByPk.mockResolvedValue({ status: 'open', capacity: 10 });
      Booking.findOne.mockResolvedValue({});

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create booking if valid', async () => {
      Facility.findByPk.mockResolvedValue({ status: 'open', capacity: 10 });
      Booking.findOne.mockResolvedValue(null);
      Booking.create.mockResolvedValue({ booking_id: 10 });

      await bookingController.createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(responseFormatter.success).toHaveBeenCalledWith({ booking_id: 10 }, "Booking created successfully");
    });
  });

  // === updateBookingStatus ===
  describe('updateBookingStatus', () => {
    it('should update booking status', async () => {
      req.params.id = 1;
      req.body.status = 'approved';

      Booking.findByPk.mockResolvedValue({
        update: jest.fn().mockResolvedValue(true)
      });

      await bookingController.updateBookingStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseFormatter.success).toHaveBeenCalled();
    });

    it('should return 404 if booking not found', async () => {
      Booking.findByPk.mockResolvedValue(null);

      await bookingController.updateBookingStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // === cancelBooking ===
  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      req.params.id = 3;

      Booking.findByPk.mockResolvedValue({
        resident_id: 1,
        status: 'approved',
        update: jest.fn().mockResolvedValue(true)
      });

      await bookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(responseFormatter.success).toHaveBeenCalledWith(null, "Booking cancelled successfully");
    });

    it('should return 403 if resident tries to cancel someone else’s booking', async () => {
      Booking.findByPk.mockResolvedValue({ resident_id: 99 });

      await bookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if booking is already cancelled', async () => {
      Booking.findByPk.mockResolvedValue({ resident_id: 1, status: 'cancelled' });

      await bookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if booking not found', async () => {
      Booking.findByPk.mockResolvedValue(null);

      await bookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
