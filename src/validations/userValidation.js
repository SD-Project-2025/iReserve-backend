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

exports.manageStatusSchema = Joi.object({
  status: Joi.string().valid("active", "suspended").required()
});

exports.manageAdminSchema = Joi.object({
  is_admin: Joi.boolean().required()
});

exports.upgradeSchema = Joi.object({
  employee_id: Joi.string()
    .pattern(/^[A-Z0-9]{6,20}$/)
    .required()
    .messages({
      "string.pattern.base": "Employee ID must be 6-20 alphanumeric characters in uppercase",
    }),
  position: Joi.string().max(50).default("Staff Member"),
  department: Joi.string().max(50).default("General"),
});

exports.downgradeSchema = Joi.object({
  membership_type: Joi.string()
    .valid("standard", "premium", "family")
    .default("standard"),
});
module.exports = exports
