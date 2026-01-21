# Supabase Provider Documentation

Complete documentation for the Supabase provider package, which enables Medusa integration with Supabase's database and authentication services.

## Overview

The `@medusajs/supabase` package provides:

1. **Database Provider** - PostgreSQL database integration via Supabase
2. **Auth Provider** - Multi-method authentication (email/password, OAuth, magic links)

## Modules

### [Authentication Provider](./auth-provider.md)
- Email/password authentication
- OAuth provider support (Google, GitHub, etc.)
- Magic link (passwordless) authentication
- JWT utilities for token validation
- Comprehensive security features

### Database Provider
- PostgreSQL connection via Supabase
- Connection pooling configuration
- Support for session and transaction pool modes
- Environment-based configuration

## Quick Start

### Installation

```bash
npm install @medusajs/supabase @supabase/supabase-js
```

### Environment Setup

```env
# Supabase API Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional - For admin operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional - For JWT validation without API calls
SUPABASE_JWT_SECRET=your-jwt-secret
```

### Configuration

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

## Features by Phase

### Phase 1: Database Provider
- ✅ PostgreSQL connection configuration
- ✅ Connection pooling (session and transaction modes)
- ✅ Database schema management
- ✅ Environment-based configuration

### Phase 2: Auth Provider (Current)
- ✅ Email/password authentication
- ✅ User registration with duplicate detection
- ✅ OAuth provider integration
- ✅ CSRF protection for OAuth flows
- ✅ Magic link passwordless authentication
- ✅ JWT validation utilities
- ✅ Comprehensive error handling

### Phase 3: Advanced Features (Planned)
- Real-time subscriptions
- Row-level security (RLS) integration
- Audit logging
- Advanced role management

### Phase 4: Testing & Documentation (Planned)
- Complete integration test suite
- API documentation
- Migration guides
- Performance benchmarks

## Types

All TypeScript types are exported from the main package:

```typescript
import {
  SupabaseAuthProviderOptions,
  SupabaseAuthOptions,
  SupabaseJWTPayload,
  JWTValidationResult,
  SessionValidationResult,
} from "@medusajs/supabase"
```

## Utilities

JWT validation utilities are available for server-side token handling:

```typescript
import {
  decodeJWT,
  isTokenExpired,
  validateSession,
  extractUserId,
  extractEmail,
  hasRole,
} from "@medusajs/supabase"
```

## Service Exports

The authentication service is exported for direct usage:

```typescript
import { SupabaseAuthService } from "@medusajs/supabase"
```

## Testing

Run the test suite:

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration
```

## Examples

### Example: Custom Auth Endpoint

```typescript
import { defineRouteConfig } from "@medusajs/framework/api"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

export const config = defineRouteConfig({
  method: "POST",
  middlewares: [],
})

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { email, password } = req.body

  const authService = req.scope.resolve("authService")
  const result = await authService.authenticate(
    { body: { email, password } },
    authIdentityService
  )

  if (result.success) {
    res.json({ success: true, identity: result.authIdentity })
  } else {
    res.status(401).json({ success: false, error: result.error })
  }
}
```

### Example: JWT Validation in Middleware

```typescript
import { decodeJWT, isTokenExpired, extractUserId } from "@medusajs/supabase"

function validateToken(token: string) {
  if (isTokenExpired(token)) {
    throw new Error("Token has expired")
  }

  const userId = extractUserId(token)
  if (!userId) {
    throw new Error("Invalid token")
  }

  return userId
}
```

## Support

For issues or questions:
1. Check [Troubleshooting](./auth-provider.md#troubleshooting)
2. Review [Supabase Documentation](https://supabase.com/docs)
3. Check [Medusa Documentation](https://docs.medusajs.com)

## Related Resources

- [Supabase Official Docs](https://supabase.com/docs)
- [Medusa Framework Docs](https://docs.medusajs.com)
- [GitHub Repository](https://github.com/medusajs/medusa)
