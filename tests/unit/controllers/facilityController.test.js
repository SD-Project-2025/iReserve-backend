const facilityController = require('../../../src/controllers/facilityController');
const { Facility, StaffFacilityAssignment, Staff } = require('../../../src/models');

// Mock the models
jest.mock('../../../src/models', () => ({
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
  }
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

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getFacilities', () => {
    it('should retrieve all facilities with no filters', async () => {
      const mockFacilities = [{ name: 'Gym' }, { name: 'Pool' }];
      Facility.findAll.mockResolvedValue(mockFacilities);

      await facilityController.getFacilities(req, res);

      expect(Facility.findAll).toHaveBeenCalledWith({
        where: {},
        order: [['name', 'ASC']]
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFacilities,
        message: 'Facilities retrieved successfully'
      });
    });

    it('should filter facilities by type, status and isIndoor', async () => {
      req.query = { type: 'sports', status: 'open', isIndoor: 'true' };
      const mockFacilities = [{ name: 'Indoor Basketball Court' }];
      Facility.findAll.mockResolvedValue(mockFacilities);

      await facilityController.getFacilities(req, res);

      expect(Facility.findAll).toHaveBeenCalledWith({
        where: {
          type: 'sports',
          status: 'open',
          is_indoor: true
        },
        order: [['name', 'ASC']]
      });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: mockFacilities
      }));
    });
  });

  describe('getFacility', () => {
    it('should retrieve a single facility', async () => {
      req.params.id = 1;
      const mockFacility = { facility_id: 1, name: 'Main Gym' };
      Facility.findByPk.mockResolvedValue(mockFacility);

      await facilityController.getFacility(req, res);

      expect(Facility.findByPk).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFacility,
        message: 'Facility retrieved successfully'
      });
    });

    it('should return 404 if facility not found', async () => {
      req.params.id = 999;
      Facility.findByPk.mockResolvedValue(null);

      await facilityController.getFacility(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Facility not found'
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
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFacility,
        message: 'Facility created successfully'
      });
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

      expect(Facility.findByPk).toHaveBeenCalledWith(1);
      expect(mockFacility.update).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: 'Facility updated successfully'
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

      expect(Facility.findByPk).toHaveBeenCalledWith(1);
      expect(mockFacility.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Facility deleted successfully'
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
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAssignment,
        message: 'Staff assigned to facility successfully'
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
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAssignments,
        message: 'Assigned staff retrieved successfully'
      });
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

    it('should handle errors and return 500', async () => {
      req.params.staff_id = 1;
      StaffFacilityAssignment.findAll.mockRejectedValue(new Error('Database error'));

      await facilityController.getFacilitiesByStaffId(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Internal server error.' 
      });
    });
  });
});