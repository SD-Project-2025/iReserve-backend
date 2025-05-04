const request = require('supertest');
const express = require('express');
const router = require('../../../src/routes');

jest.mock('../../../src/routes/auth', () => {
  const router = require('express').Router();
  router.get('/test-auth', (req, res) => res.sendStatus(200));
  return router;
});

jest.mock('../../../src/routes/events', () => {
  const router = require('express').Router();
  router.get('/test-events', (req, res) => res.sendStatus(200));
  return router;
});

jest.mock('../../../src/routes/bookings', () => {
  const router = require('express').Router();
  router.get('/test-bookings', (req, res) => res.sendStatus(200));
  return router;
});

jest.mock('../../../src/routes/maintenance', () => {
  const router = require('express').Router();
  router.get('/test-maintenance', (req, res) => res.sendStatus(200));
  return router;
});

jest.mock('../../../src/routes/notifications', () => {
  const router = require('express').Router();
  router.get('/test-notifications', (req, res) => res.sendStatus(200));
  return router;
});

jest.mock('../../../src/routes/facilities', () => {
  const router = require('express').Router();
  router.get('/test-facilities', (req, res) => res.sendStatus(200));
  return router;
});

describe('Routes Index', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(router);
  });

  it('should mount auth routes under /auth', async () => {
    const response = await request(app).get('/auth/test-auth');
    expect(response.status).toBe(200);
  });

  it('should mount events routes under /events', async () => {
    const response = await request(app).get('/events/test-events');
    expect(response.status).toBe(200);
  });

  it('should mount booking routes under /bookings', async () => {
    const response = await request(app).get('/bookings/test-bookings');
    expect(response.status).toBe(200);
  });

  it('should mount maintenance routes under /maintenance', async () => {
    const response = await request(app).get('/maintenance/test-maintenance');
    expect(response.status).toBe(200);
  });

  it('should mount notification routes under /notifications', async () => {
    const response = await request(app).get('/notifications/test-notifications');
    expect(response.status).toBe(200);
  });

  it('should mount facility routes under /facilities', async () => {
    const response = await request(app).get('/facilities/test-facilities');
    expect(response.status).toBe(200);
  });

  it('should not mount email routes', async () => {
    const response = await request(app).get('/email/test-email');
    expect(response.status).toBe(404);
  });
});