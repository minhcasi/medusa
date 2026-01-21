/**
 * Derives a PostgreSQL connection string from a Supabase project URL
 *
 * @param supabaseUrl - Supabase project URL (e.g., https://your-project.supabase.co)
 * @param password - Database password (usually from service role key or separate env var)
 * @returns PostgreSQL connection string
 */
export function deriveConnectionString(
  supabaseUrl: string,
  password?: string
): string {
  const url = new URL(supabaseUrl)
  const projectRef = url.hostname.split(".")[0]

  // Default Supabase PostgreSQL connection format
  // Password should be provided via environment variable DATABASE_URL or separately
  const dbPassword = password ?? "[YOUR-PASSWORD]"
  return `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${getRegion(projectRef)}.pooler.supabase.com:5432/postgres`
}

/**
 * Attempts to get region from project ref (simplified - real implementation would use API)
 * For now, defaults to common regions
 */
function getRegion(_projectRef: string): string {
  // In production, this would be determined from the Supabase API or config
  // Default to us-east-1 as most common
  return "us-east-1"
}

/**
 * Applies the correct port based on pool mode
 *
 * @param connectionString - Original connection string
 * @param poolMode - Pool mode ('session' or 'transaction')
 * @returns Connection string with correct port
 */
export function applyPoolModePort(
  connectionString: string,
  poolMode: "session" | "transaction"
): string {
  const port = poolMode === "transaction" ? 6543 : 5432

  try {
    const url = new URL(connectionString)
    url.port = port.toString()
    return url.toString()
  } catch {
    // If URL parsing fails, try regex replacement
    return connectionString.replace(/:(\d+)\//, `:${port}/`)
  }
}

/**
 * Validates that a connection string looks like a valid Supabase PostgreSQL URL
 *
 * @param connectionString - Connection string to validate
 * @returns true if valid Supabase format
 */
export function isValidSupabaseConnectionString(
  connectionString: string
): boolean {
  try {
    const url = new URL(connectionString)
    return (
      url.protocol === "postgresql:" &&
      (url.hostname.includes("supabase.co") ||
        url.hostname.includes("supabase.com") ||
        url.hostname.includes("pooler.supabase.com"))
    )
  } catch {
    return false
  }
}

/**
 * Extracts project reference from Supabase URL
 *
 * @param supabaseUrl - Supabase project URL
 * @returns Project reference string
 */
export function extractProjectRef(supabaseUrl: string): string | null {
  try {
    const url = new URL(supabaseUrl)
    const parts = url.hostname.split(".")
    if (parts.length >= 2 && parts[1] === "supabase") {
      return parts[0]
    }
    return null
  } catch {
    return null
  }
}
