/**
 * Example Vercel Serverless Function Handler
 *
 * This file demonstrates how to deploy Medusa on Vercel with Supabase as the database.
 *
 * Setup:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Get your database connection string from Supabase dashboard
 * 3. Set environment variables in Vercel:
 *    - DATABASE_URL: Your Supabase database URL
 *    - SUPABASE_PROJECT_REF: Your project reference (e.g., "abcdefghijklmnop")
 *    - JWT_SECRET: A secure random string
 *    - COOKIE_SECRET: A secure random string
 *
 * File structure:
 * ```
 * your-medusa-project/
 * ├── api/
 * │   └── [...medusa].ts  <- This handler
 * ├── medusa-config.ts
 * ├── package.json
 * └── vercel.json
 * ```
 *
 * vercel.json:
 * ```json
 * {
 *   "rewrites": [
 *     { "source": "/admin/:path*", "destination": "/api/[...medusa]" },
 *     { "source": "/store/:path*", "destination": "/api/[...medusa]" },
 *     { "source": "/auth/:path*", "destination": "/api/[...medusa]" }
 *   ]
 * }
 * ```
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import {
  initializeServerlessApp,
  createServerlessHandler,
  ServerlessEvent,
} from "@medusajs/framework/serverless"

// Cache the handler between invocations (warm starts)
let handler: ReturnType<typeof createServerlessHandler> | null = null

export default async function medusaHandler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Initialize on first request (cold start)
  if (!handler) {
    const app = await initializeServerlessApp({
      platform: "vercel",
      supabase: {
        projectRef: process.env.SUPABASE_PROJECT_REF,
        usePooler: true,
        useSessionMode: false,
      },
      pool: {
        min: 0,
        max: 3,
        idleTimeoutMillis: 2000,
      },
    })
    handler = createServerlessHandler(app)
  }

  // Convert Vercel request to serverless event
  const event: ServerlessEvent = {
    httpMethod: req.method,
    path: req.url?.split("?")[0] || "/",
    headers: req.headers as Record<string, string>,
    queryStringParameters: req.query as Record<string, string>,
    body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    isBase64Encoded: false,
  }

  // Execute handler
  const result = await handler(event)

  // Set response headers
  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value)
  }

  // Send response
  res.status(result.statusCode)

  if (result.isBase64Encoded) {
    res.send(Buffer.from(result.body, "base64"))
  } else {
    res.send(result.body)
  }
}

// Vercel configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
    responseLimit: false,
  },
}
