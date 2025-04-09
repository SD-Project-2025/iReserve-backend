const crypto = require("crypto")

// Get encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const IV_LENGTH = 16 //AES Encruption block size,Do not change!it will stop working!

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not defined in environment variables")
}

/**
 * Encrypt data
 * @param {String} text - Text to encrypt
 * @returns {String} - Encrypted text
 */
exports.encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`
}

/**
 * Decrypt data
 * @param {String} text - Text to decrypt
 * @returns {String} - Decrypted text
 */
exports.decrypt = (text) => {
  const textParts = text.split(":")
  const iv = Buffer.from(textParts.shift(), "hex")
  const encryptedText = Buffer.from(textParts.join(":"), "hex")
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

module.exports = exports
