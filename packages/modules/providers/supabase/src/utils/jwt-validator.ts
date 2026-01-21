import { SupabaseClient } from "@supabase/supabase-js"

/**
 * JWT payload structure for Supabase tokens
 */
export interface SupabaseJWTPayload {
  aud: string
  exp: number
  iat: number
  iss: string
  sub: string
  email?: string
  phone?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  role?: string
  aal?: string
  amr?: Array<{ method: string; timestamp: number }>
  session_id?: string
  is_anonymous?: boolean
}

/**
 * Result of JWT validation
 */
export interface JWTValidationResult {
  valid: boolean
  payload?: SupabaseJWTPayload
  error?: string
}

/**
 * Result of session validation
 */
export interface SessionValidationResult {
  valid: boolean
  user?: any
  error?: string
}

/**
 * Decode a JWT without verification (for extracting claims)
 *
 * WARNING: This does NOT verify the signature. Use only for
 * extracting non-sensitive claims or when you verify separately.
 *
 * @param token - JWT access token
 * @returns Decoded payload or null if invalid format
 */
export function decodeJWT(token: string): SupabaseJWTPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      return null
    }

    const payload = Buffer.from(parts[1], "base64url").toString("utf-8")
    return JSON.parse(payload) as SupabaseJWTPayload
  } catch {
    return null
  }
}

/**
 * Check if a JWT is expired
 *
 * @param token - JWT access token
 * @param bufferSeconds - Buffer before actual expiry (default 60s)
 * @returns true if token is expired or will expire within buffer
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJWT(token)
  if (!payload?.exp) {
    return true
  }

  const expiresAt = payload.exp * 1000 // Convert to milliseconds
  const now = Date.now()
  const buffer = bufferSeconds * 1000

  return now >= expiresAt - buffer
}

/**
 * Server-side session validation using Supabase API
 *
 * This is the recommended way to validate tokens for critical operations
 * as it checks if the session has been revoked (e.g., user logged out).
 *
 * @param client - Supabase client instance
 * @param accessToken - JWT access token to validate
 * @returns Validation result with user data if valid
 */
export async function validateSession(
  client: SupabaseClient,
  accessToken: string
): Promise<SessionValidationResult> {
  try {
    const { data, error } = await client.auth.getUser(accessToken)

    if (error) {
      return { valid: false, error: error.message }
    }

    if (!data.user) {
      return { valid: false, error: "No user found for token" }
    }

    return { valid: true, user: data.user }
  } catch (error: any) {
    return { valid: false, error: error.message }
  }
}

/**
 * Extract user ID from Supabase JWT
 *
 * @param token - JWT access token
 * @returns User ID (sub claim) or null
 */
export function extractUserId(token: string): string | null {
  const payload = decodeJWT(token)
  return payload?.sub ?? null
}

/**
 * Extract email from Supabase JWT
 *
 * @param token - JWT access token
 * @returns Email or null
 */
export function extractEmail(token: string): string | null {
  const payload = decodeJWT(token)
  return payload?.email ?? null
}

/**
 * Check if user has a specific role from JWT
 *
 * @param token - JWT access token
 * @param role - Role to check for
 * @returns true if user has the role
 */
export function hasRole(token: string, role: string): boolean {
  const payload = decodeJWT(token)
  return payload?.role === role
}
