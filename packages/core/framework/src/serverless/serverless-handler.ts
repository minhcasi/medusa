import { Express, Request, Response } from "express"
import { IncomingMessage, ServerResponse } from "http"
import { Socket } from "net"

/**
 * Serverless request event from various platforms.
 */
export interface ServerlessEvent {
  httpMethod?: string
  method?: string
  path?: string
  rawPath?: string
  headers?: Record<string, string | string[] | undefined>
  queryStringParameters?: Record<string, string | undefined> | null
  query?: Record<string, string | undefined>
  body?: string | null
  isBase64Encoded?: boolean
  rawBody?: string
  requestContext?: {
    http?: {
      method?: string
      path?: string
    }
  }
}

/**
 * Serverless context from various platforms.
 */
export interface ServerlessContext {
  functionName?: string
  awsRequestId?: string
  callbackWaitsForEmptyEventLoop?: boolean
  waitUntil?: (promise: Promise<any>) => void
  [key: string]: any
}

/**
 * Serverless response for AWS Lambda/API Gateway.
 */
export interface LambdaResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
  isBase64Encoded: boolean
}

/**
 * Creates a mock IncomingMessage from a serverless event.
 */
function createMockRequest(event: ServerlessEvent): IncomingMessage {
  const method =
    event.httpMethod ||
    event.method ||
    event.requestContext?.http?.method ||
    "GET"
  const path = event.path || event.rawPath || event.requestContext?.http?.path || "/"

  // Build query string
  const queryParams = event.queryStringParameters || event.query || {}
  const queryString = Object.entries(queryParams)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join("&")

  const url = queryString ? `${path}?${queryString}` : path

  // Normalize headers to lowercase
  const headers: Record<string, string | string[]> = {}
  if (event.headers) {
    for (const [key, value] of Object.entries(event.headers)) {
      if (value !== undefined) {
        headers[key.toLowerCase()] = value
      }
    }
  }

  // Parse body
  let body: Buffer | undefined
  if (event.body) {
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, "base64")
    } else {
      body = Buffer.from(event.body, "utf8")
    }
  }

  // Create a mock socket
  const socket = new Socket()

  // Create the mock request
  const req = new IncomingMessage(socket)
  req.method = method.toUpperCase()
  req.url = url
  req.headers = headers as any

  // Handle body streaming
  if (body) {
    req.push(body)
    req.push(null)
  } else {
    req.push(null)
  }

  return req
}

/**
 * Creates a mock ServerResponse that captures the response.
 */
function createMockResponse(
  req: IncomingMessage
): ServerResponse & { getResponse: () => LambdaResponse } {
  const res = new ServerResponse(req)

  let responseBody = Buffer.alloc(0)
  const responseHeaders: Record<string, string> = {}
  let statusCode = 200

  // Override write to capture body
  const originalWrite = res.write.bind(res)
  res.write = function (
    chunk: any,
    encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: (error: Error | null | undefined) => void
  ): boolean {
    const encoding = typeof encodingOrCallback === "string" ? encodingOrCallback : "utf8"
    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback

    if (chunk) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
      responseBody = Buffer.concat([responseBody, buffer])
    }

    if (cb) {
      cb(null)
    }

    return true
  }

  // Override end to capture final body
  const originalEnd = res.end.bind(res)
  res.end = function (
    chunkOrCallback?: any,
    encodingOrCallback?: BufferEncoding | (() => void),
    callback?: () => void
  ): ServerResponse {
    if (typeof chunkOrCallback === "function") {
      chunkOrCallback()
    } else if (chunkOrCallback) {
      const encoding = typeof encodingOrCallback === "string" ? encodingOrCallback : "utf8"
      const buffer = Buffer.isBuffer(chunkOrCallback)
        ? chunkOrCallback
        : Buffer.from(chunkOrCallback, encoding)
      responseBody = Buffer.concat([responseBody, buffer])
    }

    if (typeof encodingOrCallback === "function") {
      encodingOrCallback()
    } else if (callback) {
      callback()
    }

    return res
  }

  // Capture status code
  const originalWriteHead = res.writeHead.bind(res)
  res.writeHead = function (
    code: number,
    reasonOrHeaders?: string | Record<string, string | string[]>,
    headersArg?: Record<string, string | string[]>
  ): ServerResponse {
    statusCode = code

    const headers = typeof reasonOrHeaders === "object" ? reasonOrHeaders : headersArg
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        responseHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value
      }
    }

    return res
  }

  // Override setHeader
  const originalSetHeader = res.setHeader.bind(res)
  res.setHeader = function (name: string, value: string | number | readonly string[]): ServerResponse {
    responseHeaders[name.toLowerCase()] = Array.isArray(value)
      ? value.join(", ")
      : String(value)
    return res
  }

  // Method to get the final response
  const getResponse = (): LambdaResponse => {
    // Check for binary content
    const contentType = responseHeaders["content-type"] || ""
    const isBinary =
      contentType.includes("application/octet-stream") ||
      contentType.includes("image/") ||
      contentType.includes("audio/") ||
      contentType.includes("video/") ||
      contentType.includes("application/pdf")

    return {
      statusCode: statusCode || res.statusCode || 200,
      headers: responseHeaders,
      body: isBinary ? responseBody.toString("base64") : responseBody.toString("utf8"),
      isBase64Encoded: isBinary,
    }
  }

  return Object.assign(res, { getResponse })
}

/**
 * Creates a serverless handler from an Express app.
 * Compatible with AWS Lambda, Vercel, Netlify, and similar platforms.
 *
 * @param app - The Express application instance
 * @returns A serverless handler function
 *
 * @example
 * ```typescript
 * // AWS Lambda
 * import { createServerlessHandler } from "@medusajs/framework/serverless"
 *
 * const app = await initializeApp()
 * export const handler = createServerlessHandler(app)
 * ```
 *
 * @example
 * ```typescript
 * // Vercel
 * import { createServerlessHandler } from "@medusajs/framework/serverless"
 *
 * const app = await initializeApp()
 * export default createServerlessHandler(app)
 * ```
 */
export function createServerlessHandler(app: Express) {
  return async (
    event: ServerlessEvent,
    context?: ServerlessContext
  ): Promise<LambdaResponse> => {
    // Prevent Lambda from waiting for event loop to empty
    if (context?.callbackWaitsForEmptyEventLoop !== undefined) {
      context.callbackWaitsForEmptyEventLoop = false
    }

    const req = createMockRequest(event)
    const res = createMockResponse(req)

    return new Promise((resolve, reject) => {
      // Handle response completion
      res.on("finish", () => {
        resolve(res.getResponse())
      })

      res.on("error", (error) => {
        reject(error)
      })

      // Process request through Express
      app(req as any, res as any, (err: any) => {
        if (err) {
          reject(err)
        }
      })
    })
  }
}

/**
 * Creates a Vercel-compatible handler with Edge Runtime support.
 *
 * @param app - The Express application instance
 * @returns A handler compatible with Vercel's edge and serverless functions
 */
export function createVercelHandler(app: Express) {
  const handler = createServerlessHandler(app)

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)

    // Convert Web Request to serverless event
    const event: ServerlessEvent = {
      method: request.method,
      path: url.pathname,
      headers: Object.fromEntries(request.headers.entries()),
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      body: request.body ? await request.text() : null,
    }

    const result = await handler(event)

    return new Response(
      result.isBase64Encoded
        ? Buffer.from(result.body, "base64")
        : result.body,
      {
        status: result.statusCode,
        headers: result.headers,
      }
    )
  }
}

/**
 * Configuration for serverless handler behavior.
 */
export interface ServerlessHandlerOptions {
  /**
   * Timeout in milliseconds for the handler.
   * Default: 30000 (30 seconds)
   */
  timeout?: number
  /**
   * Whether to keep the connection alive after response.
   * Default: false (for serverless)
   */
  keepAlive?: boolean
  /**
   * Custom error handler for uncaught errors.
   */
  onError?: (error: Error) => LambdaResponse
}

/**
 * Creates a serverless handler with additional options.
 */
export function createServerlessHandlerWithOptions(
  app: Express,
  options: ServerlessHandlerOptions = {}
) {
  const { timeout = 30000, onError } = options

  const baseHandler = createServerlessHandler(app)

  return async (
    event: ServerlessEvent,
    context?: ServerlessContext
  ): Promise<LambdaResponse> => {
    const timeoutPromise = new Promise<LambdaResponse>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Handler timeout after ${timeout}ms`))
      }, timeout)
    })

    try {
      return await Promise.race([baseHandler(event, context), timeoutPromise])
    } catch (error) {
      if (onError) {
        return onError(error as Error)
      }

      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
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
}
