// assignmentValidation.js
const Joi = require('joi');

module.exports = {
  assignSchema: Joi.object({
    staff_id: Joi.number().required(),
    facility_id: Joi.number().required()
  }),
  unassignSchema: Joi.object({
    staff_id: Joi.number().required(),
    facility_id: Joi.number().required()
  })
};