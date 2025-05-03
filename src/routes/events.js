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

router.get("/:id/status/:userID", protect, isResident, eventController.getRegistrationStatus)

module.exports = router
