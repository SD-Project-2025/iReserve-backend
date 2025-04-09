const express = require("express")
const router = express.Router()
const bookingController = require("../controllers/bookingController")
const { protect } = require("../middleware/auth")
const { isStaff, isResident } = require("../middleware/roleCheck")
const validate = require("../middleware/validate")
const bookingValidation = require("../validations/bookingValidation")

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings (admin/staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *         description: Filter by booking status
 *       - in: query
 *         name: facility_id
 *         schema:
 *           type: integer
 *         description: Filter by facility ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by booking date
 *     responses:
 *       200:
 *         description: List of bookings
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get("/", protect, isStaff, bookingController.getBookings)

/**
 * @swagger
 * /bookings/my-bookings:
 *   get:
 *     summary: Get bookings for current resident
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resident's bookings
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get("/my-bookings", protect, isResident, bookingController.getMyBookings)

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.get("/:id", protect, bookingController.getBooking)

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Facility not found
 */
router.post("/", protect, isResident, validate(bookingValidation.createBookingSchema), bookingController.createBooking)

/**
 * @swagger
 * /bookings/{id}/status:
 *   put:
 *     summary: Update booking status (admin/staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, cancelled]
 *                 description: New booking status
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.put(
  "/:id/status",
  protect,
  isStaff,
  validate(bookingValidation.updateBookingStatusSchema),
  bookingController.updateBookingStatus,
)

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   put:
 *     summary: Cancel booking (resident only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.put("/:id/cancel", protect, isResident, bookingController.cancelBooking)

module.exports = router
