const request = require('supertest');
//const express = require('express');
const app = require('../../../src/app');
const swaggerUi = require('swagger-ui-express');
const errorHandler = require('../../../src/middleware/errorHandler');

// Mock dependencies
jest.mock('../../../src/config/swagger', () => ({}));
jest.mock('swagger-ui-express');
jest.mock('../../../src/middleware/errorHandler', () => jest.fn((err, req, res, next) => res.status(500).json({ error: 'Test error' })));

describe('Express App Configuration', () => {
  it('should use helmet middleware', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should use cors middleware', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should use compression middleware', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-encoding']).toBeDefined();
  });

  it('should use rate limiting on /api routes', async () => {
    // Mock rate limiter to trigger limit
    //const originalLimiter = require('express-rate-limit');
    require('express-rate-limit').mockImplementationOnce(() => (req, res, next) => {
      res.status(429).json({ message: 'Rate limit exceeded' });
    });

    const response = await request(app).get('/api/v1/test');
    expect(response.status).toBe(429);
    expect(response.body.message).toBe('Rate limit exceeded');
  });

  it('should serve Swagger UI docs at /api-docs', () => {
    expect(swaggerUi.setup).toHaveBeenCalled();
    expect(swaggerUi.serve).toBeInstanceOf(Function);
  });

  it('should mount API routes under /api/v1', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
  });

  it('should have a health check endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/nonexistent-route');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should use error handler middleware', async () => {
    // Force an error
    app.get('/error-test', (req, res, next) => {
      next(new Error('Test error'));
    });

    const response = await request(app).get('/error-test');
    expect(errorHandler).toHaveBeenCalled();
    expect(response.status).toBe(500);
  });
});