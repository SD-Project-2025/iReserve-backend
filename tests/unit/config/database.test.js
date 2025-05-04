const { sequelize, testConnection, migrate } = require('../../../src/config/database');
const { Sequelize } = require('sequelize');
const logger = require('../../../src/utils/logger');

jest.mock('sequelize', () => {
  const mockSequelize = {
    authenticate: jest.fn(),
    sync: jest.fn(),
  };
  return {
    Sequelize: jest.fn(() => mockSequelize)
  };
});

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_URL = 'postgres://test:test@localhost:5432/test';
  });

  afterAll(() => {
    delete process.env.DB_URL;
  });

  it('should initialize Sequelize with correct configuration', () => {
    expect(Sequelize).toHaveBeenCalledWith(process.env.DB_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      sequelize.authenticate.mockResolvedValueOnce();
      const result = await testConnection();
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Database connection has been established successfully.');
    });

    it('should return false when connection fails', async () => {
      sequelize.authenticate.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await testConnection();
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Unable to connect to the database:', expect.any(Error));
    });
  });

  describe('migrate', () => {
    it('should force sync when force=true', async () => {
      sequelize.sync.mockResolvedValueOnce();
      const result = await migrate(true);
      expect(result).toBe(true);
      expect(sequelize.sync).toHaveBeenCalledWith({ force: true });
      expect(logger.info).toHaveBeenCalledWith('Database tables dropped and recreated successfully');
    });

    it('should perform alter sync when force=false', async () => {
      sequelize.sync.mockResolvedValueOnce();
      const result = await migrate(false);
      expect(result).toBe(true);
      expect(sequelize.sync).toHaveBeenCalledWith({
        alter: true,
        hooks: true,
        validate: false
      });
      expect(logger.info).toHaveBeenCalledWith('Database migration completed successfully');
    });

    it('should return false when migration fails', async () => {
      sequelize.sync.mockRejectedValueOnce(new Error('Migration failed'));
      const result = await migrate(false);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Database migration failed:', expect.any(Error));
    });
  });

  it('should exit if DB_URL is not set', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    delete process.env.DB_URL;
    require('../../../src/config/database');
    expect(logger.error).toHaveBeenCalledWith('Database URL not found in environment variables');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});