require("dotenv").config()
const { sequelize } = require("../config/database")
const logger = require("../utils/logger")

async function fixNullGoogleIds() {
  try {
    logger.info("Starting to fix null google_id values...")
    await sequelize.authenticate()

    // Generate random placeholder google_ids for existing users with null values
    const result = await sequelize.query(`
      UPDATE users 
      SET google_id = 'placeholder_' || user_id || '_' || floor(random() * 1000000)::text
      WHERE google_id IS NULL
    `)

    logger.info(`Fixed ${result[1].rowCount} users with null google_id values`)

    logger.info("Operation completed successfully")
    return true
  } catch (error) {
    logger.error("Failed to fix null google_id values:", error)
    return false
  } finally {
    await sequelize.close()
  }
}

if (require.main === module) {
  fixNullGoogleIds().then((success) => {
    process.exit(success ? 0 : 1)
  })
}
module.exports = fixNullGoogleIds
