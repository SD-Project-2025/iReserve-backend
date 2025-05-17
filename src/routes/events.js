const express = require("express")
const router = express.Router()
const eventController = require("../controllers/eventController")
const { protect } = require("../middleware/auth")
const { isStaff, isResident } = require("../middleware/roleCheck")
const validate = require("../middleware/validate")
const eventValidation = require("../validations/eventValidation")

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, completed, cancelled]
 *         description: Filter by event status
 *       - in: query
 *         name: facility_id
 *         schema:
 *           type: integer
 *         description: Filter by facility ID
 *     responses:
 *       200:
 *         description: List of events
 */
router.get("/", eventController.getEvents)

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get("/:id", eventController.getEvent)

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Facility not found
 */
router.post("/", protect, isStaff, validate(eventValidation.createEventSchema), eventController.createEvent)

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Update event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.put("/:id", protect, isStaff, validate(eventValidation.updateEventSchema), eventController.updateEvent)

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.delete("/:id", protect, isStaff, eventController.deleteEvent)

/**
 * @swagger
 * /events/{id}/register:
 *   post:
 *     summary: Register for event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       201:
 *         description: Registered for event successfully
 *       400:
 *         description: Invalid input or event is full
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.post("/:id/register", protect, isResident, eventController.registerForEvent)

/**
 * @swagger
 * /events/{id}/cancel-registration:
 *   put:
 *     summary: Cancel event registration
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Registration cancelled successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event or registration not found
 */
router.put("/:id/cancel-registration", protect, isResident, eventController.cancelRegistration)

/**
 * @swagger
 * /events/{id}/initiate-payment:
 *   post:
 *     summary: Initiate payment for paid event registration
 *     description: >
 *       Creates a payment session for event registration.
 *       Registration will only be finalized after successful payment verification.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to register for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resident_id
 *             properties:
 *               resident_id:
 *                 type: integer
 *                 example: 123
 *                 description: ID of the resident attempting registration
 *     responses:
 *       200:
 *         description: Payment initialization data for redirect
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 merchant_id:
 *                   type: string
 *                   example: "10000100"
 *                 merchant_key:
 *                   type: string
 *                   example: "46f0cd694581a"
 *                 return_url:
 *                   type: string
 *                   example: "https://yourapp.com/events/456/payment-success"
 *                 cancel_url:
 *                   type: string
 *                   example: "https://yourapp.com/events/456/payment-cancel"
 *                 notify_url:
 *                   type: string
 *                   example: "https://api.yourapp.com/events/456/payment-notify"
 *                 m_payment_id:
 *                   type: string
 *                   example: "TEMP-1691234567890-123"
 *                   description: Temporary payment reference ID
 *                 amount:
 *                   type: number
 *                   example: 150.00
 *                 item_name:
 *                   type: string
 *                   example: "Annual Tech Conference Registration"
 *                 item_description:
 *                   type: string
 *                   example: "Registration for Annual Tech Conference on 2023-10-15"
 *                 custom_str1:
 *                   type: string
 *                   example: '{"event_id":456,"resident_id":123}'
 *                   description: JSON string with registration context
 *                 signature:
 *                   type: string
 *                   example: "d41d8cd98f00b204e9800998ecf8427e"
 *                 payment_url:
 *                   type: string
 *                   example: "https://www.payfast.co.za/eng/process"
 *       400:
 *         description: |
 *           Possible errors:
 *           - Event is free
 *           - Already registered
 *           - Invalid resident ID
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       404:
 *         description: |
 *           Possible errors:
 *           - Event not found
 *           - Resident not found
 */
router.post(
  "/:id/initiate-payment",
  eventController.initiatePayment
);

/**
 * @swagger
 * /events/{id}/payment-notify:
 *   post:
 *     summary: Handle Payfast payment notification (ITN)
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/PayfastNotification'
 *     responses:
 *       200:
 *         description: Notification processed
 *       400:
 *         description: Invalid signature
 *       404:
 *         description: Registration not found
 */
router.post(
  "/:id/payment-notify",
  eventController.handlePaymentNotification
);

router.get("/:id/status/:userID", protect, isResident, eventController.getRegistrationStatus)

router.get("/staff/:staff_id/events", eventController.getEventsByStaffFacilities);



module.exports = router
