import express, { Express } from "express"
import { configManager } from "../config"
import { container } from "../container"
import { logger } from "../logger"
import { MedusaAppLoader } from "../medusa-app-loader"
import { expressLoader } from "../http/express-loader"
import {
  serverlessPgConnectionLoader,
  cleanupServerlessConnection,
  isColdStart,
  markAsWarm,
} from "./serverless-connection-loader"
import {
  createServerlessHandler,
  createVercelHandler,
  createServerlessHandlerWithOptions,
} from "./serverless-handler"
import type {
  ServerlessOptions,
  ServerlessInitResult,
  WarmUpOptions,
} from "./types"

/**
 * Cached Express app for warm starts
 */
let cachedApp: Express | null = null

/**
 * Cached shutdown function
 */
let cachedShutdown: (() => Promise<void>) | null = null

/**
 * Initialization lock to prevent concurrent initializations
 */
let initPromise: Promise<Express> | null = null

/**
 * Initialize the Medusa application for serverless environments.
 *
 * This function handles:
 * - Configuration loading
 * - Database connection with serverless-optimized pooling
 * - Express app initialization
 * - Module loading
 * - Connection caching for warm starts
 *
 * @param options - Serverless initialization options
 * @returns Initialized Express application
 *
 * @example
 * ```typescript
 * import { initializeServerlessApp } from "@medusajs/framework/serverless"
 *
 * const app = await initializeServerlessApp({
 *   platform: "vercel",
 *   supabase: {
 *     projectRef: "your-project-ref",
 *     usePooler: true
 *   }
 * })
 *
 * export default createServerlessHandler(app)
 * ```
 */
export async function initializeServerlessApp(
  options?: Partial<ServerlessOptions>
): Promise<Express> {
  // Return cached app for warm starts
  if (cachedApp) {
    logger.debug("Using cached app (warm start)")
    return cachedApp
  }

  // Prevent concurrent initializations
  if (initPromise) {
    return initPromise
  }

  initPromise = doInitialize(options)

  try {
    const app = await initPromise
    return app
  } finally {
    initPromise = null
  }
}

/**
 * Internal initialization function.
 */
async function doInitialize(
  options?: Partial<ServerlessOptions>
): Promise<Express> {
  const startTime = Date.now()
  const coldStart = isColdStart()

  logger.info(`Initializing Medusa serverless app (${coldStart ? "cold" : "warm"} start)`)

  // Load configuration
  await configManager.loadConfig()

  const config = configManager.config

  // Merge serverless options with config
  const serverlessOptions: ServerlessOptions = {
    enabled: true,
    disableJobs: true,
    disableSubscriptions: true,
    ...(config.projectConfig as any)?.serverless,
    ...options,
  }

  // Set worker mode to server (no background jobs in serverless)
  if (serverlessOptions.disableJobs) {
    ;(config.projectConfig as any).workerMode = "server"
  }

  // Initialize database connection
  await serverlessPgConnectionLoader(serverlessOptions)

  // Create Express app
  const app = express()

  // Load express middleware
  const { shutdown } = await expressLoader({ app, container })
  cachedShutdown = shutdown

  // Load Medusa modules
  const medusaAppLoader = new MedusaAppLoader()
  await medusaAppLoader.load()

  // Load API routes
  const { apiLoader } = await import("../http/routes-loader")
  await apiLoader({
    app,
    container,
    configModule: config,
  })

  // Cache for warm starts
  cachedApp = app
  markAsWarm()

  const initTime = Date.now() - startTime
  logger.info(`Medusa serverless app initialized in ${initTime}ms`)

  // Call custom init hook if provided
  if (serverlessOptions.onInit) {
    await serverlessOptions.onInit()
  }

  return app
}

/**
 * Get the serverless initialization result with metadata.
 */
export async function initializeServerlessAppWithResult(
  options?: Partial<ServerlessOptions>
): Promise<ServerlessInitResult> {
  const startTime = Date.now()
  const coldStart = isColdStart()
  const warnings: string[] = []

  try {
    await initializeServerlessApp(options)

    return {
      success: true,
      initTime: Date.now() - startTime,
      coldStart,
      warnings: warnings.length > 0 ? warnings : undefined,
      cleanup: cleanupServerlessApp,
    }
  } catch (error) {
    return {
      success: false,
      initTime: Date.now() - startTime,
      coldStart,
      warnings: [(error as Error).message],
      cleanup: cleanupServerlessApp,
    }
  }
}

/**
 * Cleanup the serverless application.
 * Call this before the function terminates for proper resource cleanup.
 */
export async function cleanupServerlessApp(): Promise<void> {
  logger.debug("Cleaning up serverless app")

  // Run cached shutdown
  if (cachedShutdown) {
    await cachedShutdown()
  }

  // Cleanup database connection
  await cleanupServerlessConnection()

  // Clear caches
  cachedApp = null
  cachedShutdown = null
}

/**
 * Perform warm-up operations to reduce cold start latency.
 * Call this proactively (e.g., via cron) to keep functions warm.
 */
export async function warmUp(options?: WarmUpOptions): Promise<void> {
  const warmUpOptions: WarmUpOptions = {
    checkDatabase: true,
    preloadModules: true,
    ...options,
  }

  logger.debug("Performing warm-up")

  // Initialize app (will use cache if already warm)
  await initializeServerlessApp()

  // Additional warm-up operations
  if (warmUpOptions.checkDatabase) {
    const pgConnection = container.resolve("pgConnection") as any
    if (pgConnection) {
      await pgConnection.raw("SELECT 1")
    }
  }

  // Custom warm-up
  if (warmUpOptions.custom) {
    await warmUpOptions.custom()
  }

  logger.debug("Warm-up complete")
}

/**
 * Create a ready-to-use serverless handler for AWS Lambda.
 */
export async function createLambdaHandler() {
  const app = await initializeServerlessApp({ platform: "aws-lambda" })
  return createServerlessHandler(app)
}

/**
 * Create a ready-to-use handler for Vercel.
 */
export async function createVercelServerlessHandler() {
  const app = await initializeServerlessApp({ platform: "vercel" })
  return createVercelHandler(app)
}

/**
 * Create a ready-to-use handler for Supabase Edge Functions.
 */
export async function createSupabaseEdgeHandler() {
  const app = await initializeServerlessApp({ platform: "supabase-edge" })
  return createServerlessHandler(app)
}

/**
 * Check if the app is initialized.
 */
export function isAppInitialized(): boolean {
  return cachedApp !== null
}

/**
 * Get the cached Express app if available.
 */
export function getCachedApp(): Express | null {
  return cachedApp
}
