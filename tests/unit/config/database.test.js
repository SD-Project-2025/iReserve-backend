const path = '../../../src/config/database'
jest.resetModules(); // Important to ensure reloading fresh copy for each test

describe('Database Configuration', () => {
  const mockSequelizeInstance = {
    authenticate: jest.fn(),
    sync: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    process.env.DB_URL = 'postgres://test:test@localhost:5432/test';
    process.env.NODE_ENV = 'production';

    jest.mock('sequelize', () => ({
      Sequelize: jest.fn(() => mockSequelizeInstance),
    }));

    jest.mock('../../../src/utils/logger', () => ({
      error: jest.fn(),
      info: jest.fn(),
    }));

    // Clear require cache to re-evaluate environment variables
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('/database.js')) delete require.cache[key];
    });
  });

  afterEach(() => {
    delete process.env.DB_URL;
    delete process.env.NODE_ENV;
    jest.clearAllMocks();
  });

  it('should initialize Sequelize with correct configuration', () => {
    const { Sequelize } = require('sequelize');
    require(path); // Load after mocks
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

  it('should enable logging in development mode', () => {
    process.env.NODE_ENV = 'development';
    const { Sequelize } = require('sequelize');
    require(path);
    expect(Sequelize).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      logging: expect.any(Function),
    }));
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      const logger = require('../../../src/utils/logger');
      const { testConnection } = require(path);
      mockSequelizeInstance.authenticate.mockResolvedValueOnce();

      const result = await testConnection();

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Database connection has been established successfully.');
    });

    it('should return false when connection fails', async () => {
      const logger = require('../../../src/utils/logger');
      const { testConnection } = require(path);
      mockSequelizeInstance.authenticate.mockRejectedValueOnce(new Error('Failed'));

      const result = await testConnection();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Unable to connect to the database:', expect.any(Error));
    });
  });

  describe('migrate', () => {
    it('should force sync when force = true', async () => {
      const logger = require('../../../src/utils/logger');
      const { migrate } = require(path);
      mockSequelizeInstance.sync.mockResolvedValueOnce();

      const result = await migrate(true);

      expect(result).toBe(true);
      expect(mockSequelizeInstance.sync).toHaveBeenCalledWith({ force: true });
      expect(logger.info).toHaveBeenCalledWith('Database tables dropped and recreated successfully');
    });

    it('should alter sync when force = false', async () => {
      const logger = require('../../../src/utils/logger');
      const { migrate } = require(path);
      mockSequelizeInstance.sync.mockResolvedValueOnce();

      const result = await migrate(false);

      expect(result).toBe(true);
      expect(mockSequelizeInstance.sync).toHaveBeenCalledWith({
        alter: true,
        hooks: true,
        validate: false,
      });
      expect(logger.info).toHaveBeenCalledWith('Database migration completed successfully');
    });

    it('should return false on migration failure', async () => {
      const logger = require('../../../src/utils/logger');
      const { migrate } = require(path);
      mockSequelizeInstance.sync.mockRejectedValueOnce(new Error('Sync failed'));

      const result = await migrate(false);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Database migration failed:', expect.any(Error));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error: Sync failed'));
    });
  });

  it('should exit if DB_URL is not set', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const logger = require('../../../src/utils/logger');

    delete process.env.DB_URL;

    // Clear cache again to reload module with missing DB_URL
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('/database.js')) delete require.cache[key];
    });

    require(path);

    expect(logger.error).toHaveBeenCalledWith('Database URL not found in environment variables');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  it('should not run migration when no CLI argument is given', () => {
    const logger = require('../../../src/utils/logger');
    process.argv = ['node', 'script.js'];
    require(path);
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Syncing'));
  });
});
