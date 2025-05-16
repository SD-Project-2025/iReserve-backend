const { Facility, StaffFacilityAssignment, Staff, FacilityRating, User } = require("../models")
const asyncHandler = require("../utils/asyncHandler")
const responseFormatter = require("../utils/responseFormatter")
const { Sequelize } = require("sequelize")


exports.getFacilities = asyncHandler(async (req, res) => {
  const { type, status, isIndoor } = req.query

  const filter = {}
  if (type) filter.type = type
  if (status) filter.status = status
  if (isIndoor !== undefined) filter.is_indoor = isIndoor === "true"

  const facilities = await Facility.findAll({
    where: filter,
    order: [["name", "ASC"]],
    include: [{
      model: FacilityRating,
      attributes: [],
    }],
    attributes: {
      include: [
        [Sequelize.fn('AVG', Sequelize.col('FacilityRatings.rating')), 'average_rating'],
        [Sequelize.fn('COUNT', Sequelize.col('FacilityRatings.rating_id')), 'rating_count']
      ]
    },
    group: ['Facility.facility_id']
  })

  res.status(200).json(responseFormatter.success(facilities, "Facilities retrieved successfully"))
})


exports.getFacility = asyncHandler(async (req, res) => {
  const facility = await Facility.findByPk(req.params.id, {
    include: [{
      model: FacilityRating,
      attributes: ['rating_id', 'facility_id', 'user_id', 'rating', 'comment', 'created_at']
    }]
  });

  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    });
  }

  // Calculate average rating
  const ratings = facility.FacilityRatings || [];
  const averageRating = ratings.length > 0 
    ? parseFloat((ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length).toFixed(2))
    : null;

  const response = {
    ...facility.get({ plain: true }),
    average_rating: averageRating,
    rating_count: ratings.length,
    ratings: ratings.map(rating => ({
      rating_id: rating.rating_id,
      facility_id: rating.facility_id,
      user_id: rating.user_id,  // Still include user_id if needed for reference
      rating: rating.rating,
      comment: rating.comment,
      created_at: rating.created_at
    }))
  };

  res.status(200).json(responseFormatter.success(response, "Facility retrieved successfully"));
});


exports.createFacility = asyncHandler(async (req, res) => {
  const { name, type, location, capacity, image_url, is_indoor, description, open_time, close_time, status } = req.body


  const facility = await Facility.create({
    name,
    type,
    location,
    capacity,
    image_url,
    is_indoor,
    description,
    open_time,
    close_time,
    status: status || "open",
    created_by: req.staff.staff_id,
  })

  res.status(201).json(responseFormatter.success(facility, "Facility created successfully"))
})


exports.updateFacility = asyncHandler(async (req, res) => {
  let facility = await Facility.findByPk(req.params.id)

  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }


  facility = await facility.update(req.body)

  res.status(200).json(responseFormatter.success(facility, "Facility updated successfully"))
})


exports.deleteFacility = asyncHandler(async (req, res) => {
  const facility = await Facility.findByPk(req.params.id)

  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }

  await facility.destroy()

  res.status(200).json(responseFormatter.success(null, "Facility deleted successfully"))
})


exports.assignStaff = asyncHandler(async (req, res) => {
  const { staff_id, role, is_primary } = req.body


  const facility = await Facility.findByPk(req.params.id)
  if (!facility) {
    return res.status(404).json({
      success: false,
      message: "Facility not found",
    })
  }

  const staff = await Staff.findByPk(staff_id)
  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    })
  }


  const existingAssignment = await StaffFacilityAssignment.findOne({
    where: {
      staff_id,
      facility_id: req.params.id,
    },
  })

  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      message: "Staff is already assigned to this facility",
    })
  }

  const assignment = await StaffFacilityAssignment.create({
    staff_id,
    facility_id: req.params.id,
    role,
    assigned_date: new Date(),
    is_primary: is_primary || false,
  })

  res.status(201).json(responseFormatter.success(assignment, "Staff assigned to facility successfully"))
})


exports.getAssignedStaff = asyncHandler(async (req, res) => {
  const assignments = await StaffFacilityAssignment.findAll({
    where: { facility_id: req.params.id },
    include: [
      {
        model: Staff,
        include: ["User"],
      },
    ],
  })

  res.status(200).json(responseFormatter.success(assignments, "Assigned staff retrieved successfully"))
})

exports.getFacilitiesByStaffId = async (req, res) => {
  const { staff_id } = req.params;

  try {
    const assignments = await StaffFacilityAssignment.findAll({
      where: { staff_id },
      include: [
        {
          model: Facility,
          attributes: [
            "facility_id", "name", "type", "location", "capacity",
            "image_url", "is_indoor", "description", "open_time", "close_time", "status"
          ],
        },
      ],
    });

    if (!assignments || assignments.length === 0) {
      return res.status(404).json({ message: "No facilities assigned to this staff member." });
    }

    // Return only the facilities
    const facilities = assignments.map((a) => a.Facility);

    return res.status(200).json(facilities);
  } catch (error) {
    console.error("Error fetching facilities by staff ID:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};


exports.createFacilityRating = asyncHandler(async (req, res) => {
  const { facility_id, rating, comment, user_id } = req.body;

  // Basic validation
  if (isNaN(facility_id)) {
    return res.status(400).json({ 
      success: false,
      message: "Invalid facility ID" 
    });
  }

  if (!user_id) {
    return res.status(400).json({ 
      success: false,
      message: "User ID is required" 
    });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ 
      success: false,
      message: "Rating must be between 1 and 5" 
    });
  }

  try {
    // Check for existing rating
    const existingRating = await FacilityRating.findOne({
      where: { facility_id, user_id }
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.comment = comment;
      await existingRating.save();

      // Return success response for update
      return res.status(200).json({
        success: true,
        data: {
          rating_id: existingRating.rating_id,
          rating: existingRating.rating,
          comment: existingRating.comment,
          updated_at: existingRating.updated_at
        },
        message: "Rating updated successfully"
      });
    }

    // Create new rating if none exists
    const newRating = await FacilityRating.create({
      facility_id,
      user_id,
      rating,
      comment
    });

    // Return success response for creation
    return res.status(201).json({
      success: true,
      data: {
        rating_id: newRating.rating_id,
        rating: newRating.rating,
        comment: newRating.comment,
        created_at: newRating.created_at
      },
      message: "Rating submitted successfully"
    });

  } catch (error) {
    console.error("Rating submission error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});



module.exports = exports
