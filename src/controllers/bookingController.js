const { Booking, Facility, Resident, Staff } = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")
const { sequelize } = require("../models") // Import sequelize
const { Op } = require('sequelize');


// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @access  Private (Admin/Staff)
exports.getBookings = asyncHandler(async (req, res) => {
  const { status, facility_id, date } = req.query

  // Build filter object
  const filter = {}

  if (status) filter.status = status
  if (facility_id) filter.facility_id = facility_id
  if (date) filter.date = date

  const bookings = await Booking.findAll({
    where: filter,
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location"],
      },
      {
        model: Resident,
        attributes: ["resident_id"],
      },
      {
        model: Staff,
        as: "approver",
        attributes: ["staff_id", "employee_id"],
      },
    ],
    order: [
      ["date", "DESC"],
      ["start_time", "ASC"],
    ],
  })

  res.status(200).json(responseFormatter.success(bookings, "Bookings retrieved successfully"))
})

// @desc    Get bookings for a resident
// @route   GET /api/v1/bookings/my-bookings
// @access  Private (Resident)
exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.findAll({
    where: { resident_id: req.resident.resident_id },
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location"],
      },
    ],
    order: [
      ["date", "DESC"],
      ["start_time", "ASC"],
    ],
  })

  res.status(200).json(responseFormatter.success(bookings, "Your bookings retrieved successfully"))
})

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByPk(req.params.id, {
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location", "capacity"],
      },
      {
        model: Resident,
        attributes: ["resident_id"],
      },
      {
        model: Staff,
        as: "approver",
        attributes: ["staff_id", "employee_id"],
      },
    ],
  })

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    })
  }

  // Check if user has permission to view this booking
  if (req.user.user_type === "resident" && booking.resident_id !== req.resident.resident_id) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to view this booking",
    })
  }

  res.status(200).json(responseFormatter.success(booking, "Booking retrieved successfully"))
})

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Private (Resident)
exports.createBooking = asyncHandler(async (req, res) => {
  const { facility_id, date, start_time, end_time, purpose, attendees } = req.body

  // Check if facility exists
  const facility = await Facility.findByPk(facility_id)
  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }

  // Check if facility is open
  if (facility.status !== "open") {
    return res.status(400).json({
      success: false,
      message: `Facility is currently ${facility.status}`,
    })
  }

  // Check if attendees exceed capacity
  if (attendees > facility.capacity) {
    return res.status(400).json({
      success: false,
      message: `Number of attendees exceeds facility capacity of ${facility.capacity}`,
    })
  }

  // Check for time conflicts
  const { sequelize } = require("../models");

// Check for time conflicts
const { Op } = require("sequelize")

// Check for time conflicts
const conflictingBooking = await Booking.findOne({
  where: {
    facility_id,
    date,
    status: {
      [Op.in]: ["pending", "approved"],
    },
    [Op.and]: [
      {
        start_time: {
          [Op.lt]: end_time,
        },
      },
      {
        end_time: {
          [Op.gt]: start_time,
        },
      },
    ],
  },
})

if (conflictingBooking) {
  return res.status(400).json({
    success: false,
    message: "The selected time slot conflicts with an existing booking",
  });
}
  // Create booking
  const booking = await Booking.create({
    facility_id,
    resident_id: req.resident.resident_id,
    date,
    start_time,
    end_time,
    purpose,
    attendees,
    status: "pending",
  })

  res.status(201).json(responseFormatter.success(booking, "Booking created successfully"))
})

// @desc    Update booking status
// @route   PUT /api/v1/bookings/:id/status
// @access  Private (Admin/Staff)
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body

  const booking = await Booking.findByPk(req.params.id)

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    })
  }

  // Update booking status
  await booking.update({
    status,
    approved_by: req.staff.staff_id,
    approval_date: new Date(),
  })

  res.status(200).json(responseFormatter.success(booking, `Booking ${status} successfully`))
})

// @desc    Cancel booking
// @route   PUT /api/v1/bookings/:id/cancel
// @access  Private (Resident - own bookings only)
exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByPk(req.params.id)

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    })
  }

  // Check if user owns this booking
  if (booking.resident_id !== req.resident.resident_id) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to cancel this booking",
    })
  }

  // Check if booking can be cancelled
  if (booking.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "Booking is already cancelled",
    })
  }

  // Cancel booking
  await booking.update({ status: "cancelled" })

  res.status(200).json(responseFormatter.success(null, "Booking cancelled successfully"))
})

module.exports = exports
