const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { isAdmin } = require("../middleware/roleCheck");
const validate = require("../middleware/validate");
const userValidation = require("../validations/userValidation");
//const assignValidation = require("../validations/assignmentValidation");

/**
 * @swagger
 * /manage/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users with decrypted names and emails
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get("/", protect, isAdmin, userController.getAllUsers);

/**
 * @swagger
 * /manage/users/{userId}/status:
 *   put:
 *     summary: Update user status (Ban/Unban)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to modify
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
 *                 enum: [active, suspended]
 *                 example: suspended
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.put(
  "/:userId/status",
  protect,
  isAdmin,
  validate(userValidation.manageStatusSchema),
  userController.manageUserStatus
);

/**
 * @swagger
 * /manage/users/{userId}/admin:
 *   put:
 *     summary: Update staff admin privileges
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff user to modify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_admin
 *             properties:
 *               is_admin:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Admin privileges updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.put(
  "/:userId/admin",
  protect,
  isAdmin,
  validate(userValidation.manageAdminSchema),
  userController.manageAdminStatus
);

/**
 * @swagger
 * /manage/users/{userId}/upgrade:
 *   post:
 *     summary: Upgrade resident to staff
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the resident to upgrade
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *             properties:
 *               employee_id:
 *                 type: string
 *                 example: "EMP12345"
 *                 pattern: ^[A-Z0-9]{6,20}$
 *               position:
 *                 type: string
 *                 example: "Facility Manager"
 *               department:
 *                 type: string
 *                 example: "Operations"
 *     responses:
 *       200:
 *         description: User upgraded to staff successfully
 *       400:
 *         description: Invalid employee ID format
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.post(
  "/:userId/upgrade",
  protect,
  isAdmin,
  validate(userValidation.upgradeSchema),
  userController.upgradeToStaff
);

/**
 * @swagger
 * /manage/users/{userId}/downgrade:
 *   post:
 *     summary: Downgrade staff to resident
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member to downgrade
 *     responses:
 *       200:
 *         description: User downgraded to resident successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.post(
  "/:userId/downgrade",
  protect,
  isAdmin,
  userController.downgradeToResident
);
/**
 * @swagger
 * /manage/users/staff:
 *   get:
 *     summary: Get all staff members (Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of staff members
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Staff members retrieved successfully"
 *               data:
 *                 - user_id: 2
 *                   status: "active"
 *                   employee_id: "EMP123"
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   position: "Manager"
 *                   department: "Operations"
 *                   is_admin: true
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get("/staff", protect, isAdmin, userController.getStaffMembers);

/**
 * @swagger
 * /manage/users/residents:
 *   get:
 *     summary: Get all residents (Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of residents
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Residents retrieved successfully"
 *               data:
 *                 - user_id: 3
 *                   status: "active"
 *                   name: "Jane Smith"
 *                   email: "jane@example.com"
 *                   membership_type: "premium"
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get("/residents", protect, isAdmin, userController.getResidents);
/**
 * @swagger
 * /manage/users/staff/assign:
 *   post:
 *     summary: Assign staff member to facility
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - facilityId
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 35
 *                 description: ID of the staff user to assign
 *               facilityId:
 *                 type: integer
 *                 example: 14
 *                 description: ID of the facility to assign to
 *     responses:
 *       201:
 *         description: Staff assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffFacilityAssignment'
 *       400:
 *         description: Invalid input or duplicate assignment
 *       404:
 *         description: Staff user or facility not found
 */
router.post(
  "/staff/assign",
  protect,
  isAdmin,
  //validate(userValidation.assignSchema),
  userController.assignStaff
);

/**
 * @swagger
 * /manage/users/staff/unassign:
 *   delete:
 *     summary: Unassign staff member from facility
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: facilityId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Staff unassigned successfully
 */
router.delete(
  "/staff/unassign",
  protect,
  isAdmin,
  //validate(userValidation.unassignSchema, { context: 'query' }),
  userController.unassignStaff
);

/**
 * @swagger
 * /manage/users/{userId}/assignments:
 *   get:
 *     summary: Get staff member's facility assignments
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff user
 *     responses:
 *       200:
 *         description: List of facility assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   assignment_id:
 *                     type: integer
 *                     example: 1
 *                   facility_id:
 *                     type: integer
 *                     example: 14
 *                   name:
 *                     type: string
 *                     example: "Main Gym"
 *                   type:
 *                     type: string
 *                     example: "Gymnasium"
 *                   location:
 *                     type: string
 *                     example: "Building A, 2nd Floor"
 *                   capacity:
 *                     type: integer
 *                     example: 100
 *                   status:
 *                     type: string
 *                     example: "open"
 *                   open_time:
 *                     type: string
 *                     example: "08:00:00"
 *                   close_time:
 *                     type: string
 *                     example: "22:00:00"
 *                   image_url:
 *                     type: string
 *                     example: "https://example.com/gym.jpg"
 *                   role:
 *                     type: string
 *                     example: "FacilityStaff"
 *                   is_primary:
 *                     type: boolean
 *                     example: true
 *                   assigned_date:
 *                     type: string
 *                     format: date
 *                     example: "2023-08-15"
 *       404:
 *         description: Staff profile not found
 */
router.get(
  "/:userId/assignments",
  protect,
  isAdmin,
  //validate(userValidation.staffAssignmentsSchema, { params: true }),
  userController.getStaffAssignments
);

module.exports = router;