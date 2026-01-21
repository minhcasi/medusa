/**
 * Configuration options for Supabase database provider
 */
export interface SupabaseProviderOptions {
  /**
   * Supabase project URL
   * @example "https://your-project.supabase.co"
   */
  url: string

  /**
   * Supabase anonymous (public) key - safe for client-side
   */
  anonKey?: string

  /**
   * Supabase service role key - server-side only, bypasses RLS
   */
  serviceRoleKey?: string

  /**
   * JWT secret for token validation
   */
  jwtSecret?: string

  /**
   * Database connection options
   */
  database?: SupabaseDatabaseOptions
}

export interface SupabaseDatabaseOptions {
  /**
   * Direct PostgreSQL connection string
   * Overrides URL-derived connection if provided
   * @example "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
   */
  connectionString?: string

  /**
   * Connection pool mode
   * - 'session': Port 5432, exclusive connection per client (default)
   * - 'transaction': Port 6543, shared connections, disables prepared statements
   */
  poolMode?: "session" | "transaction"

  /**
   * Database schema to use
   * @default "public"
   */
  schema?: string

  /**
   * Connection pool configuration
   */
  pool?: SupabasePoolOptions
}

export interface SupabasePoolOptions {
  /**
   * Minimum number of connections in pool
   * @default 2
   */
  min?: number

  /**
   * Maximum number of connections in pool
   * @default 10
   */
  max?: number

  /**
   * Idle connection timeout in milliseconds
   */
  idleTimeoutMillis?: number

  /**
   * Interval to check for idle connections in milliseconds
   */
  reapIntervalMillis?: number

  /**
   * Retry interval for creating connections in milliseconds
   */
  createRetryIntervalMillis?: number
}

/**
 * Loader options passed to the connection loader
 */
export interface SupabaseLoaderOptions {
  container: any
  logger: any
  options: SupabaseProviderOptions
}

/**
 * Configuration options for Supabase Auth provider
 */
export interface SupabaseAuthProviderOptions {
  /**
   * Supabase project URL
   * @example "https://your-project.supabase.co"
   */
  url: string

  /**
   * Supabase anonymous (public) key - safe for client-side
   */
  anonKey: string

  /**
   * Supabase service role key - server-side only, bypasses RLS
   * Used for admin operations
   */
  serviceRoleKey?: string

  /**
   * JWT secret for server-side token validation
   * Required for validating tokens without API call
   */
  jwtSecret?: string

  /**
   * Auth configuration options
   */
  auth?: SupabaseAuthOptions
}

export interface SupabaseAuthOptions {
  /**
   * Enable magic link authentication
   * @default false
   */
  enableMagicLink?: boolean

  /**
   * Callback URL for OAuth redirects
   * @example "http://localhost:9000/auth/supabase/callback"
   */
  callbackUrl?: string
}
