const crypto = require('crypto');
const { Event, Facility, Staff, EventRegistration ,Resident} = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")
const { Op } = require('sequelize');
const axios = require('axios');
const encryptionService = require("../services/encryptionService");

//initiate payment
const generatePayfastSignature = (data, passPhrase = null) => {
  // PayFast's required parameter order for signature calculation
  const signatureOrder = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'm_payment_id', 'amount', 'item_name', 'item_description', 'custom_str1'
  ];

  let pfOutput = '';
  
  signatureOrder.forEach(key => {
    if (data[key] !== undefined && data[key] !== '') {
      const value = data[key].toString().trim();
      pfOutput += `${key}=${encodeURIComponent(value).replace(/%20/g, '+')}&`;
    }
  });

  // Remove trailing ampersand and add passphrase if exists
  let getString = pfOutput.slice(0, -1);
  if (passPhrase) {
    getString += `&passphrase=${encodeURIComponent(passPhrase.trim())}`;
  }

  return crypto.createHash('md5').update(getString).digest('hex');
};

exports.initiatePayment = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) {
    return res.status(404).json(responseFormatter.error("Event not found", 404));
  }

  // Validate required parameters
  const { resident_id } = req.body;
  if (!resident_id) {
    return res.status(400).json(responseFormatter.error("Resident ID is required", 400));
  }

  // Validate fee structure
  const amount = parseFloat(event.fee);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json(responseFormatter.error("Invalid event fee configuration", 400));
  }

  // Validate resident exists
  const resident = await Resident.findByPk(resident_id);
  if (!resident) {
    return res.status(404).json(responseFormatter.error("Resident not found", 404));
  }



 const registration = await EventRegistration.create({
    event_id: event.event_id,
    resident_id: resident_id,
    payment_status: 'pending',
    status: 'pending',
    payment_reference: `INIT-${Date.now()}`
  });

  // Create payment data with proper formatting
  const paymentData = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: `${process.env.FRONTEND_URL}/payments/${event.event_id}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/payments/${event.event_id}/cancel`,
    notify_url: `${process.env.API_URL}/events/${event.event_id}/payment-notify`,
    m_payment_id: `EVENT-${event.event_id}-${registration.id}`, // Use registration ID
    amount: amount.toFixed(2),
    item_name: `Event Reg: ${event.title.substring(0, 95)}`,
    item_description: `Registration for ${event.title.substring(0, 250)}`,
    custom_str1: JSON.stringify({
      event_id: event.event_id,
      resident_id: resident_id,
      registration_id: registration.id // Add registration ID to custom data
    })
  };

  // Generate signature with proper parameter order
  paymentData.signature = generatePayfastSignature(
    paymentData, 
    process.env.PAYFAST_PASSPHRASE
  );

  // Validate all required fields
  const requiredFields = [
    'merchant_id', 'merchant_key', 'return_url',
    'cancel_url', 'notify_url', 'm_payment_id',
    'amount', 'item_name', 'signature'
  ];

  for (const field of requiredFields) {
    if (!paymentData[field]) {
      return res.status(500).json(responseFormatter.error(`Missing required field: ${field}`, 500));
    }
  }

  // Create URL with parameters in correct order
  const params = new URLSearchParams();
  const urlOrder = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url',
    'notify_url', 'm_payment_id', 'amount', 'item_name',
    'item_description', 'custom_str1', 'signature'
  ];

  urlOrder.forEach(key => {
    if (paymentData[key]) {
      params.append(key, paymentData[key]);
    }
  });

  res.status(200).json(responseFormatter.success({
    ...paymentData,
    payment_url: `${process.env.PAYFAST_HOST}?${params.toString()}`
  }, "Payment initiated successfully"));
});


//const axios = require('axios');

exports.handlePaymentNotification = asyncHandler(async (req, res) => {
 

  try {
    const { event_id } = req.params;
    const pfData = req.body;
    event_id;
    // 1. Verify signature
    const generatedSignature = generatePayfastSignature(pfData, process.env.PAYFAST_PASSPHRASE);
    if (generatedSignature !== pfData.signature) {
      console.error('Signature mismatch:', {
        received: pfData.signature,
        generated: generatedSignature
      });
     
    }

    // 2. Parse custom data
    let customData;
    try {
      customData = JSON.parse(pfData.custom_str1);
    } catch (error) {
     
      console.error('Error parsing custom_str1:', error);
      return res.status(400).send('Invalid custom data');
    }

    // 3. Find registration
    const registration = await EventRegistration.findOne({
      where: {
        event_id: customData.event_id,
        resident_id: customData.resident_id
      }
    });

    if (!registration) {
      console.error('Registration not found:', customData);
      return res.status(404).send('Registration not found');
    }

    // 4. Update registration
    const paymentStatusMap = {
      'COMPLETE': { payment_status: 'paid', status: 'registered' },
      'CANCELLED': { payment_status: 'cancelled', status: 'cancelled' },
      'FAILED': { payment_status: 'failed', status: 'failed' }
    };

    const updateData = paymentStatusMap[pfData.payment_status] || { payment_status: 'unknown' };
    
    await registration.update({
      ...updateData,
      payment_date: pfData.payment_status === 'COMPLETE' ? new Date() : null,
      payment_reference: pfData.pf_payment_id
    });

    // 5. Send confirmation email for successful payments
    if (pfData.payment_status === 'COMPLETE') {
      try {
        const resident = await Resident.findByPk(customData.resident_id);
        const event = await Event.findByPk(customData.event_id);

        if (!resident || !event) {
          console.error('Missing data for email:', { resident, event });
          return res.status(200).send('OK'); // Still acknowledge PayFast
        }

        const emailPayload = {
          client_name: resident.name,
          client_email: resident.email,
          recipient_email: resident.email,
          subject: `Event Registration Confirmation: ${event.title}`,
          message: `
            <p>You have successfully registered for <strong>${event.title}</strong>.</p>
            <p>Amount Paid: ZAR ${parseFloat(pfData.amount_gross).toFixed(2)}</p>
            <p>Payment Date: ${new Date().toLocaleDateString('en-ZA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p>Payment Reference: ${pfData.pf_payment_id}</p>
          `
        };

        await axios.post(process.env.EMAIL_URL, emailPayload, {
          headers: { 'Content-Type': 'application/json' }
        });

        console.log(`Email sent to ${resident.email}`);
      } catch (emailError) {
        console.error('Email sending failed:', {
          error: emailError.response?.data || emailError.message,
          resident_id: customData.resident_id
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Payment notification processing failed:', {
      error: error.message,
      body: req.body,
      params: req.params
    });
    res.status(500).send('Internal server error');
  }
});
/*exports.handlePaymentNotification = asyncHandler(async (req, res) => {
  const { event_id } = req.params;
  const pfData = req.body;

  // Verify signature
  const signature = generatePayfastSignature(pfData, process.env.PAYFAST_PASSPHRASE);
  if (signature !== pfData.signature) {
    return res.status(400).send('Invalid signature');
  }
event_id;
  // Extract registration ID from payment ID
  const [registrationId] = pfData.m_payment_id.split('-REG-');
  const registration = await EventRegistration.findByPk(registrationId);
  
  if (!registration) {
    return res.status(404).send('Registration not found');
  }

  // Update registration based on payment status
  switch (pfData.payment_status) {
    case 'COMPLETE':
      await registration.update({
        payment_status: 'paid',
        payment_date: new Date(),
        payment_reference: pfData.pf_payment_id
      });
      break;
      
    case 'CANCELLED':
      await registration.update({
        payment_status: 'cancelled',
        status: 'cancelled'
      });
      break;
      
    default:
      await registration.update({ payment_status: 'failed' });
  }

  res.status(200).send('OK');
});*/


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

// @desc    Get all attendees for an event
// @route   GET /api/v1/events/:id/attendees
// @access  Public
exports.getAttendees = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if the event exists
  const event = await Event.findByPk(id);
  if (!event) {
    return res.status(404).json(responseFormatter.error("Event not found", 404));
  }

  // Retrieve all non-cancelled registrations for the event
  const registrations = await EventRegistration.findAll({
    where: {
      event_id: id,
      status: {
        [Op.not]: 'cancelled' // Exclude cancelled registrations
      }
    },
    include: [{
      model: Resident,
      attributes: ['resident_id', 'name', 'email'],
      required: true
    }],
    order: [[Resident, 'name', 'ASC']]
  });

  // Safe decryption function
  const safeDecrypt = (encryptedValue) => {
    if (!encryptedValue) return null;
    try {
      return encryptionService.decrypt(encryptedValue);
    } catch (error) {
      console.error("Decryption error:", error.message);
      return null;
    }
  };

  // Map and decrypt sensitive fields
  const attendees = registrations.map(registration => {
    const resident = registration.Resident.get({ plain: true });
    
    return {
      resident_id: resident.resident_id,
      name: safeDecrypt(resident.name),
      email: safeDecrypt(resident.email),
      registration_status: registration.status,
      payment_status: registration.payment_status,
      registration_date: registration.registration_date
    };
  });

  res.status(200).json(responseFormatter.success(attendees, "Attendees retrieved successfully"));
});

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