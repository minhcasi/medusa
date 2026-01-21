# Supabase Auth Provider

Supabase Authentication provider for Medusa enables seamless integration with Supabase's authentication services, supporting multiple authentication methods including email/password, OAuth providers, and magic links.

## Features

### Authentication Methods

#### Email/Password Authentication
- User registration with email and password
- Email verification support
- Password reset capability via admin API
- Duplicate user detection

#### OAuth Provider Support
- Google authentication
- GitHub authentication
- Supported providers depend on Supabase configuration
- CSRF protection via state parameter
- Automatic user identity creation/update

#### Magic Link (Passwordless)
- Email-based one-time-password (OTP) links
- Optional feature (disabled by default)
- Email redirect support
- Configurable callback URLs

### JWT Utilities
- JWT decoding without verification
- Token expiration checking with configurable buffer
- Session validation via Supabase API
- User metadata extraction (ID, email)
- Role-based access verification

## Installation

```bash
npm install @medusajs/supabase @supabase/supabase-js
```

## Configuration

### Basic Setup

```typescript
// medusa-config.ts
import { defineConfig } from "@medusajs/framework"

export default defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/supabase",
            id: "supabase",
            options: {
              url: process.env.SUPABASE_URL,
              anonKey: process.env.SUPABASE_ANON_KEY,
              auth: {
                callbackUrl: "http://localhost:9000/auth/supabase/callback",
              },
            },
          },
        ],
      },
    },
  ],
})
```

### Configuration Options

#### SupabaseAuthProviderOptions

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | string | Yes | Supabase project URL (e.g., `https://your-project.supabase.co`) |
| `anonKey` | string | Yes | Supabase anonymous/public key for client-side operations |
| `serviceRoleKey` | string | No | Service role key for admin operations (e.g., password updates). Server-side only. |
| `jwtSecret` | string | No | JWT secret for server-side token validation without API calls |
| `auth` | SupabaseAuthOptions | No | Authentication-specific configuration |

#### SupabaseAuthOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableMagicLink` | boolean | false | Enable magic link (OTP) authentication |
| `callbackUrl` | string | - | Redirect URL after OAuth or magic link authentication |

### Environment Variables

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional but recommended
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

## Usage

### Authentication Service

The Supabase Auth Provider is accessed via the authentication module:

```typescript
import { Modules } from "@medusajs/framework/utils"

// In your workflow or service
const authService = container.resolve(Modules.AUTH)
```

### Authentication Flows

#### Email/Password Login

```typescript
const response = await authService.authenticate(
  {
    body: {
      email: "user@example.com",
      password: "secure_password",
    },
  },
  authIdentityService
)

if (response.success) {
  // User authenticated successfully
  console.log("Auth identity:", response.authIdentity)
} else {
  console.error("Login failed:", response.error)
}
```

#### User Registration

```typescript
const response = await authService.register(
  {
    body: {
      email: "newuser@example.com",
      password: "secure_password",
    },
  },
  authIdentityService
)

if (response.success) {
  console.log("User registered:", response.authIdentity)
} else {
  console.error("Registration failed:", response.error)
}
```

#### OAuth Flow Initiation

```typescript
// Step 1: Initiate OAuth flow
const response = await authService.authenticate(
  {
    body: {
      provider: "google", // or "github"
      callback_url: "http://localhost:3000/auth/callback",
    },
  },
  authIdentityService
)

if (response.success) {
  // Redirect user to OAuth URL
  res.redirect(response.location)
}
```

#### OAuth Callback Handling

```typescript
// Step 2: Handle OAuth callback
const response = await authService.validateCallback(
  {
    query: {
      code: req.query.code,
      state: req.query.state,
    },
  },
  authIdentityService
)

if (response.success) {
  // User authenticated via OAuth
  console.log("OAuth user:", response.authIdentity)
}
```

#### Magic Link Authentication

```typescript
// Enable in config first: auth: { enableMagicLink: true }

// Step 1: Send magic link
const result = await authService.sendMagicLink("user@example.com")

if (result.success) {
  console.log("Magic link sent to email")
}

// Step 2: User receives email with link, clicks it
// Step 3: Handle redirect from email link (contains code)
const response = await authService.validateCallback(
  {
    query: {
      code: req.query.code,
    },
  },
  authIdentityService
)
```

#### Password Update

```typescript
const response = await authService.update(
  {
    entity_id: "user@example.com",
    password: "new_secure_password",
  },
  authIdentityService
)

if (response.success) {
  console.log("Password updated successfully")
}
```

### JWT Utilities

The package provides utilities for working with Supabase JWT tokens:

```typescript
import {
  decodeJWT,
  isTokenExpired,
  validateSession,
  extractUserId,
  extractEmail,
  hasRole,
} from "@medusajs/supabase"
import { createClient } from "@supabase/supabase-js"

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Decode JWT without verification (for extracting claims)
const payload = decodeJWT(accessToken)
console.log("User ID:", payload?.sub)
console.log("Email:", payload?.email)

// Check if token is expired (with 60-second buffer)
if (isTokenExpired(accessToken)) {
  console.log("Token is expired or expiring soon")
}

// Validate session via Supabase API (checks for revocation)
const result = await validateSession(client, accessToken)
if (result.valid) {
  console.log("Session is valid, user:", result.user)
}

// Extract specific claims
const userId = extractUserId(accessToken)
const email = extractEmail(accessToken)

// Check user role
const isAdmin = hasRole(accessToken, "admin")
```

## Auth Identity Structure

The Supabase provider stores authentication data in the following structure:

```typescript
interface AuthIdentity {
  id: string
  entity_id: string // Email for Supabase provider
  provider: "supabase"
  user_metadata: {
    supabase_user_id: string
    email: string
    email_verified: boolean
    avatar_url?: string
    full_name?: string
  }
  provider_identities: [
    {
      provider: "supabase"
      provider_metadata: {
        supabase_user_id: string
        expires_at: number
        provider: string // OAuth provider if applicable
        // Note: access_token and refresh_token are removed from responses
      }
    }
  ]
}
```

## Security Considerations

### Token Management
- Access tokens are automatically removed from response payloads
- Refresh tokens are stored securely but not exposed in API responses
- Tokens are validated server-side before use

### CSRF Protection
- OAuth flows include state parameter for CSRF protection
- State is validated during callback handling

### Password Security
- Passwords are hashed and salted by Supabase
- Passwords are never stored or logged by Medusa
- Password updates require service role key (server-side only)

### API Keys
- **anonKey**: Safe for client-side, limited permissions
- **serviceRoleKey**: Server-side only, full permissions, treat as secret
- Store all keys in environment variables, never commit to repository

## Error Handling

Common error responses:

```typescript
// Duplicate user registration
{
  success: false,
  error: "Identity with email already exists"
}

// Invalid credentials
{
  success: false,
  error: "Invalid login credentials"
}

// OAuth configuration issues
{
  success: false,
  error: "Callback URL is required for OAuth flow"
}

// Magic link not enabled
{
  success: false,
  error: "Magic link authentication is not enabled"
}

// Session validation failure
{
  success: false,
  error: "Invalid state or session expired"
}
```

## Testing

### Unit Tests
The package includes comprehensive unit tests:
- JWT decoding and expiration validation
- Authentication flows (email/password, OAuth, magic link)
- Error scenarios and edge cases
- CSRF protection validation

Run tests:
```bash
npm run test
```

### Integration Tests
Integration tests validate:
- Real Supabase API interactions
- User creation and registration flow
- Token validation and session management

Run integration tests:
```bash
npm run test:integration
```

## Troubleshooting

### Issue: "Supabase url is required"
**Solution**: Ensure `SUPABASE_URL` environment variable is set in your configuration.

### Issue: "Supabase anonKey is required"
**Solution**: Ensure `SUPABASE_ANON_KEY` environment variable is set in your configuration.

### Issue: Magic link not working
**Solution**:
1. Verify `enableMagicLink: true` is set in auth config
2. Check email configuration in Supabase dashboard
3. Verify `callbackUrl` is correctly configured

### Issue: OAuth callback fails
**Solution**:
1. Check OAuth provider configuration in Supabase dashboard
2. Verify `callbackUrl` matches provider redirect URI settings
3. Ensure state parameter is properly validated

### Issue: Password update fails
**Solution**:
1. Verify `serviceRoleKey` is provided in configuration
2. Ensure the key has admin permissions
3. Check that entity_id points to existing user

## API Reference

### SupabaseAuthService

#### Methods

##### authenticate(req, authIdentityService): Promise<AuthenticationResponse>
Authenticate user via email/password or initiate OAuth flow.

##### register(req, authIdentityService): Promise<AuthenticationResponse>
Register new user with email and password.

##### validateCallback(req, authIdentityService): Promise<AuthenticationResponse>
Handle OAuth and magic link callbacks.

##### update(data, authIdentityService): Promise<AuthenticationResponse>
Update authentication identity (e.g., password reset).

##### sendMagicLink(email): Promise<{success: boolean; error?: string}>
Send magic link for passwordless authentication.

### JWT Utilities

##### decodeJWT(token): SupabaseJWTPayload | null
Decode JWT payload without verification.

##### isTokenExpired(token, bufferSeconds?): boolean
Check if token is expired (default 60-second buffer).

##### validateSession(client, accessToken): Promise<SessionValidationResult>
Validate session via Supabase API.

##### extractUserId(token): string | null
Extract user ID from JWT.

##### extractEmail(token): string | null
Extract email from JWT.

##### hasRole(token, role): boolean
Check if user has specific role.

## Related Documentation
- [Supabase Authentication](https://supabase.com/docs/guides/auth)
- [Medusa Auth Module](../../../../../../docs/auth.md)
- [Supabase Database Provider](./database.md)
