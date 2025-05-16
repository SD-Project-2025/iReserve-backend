const express = require("express")
const router = express.Router()
const facilityController = require("../controllers/facilityController")
const { protect } = require("../middleware/auth")
const { isStaff, isAdmin } = require("../middleware/roleCheck")
const validate = require("../middleware/validate")
const facilityValidation = require("../validations/facilityValidation")

/**
 * @swagger
 * /facilities:
 *   get:
 *     summary: Get all facilities
 *     tags: [Facilities]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by facility type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed, maintenance]
 *         description: Filter by facility status
 *       - in: query
 *         name: isIndoor
 *         schema:
 *           type: boolean
 *         description: Filter by indoor/outdoor
 *     responses:
 *       200:
 *         description: List of facilities
 */
router.get("/", facilityController.getFacilities)

/**
 * @swagger
 * /facilities/{id}:
 *   get:
 *     summary: Get facility by ID
 *     tags: [Facilities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Facility ID
 *     responses:
 *       200:
 *         description: Facility details
 *       404:
 *         description: Facility not found
 */
router.get("/:id", facilityController.getFacility)

/**
 * @swagger
 * /facilities:
 *   post:
 *     summary: Create new facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Facility'
 *     responses:
 *       201:
 *         description: Facility created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.post("/", protect, isStaff, validate(facilityValidation.createFacilitySchema), facilityController.createFacility)

/**
 * @swagger
 * /facilities/{id}:
 *   put:
 *     summary: Update facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Facility ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Facility'
 *     responses:
 *       200:
 *         description: Facility updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Facility not found
 */
router.put(
  "/:id",
  protect,
  isStaff,
  validate(facilityValidation.updateFacilitySchema),
  facilityController.updateFacility,
)

/**
 * @swagger
 * /facilities/{id}:
 *   delete:
 *     summary: Delete facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Facility ID
 *     responses:
 *       200:
 *         description: Facility deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Facility not found
 */
router.delete("/:id", protect, isAdmin, facilityController.deleteFacility)

/**
 * @swagger
 * /facilities/{id}/staff:
 *   post:
 *     summary: Assign staff to facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Facility ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - role
 *             properties:
 *               staff_id:
 *                 type: integer
 *                 description: Staff ID
 *               role:
 *                 type: string
 *                 description: Role at the facility
 *               is_primary:
 *                 type: boolean
 *                 description: Whether this is the staff's primary facility
 *     responses:
 *       201:
 *         description: Staff assigned successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Facility or staff not found
 */
router.post(
  "/:id/staff",
  protect,
  isAdmin,
  validate(facilityValidation.assignStaffSchema),
  facilityController.assignStaff,
)

/**
 * @swagger
 * /facilities/{id}/staff:
 *   get:
 *     summary: Get staff assigned to facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Facility ID
 *     responses:
 *       200:
 *         description: List of assigned staff
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Facility not found
 */
router.get("/:id/staff", protect, isStaff, facilityController.getAssignedStaff)

/**
 * @swagger
 * /facilities/staff/{staff_id}:
 *   get:
 *     summary: Get all facilities assigned to a staff member
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: List of facilities
 *       404:
 *         description: No facilities found for staff
 *       500:
 *         description: Server error
 */
router.get("/staff/:staff_id", protect, isStaff, facilityController.getFacilitiesByStaffId)

// Existing routes...
router.post("/ratings", facilityController.createFacilityRating); // POST a new rating



module.exports = router
