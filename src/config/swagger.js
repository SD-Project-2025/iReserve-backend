const swaggerJsdoc = require("swagger-jsdoc")

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "iReserve API",
      version: "1.0.0",
      description: "API documentation for the iReserve sports facility booking system",
      contact: {
        name: "API Support",
        email: "support@sportsfacility.com",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3000/api/v1",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"],
}

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec
