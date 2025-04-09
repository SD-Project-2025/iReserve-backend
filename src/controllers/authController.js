const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")
const { User, Resident, Staff } = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const encryptionService = require("../services/encryptionService")
const responseFormatter = require("../utils/responseFormatter")
const querystring = require("querystring")

// Update the OAuth2Client initialization to include the client secret
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL}/auth/google/callback`,
)

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  })
}

// @desc    Redirect to Google OAuth page
// @route   GET /api/v1/auth/google
// @access  Public
exports.googleAuthRedirect = (req, res) => {
  const { userType = "resident" } = req.query

  // Store userType in session or state parameter
  const state = Buffer.from(JSON.stringify({ userType })).toString("base64")

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
    state: state,
    prompt: "consent",
  })

  res.redirect(authUrl)
}

// @desc    Handle Google OAuth callback
// @route   GET /api/v1/auth/google/callback
// @access  Public
exports.googleAuthCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Authorization code is required",
    })
  }

  try {
    // Exchange code for tokens
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const { sub: googleId, email, name, picture } = ticket.getPayload()

    // Get userType from state
    let userType = "resident"
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString())
        userType = stateData.userType || "resident"
      } catch (err) {
        // If state parsing fails, use default userType
      }
    }

    // Check if user exists
    let user = await User.findOne({ where: { google_id: googleId } })

    if (!user) {
      // Create new user
      user = await User.create({
        google_id: googleId,
        user_type: userType,
        status: "active",
        last_login: new Date(),
      })

      // Create resident or staff profile
      if (user.user_type === "resident") {
        await Resident.create({
          user_id: user.user_id,
          membership_type: "standard",
        })
      } else if (user.user_type === "staff") {
        return res.status(403).json({
          success: false,
          message: "Staff accounts cannot be created via Google authentication",
        })
      }
    } else {
      // Update last login
      await user.update({ last_login: new Date() })
    }

    // Generate token
    const jwtToken = generateToken(user.user_id)

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
    const redirectUrl = `${frontendUrl}/auth/callback?${querystring.stringify({
      token: jwtToken,
      user_id: user.user_id,
      user_type: user.user_type,
      name,
      email,
      picture,
    })}`

    res.redirect(redirectUrl)
  } catch (error) {
    console.error("Google auth error:", error)
    res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    })
  }
})

// @desc    Login or register with Google token directly
// @route   POST /api/v1/auth/google/token
// @access  Public
exports.googleAuth = asyncHandler(async (req, res) => {
  const { token, userType } = req.body

  // Verify token
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  })

  const { sub: googleId, email, name, picture } = ticket.getPayload()

  // Check if user exists
  let user = await User.findOne({ where: { google_id: googleId } })

  if (!user) {
    // Create new user
    user = await User.create({
      google_id: googleId,
      user_type: userType || "resident", // Default to resident if not specified
      status: "active",
    })

    // Create resident or staff profile
    if (user.user_type === "resident") {
      await Resident.create({
        user_id: user.user_id,
        membership_type: "standard",
      })
    } else if (user.user_type === "staff") {
      return res.status(403).json({
        success: false,
        message: "Staff accounts cannot be created via Google authentication",
      })
    }
  } else {
    // Update last login
    await user.update({ last_login: new Date() })
  }

  // Generate token
  const jwtToken = generateToken(user.user_id)

  res.status(200).json(
    responseFormatter.success(
      {
        token: jwtToken,
        user: {
          id: user.user_id,
          type: user.user_type,
          name,
          email,
          picture,
        },
      },
      "Authentication successful",
    ),
  )
})

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.user_id)

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    })
  }

  let profile
  if (user.user_type === "resident") {
    profile = await Resident.findOne({ where: { user_id: user.user_id } })
  } else if (user.user_type === "staff") {
    profile = await Staff.findOne({ where: { user_id: user.user_id } })
  }

  // Get user info from Google
  const googleUser = req.googleUser

  res.status(200).json(
    responseFormatter.success(
      {
        id: user.user_id,
        googleId: user.google_id,
        type: user.user_type,
        status: user.status,
        profile: profile || {},
        name: googleUser?.name,
        email: googleUser?.email,
        picture: googleUser?.picture,
      },
      "User profile retrieved successfully",
    ),
  )
})

// @desc    Update resident address
// @route   PUT /api/v1/auth/address
// @access  Private (Resident only)
exports.updateAddress = asyncHandler(async (req, res) => {
  const { address } = req.body

  // Check if user is resident
  if (req.user.user_type !== "resident") {
    return res.status(403).json({
      success: false,
      message: "Only residents can update address",
    })
  }

  // Get resident profile
  const resident = await Resident.findOne({ where: { user_id: req.user.user_id } })

  if (!resident) {
    return res.status(404).json({
      success: false,
      message: "Resident profile not found",
    })
  }

  // Encrypt address
  const encryptedAddress = encryptionService.encrypt(address)

  // Update resident
  await resident.update({ encrypted_address: encryptedAddress })

  res.status(200).json(responseFormatter.success(null, "Address updated successfully"))
})

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  // In a stateless JWT system, we don't need to do anything server-side
  // The client should remove the token

  res.status(200).json(responseFormatter.success(null, "Logged out successfully"))
})

module.exports = exports
