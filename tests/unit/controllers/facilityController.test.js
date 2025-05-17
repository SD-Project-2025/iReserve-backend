const facilityController = require('../../../src/controllers/facilityController');
const { 
  Facility, 
  StaffFacilityAssignment, 
  Staff,
  FacilityRating,
  Sequelize 
} = require('../../../src/models');
const responseFormatter = require('../../../src/utils/responseFormatter');

// Mock the models and utils
jest.mock('../../../src/models', () => {
  const originalModule = jest.requireActual('../../../src/models');
  return {
    ...originalModule,
    Facility: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
    },
    StaffFacilityAssignment: {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    },
    Staff: {
      findByPk: jest.fn(),
    },
    FacilityRating: {
      findOne: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
    },
    Sequelize: {
      fn: jest.fn(),
      col: jest.fn(),
    }
  };
});

jest.mock('../../../src/utils/responseFormatter', () => ({
  success: jest.fn((data, message) => ({ success: true, data, message })),
  error: jest.fn((message) => ({ success: false, message }))
}));

describe('Facility Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      staff: { staff_id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('getFacilities', () => {
    it('should retrieve all facilities with average ratings', async () => {
      req.query = {};
      const mockFacilities = [{ 
        name: 'Gym', 
        dataValues: { 
          average_rating: 4.5,
          rating_count: 10
        } 
      }];
      
      Facility.findAll.mockResolvedValue(mockFacilities);
      Sequelize.fn.mockImplementation((fn, col) => ({ fn, col }));
      Sequelize.col.mockImplementation(col => col);

      await facilityController.getFacilities(req, res);

      expect(Facility.findAll).toHaveBeenCalledWith({
        where: {},
        order: [['name', 'ASC']],
        include: [{
          model: FacilityRating,
          attributes: [],
        }],
        attributes: {
          include: [
            [{ fn: 'AVG', col: 'FacilityRatings.rating' }, 'average_rating'],
            [{ fn: 'COUNT', col: 'FacilityRatings.rating_id' }, 'rating_count']
          ]
        },
        group: ['Facility.facility_id']
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.success(mockFacilities, "Facilities retrieved successfully")
      );
    });

    it('should filter facilities by query parameters', async () => {
      req.query = { type: 'sports', status: 'open', isIndoor: 'true' };
      
      await facilityController.getFacilities(req, res);

      expect(Facility.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          type: 'sports',
          status: 'open',
          is_indoor: true
        }
      }));
    });
  });

  describe('getFacility', () => {
    it('should retrieve a facility with ratings and calculate average', async () => {
      req.params.id = 1;
      const mockRatings = [
        { rating_id: 1, rating: 4, comment: 'Good', created_at: new Date() },
        { rating_id: 2, rating: 5, comment: 'Excellent', created_at: new Date() }
      ];
      const mockFacility = { 
        facility_id: 1, 
        name: 'Main Gym',
        get: jest.fn().mockReturnValue({ facility_id: 1, name: 'Main Gym' }),
        FacilityRatings: mockRatings
      };
      
      Facility.findByPk.mockResolvedValue(mockFacility);

      await facilityController.getFacility(req, res);

      expect(Facility.findByPk).toHaveBeenCalledWith(1, {
        include: [{
          model: FacilityRating,
          attributes: ['rating_id', 'facility_id', 'user_id', 'rating', 'comment', 'created_at']
        }]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          average_rating: 4.5,
          rating_count: 2,
          ratings: expect.arrayContaining([
            expect.objectContaining({ rating: 4 }),
            expect.objectContaining({ rating: 5 })
          ])
        }),
        message: "Facility retrieved successfully"
      });
    });

    it('should handle facility with no ratings', async () => {
      req.params.id = 1;
      const mockFacility = { 
        facility_id: 1, 
        name: 'Main Gym',
        get: jest.fn().mockReturnValue({ facility_id: 1, name: 'Main Gym' }),
        FacilityRatings: []
      };
      
      Facility.findByPk.mockResolvedValue(mockFacility);

      await facilityController.getFacility(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          average_rating: null,
          rating_count: 0
        })
      }));
    });

    it('should return 404 if facility not found', async () => {
      req.params.id = 999;
      Facility.findByPk.mockResolvedValue(null);

      await facilityController.getFacility(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Facility not found"
      });
    });
  });

  describe('createFacility', () => {
    it('should create a new facility with default status', async () => {
      req.body = {
        name: 'New Gym',
        type: 'fitness',
        location: 'Building A',
        capacity: 50,
        is_indoor: true
      };
      const mockFacility = { ...req.body, facility_id: 1, status: 'open' };
      Facility.create.mockResolvedValue(mockFacility);

      await facilityController.createFacility(req, res);

      expect(Facility.create).toHaveBeenCalledWith({
        ...req.body,
        status: 'open',
        created_by: 1
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.success(mockFacility, "Facility created successfully")
      );
    });

    it('should allow custom status in request', async () => {
      req.body = {
        name: 'New Gym',
        type: 'fitness',
        status: 'maintenance'
      };
      const mockFacility = { ...req.body, facility_id: 1 };
      Facility.create.mockResolvedValue(mockFacility);

      await facilityController.createFacility(req, res);

      expect(Facility.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'maintenance'
      }));
    });
  });

  describe('updateFacility', () => {
    it('should update an existing facility', async () => {
      req.params.id = 1;
      req.body = { name: 'Updated Gym', capacity: 60 };
      const mockFacility = {
        facility_id: 1,
        update: jest.fn().mockResolvedValue({ ...req.body, facility_id: 1 })
      };
      Facility.findByPk.mockResolvedValue(mockFacility);

      await facilityController.updateFacility(req, res);

      expect(mockFacility.update).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.success(expect.any(Object), "Facility updated successfully")
      );
    });

    it('should return 404 if facility not found', async () => {
      req.params.id = 999;
      Facility.findByPk.mockResolvedValue(null);

      await facilityController.updateFacility(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Facility not found"
      });
    });
  });

  describe('deleteFacility', () => {
    it('should delete an existing facility', async () => {
      req.params.id = 1;
      const mockFacility = {
        facility_id: 1,
        destroy: jest.fn().mockResolvedValue(true)
      };
      Facility.findByPk.mockResolvedValue(mockFacility);

      await facilityController.deleteFacility(req, res);

      expect(mockFacility.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.success(null, "Facility deleted successfully")
      );
    });

    it('should return 404 if facility not found', async () => {
      req.params.id = 999;
      Facility.findByPk.mockResolvedValue(null);

      await facilityController.deleteFacility(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Facility not found"
      });
    });
  });

  describe('assignStaff', () => {
    it('should assign staff to a facility', async () => {
      req.params.id = 1;
      req.body = { staff_id: 2, role: 'manager', is_primary: true };
      
      const mockFacility = { facility_id: 1 };
      const mockStaff = { staff_id: 2 };
      const mockAssignment = { assignment_id: 1 };
      
      Facility.findByPk.mockResolvedValue(mockFacility);
      Staff.findByPk.mockResolvedValue(mockStaff);
      StaffFacilityAssignment.findOne.mockResolvedValue(null);
      StaffFacilityAssignment.create.mockResolvedValue(mockAssignment);

      await facilityController.assignStaff(req, res);

      expect(StaffFacilityAssignment.create).toHaveBeenCalledWith({
        staff_id: 2,
        facility_id: 1,
        role: 'manager',
        assigned_date: expect.any(Date),
        is_primary: true
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.success(mockAssignment, "Staff assigned to facility successfully")
      );
    });

    it('should return 404 if facility not found', async () => {
      req.params.id = 999;
      req.body = { staff_id: 2 };
      Facility.findByPk.mockResolvedValue(null);

      await facilityController.assignStaff(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Facility not found"
      });
    });

    it('should return 404 if staff not found', async () => {
      req.params.id = 1;
      req.body = { staff_id: 999 };
      Facility.findByPk.mockResolvedValue({});
      Staff.findByPk.mockResolvedValue(null);

      await facilityController.assignStaff(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Staff not found"
      });
    });

    it('should return 400 if staff already assigned', async () => {
      req.params.id = 1;
      req.body = { staff_id: 2 };
      Facility.findByPk.mockResolvedValue({});
      Staff.findByPk.mockResolvedValue({});
      StaffFacilityAssignment.findOne.mockResolvedValue({});

      await facilityController.assignStaff(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Staff is already assigned to this facility"
      });
    });
  });

  describe('getAssignedStaff', () => {
    it('should retrieve staff assigned to a facility', async () => {
      req.params.id = 1;
      const mockAssignments = [
        { staff_id: 1, role: 'manager', Staff: { user_id: 1 } }
      ];
      StaffFacilityAssignment.findAll.mockResolvedValue(mockAssignments);

      await facilityController.getAssignedStaff(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalledWith({
        where: { facility_id: 1 },
        include: [{ model: Staff, include: ['User'] }]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.success(mockAssignments, "Assigned staff retrieved successfully")
      );
    });
  });

  describe('getFacilitiesByStaffId', () => {
    it('should retrieve facilities assigned to a staff member', async () => {
      req.params.staff_id = 1;
      const mockAssignments = [
        { Facility: { facility_id: 1, name: 'Gym' } },
        { Facility: { facility_id: 2, name: 'Pool' } }
      ];
      StaffFacilityAssignment.findAll.mockResolvedValue(mockAssignments);

      await facilityController.getFacilitiesByStaffId(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalledWith({
        where: { staff_id: 1 },
        include: [{
          model: Facility,
          attributes: expect.arrayContaining([
            "facility_id", "name", "type", "location", "capacity",
            "image_url", "is_indoor", "description", "open_time", "close_time", "status"
          ])
        }]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { facility_id: 1, name: 'Gym' },
        { facility_id: 2, name: 'Pool' }
      ]);
    });

    it('should return 404 if no facilities assigned', async () => {
      req.params.staff_id = 999;
      StaffFacilityAssignment.findAll.mockResolvedValue([]);

      await facilityController.getFacilitiesByStaffId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'No facilities assigned to this staff member.' 
      });
    });

    it('should handle database errors', async () => {
      req.params.staff_id = 1;
      StaffFacilityAssignment.findAll.mockRejectedValue(new Error('Database error'));

      await facilityController.getFacilitiesByStaffId(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Internal server error.' 
      });
    });
  });

  describe('createFacilityRating', () => {
    it('should create a new rating', async () => {
      req.body = { facility_id: 1, user_id: 1, rating: 4, comment: 'Good' };
      const mockRating = { 
        rating_id: 1, 
        rating: 4, 
        comment: 'Good',
        created_at: new Date()
      };
      FacilityRating.findOne.mockResolvedValue(null);
      FacilityRating.create.mockResolvedValue(mockRating);

      await facilityController.createFacilityRating(req, res);

      expect(FacilityRating.create).toHaveBeenCalledWith({
        facility_id: 1,
        user_id: 1,
        rating: 4,
        comment: 'Good'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          rating_id: 1,
          rating: 4,
          comment: 'Good'
        }),
        message: "Rating submitted successfully"
      });
    });

    it('should update existing rating', async () => {
      req.body = { facility_id: 1, user_id: 1, rating: 5, comment: 'Updated' };
      const mockRating = { 
        rating_id: 1, 
        rating: 4,
        save: jest.fn().mockResolvedValue({
          rating_id: 1,
          rating: 5,
          comment: 'Updated',
          updated_at: new Date()
        })
      };
      FacilityRating.findOne.mockResolvedValue(mockRating);

      await facilityController.createFacilityRating(req, res);

      expect(mockRating.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          rating: 5,
          comment: 'Updated'
        }),
        message: "Rating updated successfully"
      });
    });

    it('should validate rating between 1 and 5', async () => {
      req.body = { facility_id: 1, user_id: 1, rating: 6 };
      
      await facilityController.createFacilityRating(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    });

    it('should require user_id', async () => {
      req.body = { facility_id: 1, rating: 4 };
      
      await facilityController.createFacilityRating(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User ID is required"
      });
    });

    it('should handle database errors', async () => {
      req.body = { facility_id: 1, user_id: 1, rating: 4 };
      FacilityRating.findOne.mockRejectedValue(new Error('Database error'));

      await facilityController.createFacilityRating(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal server error"
      });
    });
  });

  describe('getAssignedFacilities', () => {
    it('should retrieve assigned facilities with ratings', async () => {
      req.query = {};
      const mockAssignments = [{
        Facility: {
          facility_id: 1,
          name: 'Gym',
          get: jest.fn().mockReturnValue({ facility_id: 1, name: 'Gym' }),
          dataValues: {
            average_rating: 4.5,
            rating_count: 10
          }
        }
      }];
      StaffFacilityAssignment.findAll.mockResolvedValue(mockAssignments);
      Sequelize.fn.mockImplementation((fn, col) => ({ fn, col }));
      Sequelize.col.mockImplementation(col => col);

      await facilityController.getAssignedFacilities(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalledWith({
        include: [{
          model: Facility,
          where: {},
          include: [{
            model: FacilityRating,
            attributes: [],
          }],
          attributes: {
            include: [
              [{ fn: 'AVG', col: 'FacilityRatings.rating' }, 'average_rating'],
              [{ fn: 'COUNT', col: 'FacilityRatings.rating_id' }, 'rating_count']
            ]
          },
          group: ['Facility.facility_id']
        }],
        group: ['StaffFacilityAssignment.assignment_id']
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.success([expect.objectContaining({
          name: 'Gym',
          average_rating: 4.5,
          rating_count: 10
        })], "Assigned facilities retrieved successfully")
      );
    });

    it('should filter assigned facilities by query parameters', async () => {
      req.query = { type: 'sports', status: 'open', isIndoor: 'true' };
      
      await facilityController.getAssignedFacilities(req, res);

      expect(StaffFacilityAssignment.findAll).toHaveBeenCalledWith(expect.objectContaining({
        include: [expect.objectContaining({
          where: {
            type: 'sports',
            status: 'open',
            is_indoor: true
          }
        })]
      }));
    });

    it('should return empty array if no assignments found', async () => {
      StaffFacilityAssignment.findAll.mockResolvedValue([]);

      await facilityController.getAssignedFacilities(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.success([], "No assigned facilities found")
      );
    });

    it('should handle database errors', async () => {
      StaffFacilityAssignment.findAll.mockRejectedValue(new Error('Database error'));

      await facilityController.getAssignedFacilities(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        responseFormatter.error("Internal server error")
      );
    });
  });
});