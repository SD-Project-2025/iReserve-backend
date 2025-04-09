require("dotenv").config()
const app = require("./src/app")
const logger = require("./src/utils/logger")
const { testConnection, migrate } = require("./src/config/database")
const routes = require("./src/routes")


const PORT = process.env.PORT || 3000

// Test database connection before starting server
;(async () => {
  const isConnected = await testConnection()

  if (!isConnected) {
    logger.error("Failed to connect to database. Exiting application.")
    process.exit(1)
  }

  // Run database migrations
  const autoMigrate = process.env.AUTO_MIGRATE === "true"
  const forceMigrate = process.env.FORCE_MIGRATE === "true"

  if (autoMigrate) {
    logger.info("Auto-migration enabled. Checking database schema...")
    const migrationSuccess = await migrate(forceMigrate)

    if (!migrationSuccess) {
      logger.error("Database migration failed. Exiting application.")
      process.exit(1)
    }
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`)
  })

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    logger.error("UNHANDLED REJECTION! Shutting down...", err)
    server.close(() => {
      process.exit(1)
    })
  })

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    logger.error("UNCAUGHT EXCEPTION! Shutting down...", err)
    process.exit(1)
  })
})()
