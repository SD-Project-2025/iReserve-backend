const eventController = require('../../../src/controllers/eventController');
const { Event, EventRegistration, Resident } = require('../../../src/models');
const { Op } = require("sequelize");
const crypto = require('crypto');
const axios = require('axios');

// Mock the models and dependencies
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
    Staff: {
      findByPk: jest.fn()
    },
    EventRegistration: {
      findOne: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn()
    },
    Resident: {
      findByPk: jest.fn()
    }
  };
});

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mocked-signature')
}));

jest.mock('axios');

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
      json: jest.fn(),
      send: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
    process.env = {
      PAYFAST_MERCHANT_ID: 'test-merchant',
      PAYFAST_MERCHANT_KEY: 'test-key',
      PAYFAST_PASSPHRASE: 'test-passphrase',
      PAYFAST_HOST: 'https://sandbox.payfast.co.za',
      FRONTEND_URL: 'http://frontend',
      API_URL: 'http://api',
      EMAIL_URL: 'http://email-service'
    };
  });

  // Include all your existing test cases here...

  describe('Payment Functions', () => {
    describe('generatePayfastSignature', () => {
      it('should generate a valid MD5 signature', () => {
        const testData = {
          merchant_id: 'test-merchant',
          amount: '100.00',
          item_name: 'Test Event'
        };
        
        const signature = eventController.generatePayfastSignature(testData, 'test-passphrase');
        
        expect(crypto.createHash).toHaveBeenCalledWith('md5');
        expect(signature).toBe('mocked-signature');
      });
    });

    describe('initiatePayment', () => {
      it('should initiate payment for an event', async () => {
        const mockEvent = {
          event_id: 1,
          title: 'Test Event',
          fee: '100.00',
          toJSON: () => ({ event_id: 1, title: 'Test Event', fee: '100.00' })
        };
        const mockResident = { resident_id: 1, name: 'John Doe', email: 'john@example.com' };
        
        req.params.id = '1';
        req.body = { resident_id: 1 };
        
        Event.findByPk.mockResolvedValue(mockEvent);
        Resident.findByPk.mockResolvedValue(mockResident);
        
        await eventController.initiatePayment(req, res);
        
        expect(Event.findByPk).toHaveBeenCalledWith('1');
        expect(Resident.findByPk).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
          message: 'Payment initiated successfully'
        }));
      });

      it('should return 404 if event not found', async () => {
        req.params.id = '999';
        req.body = { resident_id: 1 };
        
        Event.findByPk.mockResolvedValue(null);
        
        await eventController.initiatePayment(req, res);
        
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Event not found',
          data: null
        });
      });

      it('should return 400 if resident_id is missing', async () => {
        req.params.id = '1';
        req.body = {};
        
        await eventController.initiatePayment(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Resident ID is required',
          data: null
        });
      });

      it('should return 400 if event fee is invalid', async () => {
        const mockEvent = {
          event_id: 1,
          title: 'Test Event',
          fee: 'invalid',
          toJSON: () => ({ event_id: 1, title: 'Test Event', fee: 'invalid' })
        };
        
        req.params.id = '1';
        req.body = { resident_id: 1 };
        
        Event.findByPk.mockResolvedValue(mockEvent);
        Resident.findByPk.mockResolvedValue({ resident_id: 1 });
        
        await eventController.initiatePayment(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid event fee configuration',
          data: null
        });
      });

      it('should return 404 if resident not found', async () => {
        const mockEvent = {
          event_id: 1,
          title: 'Test Event',
          fee: '100.00',
          toJSON: () => ({ event_id: 1, title: 'Test Event', fee: '100.00' })
        };
        
        req.params.id = '1';
        req.body = { resident_id: 999 };
        
        Event.findByPk.mockResolvedValue(mockEvent);
        Resident.findByPk.mockResolvedValue(null);
        
        await eventController.initiatePayment(req, res);
        
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Resident not found',
          data: null
        });
      });
    });

    describe('handlePaymentNotification', () => {
      it('should process successful payment notification', async () => {
        const mockEvent = { event_id: 1 };
        const mockRegistration = {
          update: jest.fn().mockResolvedValue(true)
        };
        const mockResident = {
          resident_id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        };
        
        req.params.event_id = '1';
        req.body = {
          signature: 'mocked-signature',
          payment_status: 'COMPLETE',
          custom_str1: JSON.stringify({ event_id: 1, resident_id: 1 }),
          pf_payment_id: 'PF-123',
          amount_gross: '100.00'
        };
        
        Event.findByPk.mockResolvedValue(mockEvent);
        EventRegistration.findOne.mockResolvedValue(mockRegistration);
        Resident.findByPk.mockResolvedValue(mockResident);
        axios.post.mockResolvedValue({});
        
        await eventController.handlePaymentNotification(req, res);
        
        expect(EventRegistration.findOne).toHaveBeenCalled();
        expect(mockRegistration.update).toHaveBeenCalledWith({
          payment_status: 'paid',
          status: 'registered',
          payment_date: expect.any(Date),
          payment_reference: 'PF-123'
        });
        expect(res.send).toHaveBeenCalledWith('OK');
      });

      it('should handle signature mismatch', async () => {
        req.params.event_id = '1';
        req.body = {
          signature: 'invalid-signature',
          custom_str1: JSON.stringify({ event_id: 1, resident_id: 1 })
        };
        
        crypto.createHash.mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('correct-signature')
        });
        
        await eventController.handlePaymentNotification(req, res);
        
        expect(res.send).toHaveBeenCalledWith('OK'); // Still acknowledge PayFast
      });

      it('should handle cancelled payment', async () => {
        const mockRegistration = {
          update: jest.fn().mockResolvedValue(true)
        };
        
        req.params.event_id = '1';
        req.body = {
          signature: 'mocked-signature',
          payment_status: 'CANCELLED',
          custom_str1: JSON.stringify({ event_id: 1, resident_id: 1 })
        };
        
        EventRegistration.findOne.mockResolvedValue(mockRegistration);
        
        await eventController.handlePaymentNotification(req, res);
        
        expect(mockRegistration.update).toHaveBeenCalledWith({
          payment_status: 'cancelled',
          status: 'cancelled'
        });
      });

      it('should handle failed payment', async () => {
        const mockRegistration = {
          update: jest.fn().mockResolvedValue(true)
        };
        
        req.params.event_id = '1';
        req.body = {
          signature: 'mocked-signature',
          payment_status: 'FAILED',
          custom_str1: JSON.stringify({ event_id: 1, resident_id: 1 })
        };
        
        EventRegistration.findOne.mockResolvedValue(mockRegistration);
        
        await eventController.handlePaymentNotification(req, res);
        
        expect(mockRegistration.update).toHaveBeenCalledWith({
          payment_status: 'failed',
          status: 'failed'
        });
      });

      it('should handle registration not found', async () => {
        req.params.event_id = '1';
        req.body = {
          signature: 'mocked-signature',
          payment_status: 'COMPLETE',
          custom_str1: JSON.stringify({ event_id: 1, resident_id: 1 })
        };
        
        EventRegistration.findOne.mockResolvedValue(null);
        
        await eventController.handlePaymentNotification(req, res);
        
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('Registration not found');
      });

      it('should handle invalid custom data', async () => {
        req.params.event_id = '1';
        req.body = {
          signature: 'mocked-signature',
          payment_status: 'COMPLETE',
          custom_str1: 'invalid-json'
        };
        
        await eventController.handlePaymentNotification(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith('Invalid custom data');
      });

      it('should handle email sending failure', async () => {
        const mockRegistration = {
          update: jest.fn().mockResolvedValue(true)
        };
        const mockResident = {
          resident_id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        };
        const mockEvent = { event_id: 1, title: 'Test Event' };
        
        req.params.event_id = '1';
        req.body = {
          signature: 'mocked-signature',
          payment_status: 'COMPLETE',
          custom_str1: JSON.stringify({ event_id: 1, resident_id: 1 }),
          pf_payment_id: 'PF-123',
          amount_gross: '100.00'
        };
        
        EventRegistration.findOne.mockResolvedValue(mockRegistration);
        Resident.findByPk.mockResolvedValue(mockResident);
        Event.findByPk.mockResolvedValue(mockEvent);
        axios.post.mockRejectedValue(new Error('Email failed'));
        
        await eventController.handlePaymentNotification(req, res);
        
        expect(res.send).toHaveBeenCalledWith('OK'); // Still acknowledge PayFast
      });
    });
  });

  describe('getEventsByStaffFacilities', () => {
    it('should get events for staff facilities', async () => {
      req.params.staff_id = '1';
      
      const mockFacilities = [{ facility_id: 1 }, { facility_id: 2 }];
      const mockEvents = [{ event_id: 1, facility_id: 1 }];
      
      axios.get.mockResolvedValue({ data: mockFacilities });
      Event.findAll.mockResolvedValue(mockEvents);
      
      await eventController.getEventsByStaffFacilities(req, res);
      
      expect(axios.get).toHaveBeenCalledWith('http://api/facilities/staff/1');
      expect(Event.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          facility_id: { [Op.in]: [1, 2] },
          status: { [Op.not]: 'completed' }
        }
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
        message: 'Events retrieved successfully'
      });
    });

    it('should handle no facilities assigned', async () => {
      req.params.staff_id = '1';
      
      axios.get.mockResolvedValue({ data: [] });
      
      await eventController.getEventsByStaffFacilities(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'No facilities assigned to this staff member'
      });
    });

    it('should handle API errors', async () => {
      req.params.staff_id = '1';
      
      axios.get.mockRejectedValue(new Error('API error'));
      
      await eventController.getEventsByStaffFacilities(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        data: 'API error'
      });
    });
  });
});