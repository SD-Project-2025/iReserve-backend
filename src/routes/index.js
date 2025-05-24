const express = require("express")
const router = express.Router()

const authRoutes = require("./auth")
const eventsRoutes = require("./events")
const bookingRoutes = require("./bookings")
const maintenanceRoutes = require("./maintenance")
const notificationRoutes = require("./notifications")
const facilityRoutes = require("./facilities")
const userRoutes = require("./userRoutes")
const residentRoutes = require('./residentRoutes');
//const emailRoutes = require("./emailNotifications")

// Mount routes
router.use("/auth", authRoutes)
//Debugfig routes- may not work!!
//router.use("email", emailRoutes)
router.use("/events", eventsRoutes)
router.use("/bookings", bookingRoutes)
router.use("/facilities", facilityRoutes)
router.use("/maintenance", maintenanceRoutes)
router.use("/notifications", notificationRoutes)
router.use("/manage/users", userRoutes)
router.use('/residents', residentRoutes);



module.exports = router
