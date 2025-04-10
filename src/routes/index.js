const express = require("express")
const router = express.Router()

const authRoutes = require("./auth")
const eventsRoutes = require("./events")
const bookingRoutes = require("./bookings")
const maintenanceRoutes = require("./maintenance")
const notificationRoutes = require("./notifications")
const facilityRoutes = require("./facilities")

// Mount routes
router.use("/auth", authRoutes)
//Debugfig routes- may not work!!
router.use("/events", eventsRoutes)
router.use("/bookings", bookingRoutes)
router.use("/facilities", facilityRoutes)
router.use("/maintenance", maintenanceRoutes)
router.use("/notifications", notificationRoutes)


module.exports = router
