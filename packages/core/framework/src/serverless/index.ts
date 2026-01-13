/**
 * Medusa Serverless Module
 *
 * This module provides utilities for running Medusa in serverless environments,
 * with optimized support for Supabase as the database backend.
 *
 * Key features:
 * - Serverless-optimized database connection pooling
 * - HTTP handler adapters for AWS Lambda, Vercel, Supabase Edge Functions
 * - Connection caching for warm starts
 * - Platform-specific presets and configurations
 *
 * @example
 * ```typescript
 * // Vercel API Route (pages/api/[...medusa].ts)
 * import {
 *   initializeServerlessApp,
 *   createVercelHandler
 * } from "@medusajs/framework/serverless"
 *
 * const app = await initializeServerlessApp({
 *   platform: "vercel",
 *   supabase: {
 *     projectRef: process.env.SUPABASE_PROJECT_REF,
 *     usePooler: true
 *   }
 * })
 *
 * export default createVercelHandler(app)
 * ```
 *
 * @example
 * ```typescript
 * // AWS Lambda (handler.ts)
 * import {
 *   initializeServerlessApp,
 *   createServerlessHandler
 * } from "@medusajs/framework/serverless"
 *
 * let handler
 *
 * export const main = async (event, context) => {
 *   if (!handler) {
 *     const app = await initializeServerlessApp({ platform: "aws-lambda" })
 *     handler = createServerlessHandler(app)
 *   }
 *   return handler(event, context)
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Supabase Edge Function (functions/medusa/index.ts)
 * import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 * import {
 *   initializeServerlessApp,
 *   createServerlessHandler
 * } from "@medusajs/framework/serverless"
 *
 * const app = await initializeServerlessApp({ platform: "supabase-edge" })
 * const handler = createServerlessHandler(app)
 *
 * serve(async (req) => {
 *   const event = {
 *     method: req.method,
 *     path: new URL(req.url).pathname,
 *     headers: Object.fromEntries(req.headers.entries()),
 *     body: await req.text()
 *   }
 *   const response = await handler(event)
 *   return new Response(response.body, {
 *     status: response.statusCode,
 *     headers: response.headers
 *   })
 * })
 * ```
 *
 * @packageDocumentation
 */

// Types
export * from "./types"

// Supabase connection utilities
export {
  createSupabaseConnection,
  transformToPoolerUrl,
  ServerlessPresets,
  SUPABASE_EDGE_FUNCTION_POOL,
  LAMBDA_FUNCTION_POOL,
  LOVABLE_CLOUD_POOL,
} from "./supabase-connection"

// Serverless HTTP handlers
export {
  createServerlessHandler,
  createVercelHandler,
  createServerlessHandlerWithOptions,
  type ServerlessEvent,
  type ServerlessContext,
  type LambdaResponse,
  type ServerlessHandlerOptions,
} from "./serverless-handler"

// Connection loader
export {
  serverlessPgConnectionLoader,
  cleanupServerlessConnection,
  isServerlessEnvironment,
  isColdStart,
  markAsWarm,
} from "./serverless-connection-loader"

// App initialization
export {
  initializeServerlessApp,
  initializeServerlessAppWithResult,
  cleanupServerlessApp,
  warmUp,
  createLambdaHandler,
  createVercelServerlessHandler,
  createSupabaseEdgeHandler,
  createLovableCloudHandler,
  isAppInitialized,
  getCachedApp,
} from "./serverless-app"
