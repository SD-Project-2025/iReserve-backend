const authController = require("../../../src/controllers/authController");
const { User, Resident, Staff } = require("../../../src/models");
const encryptionService = require("../../../src/services/encryptionService");
const { OAuth2Client } = require("google-auth-library");
const responseFormatter = require("../../../src/utils/responseFormatter");
const jwt = require("jsonwebtoken");

// Mock dependencies
jest.mock("../../../src/models");
jest.mock("../../../src/services/encryptionService");
jest.mock("google-auth-library");
jest.mock("jsonwebtoken");
jest.mock("../../../src/utils/responseFormatter");

describe("Auth Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      user: {
        user_id: 1,
        user_type: "resident",
      },
      googleUser: {
        name: "Test User",
        email: "test@example.com",
        picture: "https://example.com/picture.jpg",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
    };

    next = jest.fn();

    // Reset mocks
    jest.clearAllMocks();

    // Mock responseFormatter.success
    responseFormatter.success.mockImplementation((data, message) => ({
      success: true,
      data,
      message,
    }));
  });

  describe("googleAuthRedirect", () => {
    it("should redirect to Google auth URL with resident userType by default", () => {
      authController.googleAuthRedirect(req, res);

      expect(res.redirect).toHaveBeenCalled();
      const redirectUrl = res.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain("https://accounts.google.com/o/oauth2/auth");
      expect(redirectUrl).toContain("state=");
      
      const stateParam = redirectUrl.match(/state=([^&]*)/)[1];
      const state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
      expect(JSON.parse(state)).toEqual({ userType: "resident" });
    });

    it("should include specified userType in state", () => {
      req.query.userType = "staff";
      authController.googleAuthRedirect(req, res);

      const redirectUrl = res.redirect.mock.calls[0][0];
      const stateParam = redirectUrl.match(/state=([^&]*)/)[1];
      const state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
      expect(JSON.parse(state)).toEqual({ userType: "staff" });
    });
  });

  describe("googleAuthCallback", () => {
    beforeEach(() => {
      req.query = {
        code: "auth-code",
        state: Buffer.from(JSON.stringify({ userType: "resident" })).toString("base64"),
      };

      process.env.FRONTEND_URL = "http://localhost:3000";
      process.env.JWT_SECRET = "test-secret";
    });

    it("should handle successful authentication for new resident", async () => {
      const mockPayload = {
        sub: "google123",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/picture.jpg",
      };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload),
      };

      OAuth2Client.prototype.getToken = jest.fn().mockResolvedValue({ tokens: { id_token: "id-token" } });
      OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValue(mockTicket);
      OAuth2Client.prototype.setCredentials = jest.fn();

      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue({
        user_id: 1,
        google_id: "google123",
        user_type: "resident",
        update: jest.fn(),
      });

      Resident.create = jest.fn().mockResolvedValue({});
      encryptionService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      jwt.sign.mockReturnValue("jwt-token");

      await authController.googleAuthCallback(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        google_id: "google123",
        user_type: "resident",
        status: "active",
        last_login: expect.any(Date),
      });

      expect(Resident.create).toHaveBeenCalledWith({
        user_id: 1,
        membership_type: "standard",
        name: "encrypted-Test User",
        email: "encrypted-test@example.com",
      });

      expect(res.redirect).toHaveBeenCalledWith(
        "http://localhost:3000/auth/callback?token=jwt-token&user_id=1&user_type=resident&name=Test%20User&email=test%40example.com&picture=https%3A%2F%2Fexample.com%2Fpicture.jpg"
      );
    });

    it("should handle existing user authentication", async () => {
      const mockPayload = {
        sub: "google123",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/picture.jpg",
      };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload),
      };

      OAuth2Client.prototype.getToken = jest.fn().mockResolvedValue({ tokens: { id_token: "id-token" } });
      OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValue(mockTicket);

      const mockUser = {
        user_id: 1,
        google_id: "google123",
        user_type: "resident",
        update: jest.fn(),
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      Resident.findOne = jest.fn().mockResolvedValue({
        user_id: 1,
        update: jest.fn(),
      });
      jwt.sign.mockReturnValue("jwt-token");

      await authController.googleAuthCallback(req, res, next);

      expect(mockUser.update).toHaveBeenCalledWith({ last_login: expect.any(Date) });
      expect(res.redirect).toHaveBeenCalled();
    });

    it("should redirect to access denied for suspended user", async () => {
      const mockPayload = {
        sub: "google123",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/picture.jpg",
      };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload),
      };

      OAuth2Client.prototype.getToken = jest.fn().mockResolvedValue({ tokens: { id_token: "id-token" } });
      OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValue(mockTicket);

      const mockUser = {
        user_id: 1,
        google_id: "google123",
        user_type: "resident",
        status: "suspended",
        update: jest.fn(),
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      await authController.googleAuthCallback(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith("http://localhost:3000/access/denied");
    });

    it("should return 400 if code is missing", async () => {
      req.query.code = undefined;
      await authController.googleAuthCallback(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Authorization code is required",
      });
    });

    it("should handle staff account creation attempt", async () => {
      req.query.state = Buffer.from(JSON.stringify({ userType: "staff" })).toString("base64");

      const mockPayload = {
        sub: "google123",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/picture.jpg",
      };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload),
      };

      OAuth2Client.prototype.getToken = jest.fn().mockResolvedValue({ tokens: { id_token: "id-token" } });
      OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValue(mockTicket);

      User.findOne = jest.fn().mockResolvedValue(null);

      await authController.googleAuthCallback(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Staff accounts cannot be created via Google authentication",
      });
    });
  });

  describe("googleAuth", () => {
    it("should authenticate a user with Google token", async () => {
      const mockPayload = {
        sub: "google123",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/picture.jpg",
      };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload),
      };

      OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValue(mockTicket);

      User.findOne = jest.fn().mockResolvedValue({
        user_id: 1,
        google_id: "google123",
        user_type: "resident",
        update: jest.fn().mockResolvedValue(true),
      });

      Resident.findOne = jest.fn().mockResolvedValue({
        user_id: 1,
        update: jest.fn(),
      });

      req.body = {
        token: "valid-token",
        userType: "resident",
      };

      jwt.sign.mockReturnValue("jwt-token");

      await authController.googleAuth(req, res);

      expect(OAuth2Client.prototype.verifyIdToken).toHaveBeenCalledWith({
        idToken: "valid-token",
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      expect(User.findOne).toHaveBeenCalledWith({
        where: { google_id: "google123" },
      });

      expect(responseFormatter.success).toHaveBeenCalledWith(
        {
          token: "jwt-token",
          user: {
            id: 1,
            type: "resident",
            name: "Test User",
            email: "test@example.com",
            picture: "https://example.com/picture.jpg",
          },
        },
        "Authentication successful",
      );
    });

    it("should reject staff account creation", async () => {
      const mockPayload = {
        sub: "google123",
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/picture.jpg",
      };

      const mockTicket = {
        getPayload: jest.fn().mockReturnValue(mockPayload),
      };

      OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValue(mockTicket);

      User.findOne = jest.fn().mockResolvedValue(null);

      req.body = {
        token: "valid-token",
        userType: "staff",
      };

      await authController.googleAuth(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Staff accounts cannot be created via Google authentication",
      });
    });
  });

  describe("getMe", () => {
    it("should return resident profile", async () => {
      User.findByPk = jest.fn().mockResolvedValue({
        user_id: 1,
        google_id: "google123",
        user_type: "resident",
        status: "active",
      });

      Resident.findOne = jest.fn().mockResolvedValue({
        user_id: 1,
        name: "encrypted-name",
        email: "encrypted-email",
        get: jest.fn().mockReturnValue({
          user_id: 1,
          name: "encrypted-name",
          email: "encrypted-email",
        }),
      });

      encryptionService.decrypt.mockImplementation((val) => val.replace("encrypted-", ""));

      await authController.getMe(req, res);

      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(Resident.findOne).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(encryptionService.decrypt).toHaveBeenCalledTimes(2);
      expect(responseFormatter.success).toHaveBeenCalledWith(
        {
          id: 1,
          googleId: "google123",
          type: "resident",
          status: "active",
          profile: {
            user_id: 1,
            name: "name",
            email: "email",
          },
          picture: "https://example.com/picture.jpg",
        },
        "User profile retrieved successfully",
      );
    });

    it("should return staff profile", async () => {
      req.user.user_type = "staff";
      User.findByPk = jest.fn().mockResolvedValue({
        user_id: 1,
        google_id: "google123",
        user_type: "staff",
        status: "active",
      });

      Staff.findOne = jest.fn().mockResolvedValue({
        user_id: 1,
        name: "encrypted-name",
        email: "encrypted-email",
        get: jest.fn().mockReturnValue({
          user_id: 1,
          name: "encrypted-name",
          email: "encrypted-email",
        }),
      });

      encryptionService.decrypt.mockImplementation((val) => val.replace("encrypted-", ""));

      await authController.getMe(req, res);

      expect(Staff.findOne).toHaveBeenCalledWith({ where: { user_id: 1 } });
    });

    it("should return 404 if user not found", async () => {
      User.findByPk = jest.fn().mockResolvedValue(null);

      await authController.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
    });
  });

  describe("updateAddress", () => {
    it("should update resident address", async () => {
      Resident.findOne = jest.fn().mockResolvedValue({
        resident_id: 1,
        user_id: 1,
        update: jest.fn().mockResolvedValue(true),
      });

      encryptionService.encrypt = jest.fn().mockReturnValue("encrypted-address");

      req.body = {
        address: "123 Main St",
      };

      await authController.updateAddress(req, res);

      expect(encryptionService.encrypt).toHaveBeenCalledWith("123 Main St");
      expect(Resident.findOne).toHaveBeenCalledWith({
        where: { user_id: 1 },
      });

      expect(responseFormatter.success).toHaveBeenCalledWith(
        null,
        "Address updated successfully",
      );
    });

    it("should return 403 if user is not a resident", async () => {
      req.user.user_type = "staff";

      await authController.updateAddress(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Only residents can update address",
      });
    });

    it("should return 404 if resident profile not found", async () => {
      Resident.findOne = jest.fn().mockResolvedValue(null);

      await authController.updateAddress(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Resident profile not found",
      });
    });
  });

  describe("logout", () => {
    it("should return success message", async () => {
      await authController.logout(req, res);

      expect(responseFormatter.success).toHaveBeenCalledWith(
        null,
        "Logged out successfully",
      );
    });
  });
});