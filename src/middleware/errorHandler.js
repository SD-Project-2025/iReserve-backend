const logger = require("../utils/logger")

// Central error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(err.stack)

  // Default error status and message
  let statusCode = err.statusCode || 500
  let message = err.message || "Internal Server Error"

  // Handle Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    statusCode = 400
    message = err.errors.map((e) => e.message).join(", ")
  }

  // Handle Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 400
    message = "Duplicate field value entered"
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401
    message = "Invalid token. Please log in again."
  }

  // Handle JWT expiration
  if (err.name === "TokenExpiredError") {
    statusCode = 401
    message = "Your token has expired. Please log in again."
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

module.exports = errorHandler
