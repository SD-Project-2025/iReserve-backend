const { Sequelize } = require("sequelize")
const logger = require("../utils/logger")

const dbUrl = process.env.DB_URL
if (!dbUrl) {
  logger.error("Database URL not found in environment variables")
  process.exit(1)
}

const sequelize = new Sequelize(dbUrl, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
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
})
const testConnection = async () => {
  try {
    await sequelize.authenticate()
    logger.info("Database connection has been established successfully.")
    return true
  } catch (error) {
    logger.error("Unable to connect to the database:", error)
    return false
  }
}

// Database migration function
const migrate = async (force = false) => {
  try {
    if (force) {
      logger.info("Forcing database sync (dropping tables)...")
      await sequelize.sync({ force: true })
      logger.info("Database tables dropped and recreated successfully")
    } else {
      logger.info("Syncing database models...")
      // Use alter with caution - it might cause data loss in some cases - very fragile!!
      await sequelize.sync({
        alter: true,
        // This makes Sequelize more lenient with existing data - will keep existing data!
       
        hooks: true,
        validate: false,
      })
      logger.info("Database migration completed successfully")
    }
    return true
  } catch (error) {
    logger.error("Database migration failed:", error)
    logger.error(error.stack)
    return false
  }
}



if (process.argv[2] === "migrate") {
  const force = process.argv[3] === "--force"
  migrate(force).then(() => process.exit(0))
}

module.exports = {
  sequelize,
  testConnection,
  migrate,
}
