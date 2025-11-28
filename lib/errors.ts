/**
 * Custom error classes for authentication and authorization errors
 */

/**
 * Base class for all authentication-related errors
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = "AuthError"
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Error thrown when a GitHub access token has expired
 */
export class TokenExpiredError extends AuthError {
  constructor(message: string = "Session expired, please sign in again") {
    super(message, "TOKEN_EXPIRED", 401)
    this.name = "TokenExpiredError"
  }
}

/**
 * Error thrown when a GitHub access token is invalid or malformed
 */
export class InvalidTokenError extends AuthError {
  constructor(message: string = "Invalid authentication token") {
    super(message, "INVALID_TOKEN", 401)
    this.name = "InvalidTokenError"
  }
}

/**
 * Maps error codes to user-friendly error messages
 */
function getErrorMessage(error: string): string {
  switch (error) {
    case "OAuthAccountNotLinked":
      return "This email is already associated with another account."
    case "OAuthCallback":
    case "OAuthSignin":
      return "Authentication cancelled or failed. Please try again."
    case "AccessDenied":
      return "Authentication cancelled"
    case "Configuration":
      return "There is a problem with the server configuration."
    case "Verification":
      return "The verification token has expired or has already been used."
    case "TOKEN_EXPIRED":
      return "Session expired, please sign in again"
    case "INVALID_TOKEN":
      return "Session expired, please sign in again"
    case "Default":
    default:
      return "An error occurred during authentication. Please try again."
  }
}

/**
 * Handles authentication errors by logging them server-side and returning
 * user-friendly error messages
 * 
 * @param error - The error to handle (can be any type)
 * @returns User-friendly error message string
 */
export function handleAuthError(error: unknown): string {
  // Handle AuthError instances
  if (error instanceof AuthError) {
    console.error(`[Auth Error] ${error.name} [${error.code}]:`, {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })
    return getErrorMessage(error.code)
  }
  
  // Handle standard Error instances
  if (error instanceof Error) {
    console.error("[Auth Error] Unexpected error:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return getErrorMessage("Default")
  }
  
  // Handle string errors
  if (typeof error === "string") {
    console.error("[Auth Error] String error:", error)
    return getErrorMessage(error)
  }
  
  // Handle unknown error types
  console.error("[Auth Error] Unknown error type:", error)
  return getErrorMessage("Default")
}

/**
 * Logs authentication events for monitoring and debugging
 * 
 * @param event - The event type (e.g., "signin", "signout", "token_refresh")
 * @param details - Additional details about the event
 */
export function logAuthEvent(
  event: string,
  details: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString()
  console.log(`[Auth Event] ${timestamp} - ${event}:`, {
    ...details,
    // Redact sensitive information
    accessToken: details.accessToken ? "[REDACTED]" : undefined,
    refreshToken: details.refreshToken ? "[REDACTED]" : undefined,
    secret: details.secret ? "[REDACTED]" : undefined
  })
}
