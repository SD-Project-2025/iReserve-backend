const { protect, restrictTo, verifyGoogleAuth } = require("../../../src/middleware/auth")
const { User } = require("../../../src/models")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")

jest.mock("../../../src/models")
jest.mock("jsonwebtoken")
jest.mock("google-auth-library", () => {
  const mockVerifyIdToken = jest.fn()
  const mockClient = {
    verifyIdToken: mockVerifyIdToken,
  }
  return {
    OAuth2Client: jest.fn(() => mockClient),
  }
})

describe("Auth Middleware", () => {
  let req, res, next

  beforeEach(() => {
    req = {
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {},
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()

    jest.clearAllMocks()
  })

  describe("protect", () => {
    it("calls next if token and user are valid", async () => {
      jwt.verify.mockReturnValue({ id: 1 })
      User.findByPk.mockResolvedValue({ user_id: 1, user_type: "resident" })

      await protect(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith("valid-token", process.env.JWT_SECRET)
      expect(User.findByPk).toHaveBeenCalledWith(1)
      expect(req.user).toEqual({ user_id: 1, user_type: "resident" })
      expect(next).toHaveBeenCalled()
    })

    it("returns 401 if token not present", async () => {
      req.headers.authorization = undefined

      await protect(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Please log in to access this resource",
        })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it("returns 401 if token is invalid", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token")
      })

      await protect(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid or expired token",
        })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it("returns 401 if user not found", async () => {
      jwt.verify.mockReturnValue({ id: 99 })
      User.findByPk.mockResolvedValue(null)

      await protect(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "The user belonging to this token no longer exists",
        })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe("restrictTo", () => {
    it("calls next if user type is allowed", () => {
      req.user = { user_type: "admin" }
      const middleware = restrictTo("admin", "staff")

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it("returns 403 if user type is not allowed", () => {
      req.user = { user_type: "resident" }
      const middleware = restrictTo("admin", "staff")

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "You do not have permission to perform this action",
        })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe("verifyGoogleAuth", () => {
    it("calls next if Google token is valid", async () => {
      const mockPayload = { email: "test@example.com" }
      const mockVerifyIdToken = OAuth2Client().verifyIdToken
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      })

      req.body.token = "valid-google-token"

      await verifyGoogleAuth(req, res, next)

      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: "valid-google-token",
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      expect(req.googleUser).toEqual(mockPayload)
      expect(next).toHaveBeenCalled()
    })

    it("returns 400 if no token provided", async () => {
      req.body.token = undefined

      await verifyGoogleAuth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Google token is required",
        })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it("returns 401 if token is invalid", async () => {
      const mockVerifyIdToken = OAuth2Client().verifyIdToken
      mockVerifyIdToken.mockImplementation(() => {
        throw new Error("Invalid token")
      })

      req.body.token = "invalid-token"

      await verifyGoogleAuth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Google token",
        })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })
})
