/**
 * Example AWS Lambda Handler
 *
 * This file demonstrates how to deploy Medusa on AWS Lambda with Supabase as the database.
 *
 * Setup:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Get your database connection string from Supabase dashboard
 * 3. Set environment variables in Lambda:
 *    - DATABASE_URL: Your Supabase database URL
 *    - SUPABASE_PROJECT_REF: Your project reference
 *    - JWT_SECRET: A secure random string
 *    - COOKIE_SECRET: A secure random string
 *
 * Deployment options:
 * - AWS SAM (Serverless Application Model)
 * - Serverless Framework
 * - AWS CDK
 * - Terraform
 *
 * SAM template.yaml example:
 * ```yaml
 * AWSTemplateFormatVersion: '2010-09-09'
 * Transform: AWS::Serverless-2016-10-31
 *
 * Globals:
 *   Function:
 *     Timeout: 30
 *     MemorySize: 1024
 *     Runtime: nodejs18.x
 *
 * Resources:
 *   MedusaFunction:
 *     Type: AWS::Serverless::Function
 *     Properties:
 *       CodeUri: ./
 *       Handler: handler.main
 *       Events:
 *         Api:
 *           Type: HttpApi
 *           Properties:
 *             Path: /{proxy+}
 *             Method: ANY
 *       Environment:
 *         Variables:
 *           DATABASE_URL: !Ref DatabaseUrl
 *           SUPABASE_PROJECT_REF: !Ref SupabaseProjectRef
 * ```
 */

import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda"
import {
  initializeServerlessApp,
  createServerlessHandler,
  cleanupServerlessApp,
} from "@medusajs/framework/serverless"

// Cache the handler between invocations (warm starts)
let handler: ReturnType<typeof createServerlessHandler> | null = null

/**
 * Main Lambda handler function.
 */
export async function main(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Prevent Lambda from waiting for event loop to empty
  context.callbackWaitsForEmptyEventLoop = false

  try {
    // Initialize on first request (cold start)
    if (!handler) {
      const app = await initializeServerlessApp({
        platform: "aws-lambda",
        supabase: {
          projectRef: process.env.SUPABASE_PROJECT_REF,
          usePooler: true,
          useSessionMode: false,
        },
        pool: {
          min: 0,
          max: 3,
          idleTimeoutMillis: 2000,
          acquireTimeoutMillis: 15000,
        },
        timeout: 25000, // Leave buffer before Lambda timeout
      })
      handler = createServerlessHandler(app)
    }

    // Execute handler
    return await handler(event, context)
  } catch (error) {
    console.error("Lambda handler error:", error)

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Internal Server Error",
        message:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      }),
      isBase64Encoded: false,
    }
  }
}

/**
 * Warm-up handler for scheduled events.
 * Configure a CloudWatch Event to call this periodically (e.g., every 5 minutes)
 * to keep the Lambda function warm and reduce cold starts.
 *
 * CloudWatch Event example:
 * ```yaml
 * WarmUpRule:
 *   Type: AWS::Events::Rule
 *   Properties:
 *     ScheduleExpression: rate(5 minutes)
 *     Targets:
 *       - Arn: !GetAtt MedusaFunction.Arn
 *         Id: WarmUp
 *         Input: '{"warmUp": true}'
 * ```
 */
export async function warmUp(event: any): Promise<void> {
  // Check if this is a warm-up event
  if (event.warmUp) {
    console.log("Warm-up event received")

    // Initialize the app to warm the connection
    await initializeServerlessApp({ platform: "aws-lambda" })

    console.log("Warm-up complete")
    return
  }

  // Otherwise, process as normal request
  await main(event, {} as Context)
}

/**
 * Cleanup handler for graceful shutdown.
 * Called when Lambda is being terminated.
 */
export async function cleanup(): Promise<void> {
  await cleanupServerlessApp()
}
