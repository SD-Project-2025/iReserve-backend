const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")
const { User } = require("../models")
const asyncHandler = require("../utils/asyncHandler")

// Update the OAuth2Client initialization to include the client secret
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

// Verify JWT token
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded
  } catch (error) {
    return null
  }
}

// Verify Google token
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    return ticket.getPayload()
  } catch (error) {
    return null
  }
}

// Protect routes - require authentication
exports.protect = asyncHandler(async (req, res, next) => {
  // Get token from header
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this resource",
    })
  }

  // Verify token
  const decoded = await verifyToken(token)
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    })
  }

  // Check if user exists
  const user = await User.findByPk(decoded.id)
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "The user belonging to this token no longer exists",
    })
  }

  // Add user to request
  req.user = user
  next()
})

// Restrict to certain user types
exports.restrictTo =
  (...userTypes) =>
  (req, res, next) => {
    if (!userTypes.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      })
    }
    next()
  }

// Verify Google token middleware
exports.verifyGoogleAuth = asyncHandler(async (req, res, next) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Google token is required",
    })
  }

  const payload = await verifyGoogleToken(token)
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Invalid Google token",
    })
  }

  req.googleUser = payload
  next()
})

module.exports = exports
