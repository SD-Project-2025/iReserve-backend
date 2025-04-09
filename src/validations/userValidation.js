const Joi = require("joi")

// Google auth validation - this is used to validate the token received from Google
exports.googleAuthSchema = Joi.object({
  token: Joi.string().required(),
  userType: Joi.string().valid("resident", "staff").default("resident"),
})

// Address update validation - this is used to validate the address update request
exports.addressUpdateSchema = Joi.object({
  address: Joi.string().required().min(5).max(255),
})

module.exports = exports
