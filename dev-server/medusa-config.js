require("dotenv").config()
const { defineConfig, Modules } = require("@medusajs/framework/utils")

module.exports = defineConfig({
  admin: {
    disable: true, // Disable embedded admin UI - run separately
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: "http://localhost:8000,http://localhost:3000",
      adminCors:
        "http://localhost:5173,http://localhost:7001,http://localhost:7000,http://localhost:9000,http://localhost:9001",
      authCors:
        "http://localhost:5173,http://localhost:7001,http://localhost:7000,http://localhost:9000,http://localhost:9001",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: {
    // In-memory cache (no Redis required)
    [Modules.CACHE]: {
      resolve: "@medusajs/cache-inmemory",
    },
    // Local event bus (no Redis required)
    [Modules.EVENT_BUS]: {
      resolve: "@medusajs/event-bus-local",
    },
    // In-memory workflow engine (no Redis required)
    [Modules.WORKFLOW_ENGINE]: {
      resolve: "@medusajs/workflow-engine-inmemory",
    },
  },
})
