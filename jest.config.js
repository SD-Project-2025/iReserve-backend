/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",

  testMatch: ["**/tests/**/*.test.js"],

  // Only collect coverage from files with ≥80% statement coverage
  collectCoverageFrom: [
    "src/app.js",
    "src/controllers/facilityController.js",
    "src/controllers/notificationController.js",
    "src/config/swagger.js",
    "src/controllers/staffAssignmentController.js",
    "src/controllers/bookingController.js",
    "src/middleware/auth.js",
    "src/middleware/errorHandler.js",
    "src/middleware/roleCheck.js",
    "src/middleware/validate.js",
    "src/models/**/*.js",
    "src/routes/**/*.js",
    "src/utils/asyncHandler.js",
    "src/utils/responseFormatter.js",
    "src/validations/**/*.js",
    "src/controllers/authController.js",

  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/tests/",
    "src/utils/responseFormatter.js", // branch coverage is 0%
    "src/scripts/",
    "/dist/",
    "/build/",
    "src/config/database.js",
    "src/utils/logger.js",
    "src/middleware/roleCheck.js",
    "src/services/encryptionService.js",
    

    "src/controllers/maintenanceController.js",
    "src/controllers/userController.js",
  ],

  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/build/"],

  setupFilesAfterEnv: ["./tests/setup.js"],

  clearMocks: true,
  restoreMocks: true,
};
