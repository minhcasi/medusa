# Supabase Auth Provider - Quick Reference

Fast reference guide for common tasks and API usage.

## Installation & Setup

```bash
npm install @medusajs/supabase @supabase/supabase-js
```

## Configuration

```typescript
// medusa-config.ts
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

## Common Tasks

### Login with Email/Password

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

if (response.success) {
  console.log("Logged in successfully")
}
```

### Register New User

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
  console.log("User registered")
}
```

### OAuth Login (Step 1: Initiate)

```typescript
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
  res.redirect(response.location)
}
```

### OAuth Callback (Step 2: Handle)

```typescript
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
  console.log("OAuth user authenticated")
}
```

### Send Magic Link

```typescript
// First, enable in config: auth: { enableMagicLink: true }

const result = await authService.sendMagicLink("user@example.com")

if (result.success) {
  console.log("Magic link sent to email")
}
```

### Update Password

```typescript
const response = await authService.update(
  {
    entity_id: "user@example.com",
    password: "newPassword123!",
  },
  authIdentityService
)

if (response.success) {
  console.log("Password updated")
}
```

## JWT Utilities

```typescript
import {
  decodeJWT,
  isTokenExpired,
  validateSession,
  extractUserId,
  extractEmail,
  hasRole,
} from "@medusajs/supabase"

// Decode token
const payload = decodeJWT(token)

// Check expiration
if (isTokenExpired(token)) {
  // Refresh or re-authenticate
}

// Validate server-side
const result = await validateSession(client, token)

// Extract claims
const userId = extractUserId(token)
const email = extractEmail(token)

// Check role
if (hasRole(token, "admin")) {
  // Admin operations
}
```

## Authentication Response Structure

```typescript
// Success response
{
  success: true,
  authIdentity: {
    id: "auth-id",
    entity_id: "user@example.com",
    provider: "supabase",
    user_metadata: {
      supabase_user_id: "...",
      email: "user@example.com",
      email_verified: true,
      avatar_url: "...",
      full_name: "..."
    },
    provider_identities: [...]
  }
}

// Error response
{
  success: false,
  error: "Error message"
}

// OAuth redirect
{
  success: true,
  location: "https://oauth-provider/authorize?..."
}
```

## Configuration Options

| Option | Type | Required | Example |
|--------|------|----------|---------|
| `url` | string | Yes | `https://your-project.supabase.co` |
| `anonKey` | string | Yes | Your Supabase anon key |
| `serviceRoleKey` | string | No | Your service role key |
| `jwtSecret` | string | No | Your JWT secret |
| `auth.enableMagicLink` | boolean | No | `true` or `false` |
| `auth.callbackUrl` | string | No | `http://localhost:9000/callback` |

## Error Handling

```typescript
try {
  const response = await authService.authenticate(req, identityService)

  if (!response.success) {
    // Handle specific errors
    switch (response.error) {
      case "Invalid login credentials":
        res.status(401).json({ error: "Invalid email or password" })
        break
      case "Identity with email already exists":
        res.status(409).json({ error: "User already registered" })
        break
      default:
        res.status(500).json({ error: response.error })
    }
    return
  }

  // Process authenticated user
  res.json({ success: true, user: response.authIdentity })
} catch (error) {
  res.status(500).json({ error: "Unexpected error" })
}
```

## Environment Variables

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# Optional
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret-key
```

## JWT Token Claims

```typescript
const payload = decodeJWT(token)

// Always present
payload.sub              // User ID
payload.aud              // Audience
payload.iat              // Issued at (Unix timestamp)
payload.exp              // Expiration (Unix timestamp)
payload.iss              // Issuer

// Usually present
payload.email            // User email
payload.email_confirmed_at  // Email verification time
payload.role             // User role
payload.app_metadata     // App-specific metadata
payload.user_metadata    // User-specific metadata

// OAuth only
payload.provider         // OAuth provider name
payload.aal              // Authentication Assurance Level
payload.amr              // Authentication Methods References
```

## Testing Authentication

```typescript
// Test login
const loginRes = await authService.authenticate(
  { body: { email: "test@example.com", password: "test123" } },
  authIdentityService
)
expect(loginRes.success).toBe(true)

// Test registration
const regRes = await authService.register(
  { body: { email: "new@example.com", password: "secure123" } },
  authIdentityService
)
expect(regRes.success).toBe(true)

// Test duplicate registration
const dupRes = await authService.register(
  { body: { email: "new@example.com", password: "another123" } },
  authIdentityService
)
expect(dupRes.success).toBe(false)
expect(dupRes.error).toContain("already exists")
```

## Troubleshooting Checklist

- [ ] Is `SUPABASE_URL` set and valid?
- [ ] Is `SUPABASE_ANON_KEY` set?
- [ ] For OAuth: Is `callbackUrl` configured?
- [ ] For OAuth: Is provider configured in Supabase dashboard?
- [ ] For magic link: Is `enableMagicLink: true` set?
- [ ] For password updates: Is `serviceRoleKey` provided?
- [ ] Are credentials correctly formatted (email, password)?
- [ ] Is the user already registered (for login)?
- [ ] Is email verification required before login?

## Provider Identifiers

Use these provider names in `authenticate()` body:
- `"google"` - Google OAuth
- `"github"` - GitHub OAuth
- `"discord"` - Discord OAuth (if configured)
- `"facebook"` - Facebook OAuth (if configured)
- `"email"` or omit - Email/password (default)

Check your Supabase dashboard for full list of available providers.

## API Endpoints Pattern

```typescript
// Authentication endpoint
POST /auth/supabase/authenticate
Body: { email: string, password: string } | { provider: string }

// Registration endpoint
POST /auth/supabase/register
Body: { email: string, password: string }

// OAuth callback
GET /auth/supabase/callback?code=...&state=...

// Magic link
POST /auth/supabase/magic-link
Body: { email: string }

// Password reset
PUT /auth/supabase/password
Body: { entity_id: string, password: string }
```

## Type Imports

```typescript
import {
  SupabaseAuthProviderOptions,
  SupabaseAuthOptions,
  SupabaseJWTPayload,
  JWTValidationResult,
  SessionValidationResult,
} from "@medusajs/supabase"
```

## Service Imports

```typescript
import { SupabaseAuthService } from "@medusajs/supabase"

// Or access via DI container
const authService = container.resolve(Modules.AUTH)
```

## Debug Logging

Enable debug logs to troubleshoot:

```typescript
// Check logs for auth operations
// Format: [supabase-auth] <operation> <result>
// Examples:
// [supabase-auth] Login failed: Invalid login credentials
// [supabase-auth] Registration failed: User already exists
// [supabase-auth] Token exchange failed: Invalid code
```

## Quick Comparison: Auth Methods

| Method | Setup Effort | User Experience | Best For |
|--------|--------------|-----------------|----------|
| Email/Password | Low | Direct login | Registered users |
| OAuth (Google/GitHub) | Medium | 1-click login | Web/mobile apps |
| Magic Link | Medium | Link in email | Users without passwords |

## Performance Tips

1. **Cache token validation**: Store decoded payload locally
2. **Use buffers**: Give 60-second buffer before token expires
3. **Batch operations**: Combine identity checks when possible
4. **Lazy load**: Only validate sessions when critical
5. **Monitor rate limits**: Track Supabase API quotas

## Security Best Practices

1. ✅ Always use `https://` for callback URLs
2. ✅ Store keys in environment variables only
3. ✅ Never log tokens or passwords
4. ✅ Validate state parameter on OAuth callback
5. ✅ Use service role key only server-side
6. ✅ Implement rate limiting on auth endpoints
7. ✅ Check email verification before allowing access
8. ✅ Refresh tokens before expiry

## Resources

- [Full Auth Provider Guide](./auth-provider.md)
- [Complete API Reference](./api-reference.md)
- [Phase 2 Summary](./PHASE2-SUMMARY.md)
- [Supabase Docs](https://supabase.com/docs)
- [Medusa Docs](https://docs.medusajs.com)
