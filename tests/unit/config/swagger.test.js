//const swaggerSpec = require('../../../src/config/swagger');
const swaggerJsdoc = require('swagger-jsdoc');

jest.mock('swagger-jsdoc');

describe('Swagger Configuration', () => {
  it('should call swaggerJsdoc with correct options', () => {
    expect(swaggerJsdoc).toHaveBeenCalledWith({
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'iReserve API',
          version: '1.0.0',
          description: 'API documentation for the iReserve sports facility booking system',
          contact: {
            name: 'API Support',
            email: 'support@sportsfacility.com',
          },
        },
        servers: [
          {
            url: expect.any(String),
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      apis: ['./src/routes/*.js', './src/models/*.js'],
    });
  });

  it('should use API_URL from environment or default to localhost', () => {
    // Test default case
    delete process.env.API_URL;
    require('../../../src/config/swagger');
    expect(swaggerJsdoc.mock.calls[0][0].definition.servers[0].url).toBe('http://localhost:3000/api/v1');

    // Test with environment variable
    process.env.API_URL = 'https://api.example.com';
    jest.resetModules();
    require('../../../src/config/swagger');
    expect(swaggerJsdoc.mock.calls[0][0].definition.servers[0].url).toBe('https://api.example.com');
  });

  it('should export swagger specification', () => {
    const mockSpec = { info: { title: 'Mock Spec' } };
    swaggerJsdoc.mockReturnValueOnce(mockSpec);
    jest.resetModules();
    const spec = require('../../../src/config/swagger');
    expect(spec).toEqual(mockSpec);
  });
});