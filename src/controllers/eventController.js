const { Event, Facility, Staff, EventRegistration, Resident } = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")

// @desc    Get all events
// @route   GET /api/v1/events
// @access  Public
exports.getEvents = asyncHandler(async (req, res) => {
  const { status, facility_id } = req.query

  // Build filter object
  const filter = {}
  if (status) filter.status = status
  if (facility_id) filter.facility_id = facility_id

  const events = await Event.findAll({
    where: filter,
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location"],
      },
      {
        model: Staff,
        as: "organizer",
        attributes: ["staff_id", "employee_id", "position"],
      },
    ],
    order: [
      ["start_date", "ASC"],
      ["start_time", "ASC"],
    ],
  })

  res.status(200).json(responseFormatter.success(events, "Events retrieved successfully"))
})

// @desc    Get single event
// @route   GET /api/v1/events/:id
// @access  Public
exports.getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id, {
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location", "capacity"],
      },
      {
        model: Staff,
        as: "organizer",
        attributes: ["staff_id", "employee_id", "position"],
      },
    ],
  })

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    })
  }

  // Get registration count
  const registrationCount = await EventRegistration.count({
    where: { event_id: event.event_id },
  })

  // Add registration count to event
  const eventData = event.toJSON()
  eventData.registrations = registrationCount

  res.status(200).json(responseFormatter.success(eventData, "Event retrieved successfully"))
})

// @desc    Create new event
// @route   POST /api/v1/events
// @access  Private (Admin/Staff)
exports.createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    facility_id,
    start_date,
    end_date,
    start_time,
    end_time,
    capacity,
    image_url,
    is_public,
    registration_deadline,
    fee,
  } = req.body

  // Check if facility exists
  const facility = await Facility.findByPk(facility_id)
  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }

  // Create event
  const event = await Event.create({
    title,
    description,
    facility_id,
    start_date,
    end_date,
    start_time,
    end_time,
    organizer_staff_id: req.staff.staff_id,
    capacity,
    image_url,
    is_public,
    registration_deadline,
    fee,
  })

  res.status(201).json(responseFormatter.success(event, "Event created successfully"))
})

// @desc    Update event
// @route   PUT /api/v1/events/:id
// @access  Private (Admin/Staff)
exports.updateEvent = asyncHandler(async (req, res) => {
  let event = await Event.findByPk(req.params.id)

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    })
  }

  // Check if user is organizer or admin
  if (event.organizer_staff_id !== req.staff.staff_id && !req.staff.is_admin) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to update this event",
    })
  }

  // Update event
  event = await event.update(req.body)

  res.status(200).json(responseFormatter.success(event, "Event updated successfully"))
})

// @desc    Delete event
// @route   DELETE /api/v1/events/:id
// @access  Private (Admin/Staff)
exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id)

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    })
  }

  // Check if user is organizer or admin
  if (event.organizer_staff_id !== req.staff.staff_id && !req.staff.is_admin) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to delete this event",
    })
  }

  await event.destroy()

  res.status(200).json(responseFormatter.success(null, "Event deleted successfully"))
})

// @desc    Register for event
// @route   POST /api/v1/events/:id/register
// @access  Private (Resident)
exports.registerForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id)

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    })
  }

  // Check if event is upcoming
  if (event.status !== "upcoming") {
    return res.status(400).json({
      success: false,
      message: `Cannot register for ${event.status} event`,
    })
  }

  // Check if registration deadline has passed
  if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Registration deadline has passed",
    })
  }

  // Check if already registered
  const existingRegistration = await EventRegistration.findOne({
    where: {
      event_id: event.event_id,
      resident_id: req.resident.resident_id,
    },
  })

  if (existingRegistration) {
    return res.status(400).json({
      success: false,
      message: "You are already registered for this event",
    })
  }

  // Check if event is full
  const registrationCount = await EventRegistration.count({
    where: { event_id: event.event_id },
  })

  if (registrationCount >= event.capacity) {
    return res.status(400).json({
      success: false,
      message: "Event is at full capacity",
    })
  }

  // Create registration
  const registration = await EventRegistration.create({
    event_id: event.event_id,
    resident_id: req.resident.resident_id,
    status: "registered",
    payment_status: event.fee > 0 ? "pending" : "not_required",
  })

  res.status(201).json(responseFormatter.success(registration, "Registered for event successfully"))
})

// @desc    Cancel event registration
// @route   PUT /api/v1/events/:id/cancel-registration
// @access  Private (Resident)
exports.cancelRegistration = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id)

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    })
  }

  // Find registration
  const registration = await EventRegistration.findOne({
    where: {
      event_id: event.event_id,
      resident_id: req.resident.resident_id,
    },
  })

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: "Registration not found",
    })
  }

  // Update registration status
  await registration.update({ status: "cancelled" })

  res.status(200).json(responseFormatter.success(null, "Event registration cancelled successfully"))
})

module.exports = exports
