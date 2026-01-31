#!/usr/bin/env node

// Simple server starter for Medusa
require("dotenv").config()

const { spawn } = require("child_process")
const path = require("path")

console.log("Starting Medusa Development Server...")
console.log(
  "Database:",
  process.env.DATABASE_URL ? "✓ Configured" : "✗ Not set"
)
console.log("")

// Start the Medusa server directly using the framework
const server = spawn(
  "node",
  [
    path.join(__dirname, "../packages/core/framework/dist/bin/medusa.js"),
    "develop",
    "--port",
    process.env.PORT || "9000",
  ],
  {
    cwd: __dirname,
    stdio: "inherit",
    env: process.env,
  }
)

server.on("error", (err) => {
  console.error("Failed to start server:", err)
  process.exit(1)
})

server.on("exit", (code) => {
  console.log(`Server exited with code ${code}`)
  process.exit(code)
})

process.on("SIGINT", () => {
  server.kill("SIGINT")
  process.exit(0)
})
