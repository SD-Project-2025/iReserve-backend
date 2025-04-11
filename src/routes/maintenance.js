const express = require("express")
const router = express.Router()
const maintenanceController = require("../controllers/maintenanceController")
const { protect } = require("../middleware/auth")
const { isStaff } = require("../middleware/roleCheck")
const validate = require("../middleware/validate")
const maintenanceValidation = require("../validations/maintenanceValidation")

/**
 * @swagger
 * /maintenance:
 *   get:
 *     summary: Get all maintenance reports (admin/staff only)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [reported, in-progress, scheduled, completed]
 *         description: Filter by report status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by priority
 *       - in: query
 *         name: facility_id
 *         schema:
 *           type: integer
 *         description: Filter by facility ID
 *     responses:
 *       200:
 *         description: List of maintenance reports
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get("/", protect, isStaff, maintenanceController.getMaintenanceReports)

/**
 * @swagger
 * /maintenance/my-reports:
 *   get:
 *     summary: Get maintenance reports for current resident
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resident's maintenance reports
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get("/my-reports", protect, maintenanceController.getMyMaintenanceReports)

/**
 * @swagger
 * /maintenance/{id}:
 *   get:
 *     summary: Get maintenance report by ID
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Maintenance report details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Maintenance report not found
 */
router.get("/:id", protect, maintenanceController.getMaintenanceReport)

/**
 * @swagger
 * /maintenance:
 *   post:
 *     summary: Create new maintenance report
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceReport'
 *     responses:
 *       201:
 *         description: Maintenance report created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Facility not found
 */
router.post(
  "/",
  protect,
  validate(maintenanceValidation.createMaintenanceReportSchema),
  maintenanceController.createMaintenanceReport,
)

/**
 * @swagger
 * /maintenance/{id}/status:
 *   put:
 *     summary: Update maintenance report status (admin/staff only)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
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
 *                 enum: [reported, in-progress, scheduled, completed]
 *                 description: New report status
 *               assigned_to:
 *                 type: integer
 *                 description: Staff ID to assign to
 *               scheduled_date:
 *                 type: string
 *                 format: date
 *                 description: Date scheduled for maintenance
 *               feedback:
 *                 type: string
 *                 description: Feedback after completion
 *     responses:
 *       200:
 *         description: Maintenance report status updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Maintenance report not found
 */
router.put(
  "/:id/status",
  protect,
  isStaff,
  validate(maintenanceValidation.updateMaintenanceStatusSchema),
  maintenanceController.updateMaintenanceStatus,
)

module.exports = router
