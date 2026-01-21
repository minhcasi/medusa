import { SupabaseAuthService } from "../services/supabase-auth"
import { SupabaseAuthProviderOptions } from "../types"

// Mock @supabase/supabase-js
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    signInWithOAuth: jest.fn(),
    signInWithOtp: jest.fn(),
    getUser: jest.fn(),
    admin: {
      updateUserById: jest.fn(),
    },
  },
}

// Mock auth identity service
const mockAuthIdentityService = {
  create: jest.fn(),
  retrieve: jest.fn(),
  update: jest.fn(),
  setState: jest.fn(),
  getState: jest.fn(),
}

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

const defaultOptions: SupabaseAuthProviderOptions = {
  url: "https://test-project.supabase.co",
  anonKey: "test-anon-key",
  auth: {
    callbackUrl: "http://localhost:9000/auth/supabase/callback",
  },
}

describe("SupabaseAuthService", () => {
  let authService: SupabaseAuthService

  beforeEach(() => {
    jest.clearAllMocks()
    authService = new SupabaseAuthService(
      { logger: mockLogger as any },
      defaultOptions
    )
  })

  describe("validateOptions", () => {
    it("should throw error if url is missing", () => {
      expect(() => {
        SupabaseAuthService.validateOptions({ anonKey: "key" } as any)
      }).toThrow("Supabase url is required")
    })

    it("should throw error if anonKey is missing", () => {
      expect(() => {
        SupabaseAuthService.validateOptions({
          url: "https://test.supabase.co",
        } as any)
      }).toThrow("Supabase anonKey is required")
    })

    it("should not throw for valid options", () => {
      expect(() => {
        SupabaseAuthService.validateOptions(defaultOptions)
      }).not.toThrow()
    })
  })

  describe("authenticate", () => {
    it("should authenticate with email and password", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        user_metadata: {},
        app_metadata: {},
      }
      const mockSession = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: 1234567890,
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      mockAuthIdentityService.update.mockRejectedValue({
        type: "not_found",
      })
      mockAuthIdentityService.create.mockResolvedValue({
        entity_id: "test@example.com",
        provider_identities: [],
      })

      const result = await authService.authenticate(
        {
          body: { email: "test@example.com", password: "password123" },
        } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      })
    })

    it("should return error when email is missing", async () => {
      const result = await authService.authenticate(
        { body: { password: "password123" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Email and password are required")
    })

    it("should return error when password is missing", async () => {
      const result = await authService.authenticate(
        { body: { email: "test@example.com" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Email and password are required")
    })

    it("should return error on Supabase authentication failure", async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      })

      const result = await authService.authenticate(
        { body: { email: "test@example.com", password: "wrong" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid login credentials")
    })

    it("should initiate OAuth flow when provider is specified", async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: "https://supabase.co/oauth/google" },
        error: null,
      })

      const result = await authService.authenticate(
        {
          body: {
            provider: "google",
            callback_url: "http://localhost:9000/callback",
          },
        } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(true)
      expect(result.location).toBeDefined()
      expect(mockAuthIdentityService.setState).toHaveBeenCalled()
    })

    it("should handle OAuth error in query params", async () => {
      const result = await authService.authenticate(
        {
          query: {
            error: "access_denied",
            error_description: "User denied access",
          },
        } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("User denied access")
    })
  })

  describe("register", () => {
    it("should register new user with email and password", async () => {
      const mockUser = {
        id: "new-user-123",
        email: "new@example.com",
        email_confirmed_at: null,
      }

      mockAuthIdentityService.retrieve.mockRejectedValue({
        type: "not_found",
      })
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })
      mockAuthIdentityService.create.mockResolvedValue({
        entity_id: "new@example.com",
        provider_identities: [{ provider: "supabase", provider_metadata: {} }],
      })

      const result = await authService.register(
        { body: { email: "new@example.com", password: "password123" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: {
          emailRedirectTo: "http://localhost:9000/auth/supabase/callback",
        },
      })
    })

    it("should return error if user already exists", async () => {
      mockAuthIdentityService.retrieve.mockResolvedValue({
        entity_id: "existing@example.com",
      })

      const result = await authService.register(
        { body: { email: "existing@example.com", password: "password123" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Identity with email already exists")
    })

    it("should return error for invalid email", async () => {
      const result = await authService.register(
        { body: { password: "password123" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Email should be a string")
    })

    it("should return error for invalid password", async () => {
      const result = await authService.register(
        { body: { email: "test@example.com" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Password should be a string")
    })
  })

  describe("validateCallback", () => {
    it("should exchange code for session and create identity", async () => {
      const mockUser = {
        id: "user-123",
        email: "oauth@example.com",
        user_metadata: { full_name: "Test User" },
        app_metadata: { provider: "google" },
      }
      const mockSession = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: 1234567890,
      }

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      mockAuthIdentityService.getState.mockResolvedValue({
        callback_url: "http://localhost:9000/callback",
      })
      mockAuthIdentityService.update.mockRejectedValue({
        type: "not_found",
      })
      mockAuthIdentityService.create.mockResolvedValue({
        entity_id: "oauth@example.com",
        provider_identities: [],
      })

      const result = await authService.validateCallback(
        { query: { code: "auth-code", state: "state-key" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith(
        "auth-code"
      )
    })

    it("should return error when code is missing", async () => {
      const result = await authService.validateCallback(
        { query: {} } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Authorization code is required")
    })

    it("should return error when state is invalid", async () => {
      mockAuthIdentityService.getState.mockResolvedValue(null)

      const result = await authService.validateCallback(
        { query: { code: "auth-code", state: "invalid-state" } } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid state or session expired")
    })

    it("should handle OAuth error in callback", async () => {
      const result = await authService.validateCallback(
        {
          query: {
            error: "server_error",
            error_description: "Something went wrong",
          },
        } as any,
        mockAuthIdentityService as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Something went wrong")
    })
  })

  describe("sendMagicLink", () => {
    it("should send magic link when enabled", async () => {
      const serviceWithMagicLink = new SupabaseAuthService(
        { logger: mockLogger as any },
        {
          ...defaultOptions,
          auth: { ...defaultOptions.auth, enableMagicLink: true },
        }
      )

      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await serviceWithMagicLink.sendMagicLink("test@example.com")

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        options: {
          emailRedirectTo: "http://localhost:9000/auth/supabase/callback",
        },
      })
    })

    it("should return error when magic link is disabled", async () => {
      const result = await authService.sendMagicLink("test@example.com")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Magic link authentication is not enabled")
    })
  })

  describe("static properties", () => {
    it("should have correct identifier", () => {
      expect(SupabaseAuthService.identifier).toBe("supabase")
    })

    it("should have correct display name", () => {
      expect(SupabaseAuthService.DISPLAY_NAME).toBe("Supabase Authentication")
    })
  })
})
