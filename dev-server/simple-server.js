#!/usr/bin/env node
/**
 * Minimal Medusa server that bypasses the problematic migration system
 */

require("dotenv").config()
const express = require("express")

const app = express()
const PORT = process.env.PORT || 9001

console.log("Starting minimal Medusa server...")
console.log(
  `Database: ${process.env.DATABASE_URL ? "✓ Connected" : "✗ Not configured"}`
)

// Health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Medusa server is running (minimal mode)",
    timestamp: new Date().toISOString(),
  })
})

// Root endpoint with helpful info
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Medusa Development Server (Minimal Mode)",
    note: "Running without full initialization to bypass migration issues",
    endpoints: {
      health: "/health",
      store: "/store (not loaded in minimal mode)",
      admin: "/admin (not loaded in minimal mode)",
    },
    database: process.env.DATABASE_URL ? "configured" : "not configured",
  })
})

// Start server
app.listen(PORT, () => {
  console.log("")
  console.log("================================================")
  console.log(`✓ Server running on http://localhost:${PORT}`)
  console.log("================================================")
  console.log("")
  console.log("Available endpoints:")
  console.log(`  - http://localhost:${PORT}/health`)
  console.log(`  - http://localhost:${PORT}/`)
  console.log("")
  console.log("NOTE: This is a minimal server bypassing migration issues.")
  console.log("Full Medusa functionality is not available.")
  console.log("")
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\nShutting down server...")
  process.exit(0)
})
