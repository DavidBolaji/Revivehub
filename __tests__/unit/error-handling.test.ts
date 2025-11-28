/**
 * Unit Tests for Error Handling Utilities
 * Tests: AuthError, TokenExpiredError, InvalidTokenError, handleAuthError
 * Requirements: 10.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AuthError,
  TokenExpiredError,
  InvalidTokenError,
  handleAuthError
} from '@/lib/errors'

describe('Error Handling Utilities - Unit Tests', () => {
  let consoleErrorSpy: any
  let consoleLogSpy: any

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })

  describe('AuthError', () => {
    it('should create AuthError with correct properties', () => {
      const error = new AuthError('Test error message', 'TEST_CODE', 400)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AuthError)
      expect(error.message).toBe('Test error message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('AuthError')
    })

    it('should default to status code 500 when not provided', () => {
      const error = new AuthError('Test error', 'TEST_CODE')

      expect(error.statusCode).toBe(500)
    })

    it('should have proper stack trace', () => {
      const error = new AuthError('Test error', 'TEST_CODE')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AuthError')
    })

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new AuthError('Test error', 'TEST_CODE', 401)
      }).toThrow(AuthError)

      try {
        throw new AuthError('Test error', 'TEST_CODE', 401)
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError)
        expect((error as AuthError).code).toBe('TEST_CODE')
      }
    })
  })

  describe('TokenExpiredError', () => {
    it('should create TokenExpiredError with default message', () => {
      const error = new TokenExpiredError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AuthError)
      expect(error).toBeInstanceOf(TokenExpiredError)
      expect(error.message).toBe('Session expired, please sign in again')
      expect(error.code).toBe('TOKEN_EXPIRED')
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe('TokenExpiredError')
    })

    it('should create TokenExpiredError with custom message', () => {
      const customMessage = 'Your token has expired'
      const error = new TokenExpiredError(customMessage)

      expect(error.message).toBe(customMessage)
      expect(error.code).toBe('TOKEN_EXPIRED')
      expect(error.statusCode).toBe(401)
    })

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new TokenExpiredError()
      }).toThrow(TokenExpiredError)

      try {
        throw new TokenExpiredError()
      } catch (error) {
        expect(error).toBeInstanceOf(TokenExpiredError)
        expect((error as TokenExpiredError).statusCode).toBe(401)
      }
    })
  })

  describe('InvalidTokenError', () => {
    it('should create InvalidTokenError with default message', () => {
      const error = new InvalidTokenError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AuthError)
      expect(error).toBeInstanceOf(InvalidTokenError)
      expect(error.message).toBe('Invalid authentication token')
      expect(error.code).toBe('INVALID_TOKEN')
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe('InvalidTokenError')
    })

    it('should create InvalidTokenError with custom message', () => {
      const customMessage = 'Token is malformed'
      const error = new InvalidTokenError(customMessage)

      expect(error.message).toBe(customMessage)
      expect(error.code).toBe('INVALID_TOKEN')
      expect(error.statusCode).toBe(401)
    })

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new InvalidTokenError()
      }).toThrow(InvalidTokenError)

      try {
        throw new InvalidTokenError()
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidTokenError)
        expect((error as InvalidTokenError).statusCode).toBe(401)
      }
    })
  })

  describe('handleAuthError', () => {
    it('should handle AuthError and return mapped message', () => {
      const error = new AuthError('Test error', 'TOKEN_EXPIRED', 401)

      const result = handleAuthError(error)

      expect(result).toBe('Session expired, please sign in again')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Auth Error] AuthError [TOKEN_EXPIRED]:',
        expect.objectContaining({
          message: 'Test error',
          statusCode: 401,
          stack: expect.any(String)
        })
      )
    })

    it('should handle TokenExpiredError and return mapped message', () => {
      const error = new TokenExpiredError()

      const result = handleAuthError(error)

      expect(result).toBe('Session expired, please sign in again')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle InvalidTokenError and return mapped message', () => {
      const error = new InvalidTokenError()

      const result = handleAuthError(error)

      expect(result).toBe('Session expired, please sign in again')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle standard Error and return default message', () => {
      const error = new Error('Standard error')

      const result = handleAuthError(error)

      expect(result).toBe('An error occurred during authentication. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Auth Error] Unexpected error:',
        expect.objectContaining({
          name: 'Error',
          message: 'Standard error',
          stack: expect.any(String)
        })
      )
    })

    it('should handle string error and return mapped message', () => {
      const error = 'OAuthCallback'

      const result = handleAuthError(error)

      expect(result).toBe('Authentication cancelled or failed. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Auth Error] String error:', error)
    })

    it('should handle unknown error type and return default message', () => {
      const error = { unknown: 'error' }

      const result = handleAuthError(error)

      expect(result).toBe('An error occurred during authentication. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Auth Error] Unknown error type:', error)
    })

    it('should handle null error and return default message', () => {
      const error = null

      const result = handleAuthError(error)

      expect(result).toBe('An error occurred during authentication. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Auth Error] Unknown error type:', error)
    })

    it('should handle undefined error and return default message', () => {
      const error = undefined

      const result = handleAuthError(error)

      expect(result).toBe('An error occurred during authentication. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Auth Error] Unknown error type:', error)
    })

    it('should map OAuthAccountNotLinked error code', () => {
      const error = new AuthError('Account not linked', 'OAuthAccountNotLinked', 400)

      const result = handleAuthError(error)

      expect(result).toBe('This email is already associated with another account.')
    })

    it('should map AccessDenied error code', () => {
      const error = new AuthError('Access denied', 'AccessDenied', 403)

      const result = handleAuthError(error)

      expect(result).toBe('Authentication cancelled')
    })

    it('should map Configuration error code', () => {
      const error = new AuthError('Config error', 'Configuration', 500)

      const result = handleAuthError(error)

      expect(result).toBe('There is a problem with the server configuration.')
    })

    it('should map Verification error code', () => {
      const error = new AuthError('Verification failed', 'Verification', 400)

      const result = handleAuthError(error)

      expect(result).toBe('The verification token has expired or has already been used.')
    })

    it('should return default message for unknown error code', () => {
      const error = new AuthError('Unknown error', 'UNKNOWN_CODE', 500)

      const result = handleAuthError(error)

      expect(result).toBe('An error occurred during authentication. Please try again.')
    })

    it('should log error details without exposing sensitive information', () => {
      const error = new AuthError('Sensitive error', 'TEST_CODE', 500)

      handleAuthError(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Auth Error] AuthError [TEST_CODE]:',
        expect.objectContaining({
          message: 'Sensitive error',
          statusCode: 500
        })
      )
      
      // Verify no sensitive data is logged
      const loggedData = consoleErrorSpy.mock.calls[0][1]
      expect(loggedData).not.toHaveProperty('accessToken')
      expect(loggedData).not.toHaveProperty('refreshToken')
      expect(loggedData).not.toHaveProperty('secret')
    })
  })

  describe('Error inheritance chain', () => {
    it('should maintain proper inheritance for TokenExpiredError', () => {
      const error = new TokenExpiredError()

      expect(error instanceof Error).toBe(true)
      expect(error instanceof AuthError).toBe(true)
      expect(error instanceof TokenExpiredError).toBe(true)
    })

    it('should maintain proper inheritance for InvalidTokenError', () => {
      const error = new InvalidTokenError()

      expect(error instanceof Error).toBe(true)
      expect(error instanceof AuthError).toBe(true)
      expect(error instanceof InvalidTokenError).toBe(true)
    })

    it('should allow catching specific error types', () => {
      let caughtError: Error | null = null

      try {
        throw new TokenExpiredError()
      } catch (error) {
        if (error instanceof TokenExpiredError) {
          caughtError = error
        }
      }

      expect(caughtError).toBeInstanceOf(TokenExpiredError)
      expect(caughtError).not.toBeNull()
    })

    it('should allow catching base AuthError type', () => {
      let caughtError: Error | null = null

      try {
        throw new InvalidTokenError()
      } catch (error) {
        if (error instanceof AuthError) {
          caughtError = error
        }
      }

      expect(caughtError).toBeInstanceOf(AuthError)
      expect(caughtError).toBeInstanceOf(InvalidTokenError)
    })
  })
})
