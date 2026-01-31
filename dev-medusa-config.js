require("dotenv").config()
const { defineConfig, Modules } = require("@medusajs/utils")

// Validate required environment variables
if (!process.env.DATABASE_URL && !process.env.SUPABASE_DATABASE_URL) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL environment variable is required")
}

module.exports = defineConfig({
  projectConfig: {
    // Database URL from environment variables only (no hardcoded fallbacks)
    databaseUrl: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,

    // Supabase configuration (optional - enables Supabase-specific features)
    supabase: process.env.SUPABASE_DATABASE_URL
      ? {
          url: process.env.SUPABASE_URL,
          anonKey: process.env.SUPABASE_ANON_KEY,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          database: {
            connectionString: process.env.SUPABASE_DATABASE_URL,
            poolMode: process.env.SUPABASE_POOL_MODE || "session",
            pool: {
              min: 2,
              max: 10,
            },
          },
        }
      : undefined,

    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000,http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:7000",
      authCors: process.env.AUTH_CORS || "http://localhost:7001,http://localhost:7000",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
})
