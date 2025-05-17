const { Booking, Facility, Resident, Staff, StaffFacilityAssignment } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const responseFormatter = require("../utils/responseFormatter");
const { Op } = require("sequelize");
const encryptionService = require("../services/encryptionService");
//const { startOfToday } = require("date-fns");

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @access  Private (Admin/Staff)
exports.getBookings = asyncHandler(async (req, res) => {
  const { status, facility_id } = req.query;
  const filter = {
    date: {
      [Op.gte]: new Date().toISOString().split("T")[0],
    },
  };

  // Handle staff permissions
  if (req.user.user_type === 'staff' && !req.staff.is_admin) {
    try {
      // Check if assignment model exists
      const assignments = await StaffFacilityAssignment.findAll({
        where: { staff_id: req.staff.staff_id },
        attributes: ['facility_id']
      });
      
      const assignedFacilityIds = assignments.map(a => a.facility_id);
      
      if (assignedFacilityIds.length > 0) {
        filter.facility_id = { [Op.in]: assignedFacilityIds };
      } else {
        return res.status(200).json(
          responseFormatter.success([], "No bookings found - you are not assigned to any facilities")
        );
      }
    } catch (error) {
      // If assignment system not implemented, return no bookings
      console.error("Error fetching assignments:", error.message);
      return res.status(200).json(
        responseFormatter.success([error.message], "No bookings available for staff management")
      );
    }
  }

  // Apply existing filters
  if (status) filter.status = status;
  if (facility_id) filter.facility_id = facility_id;

  const bookings = await Booking.findAll({
    where: filter,
    include: [
      {
        model: Facility,
        attributes: ["facility_id", "name", "type", "location"],
      },
      {
        model: Resident,
        attributes: ["resident_id", "name"],
      },
      {
        model: Staff,
        as: "approver",
        attributes: ["staff_id", "employee_id", "name", "email"],
      },
    ],
    order: [
      ["date", "ASC"],
      ["start_time", "ASC"],
    ],
  });

  // Existing processing logic remains unchanged
  const safeDecrypt = (encryptedValue) => {
    if (!encryptedValue) return null;
    try {
      return encryptionService.decrypt(encryptedValue);
    } catch (error) {
      console.error("Decryption error:", error.message);
      return null;
    }
  };

  const processedBookings = bookings.map(booking => {
    const bookingData = booking.get({ plain: true });

    let residentName = null;
    if (bookingData.Resident) {
      residentName = safeDecrypt(bookingData.Resident.name);
      delete bookingData.Resident;
    }

    if (bookingData.approver) {
      bookingData.approver = {
        ...bookingData.approver,
        name: safeDecrypt(bookingData.approver.name),
        email: safeDecrypt(bookingData.approver.email)
      };
    }

    return {
      ...bookingData,
      resident_name: residentName,
    };
  });

  res.status(200).json(
    responseFormatter.success(
      processedBookings,
      "Bookings retrieved successfully"
    )
  );
});
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
  });

  res
    .status(200)
    .json(responseFormatter.success(bookings, "Your bookings retrieved successfully"));
});

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
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  if (
    req.user.user_type === "resident" &&
    booking.resident_id !== req.resident.resident_id
  ) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to view this booking",
    });
  }

  res
    .status(200)
    .json(responseFormatter.success(booking, "Booking retrieved successfully"));
});

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Private (Resident)
exports.createBooking = asyncHandler(async (req, res) => {
  const { facility_id, date, start_time, end_time, purpose, attendees } = req.body;

  const facility = await Facility.findByPk(facility_id);
  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    });
  }

  if (facility.status !== "open") {
    return res.status(400).json({
      success: false,
      message: `Facility is currently ${facility.status}`,
    });
  }

  if (attendees > facility.capacity) {
    return res.status(400).json({
      success: false,
      message: `Number of attendees exceeds facility capacity of ${facility.capacity}`,
    });
  }

  const conflictingBooking = await Booking.findOne({
    where: {
      facility_id,
      date,
      status: {
        [Op.in]: ["pending", "approved"],
      },
      [Op.and]: [
        { start_time: { [Op.lt]: end_time } },
        { end_time: { [Op.gt]: start_time } },
      ],
    },
  });

  if (conflictingBooking) {
    return res.status(400).json({
      success: false,
      message: "The selected time slot conflicts with an existing booking",
    });
  }

  const booking = await Booking.create({
    facility_id,
    resident_id: req.resident.resident_id,
    date,
    start_time,
    end_time,
    purpose,
    attendees,
    status: "pending",
  });

  res
    .status(201)
    .json(responseFormatter.success(booking, "Booking created successfully"));
});

// @desc    Update booking status
// @route   PUT /api/v1/bookings/:id/status
// @access  Private (Admin/Staff)
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const booking = await Booking.findByPk(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  await booking.update({
    status,
    approved_by: req.staff.staff_id,
    approval_date: new Date(),
  });

  res
    .status(200)
    .json(responseFormatter.success(booking, `Booking ${status} successfully`));
});

// @desc    Cancel booking
// @route   PUT /api/v1/bookings/:id/cancel
// @access  Private (Resident - own bookings only)
exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByPk(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  if (booking.resident_id !== req.resident.resident_id) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to cancel this booking",
    });
  }

  if (booking.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "Booking is already cancelled",
    });
  }

  await booking.update({ status: "cancelled" });

  res
    .status(200)
    .json(responseFormatter.success(null, "Booking cancelled successfully"));
});
