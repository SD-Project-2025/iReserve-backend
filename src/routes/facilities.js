const express = require("express")
const router = express.Router()
const facilityController = require("../controllers/facilityController")
const { protect } = require("../middleware/auth")
const { isStaff, isAdmin } = require("../middleware/roleCheck")
const validate = require("../middleware/validate")
const facilityValidation = require("../validations/facilityValidation")


router.get("/", facilityController.getFacilities)


router.get("/:id", facilityController.getFacility)


router.post("/", protect, isStaff, validate(facilityValidation.createFacilitySchema), facilityController.createFacility)


router.put(
  "/:id",
  protect,
  isStaff,
  validate(facilityValidation.updateFacilitySchema),
  facilityController.updateFacility,
)

router.delete("/:id", protect, isAdmin, facilityController.deleteFacility)

router.post(
  "/:id/staff",
  protect,
  isAdmin,
  validate(facilityValidation.assignStaffSchema),
  facilityController.assignStaff,
)

router.get("/:id/staff", protect, isStaff, facilityController.getAssignedStaff)

module.exports = router
