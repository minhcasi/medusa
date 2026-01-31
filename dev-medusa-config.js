const { defineConfig, Modules } = require("@medusajs/utils")

module.exports = defineConfig({
  projectConfig: {
    // Use Supabase if SUPABASE_DATABASE_URL is set, otherwise fallback to local
    databaseUrl:
      process.env.SUPABASE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "postgres://minh@localhost/medusa_test",

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
      storeCors: "http://localhost:8000,http://localhost:3000",
      adminCors: "http://localhost:7001,http://localhost:7000",
      authCors: "http://localhost:7001,http://localhost:7000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
})
