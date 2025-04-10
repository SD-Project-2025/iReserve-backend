const Joi = require("joi")

// Create facility validation
exports.createFacilitySchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  type: Joi.string().required().min(2).max(50),
  location: Joi.string().required().min(3).max(100),
  capacity: Joi.number().required().integer().min(1),
  image_url: Joi.string().uri().allow(null, ""),
  is_indoor: Joi.boolean().required(),
  description: Joi.string().required().min(10),
  open_time: Joi.string()
    .required()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  close_time: Joi.string()
    .required()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  status: Joi.string().valid("open", "closed", "maintenance").default("open"),
})

// Update facility validation
exports.updateFacilitySchema = Joi.object({
  name: Joi.string().min(3).max(100),
  type: Joi.string().min(2).max(50),
  location: Joi.string().min(3).max(100),
  capacity: Joi.number().integer().min(1),
  image_url: Joi.string().uri().allow(null, ""),
  is_indoor: Joi.boolean(),
  description: Joi.string().min(10),
  open_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  close_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  status: Joi.string().valid("open", "closed", "maintenance"),
})

// Assign staff validation
exports.assignStaffSchema = Joi.object({
  staff_id: Joi.number().required().integer().positive(),
  role: Joi.string().required().min(2).max(50),
  is_primary: Joi.boolean().default(false),
})

module.exports = exports
