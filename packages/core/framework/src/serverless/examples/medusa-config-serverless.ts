/**
 * Example medusa-config.ts for Serverless Deployment with Supabase
 *
 * This configuration demonstrates how to set up Medusa for serverless
 * environments using Supabase as the database backend.
 *
 * Copy this file to your project root as `medusa-config.ts` and adjust
 * the values according to your environment.
 */

import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  projectConfig: {
    // Database URL - Use Supabase's connection pooler URL for serverless
    // Direct: postgres://postgres:[password]@db.[ref].supabase.co:5432/postgres
    // Pooler: postgres://postgres.[ref]:[password]@[ref].pooler.supabase.com:6543/postgres
    databaseUrl: process.env.DATABASE_URL,

    // Database schema (default: public)
    databaseSchema: process.env.DATABASE_SCHEMA || "public",

    // Enable logging in development
    databaseLogging: process.env.NODE_ENV === "development",

    // Database driver options for SSL (required for Supabase)
    databaseDriverOptions:
      process.env.NODE_ENV === "production"
        ? {
            connection: {
              ssl: {
                rejectUnauthorized: false,
              },
            },
          }
        : {},

    // HTTP configuration
    http: {
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      jwtExpiresIn: "1d",
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001",
      authCors: process.env.AUTH_CORS || "http://localhost:7001",
    },

    // Worker mode - Always use "server" for serverless (no background jobs)
    workerMode: "server",

    // Serverless configuration
    serverless: {
      // Enable serverless mode
      enabled: true,

      // Platform-specific optimizations
      // Options: "supabase-edge" | "vercel" | "aws-lambda" | "cloudflare-workers" | "netlify"
      platform:
        (process.env.SERVERLESS_PLATFORM as any) || detectPlatform(),

      // Supabase-specific configuration
      supabase: {
        // Your Supabase project reference (from the URL: https://[ref].supabase.co)
        projectRef: process.env.SUPABASE_PROJECT_REF,

        // Use Supabase's built-in connection pooler (recommended for serverless)
        usePooler: true,

        // Use transaction mode (default) vs session mode
        // Transaction mode: Each query can use a different connection (better for serverless)
        // Session mode: Connection persists for the session (needed for prepared statements)
        useSessionMode: false,

        // Optional: Supabase keys for additional integrations
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },

      // Connection pool settings optimized for serverless
      pool: {
        // Minimum connections (0 for serverless - no idle connections)
        min: 0,

        // Maximum connections per function instance
        max: parseInt(process.env.DB_POOL_MAX || "1"),

        // How long before idle connections are closed (ms)
        idleTimeoutMillis: 1000,

        // How long to wait for a connection (ms)
        acquireTimeoutMillis: 10000,

        // How long to wait when creating a connection (ms)
        createTimeoutMillis: 10000,
      },

      // Function timeout in milliseconds
      timeout: parseInt(process.env.FUNCTION_TIMEOUT || "30000"),

      // Disable background jobs (recommended for serverless)
      disableJobs: true,

      // Disable real-time subscriptions (recommended for serverless)
      disableSubscriptions: true,
    },
  },

  // Admin dashboard configuration
  admin: {
    // Disable admin in serverless (serve separately or use Medusa Cloud)
    disable: process.env.DISABLE_ADMIN === "true",

    // If enabled, set the path
    path: "/app",

    // Backend URL for admin API calls
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },

  // Modules configuration
  modules: [
    // Add your modules here
    // Example: { resolve: "./modules/custom-module" }
  ],
})

/**
 * Detect the serverless platform from environment variables.
 */
function detectPlatform():
  | "supabase-edge"
  | "vercel"
  | "aws-lambda"
  | "netlify"
  | "custom" {
  if (process.env.SUPABASE_URL || process.env.DENO_DEPLOYMENT_ID) {
    return "supabase-edge"
  }
  if (process.env.VERCEL) {
    return "vercel"
  }
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return "aws-lambda"
  }
  if (process.env.NETLIFY) {
    return "netlify"
  }
  return "custom"
}

/**
 * Environment variables reference:
 *
 * Required:
 * - DATABASE_URL: Supabase PostgreSQL connection string
 * - JWT_SECRET: Secret for JWT token signing
 * - COOKIE_SECRET: Secret for cookie signing
 *
 * Recommended:
 * - SUPABASE_PROJECT_REF: Your Supabase project reference
 * - STORE_CORS: Allowed origins for store API
 * - ADMIN_CORS: Allowed origins for admin API
 * - AUTH_CORS: Allowed origins for auth API
 *
 * Optional:
 * - DATABASE_SCHEMA: Database schema (default: public)
 * - DB_POOL_MAX: Maximum database connections (default: 1)
 * - FUNCTION_TIMEOUT: Function timeout in ms (default: 30000)
 * - DISABLE_ADMIN: Disable admin dashboard (default: false)
 * - MEDUSA_BACKEND_URL: Backend URL for admin
 * - SUPABASE_ANON_KEY: Supabase anonymous key
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 *
 * Example .env file:
 * ```
 * DATABASE_URL=postgres://postgres.ref:[password]@ref.pooler.supabase.com:6543/postgres
 * SUPABASE_PROJECT_REF=abcdefghijklmnop
 * JWT_SECRET=your-super-secret-jwt-key
 * COOKIE_SECRET=your-super-secret-cookie-key
 * STORE_CORS=https://your-storefront.com
 * ADMIN_CORS=https://your-admin.com
 * AUTH_CORS=https://your-admin.com
 * ```
 */
