module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/config/swagger.js", "!src/utils/logger.js"],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 14,
      lines: 20,
      statements: 20,
    },
  },
  setupFilesAfterEnv: ["./tests/setup.js"],
  clearMocks: true,
  restoreMocks: true,
}
