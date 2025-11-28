/**
 * Unit Tests for GitHub Error Handling Utilities
 * Tests: GitHubError, handleGitHubError, withExponentialBackoff
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RequestError } from '@octokit/request-error'
import {
  GitHubError,
  GitHubAPIError,
  handleGitHubError,
  withExponentialBackoff,
  formatRateLimit,
  isRateLimitError,
  isPermissionError,
  isNetworkError,
  isAuthenticationError,
  isRetryableError,
} from '@/lib/github/errors'

describe('GitHub Error Handling Utilities - Unit Tests', () => {
  let consoleErrorSpy: any
  let consoleWarnSpy: any

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('GitHubError', () => {
    it('should create GitHubError with all properties', () => {
      const rateLimit = {
        limit: 5000,
        remaining: 0,
        reset: new Date('2024-01-01T12:00:00Z'),
      }

      const error = new GitHubError(
        'Test error',
        'TEST_CODE',
        403,
        rateLimit,
        true,
        'User friendly message'
      )

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(GitHubError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.statusCode).toBe(403)
      expect(error.rateLimit).toEqual(rateLimit)
      expect(error.retryable).toBe(true)
      expect(error.userMessage).toBe('User friendly message')
      expect(error.name).toBe('GitHubError')
    })

    it('should serialize to JSON correctly', () => {
      const error = new GitHubError('Test', 'TEST', 400, undefined, false, 'User msg')
      const json = error.toJSON()

      expect(json).toEqual({
        name: 'GitHubError',
        message: 'Test',
        code: 'TEST',
        statusCode: 400,
        rateLimit: undefined,
        retryable: false,
        userMessage: 'User msg',
      })
    })
  })

  describe('GitHubAPIError (legacy)', () => {
    it('should create GitHubAPIError for backward compatibility', () => {
      const error = new GitHubAPIError('Test error', 404)

      expect(error).toBeInstanceOf(GitHubError)
      expect(error).toBeInstanceOf(GitHubAPIError)
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('GITHUB_API_ERROR')
      expect(error.name).toBe('GitHubAPIError')
    })
  })

  describe('handleGitHubError - Rate Limit Errors', () => {
    it('should handle rate limit exceeded error (Requirement 4.1)', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600
      const requestError = new RequestError('Rate limit exceeded', 403, {
        request: { method: 'GET', url: 'https://api.github.com/repos/test/test', headers: {} },
        response: {
          status: 403,
          url: 'https://api.github.com/repos/test/test',
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(resetTime),
          },
          data: {},
        },
      })

      expect(() => handleGitHubError(requestError)).toThrow(GitHubError)
      
      try {
        handleGitHubError(requestError)
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubError)
        const ghError = error as GitHubError
        expect(ghError.code).toBe('RATE_LIMIT_EXCEEDED')
        expect(ghError.statusCode).toBe(403)
        expect(ghError.retryable).toBe(true)
        expect(ghError.rateLimit).toBeDefined()
        expect(ghError.rateLimit?.remaining).toBe(0)
        expect(ghError.userMessage).toContain('rate limit exceeded')
      }

      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('handleGitHubError - Permission Errors', () => {
    it('should handle insufficient permissions error (Requirement 4.2)', () => {
      const requestError = new RequestError('Forbidden', 403, {
        request: { method: 'POST', url: 'https://api.github.com/repos/test/test', headers: {} },
        response: {
          status: 403,
          url: 'https://api.github.com/repos/test/test',
          headers: {},
          data: {},
        },
      })

      expect(() => handleGitHubError(requestError)).toThrow(GitHubError)
      
      try {
        handleGitHubError(requestError)
      } catch (error) {
        const ghError = error as GitHubError
        expect(ghError.code).toBe('INSUFFICIENT_PERMISSIONS')
        expect(ghError.statusCode).toBe(403)
        expect(ghError.retryable).toBe(false)
        expect(ghError.userMessage).toContain('write access')
      }
    })
  })

  describe('handleGitHubError - Authentication Errors', () => {
    it('should handle authentication failed error (Requirement 4.4)', () => {
      const requestError = new RequestError('Unauthorized', 401, {
        request: { method: 'GET', url: 'https://api.github.com/user', headers: {} },
        response: {
          status: 401,
          url: 'https://api.github.com/user',
          headers: {},
          data: {},
        },
      })

      expect(() => handleGitHubError(requestError)).toThrow(GitHubError)
      
      try {
        handleGitHubError(requestError)
      } catch (error) {
        const ghError = error as GitHubError
        expect(ghError.code).toBe('AUTHENTICATION_FAILED')
        expect(ghError.statusCode).toBe(401)
        expect(ghError.retryable).toBe(false)
        expect(ghError.userMessage).toContain('sign in again')
      }
    })
  })

  describe('handleGitHubError - Network Errors', () => {
    it('should handle network error with ECONNREFUSED (Requirement 4.3)', () => {
      const networkError = new Error('connect ECONNREFUSED 127.0.0.1:443')

      expect(() => handleGitHubError(networkError)).toThrow(GitHubError)
      
      try {
        handleGitHubError(networkError)
      } catch (error) {
        const ghError = error as GitHubError
        expect(ghError.code).toBe('NETWORK_ERROR')
        expect(ghError.retryable).toBe(true)
        expect(ghError.userMessage).toContain('Network error')
      }
    })

    it('should handle network error with ETIMEDOUT', () => {
      const networkError = new Error('request ETIMEDOUT')

      try {
        handleGitHubError(networkError)
      } catch (error) {
        const ghError = error as GitHubError
        expect(ghError.code).toBe('NETWORK_ERROR')
        expect(ghError.retryable).toBe(true)
      }
    })

    it('should handle fetch failed error', () => {
      const networkError = new Error('fetch failed')

      try {
        handleGitHubError(networkError)
      } catch (error) {
        const ghError = error as GitHubError
        expect(ghError.code).toBe('NETWORK_ERROR')
        expect(ghError.retryable).toBe(true)
      }
    })
  })

  describe('handleGitHubError - Other Errors', () => {
    it('should handle 404 not found error', () => {
      const requestError = new RequestError('Not Found', 404, {
        request: { method: 'GET', url: 'https://api.github.com/repos/test/test', headers: {} },
        response: {
          status: 404,
          url: 'https://api.github.com/repos/test/test',
          headers: {},
          data: {},
        },
      })

      try {
        handleGitHubError(requestError)
      } catch (error) {
        const ghError = error as GitHubError
        expect(ghError.code).toBe('RESOURCE_NOT_FOUND')
        expect(ghError.statusCode).toBe(404)
        expect(ghError.retryable).toBe(false)
      }
    })

    it('should handle 500 server error as retryable', () => {
      const requestError = new RequestError('Internal Server Error', 500, {
        request: { method: 'GET', url: 'https://api.github.com/repos/test/test', headers: {} },
        response: {
          status: 500,
          url: 'https://api.github.com/repos/test/test',
          headers: {},
          data: {},
        },
      })

      try {
        handleGitHubError(requestError)
      } catch (error) {
        const ghError = error as GitHubError
        expect(ghError.code).toBe('SERVER_ERROR')
        expect(ghError.statusCode).toBe(500)
        expect(ghError.retryable).toBe(true)
      }
    })

    it('should log all errors to console (Requirement 4.5)', () => {
      const error = new Error('Test error')

      try {
        handleGitHubError(error)
      } catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GitHub API Error]',
        expect.objectContaining({
          error: 'Test error',
          timestamp: expect.any(String),
        })
      )
    })
  })

  describe('withExponentialBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withExponentialBackoff(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable error (Requirement 4.3)', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new GitHubError('Network error', 'NETWORK_ERROR', undefined, undefined, true))
        .mockResolvedValue('success')

      const result = await withExponentialBackoff(operation, 3, 10)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('should not retry on non-retryable error', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new GitHubError('Auth failed', 'AUTHENTICATION_FAILED', 401, undefined, false))

      await expect(withExponentialBackoff(operation, 3, 10)).rejects.toThrow(GitHubError)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry up to max retries and then fail', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new GitHubError('Network error', 'NETWORK_ERROR', undefined, undefined, true))

      await expect(withExponentialBackoff(operation, 2, 10)).rejects.toThrow(GitHubError)
      expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max retries'),
        expect.any(Object)
      )
    })
  })

  describe('Helper Functions', () => {
    it('should format rate limit correctly', () => {
      const rateLimit = {
        limit: 5000,
        remaining: 4500,
        reset: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      }

      const formatted = formatRateLimit(rateLimit)

      expect(formatted).toContain('4500/5000')
      expect(formatted).toContain('30 minutes')
    })

    it('should identify rate limit error', () => {
      const error = new GitHubError('Rate limit', 'RATE_LIMIT_EXCEEDED', 403)
      expect(isRateLimitError(error)).toBe(true)
      expect(isRateLimitError(new Error('test'))).toBe(false)
    })

    it('should identify permission error', () => {
      const error = new GitHubError('Permission', 'INSUFFICIENT_PERMISSIONS', 403)
      expect(isPermissionError(error)).toBe(true)
      expect(isPermissionError(new Error('test'))).toBe(false)
    })

    it('should identify network error', () => {
      const error = new GitHubError('Network', 'NETWORK_ERROR')
      expect(isNetworkError(error)).toBe(true)
      expect(isNetworkError(new Error('test'))).toBe(false)
    })

    it('should identify authentication error', () => {
      const error = new GitHubError('Auth', 'AUTHENTICATION_FAILED', 401)
      expect(isAuthenticationError(error)).toBe(true)
      expect(isAuthenticationError(new Error('test'))).toBe(false)
    })

    it('should identify retryable error', () => {
      const retryable = new GitHubError('Test', 'TEST', undefined, undefined, true)
      const notRetryable = new GitHubError('Test', 'TEST', undefined, undefined, false)
      
      expect(isRetryableError(retryable)).toBe(true)
      expect(isRetryableError(notRetryable)).toBe(false)
      expect(isRetryableError(new Error('test'))).toBe(false)
    })
  })
})
