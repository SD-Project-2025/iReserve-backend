const express = require("express")
const router = express.Router()

const authRoutes = require("./auth")
const eventsRoutes = require("./events")
const bookingRoutes = require("./bookings")

// Mount routes
router.use("/auth", authRoutes)
//Debugfig routes- may not work!!
router.use("/events", eventsRoutes)
router.use("/bookings", bookingRoutes)


module.exports = router
