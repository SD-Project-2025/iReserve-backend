const request = require('supertest');
const express = require('express');
const notificationRouter = require('../../../src/routes/notifications');
const notificationController = require('../../../src/controllers/notificationController');
const { protect } = require('../../../src/middleware/auth');

// Mock middleware and controller
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next())
}));

jest.mock('../../../src/controllers/notificationController', () => ({
  getNotifications: jest.fn((req, res) => res.sendStatus(200)),
  markAsRead: jest.fn((req, res) => res.sendStatus(200)),
  markAllAsRead: jest.fn((req, res) => res.sendStatus(200)),
  deleteNotification: jest.fn((req, res) => res.sendStatus(200)),
  createNotification: jest.fn((req, res) => res.sendStatus(201))
}));

describe('Notification Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/notifications', notificationRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /notifications', () => {
    it('should call protect middleware', async () => {
      await request(app).get('/notifications');
      expect(protect).toHaveBeenCalled();
    });

    it('should call notificationController.getNotifications', async () => {
      await request(app).get('/notifications');
      expect(notificationController.getNotifications).toHaveBeenCalled();
    });

    it('should accept read query parameter', async () => {
      await request(app).get('/notifications').query({ read: true });
      expect(notificationController.getNotifications).toHaveBeenCalled();
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should call protect middleware', async () => {
      await request(app).put('/notifications/1/read');
      expect(protect).toHaveBeenCalled();
    });

    it('should call notificationController.markAsRead', async () => {
      await request(app).put('/notifications/1/read');
      expect(notificationController.markAsRead).toHaveBeenCalled();
    });
  });

  describe('PUT /notifications/read-all', () => {
    it('should call protect middleware', async () => {
      await request(app).put('/notifications/read-all');
      expect(protect).toHaveBeenCalled();
    });

    it('should call notificationController.markAllAsRead', async () => {
      await request(app).put('/notifications/read-all');
      expect(notificationController.markAllAsRead).toHaveBeenCalled();
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should call protect middleware', async () => {
      await request(app).delete('/notifications/1');
      expect(protect).toHaveBeenCalled();
    });

    it('should call notificationController.deleteNotification', async () => {
      await request(app).delete('/notifications/1');
      expect(notificationController.deleteNotification).toHaveBeenCalled();
    });
  });

  describe('POST /notifications', () => {
    it('should call protect middleware', async () => {
      await request(app).post('/notifications');
      expect(protect).toHaveBeenCalled();
    });

    it('should call notificationController.createNotification', async () => {
      await request(app).post('/notifications');
      expect(notificationController.createNotification).toHaveBeenCalled();
    });
  });
});