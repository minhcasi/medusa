import type {
  InternalModuleDeclaration,
  LoaderOptions,
  ModulesSdkTypes,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  createPgConnection,
  retryExecution,
  stringifyCircular,
} from "@medusajs/framework/utils"
import { SupabaseProviderOptions } from "../types"
import { applyPoolModePort, isValidSupabaseConnectionString } from "../utils"

/**
 * Validates Supabase configuration
 */
function validateSupabaseConfig(options: SupabaseProviderOptions): void {
  if (!options.database?.connectionString) {
    throw new Error(
      "[supabase] database.connectionString is required. " +
        "Provide the PostgreSQL connection URL from your Supabase project settings."
    )
  }

  const connectionString = options.database.connectionString

  // Check for placeholder password
  if (
    connectionString.includes("[YOUR-PASSWORD]") ||
    connectionString.includes("[PASSWORD]")
  ) {
    throw new Error(
      "[supabase] Connection string contains placeholder password. " +
        "Please replace with your actual database password."
    )
  }

  // Validate URL format
  try {
    new URL(connectionString)
  } catch {
    throw new Error(
      "[supabase] Invalid connection string format. " +
        "Expected: postgresql://user:password@host:port/database"
    )
  }

  // Warn if not a Supabase URL
  if (!isValidSupabaseConnectionString(connectionString)) {
    console.warn(
      "[supabase] Connection string does not appear to be a Supabase URL. " +
        "Expected hostname containing 'supabase.co' or 'supabase.com'."
    )
  }
}

/**
 * Supabase database connection loader
 *
 * Creates a Knex connection to Supabase PostgreSQL with:
 * - SSL enforced (required by Supabase)
 * - Pool mode support (session/transaction)
 * - Retry mechanism for connection failures
 *
 * This loader can be used standalone or the integration is automatically
 * handled by the framework when supabase config is present in medusa-config.
 */
export default async (
  {
    container,
    logger,
    options,
  }: LoaderOptions<
    (
      | ModulesSdkTypes.ModuleServiceInitializeOptions
      | ModulesSdkTypes.ModuleServiceInitializeCustomDataLayerOptions
    ) & { logger?: any }
  >,
  moduleDeclaration?: InternalModuleDeclaration
): Promise<void> => {
  const logger_ = logger ?? console

  const moduleOptions = (options ??
    moduleDeclaration?.options ??
    {}) as SupabaseProviderOptions

  // Validate configuration
  validateSupabaseConfig(moduleOptions)

  const connectionString = moduleOptions.database!.connectionString!
  const poolMode = moduleOptions.database?.poolMode ?? "session"
  const schema = moduleOptions.database?.schema ?? "public"

  // Apply correct port based on pool mode
  const clientUrl = applyPoolModePort(connectionString, poolMode)

  // Pool configuration with bounds validation
  const poolMin = Math.max(1, moduleOptions.database?.pool?.min ?? 2)
  const poolMax = Math.max(poolMin, moduleOptions.database?.pool?.max ?? 10)
  const idleTimeoutMillis = moduleOptions.database?.pool?.idleTimeoutMillis
  const reapIntervalMillis = moduleOptions.database?.pool?.reapIntervalMillis
  const createRetryIntervalMillis =
    moduleOptions.database?.pool?.createRetryIntervalMillis

  // Driver options with SSL enforced for Supabase
  // Note: rejectUnauthorized: false is needed for Supabase Supavisor pooler
  const driverOptions: any = {
    connection: {
      ssl: { rejectUnauthorized: false },
    },
  }

  // Disable prepared statements for transaction mode (required by Supabase pooler)
  if (poolMode === "transaction") {
    driverOptions.prepare = false
    logger_.info(
      "[supabase] Using transaction mode pooling - prepared statements disabled"
    )
  }

  logger_.info(`[supabase] Connecting to Supabase PostgreSQL (${poolMode} mode)`)

  const pgConnection = createPgConnection({
    clientUrl,
    schema,
    driverOptions,
    pool: {
      min: poolMin,
      max: poolMax,
      idleTimeoutMillis,
      reapIntervalMillis,
      createRetryIntervalMillis,
    },
  })

  // Retry configuration
  const maxRetries = process.env.__MEDUSA_DB_CONNECTION_MAX_RETRIES
    ? parseInt(process.env.__MEDUSA_DB_CONNECTION_MAX_RETRIES)
    : 5

  const retryDelay = process.env.__MEDUSA_DB_CONNECTION_RETRY_DELAY
    ? parseInt(process.env.__MEDUSA_DB_CONNECTION_RETRY_DELAY)
    : 1000

  // Test connection with retry
  await retryExecution(
    async () => {
      await pgConnection.raw("SELECT 1")
    },
    {
      maxRetries,
      retryDelay,
      onRetry: (error) => {
        logger_.warn(
          `[supabase] Connection failed, retrying...\n${stringifyCircular(error)}`
        )
      },
    }
  )

  logger_.info("[supabase] Connection established successfully")

  // Register connection in container
  container.register({
    [ContainerRegistrationKeys.PG_CONNECTION]: {
      resolve: () => pgConnection,
    },
    supabaseConfig: {
      resolve: () => moduleOptions,
    },
  })
}
