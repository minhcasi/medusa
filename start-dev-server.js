#!/usr/bin/env node

const express = require("express")
const { execSync } = require("child_process")
const path = require("path")

const app = express()
const PORT = process.env.PORT || 9000

// Serve a landing page at root
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Medusa Development Server</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          line-height: 1.6;
        }
        h1 { color: #333; }
        .endpoint {
          background: #f4f4f4;
          padding: 15px;
          margin: 10px 0;
          border-left: 4px solid #5469d4;
        }
        code {
          background: #e8e8e8;
          padding: 2px 6px;
          border-radius: 3px;
        }
        a { color: #5469d4; }
      </style>
    </head>
    <body>
      <h1>🚀 Medusa Development Server</h1>
      <p>Your Medusa server is running on <strong>http://localhost:${PORT}</strong></p>
      
      <h2>Available Endpoints:</h2>
      
      <div class="endpoint">
        <h3>Health Check</h3>
        <code>GET /health</code>
        <p>Check if the server is running</p>
        <a href="/health" target="_blank">Try it →</a>
      </div>
      
      <div class="endpoint">
        <h3>Store API</h3>
        <code>GET /store/*</code>
        <p>Storefront API endpoints (requires publishable API key)</p>
      </div>
      
      <div class="endpoint">
        <h3>Admin API</h3>
        <code>GET /admin/*</code>
        <p>Admin API endpoints (requires authentication)</p>
      </div>
      
      <h2>Quick Links:</h2>
      <ul>
        <li><a href="https://docs.medusajs.com" target="_blank">Medusa Documentation</a></li>
        <li><a href="https://docs.medusajs.com/api/store" target="_blank">Store API Reference</a></li>
        <li><a href="https://docs.medusajs.com/api/admin" target="_blank">Admin API Reference</a></li>
      </ul>
      
      <p><small>This is a development server running from the Medusa monorepo.</small></p>
    </body>
    </html>
  `)
})

// Start the Medusa backend in development mode
const medusaProcess = require("child_process").spawn(
  "npx",
  ["medusa", "develop"],
  {
    cwd: path.join(__dirname, "integration-tests/http"),
    env: {
      ...process.env,
      DB_HOST: "localhost",
      DB_USERNAME: "minh",
      DB_PASSWORD: "",
      DB_TEMP_NAME: "medusa_test",
      DATABASE_URL: "postgres://minh@localhost/medusa_test",
      PORT: PORT.toString(),
    },
    stdio: "inherit",
  }
)

medusaProcess.on("error", (err) => {
  console.error("Failed to start Medusa:", err)
  process.exit(1)
})

medusaProcess.on("exit", (code) => {
  console.log(`Medusa process exited with code ${code}`)
  process.exit(code)
})

console.log(`Starting Medusa development server on http://localhost:${PORT}`)
console.log(`Visit http://localhost:${PORT} for API information`)
