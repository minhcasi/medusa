import {
  ContainerRegistrationKeys,
  ModulesSdkUtils,
  retryExecution,
  stringifyCircular,
} from "@medusajs/utils"
import { asValue } from "../deps/awilix"
import { configManager } from "../config"
import { container } from "../container"
import { logger } from "../logger"

/**
 * Applies the correct port based on Supabase pool mode
 */
function applySupabasePoolModePort(
  connectionString: string,
  poolMode: "session" | "transaction"
): string {
  const port = poolMode === "transaction" ? 6543 : 5432
  try {
    const url = new URL(connectionString)
    url.port = port.toString()
    return url.toString()
  } catch {
    return connectionString.replace(/:(\d+)\//, `:${port}/`)
  }
}

/**
 * Initialize a knex connection that can then be shared to any resources if needed
 */
export async function pgConnectionLoader(): Promise<
  ReturnType<typeof ModulesSdkUtils.createPgConnection>
> {
  if (container.hasRegistration(ContainerRegistrationKeys.PG_CONNECTION)) {
    return container.resolve(
      ContainerRegistrationKeys.PG_CONNECTION
    ) as unknown as ReturnType<typeof ModulesSdkUtils.createPgConnection>
  }

  const configModule = configManager.config

  // Check for Supabase configuration
  const supabaseConfig = (configModule.projectConfig as any).supabase
  if (supabaseConfig?.database?.connectionString) {
    logger.info("[supabase] Supabase configuration detected, using Supabase PostgreSQL")
    return loadSupabaseConnection(supabaseConfig)
  }

  // Share a knex connection to be consumed by the shared modules
  const connectionString = configModule.projectConfig.databaseUrl
  const driverOptions: any = {
    ...(configModule.projectConfig.databaseDriverOptions || {}),
  }
  const schema = configModule.projectConfig.databaseSchema || "public"
  const idleTimeoutMillis = driverOptions.pool?.idleTimeoutMillis ?? undefined // prevent null to be passed
  const poolMin = driverOptions.pool?.min ?? 2
  const poolMax = driverOptions.pool?.max
  const reapIntervalMillis = driverOptions.pool?.reapIntervalMillis ?? undefined
  const createRetryIntervalMillis =
    driverOptions.pool?.createRetryIntervalMillis ?? undefined

  delete driverOptions.pool

  const clientUrl = connectionString?.replace(
    /(\?|&)ssl_mode=[^&]*(&|$)/gi,
    (match, prefix, suffix) => {
      if (prefix === "?" && suffix === "&") return "?"
      if (prefix === "?" && suffix === "") return ""
      if (prefix === "&") return suffix
      return ""
    }
  )

  const pgConnection = ModulesSdkUtils.createPgConnection({
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

  const maxRetries = process.env.__MEDUSA_DB_CONNECTION_MAX_RETRIES
    ? parseInt(process.env.__MEDUSA_DB_CONNECTION_MAX_RETRIES)
    : 5

  const retryDelay = process.env.__MEDUSA_DB_CONNECTION_RETRY_DELAY
    ? parseInt(process.env.__MEDUSA_DB_CONNECTION_RETRY_DELAY)
    : 1000

  await retryExecution(
    async () => {
      await pgConnection.raw("SELECT 1")
    },
    {
      maxRetries,
      retryDelay,
      onRetry: (error) => {
        logger.warn(
          `Pg connection failed to connect to the database. Retrying...\n${stringifyCircular(
            error
          )}`
        )
      },
    }
  )

  container.register(
    ContainerRegistrationKeys.PG_CONNECTION,
    asValue(pgConnection)
  )

  return pgConnection
}

/**
 * Validates Supabase connection string format
 */
function validateSupabaseConnectionString(connectionString: string): void {
  if (!connectionString) {
    throw new Error("[supabase] database.connectionString is required")
  }

  // Check for placeholder password
  if (connectionString.includes("[YOUR-PASSWORD]") || connectionString.includes("[PASSWORD]")) {
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
}

/**
 * Load Supabase PostgreSQL connection
 * Handles Supabase-specific configuration including:
 * - SSL enforcement (required by Supabase)
 * - Pool mode (session/transaction)
 * - Prepared statement handling
 */
async function loadSupabaseConnection(
  supabaseConfig: any
): Promise<ReturnType<typeof ModulesSdkUtils.createPgConnection>> {
  const connectionString = supabaseConfig.database.connectionString

  // Validate connection string
  validateSupabaseConnectionString(connectionString)

  const poolMode = supabaseConfig.database?.poolMode ?? "session"
  const schema = supabaseConfig.database?.schema ?? "public"

  // Apply correct port based on pool mode
  const clientUrl = applySupabasePoolModePort(connectionString, poolMode)

  // Pool configuration with bounds validation
  const poolMin = Math.max(1, supabaseConfig.database?.pool?.min ?? 2)
  const poolMax = Math.max(poolMin, supabaseConfig.database?.pool?.max ?? 10)
  const idleTimeoutMillis = supabaseConfig.database?.pool?.idleTimeoutMillis
  const reapIntervalMillis = supabaseConfig.database?.pool?.reapIntervalMillis
  const createRetryIntervalMillis =
    supabaseConfig.database?.pool?.createRetryIntervalMillis

  // Driver options with SSL enforced for Supabase
  // Note: rejectUnauthorized: false is needed for Supabase Supavisor pooler
  // which uses certificates that may not be in the system trust store.
  // For direct connections, ssl: true can be used instead.
  const sslConfig = supabaseConfig.database?.ssl ?? { rejectUnauthorized: false }
  const driverOptions: any = {
    connection: {
      ssl: sslConfig,
    },
  }

  // Disable prepared statements for transaction mode (required by Supabase pooler)
  if (poolMode === "transaction") {
    driverOptions.prepare = false
    logger.info(
      "[supabase] Using transaction mode pooling - prepared statements disabled"
    )
  }

  logger.info(`[supabase] Connecting to Supabase PostgreSQL (${poolMode} mode)`)

  const pgConnection = ModulesSdkUtils.createPgConnection({
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
        logger.warn(
          `[supabase] Connection failed, retrying...\n${stringifyCircular(error)}`
        )
      },
    }
  )

  logger.info("[supabase] Connection established successfully")

  container.register(
    ContainerRegistrationKeys.PG_CONNECTION,
    asValue(pgConnection)
  )

  return pgConnection
}
