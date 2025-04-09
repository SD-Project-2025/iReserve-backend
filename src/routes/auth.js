const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const { protect } = require("../middleware/auth")
const validate = require("../middleware/validate")
const userValidation = require("../validations/userValidation")

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Redirect to Google OAuth login page
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [resident, staff]
 *           default: resident
 *         description: Type of user account to create
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth page
 */
router.get("/google", authController.googleAuthRedirect)

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter with encoded data
 *     responses:
 *       302:
 *         description: Redirects to frontend with authentication token
 *       400:
 *         description: Missing authorization code
 *       500:
 *         description: Authentication failed
 */
router.get("/google/callback", authController.googleAuthCallback)

/**
 * @swagger
 * /auth/google/token:
 *   post:
 *     summary: Login or register with Google ID token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Google ID token
 *               userType:
 *                 type: string
 *                 enum: [resident, staff]
 *                 default: resident
 *                 description: Type of user account
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid Google token
 */
router.post("/google/token", validate(userValidation.googleAuthSchema), authController.googleAuth)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/me", protect, authController.getMe)

/**
 * @swagger
 * /auth/address:
 *   put:
 *     summary: Update resident address
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: Physical address
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.put("/address", protect, validate(userValidation.addressUpdateSchema), authController.updateAddress)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", protect, authController.logout)

module.exports = router
