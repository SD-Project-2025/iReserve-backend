// tests/unit/services/encryptionService.test.js

const crypto = require("crypto");

describe("encryptionService", () => {
  let encryptionService;
  const ORIGINAL_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Set a fixed 32-byte encryption key (AES-256 requires 32 bytes)
    // We use a Buffer from a hex string (slice to 32 chars for safety)
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex").slice(0, 32);

    // Clear the Node.js module cache to reload with new env variable
    jest.resetModules();

    // Import the module fresh, now that ENCRYPTION_KEY is set
    encryptionService = require("../../../src/services/encryptionService");
  });

  afterAll(() => {
    // Restore original environment variable after all tests
    process.env.ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY;
  });

  describe("encrypt()", () => {
    it("should encrypt a string and return iv:encryptedText format", () => {
      const text = "Hello World!";
      const encrypted = encryptionService.encrypt(text);

      expect(typeof encrypted).toBe("string");
      expect(encrypted).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/); // iv (16 bytes = 32 hex chars) and ciphertext hex format separated by colon
    });
  });

  describe("decrypt()", () => {
    it("should decrypt the encrypted text and return the original string", () => {
      const originalText = "Secret message 123";

      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it("should throw an error if input format is invalid", () => {
      const badInput = "not-a-valid-encrypted-string";

      expect(() => encryptionService.decrypt(badInput)).toThrow();
    });

    it("should throw an error if encrypted data is tampered with", () => {
      const originalText = "Another secret";
      const encrypted = encryptionService.encrypt(originalText);

      // Tamper with encrypted string by changing last two hex chars
      const tampered = encrypted.slice(0, -2) + "00";

      expect(() => encryptionService.decrypt(tampered)).toThrow();
    });
  });
});

describe("encryptionService environment variable validation", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
    jest.resetModules();
  });

  it("should throw an error if ENCRYPTION_KEY is not defined", () => {
    process.env.ENCRYPTION_KEY = "";

    expect(() => {
      jest.resetModules();
      require("../../../src/services/encryptionService");
    }).toThrow("ENCRYPTION_KEY is not defined in environment variables");
  });
});
