/**
 * Serverless platform types supported by Medusa.
 */
export type ServerlessPlatform =
  | "supabase-edge"
  | "vercel"
  | "aws-lambda"
  | "cloudflare-workers"
  | "netlify"
  | "custom"

/**
 * Serverless-specific configuration options.
 */
export interface ServerlessOptions {
  /**
   * Enable serverless mode. When true, optimizes connection pooling,
   * session handling, and other settings for serverless environments.
   */
  enabled: boolean

  /**
   * The serverless platform being used. Helps apply platform-specific
   * optimizations.
   */
  platform?: ServerlessPlatform

  /**
   * Supabase-specific configuration.
   */
  supabase?: SupabaseServerlessOptions

  /**
   * Database connection pool settings optimized for serverless.
   * These override the default pool settings when serverless mode is enabled.
   */
  pool?: ServerlessPoolOptions

  /**
   * Timeout in milliseconds for serverless function execution.
   * Default: 30000 (30 seconds)
   */
  timeout?: number

  /**
   * Whether to disable background jobs in serverless mode.
   * Recommended: true for serverless, as jobs should run in separate workers.
   * Default: true
   */
  disableJobs?: boolean

  /**
   * Whether to disable real-time subscriptions in serverless mode.
   * Default: true
   */
  disableSubscriptions?: boolean

  /**
   * Custom initialization callback called after the app is initialized.
   * Useful for warming up connections or caches.
   */
  onInit?: () => Promise<void>

  /**
   * Custom cleanup callback called before the serverless function terminates.
   */
  onCleanup?: () => Promise<void>
}

/**
 * Supabase-specific serverless configuration.
 */
export interface SupabaseServerlessOptions {
  /**
   * Supabase project reference (e.g., "your-project-ref").
   * Used to construct the connection pooler URL.
   */
  projectRef?: string

  /**
   * Whether to use Supabase's built-in connection pooler (PgBouncer).
   * Default: true
   */
  usePooler?: boolean

  /**
   * Use session mode instead of transaction mode for the pooler.
   * Session mode maintains state but uses more connections.
   * Default: false (transaction mode)
   */
  useSessionMode?: boolean

  /**
   * Supabase anon key for client-side authentication.
   */
  anonKey?: string

  /**
   * Supabase service role key for server-side operations.
   */
  serviceRoleKey?: string

  /**
   * Whether to use Supabase Auth for session management.
   * Default: false
   */
  useSupabaseAuth?: boolean
}

/**
 * Connection pool options optimized for serverless environments.
 */
export interface ServerlessPoolOptions {
  /**
   * Minimum number of connections in the pool.
   * Default: 0 (no idle connections)
   */
  min?: number

  /**
   * Maximum number of connections in the pool.
   * Default: 1 for serverless
   */
  max?: number

  /**
   * Time in milliseconds before idle connections are closed.
   * Default: 1000 for serverless
   */
  idleTimeoutMillis?: number

  /**
   * Time in milliseconds to wait for a connection to be acquired.
   * Default: 10000 for serverless
   */
  acquireTimeoutMillis?: number

  /**
   * Time in milliseconds to wait for a connection to be created.
   * Default: 10000 for serverless
   */
  createTimeoutMillis?: number

  /**
   * Interval in milliseconds for reaping idle connections.
   * Default: 500 for serverless
   */
  reapIntervalMillis?: number
}

/**
 * Extended project configuration with serverless options.
 */
export interface ServerlessProjectConfig {
  /**
   * Serverless-specific configuration.
   */
  serverless?: ServerlessOptions
}

/**
 * Warm-up configuration for reducing cold start times.
 */
export interface WarmUpOptions {
  /**
   * Whether to perform a database health check on init.
   * Default: true
   */
  checkDatabase?: boolean

  /**
   * Whether to preload common modules.
   * Default: true
   */
  preloadModules?: boolean

  /**
   * Custom warm-up function.
   */
  custom?: () => Promise<void>
}

/**
 * Result of serverless initialization.
 */
export interface ServerlessInitResult {
  /**
   * Whether initialization was successful.
   */
  success: boolean

  /**
   * Time taken to initialize in milliseconds.
   */
  initTime: number

  /**
   * Whether this was a cold start.
   */
  coldStart: boolean

  /**
   * Any warnings during initialization.
   */
  warnings?: string[]

  /**
   * Cleanup function to call before function termination.
   */
  cleanup: () => Promise<void>
}
