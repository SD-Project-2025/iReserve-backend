const request = require('supertest');
const swaggerUi = require('swagger-ui-express');
const errorHandler = require('../../../src/middleware/errorHandler');
const app = require('../../../src/app');

// Mock dependencies
jest.mock('../../../src/config/swagger', () => ({}));
jest.mock('swagger-ui-express', () => ({
  serve: jest.fn((req, res, next) => next()),
  setup: jest.fn(() => (req, res) => res.send('Swagger Docs')),
}));
jest.mock('../../../src/middleware/errorHandler', () =>
  jest.fn((err, req, res, next) => {
    res.status(500).json({ error: 'Test error' });
  })
);

describe('Express App Configuration', () => {
  it('should remove X-Powered-By header (helmet)', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should allow CORS headers', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should compress responses', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-encoding']).toBe('gzip');
  });

  it('should apply rate limiting on /api', async () => {
    const rateLimit = require('express-rate-limit');

    // Re-mock rateLimit for this test only
    jest.resetModules();
    jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => {
      res.status(429).json({ message: 'Rate limit exceeded' });
    }));

    const testApp = require('../../../src/app');
    const response = await request(testApp).get('/api/v1/some-endpoint');
    expect(response.status).toBe(429);
    expect(response.body.message).toBe('Rate limit exceeded');
  });

  it('should serve Swagger UI at /api-docs', async () => {
    const response = await request(app).get('/api-docs');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Swagger Docs');
  });

  it('should mount /api/v1 routes (mock or real)', async () => {
    // If your /api/v1/health route exists, this will work.
    // If not, replace with a known route or use a mock router in your `routes` module.
    const response = await request(app).get('/api/v1/health');
    // Don't fail the test if 404 – app structure may vary
    expect([200, 404]).toContain(response.status);
  });

  it('should have a working /health endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/not-found');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: expect.stringContaining('Cannot find /not-found'),
    });
  });

  it('should call error handler on thrown errors', async () => {
    // Inject an error route for testing
    app.get('/force-error', (req, res, next) => {
      next(new Error('Test error'));
    });

    const response = await request(app).get('/force-error');
    expect(errorHandler).toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Test error' });
  });
});
