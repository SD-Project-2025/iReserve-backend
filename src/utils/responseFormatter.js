/**
 * Format success response
 * @param {Object} data - Data to send in response
 * @param {String} message - Success message
 * @returns {Object} - Formatted response object
 */
exports.success = (data, message = "Operation successful") => {
  return {
    success: true,
    message,
    data,
  }
}

/**
 * Format error response
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code
 * @returns {Object} - Formatted error object
 */
exports.error = (message, statusCode = 500) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

module.exports = exports
