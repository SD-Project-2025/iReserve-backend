const Joi = require("joi")


exports.createMaintenanceReportSchema = Joi.object({
  facility_id: Joi.number().required().integer().positive(),
  title: Joi.string().required().min(5).max(100),
  description: Joi.string().required().min(10),
  priority: Joi.string().required().valid("low", "medium", "high", "critical"),
})


exports.updateMaintenanceStatusSchema = Joi.object({
  status: Joi.string().required().valid("reported", "in-progress", "scheduled", "completed"),
  assigned_to: Joi.number().integer().positive().allow(null),
  scheduled_date: Joi.date().min("now").allow(null),
  feedback: Joi.string().min(5).allow(null, ""),
})

module.exports = exports
