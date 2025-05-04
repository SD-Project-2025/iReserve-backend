const eventController = require('../../../src/controllers/eventController');
const { Event, Facility, Staff, EventRegistration } = require('../../../src/models');

// Mock the models
jest.mock('../../../src/models', () => {
  const originalModule = jest.requireActual('../../../src/models');
  return {
    ...originalModule,
    Event: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn()
    },
    Facility: {
      findByPk: jest.fn()
    },
    EventRegistration: {
      findOne: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    }
  };
});

describe('Event Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { user_type: 'staff' },
      staff: { staff_id: 1, is_admin: false },
      resident: { resident_id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getEvents', () => {
    it('should retrieve all events excluding completed ones by default', async () => {
      const mockEvents = [
        { event_id: 1, status: 'upcoming' },
        { event_id: 2, status: 'ongoing' }
      ];
      Event.findAll.mockResolvedValue(mockEvents);

      await eventController.getEvents(req, res);

      expect(Event.findAll).toHaveBeenCalledWith({
        where: {
          status: { [Op.not]: 'completed' }
        },
        include: [
          {
            model: Facility,
            attributes: ['facility_id', 'name', 'type', 'location']
          },
          {
            model: Staff,
            as: 'organizer',
            attributes: ['staff_id', 'employee_id', 'position']
          }
        ],
        order: [
          ['start_date', 'ASC'],
          ['start_time', 'ASC']
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
        message: 'Events retrieved successfully'
      });
    });

    it('should filter events by status and facility_id when provided', async () => {
      req.query = { status: 'upcoming', facility_id: '1' };
      const mockEvents = [{ event_id: 1, status: 'upcoming', facility_id: 1 }];
      Event.findAll.mockResolvedValue(mockEvents);

      await eventController.getEvents(req, res);

      expect(Event.findAll).toHaveBeenCalledWith({
        where: {
          status: 'upcoming',
          facility_id: '1'
        },
        include: expect.any(Array),
        order: expect.any(Array)
      });
    });
  });

  describe('getEvent', () => {
    it('should retrieve a single event with registration count', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        toJSON: jest.fn().mockReturnValue({ event_id: 1 })
      };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.count.mockResolvedValue(10);

      await eventController.getEvent(req, res);

      expect(Event.findByPk).toHaveBeenCalledWith(1, {
        include: [
          {
            model: Facility,
            attributes: ['facility_id', 'name', 'type', 'location', 'capacity']
          },
          {
            model: Staff,
            as: 'organizer',
            attributes: ['staff_id', 'employee_id', 'position']
          }
        ]
      });
      expect(EventRegistration.count).toHaveBeenCalledWith({
        where: {
          event_id: 1,
          status: { [Op.not]: 'cancelled' }
        }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { event_id: 1, registrations: 10 },
        message: 'Event retrieved successfully'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = 999;
      Event.findByPk.mockResolvedValue(null);

      await eventController.getEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });
  });

  describe('createEvent', () => {
    it('should create a new event when all conditions are met', async () => {
      req.body = {
        title: 'Test Event',
        description: 'Test Description',
        facility_id: 1,
        start_date: '2023-12-01',
        end_date: '2023-12-01',
        start_time: '09:00',
        end_time: '10:00',
        capacity: 10,
        image_url: 'test.jpg',
        is_public: true,
        registration_deadline: '2023-11-30',
        fee: 0
      };

      const mockFacility = { facility_id: 1 };
      const mockEvent = { event_id: 1, ...req.body };

      Facility.findByPk.mockResolvedValue(mockFacility);
      Event.create.mockResolvedValue(mockEvent);

      await eventController.createEvent(req, res);

      expect(Facility.findByPk).toHaveBeenCalledWith(1);
      expect(Event.create).toHaveBeenCalledWith({
        ...req.body,
        organizer_staff_id: 1
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event created successfully'
      });
    });

    it('should return 404 if facility not found', async () => {
      req.body = { facility_id: 999 };
      Facility.findByPk.mockResolvedValue(null);

      await eventController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Facility not found'
      });
    });
  });

  describe('updateEvent', () => {
    it('should update event when authorized (organizer)', async () => {
      req.params.id = 1;
      req.body = { title: 'Updated Event' };
      const mockEvent = {
        event_id: 1,
        organizer_staff_id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.updateEvent(req, res);

      expect(Event.findByPk).toHaveBeenCalledWith(1);
      expect(mockEvent.update).toHaveBeenCalledWith({ title: 'Updated Event' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event updated successfully'
      });
    });

    it('should update event when authorized (admin)', async () => {
      req.params.id = 1;
      req.staff.is_admin = true;
      req.body = { title: 'Updated Event' };
      const mockEvent = {
        event_id: 1,
        organizer_staff_id: 2, // Different from req.staff.staff_id
        update: jest.fn().mockResolvedValue(true)
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.updateEvent(req, res);

      expect(mockEvent.update).toHaveBeenCalled();
    });

    it('should return 404 if event not found', async () => {
      req.params.id = 999;
      Event.findByPk.mockResolvedValue(null);

      await eventController.updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });

    it('should return 403 if not organizer or admin', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        organizer_staff_id: 2 // Different from req.staff.staff_id
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to update this event'
      });
    });
  });

  describe('deleteEvent', () => {
    it('should delete event when authorized (organizer)', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        organizer_staff_id: 1,
        destroy: jest.fn().mockResolvedValue(true)
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.deleteEvent(req, res);

      expect(Event.findByPk).toHaveBeenCalledWith(1);
      expect(mockEvent.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Event deleted successfully'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = 999;
      Event.findByPk.mockResolvedValue(null);

      await eventController.deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });

    it('should return 403 if not organizer or admin', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        organizer_staff_id: 2 // Different from req.staff.staff_id
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to delete this event'
      });
    });
  });

  describe('registerForEvent', () => {
    it('should register for event when all conditions are met', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        status: 'upcoming',
        capacity: 10,
        fee: 0,
        registration_deadline: '2023-12-31'
      };
      const mockRegistration = {
        event_id: 1,
        resident_id: 1,
        status: 'registered',
        payment_status: 'not_required'
      };

      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(null);
      EventRegistration.count.mockResolvedValue(5);
      EventRegistration.create.mockResolvedValue(mockRegistration);

      await eventController.registerForEvent(req, res);

      expect(Event.findByPk).toHaveBeenCalledWith(1);
      expect(EventRegistration.findOne).toHaveBeenCalledWith({
        where: {
          event_id: 1,
          resident_id: 1,
          status: { [Op.not]: 'cancelled' }
        }
      });
      expect(EventRegistration.create).toHaveBeenCalledWith({
        event_id: 1,
        resident_id: 1,
        status: 'registered',
        payment_status: 'not_required'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRegistration,
        message: 'Registered for event successfully'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = 999;
      Event.findByPk.mockResolvedValue(null);

      await eventController.registerForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });

    it('should return 400 if event is not upcoming', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        status: 'completed'
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.registerForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot register for completed event'
      });
    });

    it('should return 400 if registration deadline has passed', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        status: 'upcoming',
        registration_deadline: '2020-01-01'
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.registerForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Registration deadline has passed'
      });
    });

    it('should return 400 if already registered', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        status: 'upcoming',
        registration_deadline: '2023-12-31'
      };
      const mockRegistration = {
        event_id: 1,
        resident_id: 1,
        status: 'registered'
      };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(mockRegistration);

      await eventController.registerForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are already registered for this event'
      });
    });

    it('should return 400 if event is full', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        status: 'upcoming',
        capacity: 10,
        registration_deadline: '2023-12-31'
      };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(null);
      EventRegistration.count.mockResolvedValue(10);

      await eventController.registerForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event is at full capacity'
      });
    });

    it('should reactivate cancelled registration if exists', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        status: 'upcoming',
        capacity: 10,
        fee: 0,
        registration_deadline: '2023-12-31'
      };
      const mockRegistration = {
        event_id: 1,
        resident_id: 1,
        status: 'cancelled',
        update: jest.fn().mockResolvedValue(true)
      };

      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne
        .mockResolvedValueOnce(null) // First call for active registration check
        .mockResolvedValueOnce(mockRegistration); // Second call for cancelled registration check
      EventRegistration.count.mockResolvedValue(5);

      await eventController.registerForEvent(req, res);

      expect(mockRegistration.update).toHaveBeenCalledWith({
        status: 'registered',
        payment_status: 'not_required',
        registration_date: expect.any(Date)
      });
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel registration when all conditions are met', async () => {
      req.params.id = 1;
      const mockEvent = { event_id: 1 };
      const mockRegistration = {
        event_id: 1,
        resident_id: 1,
        status: 'registered',
        update: jest.fn().mockResolvedValue(true)
      };

      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(mockRegistration);

      await eventController.cancelRegistration(req, res);

      expect(EventRegistration.findOne).toHaveBeenCalledWith({
        where: {
          event_id: 1,
          resident_id: 1
        }
      });
      expect(mockRegistration.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Event registration cancelled successfully'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = 999;
      Event.findByPk.mockResolvedValue(null);

      await eventController.cancelRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found'
      });
    });

    it('should return 400 if not registered', async () => {
      req.params.id = 1;
      const mockEvent = { event_id: 1 };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(null);

      await eventController.cancelRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not registered for this event'
      });
    });

    it('should return 400 if registration is already cancelled', async () => {
      req.params.id = 1;
      const mockEvent = { event_id: 1 };
      const mockRegistration = {
        event_id: 1,
        resident_id: 1,
        status: 'cancelled'
      };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(mockRegistration);

      await eventController.cancelRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Your registration is already cancelled'
      });
    });
  });

  describe('getRegistrationStatus', () => {
    it('should return registration status when registered', async () => {
      req.params.id = 1;
      req.params.userID = 1;
      const mockEvent = { event_id: 1 };
      const mockRegistration = {
        status: 'registered',
        payment_status: 'paid',
        notes: 'VIP',
        registration_date: '2023-01-01'
      };

      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(mockRegistration);

      await eventController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          isRegistered: true,
          status: 'registered',
          paymentStatus: 'paid',
          notes: 'VIP',
          registrationDate: '2023-01-01'
        },
        message: 'Registration status retrieved successfully'
      });
    });

    it('should return not registered status when no registration exists', async () => {
      req.params.id = 1;
      req.params.userID = 1;
      const mockEvent = { event_id: 1 };

      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(null);

      await eventController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          isRegistered: false,
          status: 'not_registered',
          paymentStatus: null,
          notes: null,
          registrationDate: null
        },
        message: 'Registration status retrieved successfully'
      });
    });

    it('should return 404 if event not found', async () => {
      req.params.id = 999;
      req.params.userID = 1;
      Event.findByPk.mockResolvedValue(null);

      await eventController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found',
        data: null
      });
    });

    it('should handle server errors', async () => {
      req.params.id = 1;
      req.params.userID = 1;
      Event.findByPk.mockRejectedValue(new Error('Database error'));

      await eventController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        data: null
      });
    });
  });
});