import { ContainerRegistrationKeys } from "@medusajs/utils"
import { asValue } from "../deps/awilix"
import { configManager } from "../config"
import { container } from "../container"
import { logger } from "../logger"
import {
  createSupabaseConnection,
  ServerlessPresets,
} from "./supabase-connection"
import type { ServerlessOptions, ServerlessPlatform } from "./types"

/**
 * Track cold start state
 */
let isWarm = false

/**
 * Cached connection for warm starts
 */
let cachedConnection: ReturnType<typeof createSupabaseConnection> | null = null

/**
 * Initialize a serverless-optimized database connection.
 *
 * Key differences from standard pg-connection-loader:
 * - Uses connection pooler URL for Supabase
 * - Minimal connection pool (0-1 connections)
 * - Reuses connection across warm invocations
 * - Quick cleanup on function termination
 *
 * @param options - Optional serverless configuration override
 */
export async function serverlessPgConnectionLoader(
  options?: Partial<ServerlessOptions>
): Promise<ReturnType<typeof createSupabaseConnection>> {
  // Return cached connection for warm starts
  if (cachedConnection && isWarm) {
    // Verify connection is still alive
    try {
      await cachedConnection.raw("SELECT 1")
      logger.debug("Using cached database connection (warm start)")
      return cachedConnection
    } catch {
      // Connection is stale, create new one
      logger.debug("Cached connection stale, creating new connection")
      cachedConnection = null
    }
  }

  // Check if already registered in container
  if (container.hasRegistration(ContainerRegistrationKeys.PG_CONNECTION)) {
    const existing = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    if (existing) {
      return existing as ReturnType<typeof createSupabaseConnection>
    }
  }

  const configModule = configManager.config
  const serverlessConfig = options || (configModule.projectConfig as any)?.serverless

  // Determine platform for preset selection
  const platform: ServerlessPlatform = serverlessConfig?.platform || detectPlatform()

  const connectionString = configModule.projectConfig.databaseUrl
  const driverOptions: any = {
    ...(configModule.projectConfig.databaseDriverOptions || {}),
  }
  const schema = configModule.projectConfig.databaseSchema || "public"

  // Get Supabase-specific options
  const supabaseOptions = serverlessConfig?.supabase || {}
  const projectRef =
    supabaseOptions.projectRef || extractProjectRef(connectionString)

  // Select connection preset based on platform
  let connectionOptions = getPresetForPlatform(
    platform,
    connectionString!,
    projectRef
  )

  // Merge with custom pool settings if provided
  if (serverlessConfig?.pool) {
    connectionOptions = {
      ...connectionOptions,
      pool: {
        ...connectionOptions.pool,
        ...serverlessConfig.pool,
      },
    }
  }

  // Merge driver options
  connectionOptions = {
    ...connectionOptions,
    schema,
    driverOptions: {
      ...connectionOptions.driverOptions,
      ...driverOptions,
    },
    useSupabasePooler: supabaseOptions.usePooler !== false,
    useSessionMode: supabaseOptions.useSessionMode || false,
  }

  const startTime = Date.now()

  // Create the connection
  const pgConnection = createSupabaseConnection(connectionOptions)

  // Verify connection with retry
  const maxRetries = 3
  const retryDelay = 1000

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pgConnection.raw("SELECT 1")
      break
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts: ${(error as Error).message}`
        )
      }
      logger.warn(
        `Database connection attempt ${attempt} failed, retrying in ${retryDelay}ms...`
      )
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  const connectionTime = Date.now() - startTime
  logger.info(
    `Serverless database connection established in ${connectionTime}ms (${isWarm ? "warm" : "cold"} start)`
  )

  // Cache connection for warm starts
  cachedConnection = pgConnection
  isWarm = true

  // Register in container
  container.register(
    ContainerRegistrationKeys.PG_CONNECTION,
    asValue(pgConnection)
  )

  return pgConnection
}

/**
 * Extract Supabase project reference from database URL.
 */
function extractProjectRef(url?: string): string | undefined {
  if (!url) return undefined

  try {
    const parsedUrl = new URL(url)
    const hostParts = parsedUrl.hostname.split(".")

    // Format: db.{project-ref}.supabase.co
    if (hostParts[0] === "db" && hostParts.length >= 3) {
      return hostParts[1]
    }

    // Format: {project-ref}.pooler.supabase.com
    if (hostParts.length >= 3 && hostParts[1] === "pooler") {
      return hostParts[0]
    }
  } catch {
    // Invalid URL
  }

  return undefined
}

/**
 * Detect the serverless platform from environment variables.
 */
function detectPlatform(): ServerlessPlatform {
  // Lovable Cloud (check first as it uses Supabase under the hood)
  if (process.env.LOVABLE_PROJECT_ID || process.env.LOVABLE_CLOUD) {
    return "lovable-cloud"
  }

  // Supabase Edge Functions
  if (process.env.SUPABASE_URL || process.env.DENO_DEPLOYMENT_ID) {
    return "supabase-edge"
  }

  // Vercel
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return "vercel"
  }

  // AWS Lambda
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    return "aws-lambda"
  }

  // Cloudflare Workers
  if (process.env.CF_WORKER) {
    return "cloudflare-workers"
  }

  // Netlify
  if (process.env.NETLIFY || process.env.NETLIFY_DEV) {
    return "netlify"
  }

  return "custom"
}

/**
 * Get connection preset for a platform.
 */
function getPresetForPlatform(
  platform: ServerlessPlatform,
  databaseUrl: string,
  projectRef?: string
) {
  switch (platform) {
    case "lovable-cloud":
      return ServerlessPresets.lovableCloud(databaseUrl, projectRef)
    case "supabase-edge":
      return ServerlessPresets.supabaseEdge(databaseUrl, projectRef)
    case "vercel":
      return ServerlessPresets.vercel(databaseUrl, projectRef)
    case "aws-lambda":
    case "netlify":
      return ServerlessPresets.awsLambda(databaseUrl, projectRef)
    case "cloudflare-workers":
      return ServerlessPresets.cloudflareWorkers(databaseUrl, projectRef)
    default:
      return ServerlessPresets.vercel(databaseUrl, projectRef)
  }
}

/**
 * Cleanup the serverless connection.
 * Call this before the function terminates to ensure proper cleanup.
 */
export async function cleanupServerlessConnection(): Promise<void> {
  if (cachedConnection) {
    try {
      await cachedConnection.destroy()
      logger.debug("Database connection cleaned up")
    } catch (error) {
      logger.warn(`Error cleaning up database connection: ${(error as Error).message}`)
    }
    cachedConnection = null
  }
}

/**
 * Check if running in a serverless environment.
 */
export function isServerlessEnvironment(): boolean {
  return (
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.VERCEL ||
    !!process.env.NETLIFY ||
    !!process.env.CF_WORKER ||
    !!process.env.SUPABASE_URL ||
    !!process.env.DENO_DEPLOYMENT_ID ||
    !!process.env.LOVABLE_PROJECT_ID ||
    !!process.env.LOVABLE_CLOUD ||
    !!process.env.MEDUSA_SERVERLESS
  )
}

/**
 * Get cold start status.
 */
export function isColdStart(): boolean {
  return !isWarm
}

/**
 * Mark as warm (for manual warm-up scenarios).
 */
export function markAsWarm(): void {
  isWarm = true
}
