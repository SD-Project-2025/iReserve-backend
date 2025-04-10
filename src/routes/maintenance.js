const express = require("express")
const router = express.Router()
const maintenanceController = require("../controllers/maintenanceController")
const { protect } = require("../middleware/auth")
const { isStaff } = require("../middleware/roleCheck")
const validate = require("../middleware/validate")
const maintenanceValidation = require("../validations/maintenanceValidation")


router.get("/", protect, isStaff, maintenanceController.getMaintenanceReports)


router.get("/my-reports", protect, maintenanceController.getMyMaintenanceReports)


router.get("/:id", protect, maintenanceController.getMaintenanceReport)


router.post(
  "/",
  protect,
  validate(maintenanceValidation.createMaintenanceReportSchema),
  maintenanceController.createMaintenanceReport,
)


router.put(
  "/:id/status",
  protect,
  isStaff,
  validate(maintenanceValidation.updateMaintenanceStatusSchema),
  maintenanceController.updateMaintenanceStatus,
)

module.exports = router
