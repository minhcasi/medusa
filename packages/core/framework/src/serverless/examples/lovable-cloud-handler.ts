/**
 * Example Lovable Cloud Handler
 *
 * This file demonstrates how to deploy Medusa on Lovable Cloud.
 * Lovable Cloud uses Supabase infrastructure under the hood, providing:
 * - Managed PostgreSQL database
 * - Serverless edge functions
 * - Built-in authentication
 * - Real-time monitoring
 *
 * Setup:
 * 1. Create a Lovable project at https://lovable.dev
 * 2. Connect your GitHub repository
 * 3. Set environment variables in Lovable dashboard:
 *    - DATABASE_URL: Automatically provisioned by Lovable
 *    - JWT_SECRET: A secure random string
 *    - COOKIE_SECRET: A secure random string
 *
 * Deployment:
 * Lovable automatically deploys when you push to your connected branch.
 * You can also trigger deployments from the Lovable dashboard.
 *
 * File structure for Lovable:
 * ```
 * your-medusa-project/
 * ├── src/
 * │   └── api/
 * │       └── [...medusa].ts  <- This handler
 * ├── medusa-config.ts
 * └── package.json
 * ```
 */

import {
  initializeServerlessApp,
  createServerlessHandler,
  ServerlessEvent,
  LambdaResponse,
} from "@medusajs/framework/serverless"

// Cache the handler between invocations (warm starts)
let handler: ((event: ServerlessEvent) => Promise<LambdaResponse>) | null = null

/**
 * Initialize the handler once (warm start optimization)
 */
async function getHandler() {
  if (!handler) {
    const app = await initializeServerlessApp({
      platform: "lovable-cloud",
      // Lovable Cloud automatically provisions Supabase
      supabase: {
        usePooler: true,
        useSessionMode: false,
      },
      // Lovable-specific options
      lovable: {
        projectId: process.env.LOVABLE_PROJECT_ID,
        enableMonitoring: true,
        environment:
          (process.env.LOVABLE_ENV as "development" | "staging" | "production") ||
          "production",
        useManagedDatabase: true,
      },
      pool: {
        min: 0,
        max: 1,
        idleTimeoutMillis: 500,
        acquireTimeoutMillis: 5000,
      },
      timeout: 10000,
      disableJobs: true,
      disableSubscriptions: true,
    })
    handler = createServerlessHandler(app)
  }
  return handler
}

/**
 * Main Lovable Cloud handler function.
 *
 * Lovable Cloud uses a similar request/response pattern to other
 * serverless platforms. This handler converts the incoming request
 * to a format compatible with Medusa and returns the response.
 */
export async function handleRequest(request: Request): Promise<Response> {
  try {
    const h = await getHandler()

    const url = new URL(request.url)

    // Convert Web Request to serverless event
    const event: ServerlessEvent = {
      method: request.method,
      path: url.pathname,
      headers: Object.fromEntries(request.headers.entries()),
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      body: request.body ? await request.text() : null,
      isBase64Encoded: false,
    }

    // Execute handler
    const result = await h(event)

    // Convert to Web Response
    return new Response(
      result.isBase64Encoded
        ? Uint8Array.from(atob(result.body), (c) => c.charCodeAt(0))
        : result.body,
      {
        status: result.statusCode,
        headers: new Headers(result.headers),
      }
    )
  } catch (error) {
    console.error("Lovable Cloud handler error:", error)

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

// Default export for Lovable Cloud
export default handleRequest

/**
 * Alternative: Using the pre-built Lovable Cloud handler
 *
 * If you prefer a simpler setup, you can use the pre-built handler:
 *
 * ```typescript
 * import { createLovableCloudHandler } from "@medusajs/framework/serverless"
 *
 * const handler = await createLovableCloudHandler()
 * export default handler
 * ```
 */

/**
 * Example medusa-config.ts for Lovable Cloud:
 *
 * ```typescript
 * import { defineConfig } from "@medusajs/framework/utils"
 *
 * export default defineConfig({
 *   projectConfig: {
 *     databaseUrl: process.env.DATABASE_URL,
 *     http: {
 *       jwtSecret: process.env.JWT_SECRET || "supersecret",
 *       cookieSecret: process.env.COOKIE_SECRET || "supersecret",
 *       storeCors: process.env.STORE_CORS || "*",
 *       adminCors: process.env.ADMIN_CORS || "*",
 *       authCors: process.env.AUTH_CORS || "*",
 *     },
 *     serverless: {
 *       enabled: true,
 *       platform: "lovable-cloud",
 *       lovable: {
 *         projectId: process.env.LOVABLE_PROJECT_ID,
 *         enableMonitoring: true,
 *         useManagedDatabase: true,
 *       },
 *     },
 *   },
 * })
 * ```
 */

/**
 * Environment variables for Lovable Cloud:
 *
 * Required (automatically set by Lovable):
 * - DATABASE_URL: PostgreSQL connection string (managed by Lovable)
 * - LOVABLE_PROJECT_ID: Your Lovable project ID
 *
 * Required (you must set):
 * - JWT_SECRET: Secret for JWT token signing
 * - COOKIE_SECRET: Secret for cookie signing
 *
 * Optional:
 * - STORE_CORS: Allowed origins for store API
 * - ADMIN_CORS: Allowed origins for admin API
 * - AUTH_CORS: Allowed origins for auth API
 * - LOVABLE_ENV: Environment (development/staging/production)
 */
