/**
 * Example Supabase Edge Function Handler
 *
 * This file demonstrates how to deploy Medusa on Supabase Edge Functions.
 * Supabase Edge Functions run on Deno runtime at the edge, providing
 * ultra-low latency responses.
 *
 * Setup:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Install Supabase CLI: npm install -g supabase
 * 3. Initialize Supabase in your project: supabase init
 * 4. Create the function: supabase functions new medusa
 *
 * File structure:
 * ```
 * your-medusa-project/
 * ├── supabase/
 * │   └── functions/
 * │       └── medusa/
 * │           └── index.ts  <- This handler
 * ├── medusa-config.ts
 * └── package.json
 * ```
 *
 * Environment variables (set in Supabase dashboard or .env):
 * - DATABASE_URL: Your Supabase database URL
 * - JWT_SECRET: A secure random string
 * - COOKIE_SECRET: A secure random string
 *
 * Deploy:
 * ```bash
 * supabase functions deploy medusa
 * ```
 *
 * Note: This is a TypeScript example that would need to be adapted for Deno runtime.
 * Supabase Edge Functions use Deno, so some Node.js modules may not be available.
 */

// For Deno runtime, you would import like this:
// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import {
  initializeServerlessApp,
  createServerlessHandler,
  ServerlessEvent,
  LambdaResponse,
} from "@medusajs/framework/serverless"

// Cache the handler between invocations
let handler: ((event: ServerlessEvent) => Promise<LambdaResponse>) | null = null

/**
 * Initialize the handler once (warm start optimization)
 */
async function getHandler() {
  if (!handler) {
    const app = await initializeServerlessApp({
      platform: "supabase-edge",
      supabase: {
        // Supabase Edge Functions have access to the project ref automatically
        projectRef: Deno.env.get("SUPABASE_PROJECT_REF") || undefined,
        usePooler: true,
        useSessionMode: false,
      },
      pool: {
        // Edge functions have very short execution times
        min: 0,
        max: 1,
        idleTimeoutMillis: 500,
        acquireTimeoutMillis: 5000,
      },
      timeout: 10000, // Edge functions have shorter timeouts
      disableJobs: true,
      disableSubscriptions: true,
    })
    handler = createServerlessHandler(app)
  }
  return handler
}

/**
 * Main edge function handler.
 *
 * For actual Supabase Edge Function, you would use:
 * ```typescript
 * import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 *
 * serve(async (req: Request) => {
 *   // ... handler code
 * })
 * ```
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
    console.error("Edge function error:", error)

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: (error as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

// For Node.js environments (testing), export the handler
export default handleRequest

// Example Deno serve implementation:
// serve(handleRequest)

/**
 * Deno type declarations for TypeScript
 */
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined
    }
  }
}
