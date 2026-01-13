import { ModuleServiceInitializeOptions } from "@medusajs/types"
import { knex } from "@medusajs/deps/mikro-orm/postgresql"

type Options = ModuleServiceInitializeOptions["database"] & {
  /**
   * Whether to use Supabase's connection pooler (Transaction mode).
   * When true, optimizes connection settings for serverless environments.
   */
  useSupabasePooler?: boolean
  /**
   * Supabase project reference (e.g., "your-project-ref")
   * Used to construct the pooler URL if not explicitly provided.
   */
  supabaseProjectRef?: string
  /**
   * Use session mode instead of transaction mode for the pooler.
   * Session mode maintains state across queries but uses more connections.
   */
  useSessionMode?: boolean
}

/**
 * Default pool settings optimized for serverless environments.
 * - min: 0 - Don't maintain idle connections (cold start friendly)
 * - max: 1 - Single connection per function instance
 * - idleTimeoutMillis: 1000 - Quick cleanup of idle connections
 * - acquireTimeoutMillis: 10000 - Reasonable acquire timeout
 */
const SERVERLESS_POOL_DEFAULTS = {
  min: 0,
  max: 1,
  idleTimeoutMillis: 1000,
  acquireTimeoutMillis: 10000,
  createTimeoutMillis: 10000,
  reapIntervalMillis: 500,
  propagateCreateError: false,
}

/**
 * Transforms a direct Supabase database URL to use the connection pooler.
 *
 * Direct connection: postgres://user:pass@db.xxx.supabase.co:5432/postgres
 * Pooler (Transaction): postgres://user:pass@xxx.pooler.supabase.com:6543/postgres
 * Pooler (Session): postgres://user:pass@xxx.pooler.supabase.com:5432/postgres
 *
 * @param directUrl - The direct database connection URL
 * @param projectRef - The Supabase project reference
 * @param useSessionMode - Whether to use session mode (port 5432) instead of transaction mode (port 6543)
 */
export function transformToPoolerUrl(
  directUrl: string,
  projectRef?: string,
  useSessionMode = false
): string {
  try {
    const url = new URL(directUrl)

    // Extract project ref from hostname if not provided
    // Format: db.{project-ref}.supabase.co
    if (!projectRef) {
      const hostParts = url.hostname.split(".")
      if (hostParts[0] === "db" && hostParts.length >= 3) {
        projectRef = hostParts[1]
      }
    }

    if (!projectRef) {
      // Can't transform without project ref, return original
      return directUrl
    }

    // Construct pooler URL
    const poolerPort = useSessionMode ? "5432" : "6543"
    url.hostname = `${projectRef}.pooler.supabase.com`
    url.port = poolerPort

    return url.toString()
  } catch {
    // If URL parsing fails, return original
    return directUrl
  }
}

/**
 * Creates a PostgreSQL connection optimized for Supabase serverless environments.
 *
 * Key optimizations:
 * - Uses Supabase's built-in connection pooler (PgBouncer)
 * - Minimal connection pool (0-1 connections)
 * - Quick idle timeout for serverless lifecycle
 * - SSL enabled by default for Supabase
 * - Prepared statements disabled for transaction mode pooler compatibility
 *
 * @param options - Connection options including Supabase-specific settings
 * @returns Knex instance configured for serverless
 */
export function createSupabaseConnection(options: Options) {
  const {
    pool,
    schema = "public",
    clientUrl,
    driverOptions,
    useSupabasePooler = true,
    supabaseProjectRef,
    useSessionMode = false,
  } = options

  // Transform to pooler URL if using Supabase pooler
  let connectionUrl = clientUrl
  if (useSupabasePooler && clientUrl) {
    connectionUrl = transformToPoolerUrl(
      clientUrl,
      supabaseProjectRef,
      useSessionMode
    )
  }

  // Default SSL settings for Supabase (always uses SSL in production)
  const ssl =
    driverOptions?.ssl ??
    driverOptions?.connection?.ssl ?? {
      rejectUnauthorized: false,
    }

  // Shorter timeouts for serverless cold starts
  const connectionTimeoutMillis =
    driverOptions?.connectionTimeoutMillis ??
    driverOptions?.connection?.connectionTimeoutMillis ??
    10000

  // Disable keepalive for serverless (connections are short-lived)
  const keepAlive =
    driverOptions?.keepAlive ?? driverOptions?.connection?.keepAlive ?? false

  // Merge pool settings with serverless defaults
  const poolConfig = {
    ...SERVERLESS_POOL_DEFAULTS,
    ...(pool ?? {}),
  }

  const knexConfig: any = {
    client: "pg",
    searchPath: schema,
    connection: {
      connectionString: connectionUrl,
      ssl,
      connectionTimeoutMillis,
      keepAlive,
      // Disable statement timeout for complex queries
      statement_timeout:
        (driverOptions?.statement_timeout as number) ?? 30000,
      // Idle timeout in transaction
      idle_in_transaction_session_timeout:
        (driverOptions?.idle_in_transaction_session_timeout as number) ?? 30000,
    },
    pool: poolConfig,
    // Disable native bindings for better serverless compatibility
    acquireConnectionTimeout: 10000,
  }

  // When using transaction mode pooler, prepared statements must be disabled
  // as the connection may be different for each query
  if (useSupabasePooler && !useSessionMode) {
    knexConfig.pool.afterCreate = (conn: any, done: any) => {
      // Disable prepared statements for PgBouncer transaction mode
      conn.query("SET plan_cache_mode = force_generic_plan", (err: any) => {
        // Ignore error if setting doesn't exist (older PostgreSQL versions)
        done(err && err.code !== "42704" ? err : null, conn)
      })
    }
  }

  return knex<any, any>(knexConfig)
}

/**
 * Configuration preset for Supabase Edge Functions.
 * These are Deno-based serverless functions with very short execution times.
 */
export const SUPABASE_EDGE_FUNCTION_POOL = {
  min: 0,
  max: 1,
  idleTimeoutMillis: 500,
  acquireTimeoutMillis: 5000,
  createTimeoutMillis: 5000,
  reapIntervalMillis: 250,
}

/**
 * Configuration preset for Vercel/AWS Lambda functions.
 * These have slightly longer execution times and warm instances.
 */
export const LAMBDA_FUNCTION_POOL = {
  min: 0,
  max: 3,
  idleTimeoutMillis: 2000,
  acquireTimeoutMillis: 15000,
  createTimeoutMillis: 15000,
  reapIntervalMillis: 1000,
}

/**
 * Configuration preset for Lovable Cloud.
 * Lovable Cloud uses Supabase Edge Functions under the hood with
 * managed PostgreSQL database and automatic scaling.
 */
export const LOVABLE_CLOUD_POOL = {
  min: 0,
  max: 1,
  idleTimeoutMillis: 500,
  acquireTimeoutMillis: 5000,
  createTimeoutMillis: 5000,
  reapIntervalMillis: 250,
}

/**
 * Connection options builder for common serverless platforms.
 */
export const ServerlessPresets = {
  /**
   * Preset for Supabase Edge Functions (Deno runtime)
   */
  supabaseEdge: (databaseUrl: string, projectRef?: string): Options => ({
    clientUrl: databaseUrl,
    schema: "public",
    useSupabasePooler: true,
    supabaseProjectRef: projectRef,
    useSessionMode: false,
    pool: SUPABASE_EDGE_FUNCTION_POOL,
    driverOptions: {
      ssl: { rejectUnauthorized: false },
    },
  }),

  /**
   * Preset for Vercel Serverless Functions
   */
  vercel: (databaseUrl: string, projectRef?: string): Options => ({
    clientUrl: databaseUrl,
    schema: "public",
    useSupabasePooler: true,
    supabaseProjectRef: projectRef,
    useSessionMode: false,
    pool: LAMBDA_FUNCTION_POOL,
    driverOptions: {
      ssl: { rejectUnauthorized: false },
    },
  }),

  /**
   * Preset for AWS Lambda Functions
   */
  awsLambda: (databaseUrl: string, projectRef?: string): Options => ({
    clientUrl: databaseUrl,
    schema: "public",
    useSupabasePooler: true,
    supabaseProjectRef: projectRef,
    useSessionMode: false,
    pool: LAMBDA_FUNCTION_POOL,
    driverOptions: {
      ssl: { rejectUnauthorized: false },
    },
  }),

  /**
   * Preset for Cloudflare Workers (Note: requires specific pg driver)
   */
  cloudflareWorkers: (databaseUrl: string, projectRef?: string): Options => ({
    clientUrl: databaseUrl,
    schema: "public",
    useSupabasePooler: true,
    supabaseProjectRef: projectRef,
    useSessionMode: false,
    pool: {
      min: 0,
      max: 1,
      idleTimeoutMillis: 100,
      acquireTimeoutMillis: 3000,
      createTimeoutMillis: 3000,
    },
    driverOptions: {
      ssl: { rejectUnauthorized: false },
    },
  }),

  /**
   * Preset for Lovable Cloud (https://lovable.dev)
   * Lovable Cloud uses Supabase infrastructure with managed PostgreSQL.
   * Optimized for Lovable's serverless function runtime.
   */
  lovableCloud: (databaseUrl: string, projectRef?: string): Options => ({
    clientUrl: databaseUrl,
    schema: "public",
    useSupabasePooler: true,
    supabaseProjectRef: projectRef,
    useSessionMode: false,
    pool: LOVABLE_CLOUD_POOL,
    driverOptions: {
      ssl: { rejectUnauthorized: false },
    },
  }),
}
