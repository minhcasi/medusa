import {
  decodeJWT,
  isTokenExpired,
  extractUserId,
  extractEmail,
  hasRole,
} from "../utils/jwt-validator"

describe("JWT Validator Utilities", () => {
  // Create a valid JWT structure (header.payload.signature)
  const createMockJWT = (payload: Record<string, any>): string => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
    const signature = "mock_signature"
    return `${header}.${payloadBase64}.${signature}`
  }

  describe("decodeJWT", () => {
    it("should decode a valid JWT payload", () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: "https://project.supabase.co/auth/v1",
        aud: "authenticated",
        role: "authenticated",
      }
      const token = createMockJWT(payload)
      const decoded = decodeJWT(token)

      expect(decoded).toBeDefined()
      expect(decoded?.sub).toBe("user-123")
      expect(decoded?.email).toBe("test@example.com")
      expect(decoded?.role).toBe("authenticated")
    })

    it("should return null for invalid JWT format", () => {
      expect(decodeJWT("not-a-jwt")).toBeNull()
      expect(decodeJWT("only.two.parts.extra")).toBeNull()
      expect(decodeJWT("")).toBeNull()
    })

    it("should return null for invalid base64 payload", () => {
      const invalidToken = "valid.invalid!!!.signature"
      expect(decodeJWT(invalidToken)).toBeNull()
    })
  })

  describe("isTokenExpired", () => {
    it("should return false for valid non-expired token", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const token = createMockJWT({ exp: futureExp })

      expect(isTokenExpired(token)).toBe(false)
    })

    it("should return true for expired token", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      const token = createMockJWT({ exp: pastExp })

      expect(isTokenExpired(token)).toBe(true)
    })

    it("should return true for token expiring within buffer", () => {
      const nearExp = Math.floor(Date.now() / 1000) + 30 // 30 seconds from now
      const token = createMockJWT({ exp: nearExp })

      // Default buffer is 60 seconds
      expect(isTokenExpired(token)).toBe(true)
      // With smaller buffer should not be expired
      expect(isTokenExpired(token, 10)).toBe(false)
    })

    it("should return true for invalid token", () => {
      expect(isTokenExpired("invalid-token")).toBe(true)
    })

    it("should return true for token without exp claim", () => {
      const token = createMockJWT({ sub: "user-123" })
      expect(isTokenExpired(token)).toBe(true)
    })
  })

  describe("extractUserId", () => {
    it("should extract user ID from valid token", () => {
      const token = createMockJWT({ sub: "user-abc-123" })
      expect(extractUserId(token)).toBe("user-abc-123")
    })

    it("should return null for invalid token", () => {
      expect(extractUserId("invalid")).toBeNull()
    })

    it("should return null for token without sub claim", () => {
      const token = createMockJWT({ email: "test@example.com" })
      expect(extractUserId(token)).toBeNull()
    })
  })

  describe("extractEmail", () => {
    it("should extract email from valid token", () => {
      const token = createMockJWT({ email: "user@example.com" })
      expect(extractEmail(token)).toBe("user@example.com")
    })

    it("should return null for invalid token", () => {
      expect(extractEmail("invalid")).toBeNull()
    })

    it("should return null for token without email claim", () => {
      const token = createMockJWT({ sub: "user-123" })
      expect(extractEmail(token)).toBeNull()
    })
  })

  describe("hasRole", () => {
    it("should return true when user has the specified role", () => {
      const token = createMockJWT({ role: "admin" })
      expect(hasRole(token, "admin")).toBe(true)
    })

    it("should return false when user does not have the specified role", () => {
      const token = createMockJWT({ role: "user" })
      expect(hasRole(token, "admin")).toBe(false)
    })

    it("should return false for invalid token", () => {
      expect(hasRole("invalid", "admin")).toBe(false)
    })

    it("should return false for token without role claim", () => {
      const token = createMockJWT({ sub: "user-123" })
      expect(hasRole(token, "admin")).toBe(false)
    })
  })
})
