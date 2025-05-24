const { getResidentNames } = require('../../../src/controllers/residentController');
const { Resident } = require('../../../src/models'); // Fixed path
const encryptionService = require('../../../src/services/encryptionService');
const responseFormatter = require('../../../src/utils/responseFormatter');

// Mock the models
jest.mock('../../../src/models', () => ({
  Resident: {
    findAll: jest.fn(),
  },
  // Add other models if needed
}));

// Mock the encryption service
jest.mock('../../../src/services/encryptionService', () => ({
  decrypt: jest.fn(),
}));

// Mock the response formatter
jest.mock('../../../src/utils/responseFormatter', () => ({
  success: jest.fn((data, message) => ({ success: true, data, message })),
  error: jest.fn((message, code) => ({ success: false, message, code })),
}));

describe('getResidentNames', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should return 400 if user_ids is not provided', async () => {
    await getResidentNames(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'User IDs array is required',
        code: 400
      })
    );
  });

  it('should return decrypted names for valid user_ids', async () => {
    req.body.user_ids = [1, 2];

    Resident.findAll.mockResolvedValue([
      { user_id: 1, name: 'encryptedName1' },
      { user_id: 2, name: 'encryptedName2' },
    ]);

    encryptionService.decrypt
      .mockReturnValueOnce('John Doe')
      .mockReturnValueOnce('Jane Smith');

    await getResidentNames(req, res);

    expect(Resident.findAll).toHaveBeenCalledWith({
      where: { user_id: { [expect.anything()]: [1, 2] } },
      attributes: ['user_id', 'name'],
    });

    expect(encryptionService.decrypt).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { 1: 'John Doe', 2: 'Jane Smith' },
        message: "Resident names retrieved successfully"
      })
    );
  });

  it('should handle decryption error gracefully', async () => {
    req.body.user_ids = [3];

    Resident.findAll.mockResolvedValue([
      { user_id: 3, name: 'badEncryptedName' },
    ]);

    encryptionService.decrypt.mockImplementation(() => {
      throw new Error('decryption failed');
    });

    await getResidentNames(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { 3: 'User 3' },
        message: "Resident names retrieved successfully"
      })
    );
  });

  it('should assign default name if user_id is not found in DB', async () => {
    req.body.user_ids = [4, 5];

    Resident.findAll.mockResolvedValue([
      { user_id: 4, name: 'encryptedName4' },
    ]);

    encryptionService.decrypt.mockReturnValueOnce('Alice');

    await getResidentNames(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          4: 'Alice',
          5: 'User 5',
        },
        message: "Resident names retrieved successfully"
      })
    );
  });

  it('should return 500 on unexpected error', async () => {
    req.body.user_ids = [6];

    Resident.findAll.mockRejectedValue(new Error('DB error'));

    await getResidentNames(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Failed to fetch resident names",
        code: 500
      })
    );
  });
});