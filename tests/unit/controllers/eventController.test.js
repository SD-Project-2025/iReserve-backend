const eventController = require('../../../src/controllers/eventController');
const { Event, Facility, Staff, EventRegistration } = require('../../../src/models');

// Mock the models
jest.mock('../../../src/models', () => ({
  Event: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Facility: {
    findByPk: jest.fn(),
  },
  Staff: {
    // Mock as needed
  },
  EventRegistration: {
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  }
}));

describe('Event Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
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
    it('should retrieve all events with no filters', async () => {
      const mockEvents = [{ title: 'Yoga Class' }, { title: 'Basketball Tournament' }];
      Event.findAll.mockResolvedValue(mockEvents);

      await eventController.getEvents(req, res);

      expect(Event.findAll).toHaveBeenCalledWith({
        where: {},
        include: expect.arrayContaining([
          expect.objectContaining({ model: Facility }),
          expect.objectContaining({ model: Staff, as: 'organizer' })
        ]),
        order: [
          ["start_date", "ASC"],
          ["start_time", "ASC"],
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should filter events by status and facility_id', async () => {
      req.query = { status: 'upcoming', facility_id: '1' };
      const mockEvents = [{ title: 'Upcoming Event' }];
      Event.findAll.mockResolvedValue(mockEvents);

      await eventController.getEvents(req, res);

      expect(Event.findAll).toHaveBeenCalledWith({
        where: { status: 'upcoming', facility_id: '1' },
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
        title: 'Test Event',
        toJSON: jest.fn().mockReturnValue({ event_id: 1, title: 'Test Event' })
      };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.count.mockResolvedValue(10);

      await eventController.getEvent(req, res);

      expect(Event.findByPk).toHaveBeenCalledWith(1, {
        include: expect.arrayContaining([
          expect.objectContaining({ model: Facility }),
          expect.objectContaining({ model: Staff, as: 'organizer' })
        ])
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if event not found', async () => {
      req.params.id = 999;
      Event.findByPk.mockResolvedValue(null);

      await eventController.getEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      req.body = {
        title: 'New Event',
        facility_id: 1,
        start_date: '2023-12-01',
        end_date: '2023-12-01',
        start_time: '10:00',
        end_time: '12:00'
      };
      Facility.findByPk.mockResolvedValue({ facility_id: 1 });
      Event.create.mockResolvedValue({ event_id: 1 });

      await eventController.createEvent(req, res);

      expect(Facility.findByPk).toHaveBeenCalledWith(1);
      expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({
        organizer_staff_id: 1
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if facility not found', async () => {
      req.body = { facility_id: 999 };
      Facility.findByPk.mockResolvedValue(null);

      await eventController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateEvent', () => {
    it('should update an event if organizer', async () => {
      req.params.id = 1;
      const mockEvent = { 
        event_id: 1, 
        organizer_staff_id: 1,
        update: jest.fn().mockResolvedValue(true)
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.updateEvent(req, res);

      expect(mockEvent.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
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
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event if admin', async () => {
      req.params.id = 1;
      req.staff.is_admin = true;
      const mockEvent = { 
        event_id: 1,
        organizer_staff_id: 2,
        destroy: jest.fn().mockResolvedValue(true)
      };
      Event.findByPk.mockResolvedValue(mockEvent);

      await eventController.deleteEvent(req, res);

      expect(mockEvent.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
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
    });
  });

  describe('registerForEvent', () => {
    it('should register resident for event', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        status: 'upcoming',
        capacity: 10,
        registration_deadline: '2023-12-31',
        fee: 0
      };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(null);
      EventRegistration.count.mockResolvedValue(5);
      EventRegistration.create.mockResolvedValue({ registration_id: 1 });

      await eventController.registerForEvent(req, res);

      expect(EventRegistration.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if event is full', async () => {
      req.params.id = 1;
      const mockEvent = {
        event_id: 1,
        status: 'upcoming',
        capacity: 10,
        registration_deadline: '2023-12-31',
        fee: 0
      };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.count.mockResolvedValue(10);

      await eventController.registerForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel event registration', async () => {
      req.params.id = 1;
      const mockEvent = { event_id: 1 };
      const mockRegistration = {
        update: jest.fn().mockResolvedValue(true)
      };
      Event.findByPk.mockResolvedValue(mockEvent);
      EventRegistration.findOne.mockResolvedValue(mockRegistration);

      await eventController.cancelRegistration(req, res);

      expect(mockRegistration.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if registration not found', async () => {
      req.params.id = 1;
      Event.findByPk.mockResolvedValue({ event_id: 1 });
      EventRegistration.findOne.mockResolvedValue(null);

      await eventController.cancelRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});