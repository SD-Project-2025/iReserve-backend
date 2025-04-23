const errorHandler = require('../../../src/middleware/errorHandler');
const logger = require('../../../src/utils/logger');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn()
}));

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Clear all mocks before each test
    logger.error.mockClear();
  });

  it('should handle generic errors with 500 status', () => {
    const err = new Error('Test error');
    
    errorHandler(err, req, res, next);
    
    expect(logger.error).toHaveBeenCalledWith(err.stack);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Test error'
    }));
  });

  it('should handle Sequelize validation errors', () => {
    const err = new Error('Validation error');
    err.name = 'SequelizeValidationError';
    err.errors = [
      { message: 'Invalid email' },
      { message: 'Password too short' }
    ];
    
    errorHandler(err, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid email, Password too short'
    });
  });

  it('should handle Sequelize unique constraint errors', () => {
    const err = new Error('Unique constraint error');
    err.name = 'SequelizeUniqueConstraintError';
    
    errorHandler(err, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Duplicate field value entered'
    });
  });

  it('should handle JWT errors', () => {
    const err = new Error('Invalid token');
    err.name = 'JsonWebTokenError';
    
    errorHandler(err, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid token. Please log in again.'
    });
  });

  it('should handle token expiration errors', () => {
    const err = new Error('Token expired');
    err.name = 'TokenExpiredError';
    
    errorHandler(err, req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Your token has expired. Please log in again.'
    });
  });

  it('should include stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = new Error('Test error');
    const stack = 'test stack trace';
    err.stack = stack;
    
    errorHandler(err, req, res, next);
    
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Test error',
      stack: stack
    });
    
    // Reset NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
});