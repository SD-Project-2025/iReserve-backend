const validate = require('../../../src/middleware/validate');
//const Joi = require('joi');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() when validation passes', () => {
    const schema = {
      validate: jest.fn().mockReturnValue({ error: undefined })
    };

    validate(schema)(req, res, next);

    expect(schema.validate).toHaveBeenCalledWith(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 with error messages when validation fails', () => {
    const mockErrors = [
      { message: 'Username is required' },
      { message: 'Password must be at least 6 characters' }
    ];
    const schema = {
      validate: jest.fn().mockReturnValue({
        error: {
          details: mockErrors
        }
      })
    };

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation error',
      errors: 'Username is required, Password must be at least 6 characters'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle empty request body validation', () => {
    req.body = null;
    const schema = {
      validate: jest.fn().mockReturnValue({
        error: {
          details: [{ message: 'Request body cannot be empty' }]
        }
      })
    };

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation error',
      errors: 'Request body cannot be empty'
    });
  });

  it('should pass validation options correctly', () => {
    const validateSpy = jest.fn().mockReturnValue({ error: undefined });
    const schema = { validate: validateSpy };

    validate(schema)(req, res, next);

    expect(validateSpy).toHaveBeenCalledWith(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
  });

  it('should show all validation errors when abortEarly is false', () => {
    const mockErrors = [
      { message: 'Error 1' },
      { message: 'Error 2' },
      { message: 'Error 3' }
    ];
    const schema = {
      validate: jest.fn().mockReturnValue({
        error: {
          details: mockErrors
        }
      })
    };

    validate(schema)(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation error',
      errors: 'Error 1, Error 2, Error 3'
    });
  });

  // Modified test for stripUnknown behavior
  it('should not modify original request body (stripUnknown handled by Joi internally)', () => {
    const originalBody = {
      username: 'testuser',
      password: 'secure123',
      extraField: 'should remain'
    };
    req.body = {...originalBody};

    const schema = {
      validate: jest.fn().mockImplementation((body) => {
        // Joi would strip unknown fields internally, but our middleware
        // doesn't modify the original request body
        return { 
          error: undefined,
          value: {
            username: body.username,
            password: body.password
          }
        };
      })
    };

    validate(schema)(req, res, next);

    // Verify original body wasn't modified
    expect(req.body).toEqual(originalBody);
    expect(next).toHaveBeenCalled();
  });
});