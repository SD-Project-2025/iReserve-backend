const { Event, Facility, Staff, EventRegistration } = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")
const { Op } = require('sequelize');
const axios = require('axios');

// @desc    Get all events
// @route   GET /api/v1/events
// @access  Public
exports.getEvents = asyncHandler(async (req, res) => {
  const { status, facility_id } = req.query;

  // Build filter object
  const filter = {};
  if (status) {
    filter.status = status;
  } else {
    // Exclude events with status "completed" if no status filter is provided
    filter.status = { [Op.not]: "completed" };
  }

  if (facility_id) filter.facility_id = facility_id;

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
  });

  res
    .status(200)
    .json(responseFormatter.success(events, "Events retrieved successfully"));
});
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

  // Get registration count (excluding cancelled registrations)
  const registrationCount = await EventRegistration.count({
    where: { 
      event_id: event.event_id,
      status: {
        [Op.not]: 'cancelled'
      }
    },
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
  const event = await Event.findByPk(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if event is upcoming
  if (event.status !== "upcoming") {
    return res.status(400).json({
      success: false,
      message: `Cannot register for ${event.status} event`,
    });
  }

  // Check if registration deadline has passed
  if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Registration deadline has passed",
    });
  }

  // Check if already registered (only consider active registrations)
  const existingRegistration = await EventRegistration.findOne({
    where: {
      event_id: event.event_id,
      resident_id: req.resident.resident_id,
      status: {
        [Op.not]: 'cancelled' // Only check non-cancelled registrations
      }
    },
  });

  if (existingRegistration) {
    return res.status(400).json({
      success: false,
      message: "You are already registered for this event",
    });
  }

  // Check if event is full (only count active registrations)
  const registrationCount = await EventRegistration.count({
    where: { 
      event_id: event.event_id,
      status: {
        [Op.not]: 'cancelled' // Only count non-cancelled registrations
      }
    },
  });

  if (registrationCount >= event.capacity) {
    return res.status(400).json({
      success: false,
      message: "Event is at full capacity",
    });
  }

  // Check for previous cancelled registration
  const cancelledRegistration = await EventRegistration.findOne({
    where: {
      event_id: event.event_id,
      resident_id: req.resident.resident_id,
      status: 'cancelled'
    },
  });

  // Either update the cancelled registration or create a new one
  let registration;
  if (cancelledRegistration) {
    registration = await cancelledRegistration.update({
      status: "registered",
      payment_status: event.fee > 0 ? "pending" : "not_required",
      registration_date: new Date()
    });
  } else {
    registration = await EventRegistration.create({
      event_id: event.event_id,
      resident_id: req.resident.resident_id,
      status: "registered",
      payment_status: event.fee > 0 ? "pending" : "not_required",
    });
  }

  res.status(201).json(responseFormatter.success(registration, "Registered for event successfully"));
});
// @desc    Cancel event registration
// @route   PUT /api/v1/events/:id/cancel-registration
// @access  Private (Resident)
exports.cancelRegistration = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Find registration (including cancelled ones)
  const registration = await EventRegistration.findOne({
    where: {
      event_id: event.event_id,
      resident_id: req.resident.resident_id,
    },
  });

  if (!registration) {
    return res.status(400).json({
      success: false,
      message: "You are not registered for this event",
    });
  }

  // Check if registration is already cancelled
  if (registration.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: "Your registration is already cancelled",
    });
  }

  // Update registration status
  await registration.update({ status: "cancelled" });

  res.status(200).json(responseFormatter.success(null, "Event registration cancelled successfully"));
});

// @desc    Check registration status for a specific event
// @route   GET /api/v1/events/:id/status
// @access  Private (Resident)
exports.getRegistrationStatus = asyncHandler(async (req, res) => {
  const { id, userID } = req.params;
  
  try {
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json(
        responseFormatter.error(null, 'Event not found', 404)
      );
    }

    const registration = await EventRegistration.findOne({
      where: {
        event_id: id,
        resident_id: userID,
      },
    });

    if (!registration) {
      return res.status(200).json(
        responseFormatter.success(
          { 
            isRegistered: false,
            status: 'not_registered',
            paymentStatus: null,
            notes: null,
            registrationDate: null
          }, 
          'Registration status retrieved successfully'
        )
      );
    }

    res.status(200).json(
      responseFormatter.success(
        { 
          isRegistered: registration.status !== 'cancelled',
          status: registration.status,
          paymentStatus: registration.payment_status,
          notes: registration.notes,
          registrationDate: registration.registration_date
        }, 
        'Registration status retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Error fetching registration status:', error);
    res.status(500).json(
      responseFormatter.error(null, 'Internal server error', 500)
    );
  }
});

exports.getEventsByStaffFacilities = asyncHandler(async (req, res) => {
  const { staff_id } = req.params;
  const { status } = req.query;
  const apiUrl = process.env.API_URL || "http://localhost:5000/api/v1"

  try {
    // 1. Get assigned facilities from staff-facilities API
    const facilitiesResponse = await axios.get(`${apiUrl}/facilities/staff/${staff_id}`);
    
    if (!facilitiesResponse.data || facilitiesResponse.data.length === 0) {
      return res.status(200).json(
        responseFormatter.success([], "No facilities assigned to this staff member")
      );
    }

    // 2. Extract facility IDs
    const facilityIds = facilitiesResponse.data.map(f => f.facility_id);

    // 3. Build event filter
    const eventFilter = {
      facility_id: { [Op.in]: facilityIds }
    };

    // Add status filter if provided
    if (status) {
      eventFilter.status = status;
    } else {
      // Exclude completed events by default
      eventFilter.status = { [Op.not]: "completed" };
    }

    // 4. Get events for these facilities
    const events = await Event.findAll({
      where: eventFilter,
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
    });

    return res.status(200).json(
      responseFormatter.success(events, "Events retrieved successfully")
    );

  } catch (error) {
    console.error("Error in getEventsByStaffFacilities:", error);
    return res.status(500).json(
      responseFormatter.error("Internal server error", error.message)
    );
  }
});


module.exports = exports