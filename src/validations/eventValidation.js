const Joi = require("joi")

// Create event validation
exports.createEventSchema = Joi.object({
  title: Joi.string().required().min(5).max(100),
  description: Joi.string().required().min(10),
  facility_id: Joi.number().required().integer().positive(),
  start_date: Joi.date().required().min("now"),
  end_date: Joi.date().required().min(Joi.ref("start_date")),
  start_time: Joi.string()
    .required()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: Joi.string()
    .required()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  capacity: Joi.number().required().integer().min(1),
  image_url: Joi.string().uri().allow(null, ""),
  is_public: Joi.boolean().default(true),
  registration_deadline: Joi.date().allow(null).max(Joi.ref("start_date")),
  fee: Joi.number().min(0).default(0),
})

// Update event validation
exports.updateEventSchema = Joi.object({
  title: Joi.string().min(5).max(100),
  description: Joi.string().min(10),
  facility_id: Joi.number().integer().positive(),
  start_date: Joi.date().min("now"),
  end_date: Joi.date().min(Joi.ref("start_date")),
  start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  capacity: Joi.number().integer().min(1),
  image_url: Joi.string().uri().allow(null, ""),
  is_public: Joi.boolean(),
  registration_deadline: Joi.date().allow(null).max(Joi.ref("start_date")),
  fee: Joi.number().min(0),
  status: Joi.string().valid("upcoming", "ongoing", "completed", "cancelled"),
})

module.exports = exports
