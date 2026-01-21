/**
 * @medusajs/supabase
 *
 * Supabase database and auth integration for Medusa.
 *
 * This package provides:
 * - Database connection utilities for Supabase PostgreSQL
 * - Auth provider for Supabase Authentication (email/password, OAuth, magic link)
 *
 * @example Database Configuration
 * ```typescript
 * // medusa-config.ts
 * export default defineConfig({
 *   projectConfig: {
 *     supabase: {
 *       database: {
 *         connectionString: process.env.SUPABASE_DATABASE_URL,
 *         poolMode: "session", // or "transaction" for serverless
 *       }
 *     }
 *   }
 * })
 * ```
 *
 * @example Auth Provider Configuration
 * ```typescript
 * // medusa-config.ts
 * export default defineConfig({
 *   modules: [
 *     {
 *       resolve: "@medusajs/medusa/auth",
 *       options: {
 *         providers: [
 *           {
 *             resolve: "@medusajs/supabase/auth",
 *             id: "supabase",
 *             options: {
 *               url: process.env.SUPABASE_URL,
 *               anonKey: process.env.SUPABASE_ANON_KEY,
 *               auth: {
 *                 callbackUrl: "http://localhost:9000/auth/supabase/callback",
 *               }
 *             }
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * })
 * ```
 */

import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { SupabaseAuthService } from "./services/supabase-auth"

// Export loader for direct usage (can be used as standalone loader)
export { default as supabaseConnectionLoader } from "./loaders/connection"

// Export auth service
export { SupabaseAuthService } from "./services/supabase-auth"

// Export types
export * from "./types"

// Export utilities
export * from "./utils"

// Auth provider module export
const services = [SupabaseAuthService]

export default ModuleProvider(Modules.AUTH, {
  services,
})
