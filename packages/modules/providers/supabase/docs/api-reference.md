# Supabase Provider - API Reference

Complete API reference for the Supabase Auth Provider and JWT utilities.

## SupabaseAuthService

The main authentication service that handles user authentication and identity management.

### Class Definition

```typescript
export class SupabaseAuthService extends AbstractAuthModuleProvider {
  static identifier: "supabase"
  static DISPLAY_NAME: "Supabase Authentication"
}
```

### Constructor

```typescript
constructor(
  dependencies: { logger: Logger },
  options: SupabaseAuthProviderOptions
)
```

**Parameters:**
- `dependencies.logger` - Logger instance for debug and error logging
- `options` - Configuration options for the auth provider

**Throws:**
- `Error` if `url` is not provided
- `Error` if `anonKey` is not provided

### Methods

#### authenticate()

Authenticate user via email/password or initiate OAuth flow.

```typescript
async authenticate(
  req: AuthenticationInput,
  authIdentityService: AuthIdentityProviderService
): Promise<AuthenticationResponse>
```

**Parameters:**

`req: AuthenticationInput`
```typescript
{
  query?: Record<string, string>    // Query parameters (OAuth errors, etc.)
  body?: {
    email?: string                   // User email
    password?: string                // User password
    provider?: string                // OAuth provider ("google", "github", etc.)
    callback_url?: string            // OAuth callback URL override
  }
}
```

`authIdentityService: AuthIdentityProviderService`
- Service for managing auth identities

**Returns:** `AuthenticationResponse`
```typescript
{
  success: boolean
  error?: string
  location?: string                  // OAuth redirect URL (if provider flow)
  authIdentity?: {
    id: string
    entity_id: string
    provider: "supabase"
    user_metadata: Record<string, unknown>
    provider_identities: Array<{
      provider: string
      provider_metadata: Record<string, unknown>
    }>
  }
}
```

**Examples:**

Email/password login:
```typescript
const response = await authService.authenticate(
  {
    body: {
      email: "user@example.com",
      password: "password123",
    },
  },
  authIdentityService
)
```

OAuth initiation:
```typescript
const response = await authService.authenticate(
  {
    body: {
      provider: "google",
      callback_url: "http://localhost:3000/auth/callback",
    },
  },
  authIdentityService
)

if (response.success && response.location) {
  res.redirect(response.location)
}
```

#### register()

Register new user with email and password.

```typescript
async register(
  req: AuthenticationInput,
  authIdentityService: AuthIdentityProviderService
): Promise<AuthenticationResponse>
```

**Parameters:**

`req: AuthenticationInput`
```typescript
{
  body: {
    email: string                    // User email (must be valid email)
    password: string                 // User password (complexity depends on Supabase config)
  }
}
```

`authIdentityService: AuthIdentityProviderService`
- Service for managing auth identities

**Returns:** `AuthenticationResponse` (with authIdentity on success)

**Error Cases:**
- `"Email should be a string"` - Email is missing or not a string
- `"Password should be a string"` - Password is missing or not a string
- `"Identity with email already exists"` - User already registered with this email
- Supabase error messages for other registration failures

**Example:**
```typescript
const response = await authService.register(
  {
    body: {
      email: "newuser@example.com",
      password: "securePassword123!",
    },
  },
  authIdentityService
)

if (response.success) {
  console.log("Registered user ID:", response.authIdentity.provider_identities[0].provider_metadata.supabase_user_id)
}
```

#### validateCallback()

Handle OAuth callbacks and magic link redirects.

```typescript
async validateCallback(
  req: AuthenticationInput,
  authIdentityService: AuthIdentityProviderService
): Promise<AuthenticationResponse>
```

**Parameters:**

`req: AuthenticationInput`
```typescript
{
  query?: {
    code?: string                    // Authorization code from Supabase
    state?: string                   // State parameter for CSRF validation
    error?: string                   // Error code (if auth failed)
    error_description?: string       // Error description
  }
  body?: {
    code?: string                    // Alternative code location
  }
}
```

`authIdentityService: AuthIdentityProviderService`
- Service for managing auth identities and state

**Returns:** `AuthenticationResponse` (with authIdentity on success)

**Error Cases:**
- `"<error_description>"` - If OAuth provider returned error
- `"Authorization code is required"` - Missing code parameter
- `"Invalid state or session expired"` - State validation failed
- Token exchange errors from Supabase

**Example:**
```typescript
// Handle OAuth callback
const response = await authService.validateCallback(
  {
    query: {
      code: req.query.code,
      state: req.query.state,
    },
  },
  authIdentityService
)

// Handle magic link callback
const magicLinkResponse = await authService.validateCallback(
  {
    query: {
      code: req.query.code, // OTP code from email link
    },
  },
  authIdentityService
)
```

#### update()

Update authentication identity (e.g., password reset).

```typescript
async update(
  data: {
    entity_id: string               // User identifier (email for Supabase)
    password?: string               // New password
    [key: string]: unknown
  },
  authIdentityService: AuthIdentityProviderService
): Promise<AuthenticationResponse>
```

**Parameters:**

`data` - Update data object
- `entity_id` (required) - Identifier for the user to update
- `password` (optional) - New password to set

`authIdentityService: AuthIdentityProviderService`
- Service for managing auth identities

**Returns:** `AuthenticationResponse` (updated authIdentity on success)

**Error Cases:**
- `"entity_id is required for update"` - entity_id not provided
- `"No Supabase user linked to this identity"` - User not found in Supabase
- `"Service role key required for password update"` - serviceRoleKey not configured
- Supabase admin API errors

**Example:**
```typescript
const response = await authService.update(
  {
    entity_id: "user@example.com",
    password: "newSecurePassword123!",
  },
  authIdentityService
)

if (response.success) {
  console.log("Password updated successfully")
}
```

#### sendMagicLink()

Send magic link (OTP) for passwordless authentication.

```typescript
async sendMagicLink(email: string): Promise<{
  success: boolean
  error?: string
}>
```

**Parameters:**
- `email` (string) - Email address to send magic link to

**Returns:**
```typescript
{
  success: boolean          // true if email sent successfully
  error?: string           // Error message if failed
}
```

**Error Cases:**
- `"Magic link authentication is not enabled"` - enableMagicLink is false in config
- Email service errors from Supabase
- Invalid email format (handled by Supabase)

**Requirements:**
- Must have `auth.enableMagicLink: true` in configuration
- Must have `callbackUrl` configured
- Supabase must have email provider configured

**Example:**
```typescript
const result = await authService.sendMagicLink("user@example.com")

if (result.success) {
  res.json({ message: "Magic link sent to email" })
} else {
  res.status(400).json({ error: result.error })
}

// After user clicks link in email, handle with validateCallback()
```

#### Static Methods

##### validateOptions()

Validate configuration options at initialization.

```typescript
static validateOptions(options: SupabaseAuthProviderOptions): void
```

**Throws:**
- `Error` if `url` is missing
- `Error` if `anonKey` is missing

Called automatically during service instantiation.

---

## JWT Utilities

Utility functions for working with Supabase JWT tokens.

### decodeJWT()

Decode JWT payload without signature verification.

```typescript
function decodeJWT(token: string): SupabaseJWTPayload | null
```

**Parameters:**
- `token` (string) - JWT access token

**Returns:** `SupabaseJWTPayload | null`
- Parsed JWT payload or null if invalid format

**⚠️ Warning:** This function does NOT verify the signature. Use only for:
- Extracting claims before validation
- Client-side processing
- When signature is verified separately

**Example:**
```typescript
const payload = decodeJWT(accessToken)
if (payload) {
  console.log("User ID:", payload.sub)
  console.log("Email:", payload.email)
  console.log("Issued At:", new Date(payload.iat * 1000))
  console.log("Expires At:", new Date(payload.exp * 1000))
}
```

### isTokenExpired()

Check if JWT token is expired.

```typescript
function isTokenExpired(token: string, bufferSeconds?: number): boolean
```

**Parameters:**
- `token` (string) - JWT access token
- `bufferSeconds` (number, optional, default: 60) - Buffer before actual expiry in seconds

**Returns:** `boolean`
- true if token is expired or will expire within buffer
- true if token is invalid or missing exp claim

**Example:**
```typescript
// Check if token is expired
if (isTokenExpired(accessToken)) {
  console.log("Token expired, refresh needed")
}

// Check with custom buffer (5 minute buffer)
if (isTokenExpired(accessToken, 300)) {
  console.log("Token expiring soon, refresh recommended")
}
```

### validateSession()

Server-side session validation via Supabase API.

```typescript
async function validateSession(
  client: SupabaseClient,
  accessToken: string
): Promise<SessionValidationResult>
```

**Parameters:**
- `client` (SupabaseClient) - Initialized Supabase client
- `accessToken` (string) - JWT access token to validate

**Returns:** `SessionValidationResult`
```typescript
{
  valid: boolean           // true if session is valid
  user?: {                 // User object (if valid)
    id: string
    email?: string
    email_confirmed_at?: string
    created_at: string
    updated_at: string
    // ... other user fields
  }
  error?: string          // Error message if invalid
}
```

**When to Use:**
- Validating tokens from API requests
- Checking if session has been revoked (user logged out)
- Critical security operations
- Don't use for every request (performance impact)

**Example:**
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const result = await validateSession(supabase, accessToken)

if (result.valid) {
  console.log("User email:", result.user?.email)
  // Process request
} else {
  console.log("Session invalid:", result.error)
  // Reject request
}
```

### extractUserId()

Extract user ID (sub claim) from JWT.

```typescript
function extractUserId(token: string): string | null
```

**Parameters:**
- `token` (string) - JWT access token

**Returns:** `string | null`
- Supabase user ID or null if invalid/missing

**Example:**
```typescript
const userId = extractUserId(accessToken)
if (userId) {
  const user = await db.users.findById(userId)
}
```

### extractEmail()

Extract email from JWT.

```typescript
function extractEmail(token: string): string | null
```

**Parameters:**
- `token` (string) - JWT access token

**Returns:** `string | null`
- Email or null if invalid/missing

**Example:**
```typescript
const email = extractEmail(accessToken)
console.log("Authenticated user:", email)
```

### hasRole()

Check if user has specific role from JWT.

```typescript
function hasRole(token: string, role: string): boolean
```

**Parameters:**
- `token` (string) - JWT access token
- `role` (string) - Role to check for

**Returns:** `boolean`
- true if user has the role

**Example:**
```typescript
if (hasRole(accessToken, "admin")) {
  // Allow admin operations
}

if (hasRole(accessToken, "moderator")) {
  // Allow moderation operations
}
```

---

## Types

### SupabaseAuthProviderOptions

Configuration options for the auth provider.

```typescript
interface SupabaseAuthProviderOptions {
  url: string                      // Required: Supabase project URL
  anonKey: string                  // Required: Supabase anon key
  serviceRoleKey?: string          // Optional: Service role key for admin ops
  jwtSecret?: string               // Optional: JWT secret for validation
  auth?: SupabaseAuthOptions
}
```

### SupabaseAuthOptions

Auth-specific configuration.

```typescript
interface SupabaseAuthOptions {
  enableMagicLink?: boolean        // Enable OTP/magic link (default: false)
  callbackUrl?: string             // OAuth/magic link callback URL
}
```

### SupabaseJWTPayload

JWT payload structure.

```typescript
interface SupabaseJWTPayload {
  aud: string                      // Audience
  exp: number                      // Expiration time (Unix timestamp)
  iat: number                      // Issued at (Unix timestamp)
  iss: string                      // Issuer
  sub: string                      // Subject (user ID)
  email?: string
  phone?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  role?: string
  aal?: string                     // Authentication Assurance Level
  amr?: Array<{                    // Authentication Methods References
    method: string
    timestamp: number
  }>
  session_id?: string
  is_anonymous?: boolean
}
```

### AuthenticationResponse

Response from authentication methods.

```typescript
interface AuthenticationResponse {
  success: boolean
  error?: string                   // Error message if failed
  location?: string                // OAuth redirect URL if applicable
  authIdentity?: {
    id: string
    entity_id: string
    provider: "supabase"
    user_metadata: Record<string, unknown>
    provider_identities: Array<{
      provider: string
      provider_metadata: Record<string, unknown>
    }>
  }
}
```

### SessionValidationResult

Result of session validation.

```typescript
interface SessionValidationResult {
  valid: boolean
  user?: any                       // Supabase user object
  error?: string
}
```

### JWTValidationResult

Result of JWT validation.

```typescript
interface JWTValidationResult {
  valid: boolean
  payload?: SupabaseJWTPayload
  error?: string
}
```

---

## Error Handling

All authentication methods return structured error responses:

```typescript
// Invalid credentials
{
  success: false,
  error: "Invalid login credentials"
}

// Missing required field
{
  success: false,
  error: "Email and password are required"
}

// User already exists
{
  success: false,
  error: "Identity with email already exists"
}

// Configuration error
{
  success: false,
  error: "Callback URL is required for OAuth flow"
}

// Feature not enabled
{
  success: false,
  error: "Magic link authentication is not enabled"
}
```

For production, always check `response.success` and handle errors gracefully:

```typescript
const response = await authService.authenticate(req, identityService)

if (!response.success) {
  logger.warn(`Auth failed: ${response.error}`)
  res.status(401).json({ error: response.error })
  return
}

// Continue with authenticated user
```

---

## Dependency Injection

The service uses constructor injection for dependencies:

```typescript
constructor(
  { logger }: InjectedDependencies,
  options: SupabaseAuthProviderOptions
)
```

**Required Dependencies:**
- `logger` - Logger instance for debug/error output

Dependencies are provided by the Medusa container during initialization.

---

## See Also

- [Auth Provider Configuration Guide](./auth-provider.md)
- [Main Documentation](./index.md)
- [Supabase JS Client](https://github.com/supabase/supabase-js)
- [JWT Standard (RFC 7519)](https://tools.ietf.org/html/rfc7519)
