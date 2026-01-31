#!/usr/bin/env node

console.log("Step 1: Loading dependencies...")
const { createMedusaContainer } = require("@medusajs/framework")
const { defineConfig, Modules } = require("@medusajs/framework/utils")

console.log("Step 2: Defining config...")
const config = defineConfig({
  admin: {
    disable: true,
  },
  projectConfig: {
    databaseUrl:
      "postgresql://postgres.bkzogaowrfycneytxmak:3h291nu0lIoalPqy@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
    http: {
      jwtSecret: "test",
      cookieSecret: "test",
    },
  },
  modules: {
    [Modules.CACHE]: {
      resolve: "@medusajs/cache-inmemory",
    },
    [Modules.EVENT_BUS]: {
      resolve: "@medusajs/event-bus-local",
    },
    [Modules.WORKFLOW_ENGINE]: {
      resolve: "@medusajs/workflow-engine-inmemory",
    },
  },
})

console.log("Step 3: Creating container...")
async function test() {
  try {
    console.log("Step 4: Initializing Medusa...")
    const container = await createMedusaContainer(config)
    console.log("✓ Container created successfully!")
    console.log("Step 5: Container has", Object.keys(container).length, "keys")
    process.exit(0)
  } catch (error) {
    console.error("✗ Error:", error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

test()
