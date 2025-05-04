const request = require('supertest');
const express = require('express');
const authRouter = require('../../../src/routes/auth');
const authController = require('../../../src/controllers/authController');
const { protect } = require('../../../src/middleware/auth');
const validate = require('../../../src/middleware/validate');
const userValidation = require('../../../src/validations/userValidation');

// Mock middleware and controller
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next())
}));

jest.mock('../../../src/middleware/validate', () => jest.fn(() => (req, res, next) => next()));

jest.mock('../../../src/controllers/authController', () => ({
  googleAuthRedirect: jest.fn((req, res) => res.sendStatus(302)),
  googleAuthCallback: jest.fn((req, res) => res.sendStatus(302)),
  googleAuth: jest.fn((req, res) => res.sendStatus(200)),
  getMe: jest.fn((req, res) => res.sendStatus(200)),
  updateAddress: jest.fn((req, res) => res.sendStatus(200)),
  logout: jest.fn((req, res) => res.sendStatus(200))
}));

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /auth/google', () => {
    it('should call authController.googleAuthRedirect', async () => {
      await request(app).get('/auth/google');
      expect(authController.googleAuthRedirect).toHaveBeenCalled();
    });

    it('should accept userType query parameter', async () => {
      await request(app).get('/auth/google').query({ userType: 'staff' });
      expect(authController.googleAuthRedirect).toHaveBeenCalled();
    });
  });

  describe('GET /auth/google/callback', () => {
    it('should call authController.googleAuthCallback', async () => {
      await request(app).get('/auth/google/callback').query({ code: 'test-code' });
      expect(authController.googleAuthCallback).toHaveBeenCalled();
    });
  });

  describe('POST /auth/google/token', () => {
    const authData = {
      token: 'test-token',
      userType: 'staff'
    };

    it('should call validate middleware with googleAuthSchema', async () => {
      await request(app).post('/auth/google/token').send(authData);
      expect(validate).toHaveBeenCalledWith(userValidation.googleAuthSchema);
    });

    it('should call authController.googleAuth', async () => {
      await request(app).post('/auth/google/token').send(authData);
      expect(authController.googleAuth).toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('should call protect middleware', async () => {
      await request(app).get('/auth/me');
      expect(protect).toHaveBeenCalled();
    });

    it('should call authController.getMe', async () => {
      await request(app).get('/auth/me');
      expect(authController.getMe).toHaveBeenCalled();
    });
  });

  describe('PUT /auth/address', () => {
    const addressUpdate = {
      address: '123 Main St'
    };

    it('should call protect middleware', async () => {
      await request(app).put('/auth/address').send(addressUpdate);
      expect(protect).toHaveBeenCalled();
    });

    it('should call validate middleware with addressUpdateSchema', async () => {
      await request(app).put('/auth/address').send(addressUpdate);
      expect(validate).toHaveBeenCalledWith(userValidation.addressUpdateSchema);
    });

    it('should call authController.updateAddress', async () => {
      await request(app).put('/auth/address').send(addressUpdate);
      expect(authController.updateAddress).toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('should call protect middleware', async () => {
      await request(app).post('/auth/logout');
      expect(protect).toHaveBeenCalled();
    });

    it('should call authController.logout', async () => {
      await request(app).post('/auth/logout');
      expect(authController.logout).toHaveBeenCalled();
    });
  });
});