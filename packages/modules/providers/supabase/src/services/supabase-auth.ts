import crypto from "crypto"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from "@medusajs/framework/types"
import {
  AbstractAuthModuleProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import { SupabaseAuthProviderOptions } from "../types"

type InjectedDependencies = {
  logger: Logger
}

/**
 * Supabase Auth Provider for Medusa
 *
 * Supports:
 * - Email/password authentication via Supabase Auth
 * - OAuth providers (Google, GitHub, etc.) via Supabase
 * - Magic link authentication
 *
 * @example
 * ```typescript
 * // medusa-config.ts
 * export default defineConfig({
 *   modules: [
 *     {
 *       resolve: "@medusajs/medusa/auth",
 *       options: {
 *         providers: [
 *           {
 *             resolve: "@medusajs/supabase",
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
export class SupabaseAuthService extends AbstractAuthModuleProvider {
  static identifier = "supabase"
  static DISPLAY_NAME = "Supabase Authentication"

  protected config_: SupabaseAuthProviderOptions
  protected logger_: Logger
  protected client_: SupabaseClient

  static validateOptions(options: SupabaseAuthProviderOptions) {
    if (!options.url) {
      throw new Error("Supabase url is required")
    }

    if (!options.anonKey) {
      throw new Error("Supabase anonKey is required")
    }
  }

  constructor(
    { logger }: InjectedDependencies,
    options: SupabaseAuthProviderOptions
  ) {
    // @ts-ignore
    super(...arguments)
    this.config_ = options
    this.logger_ = logger

    // Initialize Supabase client without session persistence (server-side)
    this.client_ = createClient(options.url, options.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  /**
   * Authenticate user via email/password or initiate OAuth flow
   */
  async authenticate(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const query: Record<string, string> = req.query ?? {}
    const body: Record<string, string> = req.body ?? {}

    // Handle OAuth error callback
    if (query.error) {
      return {
        success: false,
        error: query.error_description || query.error,
      }
    }

    const { email, password, provider } = body

    // OAuth flow - redirect to Supabase OAuth
    if (provider && provider !== "email") {
      return this.initiateOAuthFlow(provider, body, authIdentityService)
    }

    // Email/password flow
    if (!email || !password) {
      return {
        success: false,
        error: "Email and password are required",
      }
    }

    try {
      const { data, error } = await this.client_.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        this.logger_.debug(`[supabase-auth] Login failed: ${error.message}`)
        return { success: false, error: error.message }
      }

      if (!data.user || !data.session) {
        return { success: false, error: "Authentication failed" }
      }

      return this.handleSuccessfulAuth(
        data.user,
        data.session,
        authIdentityService
      )
    } catch (error: any) {
      this.logger_.error(`[supabase-auth] Error: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Register new user via Supabase Auth
   */
  async register(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const { email, password } = req.body ?? {}

    if (!email || typeof email !== "string") {
      return { success: false, error: "Email should be a string" }
    }

    if (!password || typeof password !== "string") {
      return { success: false, error: "Password should be a string" }
    }

    try {
      // Check if identity already exists
      try {
        await authIdentityService.retrieve({ entity_id: email })
        return { success: false, error: "Identity with email already exists" }
      } catch (retrieveError: any) {
        if (retrieveError.type !== MedusaError.Types.NOT_FOUND) {
          return { success: false, error: retrieveError.message }
        }
      }

      // Create user in Supabase
      const { data, error } = await this.client_.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: this.config_.auth?.callbackUrl,
        },
      })

      if (error) {
        this.logger_.debug(`[supabase-auth] Registration failed: ${error.message}`)
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: "User creation failed" }
      }

      // Create Medusa auth identity linked to Supabase user
      const authIdentity = await authIdentityService.create({
        entity_id: email,
        user_metadata: {
          supabase_user_id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        },
        provider_metadata: {
          supabase_user_id: data.user.id,
        },
      })

      // Remove sensitive data before returning
      const copy = JSON.parse(JSON.stringify(authIdentity))
      return { success: true, authIdentity: copy }
    } catch (error: any) {
      this.logger_.error(`[supabase-auth] Registration error: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Validate OAuth callback from Supabase
   */
  async validateCallback(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const query: Record<string, string> = req.query ?? {}
    const body: Record<string, string> = req.body ?? {}

    // Handle error from OAuth provider
    if (query.error) {
      return {
        success: false,
        error: query.error_description || query.error,
      }
    }

    const code = query.code ?? body.code
    if (!code) {
      return { success: false, error: "Authorization code is required" }
    }

    // Verify state if provided
    const stateKey = query.state
    if (stateKey) {
      const state = await authIdentityService.getState(stateKey)
      if (!state) {
        return { success: false, error: "Invalid state or session expired" }
      }
    }

    try {
      // Exchange code for session
      const { data, error } = await this.client_.auth.exchangeCodeForSession(
        code
      )

      if (error) {
        this.logger_.debug(`[supabase-auth] Token exchange failed: ${error.message}`)
        return { success: false, error: error.message }
      }

      if (!data.user || !data.session) {
        return { success: false, error: "Failed to exchange code for session" }
      }

      return this.handleSuccessfulAuth(
        data.user,
        data.session,
        authIdentityService
      )
    } catch (error: any) {
      this.logger_.error(`[supabase-auth] Callback error: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update auth identity (e.g., password reset)
   */
  async update(
    data: Record<string, unknown>,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const { entity_id, password } = data

    if (!entity_id || typeof entity_id !== "string") {
      return {
        success: false,
        error: "entity_id is required for update",
      }
    }

    try {
      // If password update is requested
      if (password && typeof password === "string") {
        // Get the auth identity to find Supabase user ID
        const authIdentity = await authIdentityService.retrieve({
          entity_id,
        })

        const providerIdentity = authIdentity.provider_identities?.find(
          (pi) => pi.provider === this.provider
        )
        const supabaseUserId = providerIdentity?.provider_metadata?.supabase_user_id

        if (!supabaseUserId) {
          return {
            success: false,
            error: "No Supabase user linked to this identity",
          }
        }

        // Update password via Supabase admin API requires service role key
        if (this.config_.serviceRoleKey) {
          const adminClient = createClient(
            this.config_.url,
            this.config_.serviceRoleKey,
            { auth: { persistSession: false } }
          )

          const { error } = await adminClient.auth.admin.updateUserById(
            supabaseUserId as string,
            { password }
          )

          if (error) {
            return { success: false, error: error.message }
          }
        } else {
          return {
            success: false,
            error: "Service role key required for password update",
          }
        }
      }

      // Return success with updated identity
      const updatedIdentity = await authIdentityService.retrieve({
        entity_id,
      })

      return { success: true, authIdentity: updatedIdentity }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Send magic link for passwordless authentication
   */
  async sendMagicLink(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config_.auth?.enableMagicLink) {
      return { success: false, error: "Magic link authentication is not enabled" }
    }

    try {
      const { error } = await this.client_.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: this.config_.auth?.callbackUrl,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Initiate OAuth flow with Supabase
   */
  private async initiateOAuthFlow(
    provider: string,
    body: Record<string, string>,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const callbackUrl = body.callback_url ?? this.config_.auth?.callbackUrl

    if (!callbackUrl) {
      return {
        success: false,
        error: "Callback URL is required for OAuth flow",
      }
    }

    // Generate state for CSRF protection
    const stateKey = crypto.randomBytes(32).toString("hex")
    const state = { callback_url: callbackUrl }

    await authIdentityService.setState(stateKey, state)

    try {
      const { data, error } = await this.client_.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            state: stateKey,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.url) {
        return { success: false, error: "Failed to generate OAuth URL" }
      }

      return { success: true, location: data.url }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle successful authentication - create or update auth identity
   */
  private async handleSuccessfulAuth(
    user: any,
    session: any,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    // Use email as entity_id for consistency with emailpass provider
    const entityId = user.email || user.id

    const userMetadata = {
      supabase_user_id: user.id,
      email: user.email,
      email_verified: !!user.email_confirmed_at,
      avatar_url: user.user_metadata?.avatar_url,
      full_name: user.user_metadata?.full_name,
    }

    const providerMetadata = {
      supabase_user_id: user.id,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      provider: user.app_metadata?.provider,
    }

    let authIdentity

    try {
      // Try to update existing identity
      authIdentity = await authIdentityService.update(entityId, {
        user_metadata: userMetadata,
        provider_metadata: providerMetadata,
      })
    } catch (error: any) {
      if (error.type === MedusaError.Types.NOT_FOUND) {
        // Create new identity
        authIdentity = await authIdentityService.create({
          entity_id: entityId,
          user_metadata: userMetadata,
          provider_metadata: providerMetadata,
        })
      } else {
        return { success: false, error: error.message }
      }
    }

    // Remove sensitive tokens from response
    const copy = JSON.parse(JSON.stringify(authIdentity))
    const providerIdentity = copy.provider_identities?.find(
      (pi: any) => pi.provider === this.provider
    )
    if (providerIdentity?.provider_metadata) {
      delete providerIdentity.provider_metadata.access_token
      delete providerIdentity.provider_metadata.refresh_token
    }

    return { success: true, authIdentity: copy }
  }
}
