const Joi = require("joi")

// Create booking validation, Checcks for unual errors
exports.createBookingSchema = Joi.object({
  facility_id: Joi.number().required().integer().positive(),
  date: Joi.date().required().min("now"),
  start_time: Joi.string()
    .required()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: Joi.string()
    .required()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  purpose: Joi.string().required().min(5).max(200),
  attendees: Joi.number().required().integer().min(1),
})


exports.updateBookingStatusSchema = Joi.object({
  status: Joi.string().required().valid("pending", "approved", "rejected", "cancelled"),
})

module.exports = exports
