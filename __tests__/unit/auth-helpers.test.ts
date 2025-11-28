/**
 * Unit Tests for Authentication Helper Functions
 * Tests: getSession, requireAuth, isTokenExpiringSoon, getGitHubToken, error handling utilities
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as authHelpers from '@/lib/auth'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  })
}))

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn()
}))

describe('Auth Helper Functions - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isTokenExpiringSoon', () => {
    it('should return true when token expires in less than 24 hours', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = currentTime + (12 * 60 * 60) // 12 hours from now

      const result = authHelpers.isTokenExpiringSoon(expiresAt)

      expect(result).toBe(true)
    })

    it('should return true when token expires in exactly 23 hours', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = currentTime + (23 * 60 * 60) // 23 hours from now

      const result = authHelpers.isTokenExpiringSoon(expiresAt)

      expect(result).toBe(true)
    })

    it('should return false when token expires in more than 24 hours', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = currentTime + (48 * 60 * 60) // 48 hours from now

      const result = authHelpers.isTokenExpiringSoon(expiresAt)

      expect(result).toBe(false)
    })

    it('should return false when token expires in exactly 25 hours', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = currentTime + (25 * 60 * 60) // 25 hours from now

      const result = authHelpers.isTokenExpiringSoon(expiresAt)

      expect(result).toBe(false)
    })

    it('should return true when token has already expired', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = currentTime - 3600 // 1 hour ago

      const result = authHelpers.isTokenExpiringSoon(expiresAt)

      expect(result).toBe(true)
    })

    it('should return true when token expires in 1 minute', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = currentTime + 60 // 1 minute from now

      const result = authHelpers.isTokenExpiringSoon(expiresAt)

      expect(result).toBe(true)
    })

    it('should handle edge case at exactly 24 hours', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = currentTime + (24 * 60 * 60) // exactly 24 hours

      const result = authHelpers.isTokenExpiringSoon(expiresAt)

      expect(result).toBe(false)
    })
  })

  describe('getSession', () => {
    it('should return session when user is authenticated', async () => {
      const mockSession = {
        user: {
          id: '12345',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
          githubId: '12345'
        },
        accessToken: 'test_access_token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const result = await authHelpers.getSession()

      expect(result).toEqual(mockSession)
      expect(auth).toHaveBeenCalledTimes(1)
    })

    it('should return null when user is not authenticated', async () => {
      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any)

      const result = await authHelpers.getSession()

      expect(result).toBeNull()
      expect(auth).toHaveBeenCalledTimes(1)
    })

    it('should return undefined when session is undefined', async () => {
      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(undefined as any)

      const result = await authHelpers.getSession()

      expect(result).toBeUndefined()
      expect(auth).toHaveBeenCalledTimes(1)
    })
  })

  describe('getCurrentUser', () => {
    it('should return user data when session exists', async () => {
      const mockUser = {
        id: '12345',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
        githubId: '12345'
      }

      const mockSession = {
        user: mockUser,
        accessToken: 'test_token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const result = await authHelpers.getCurrentUser()

      expect(result).toEqual(mockUser)
    })

    it('should return undefined when session is null', async () => {
      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any)

      const result = await authHelpers.getCurrentUser()

      expect(result).toBeUndefined()
    })

    it('should return undefined when session exists but user is undefined', async () => {
      const mockSession = {
        accessToken: 'test_token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const result = await authHelpers.getCurrentUser()

      expect(result).toBeUndefined()
    })
  })

  describe('requireAuth', () => {
    it('should return session when user is authenticated', async () => {
      const mockSession = {
        user: {
          id: '12345',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
          githubId: '12345'
        },
        accessToken: 'test_access_token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const result = await authHelpers.requireAuth()

      expect(result).toEqual(mockSession)
      const { redirect } = await import('next/navigation')
      expect(redirect).not.toHaveBeenCalled()
    })

    it('should redirect to /login when session is null', async () => {
      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any)

      await expect(authHelpers.requireAuth()).rejects.toThrow()
      const { redirect } = await import('next/navigation')
      expect(redirect).toHaveBeenCalledWith('/login')
    })

    it('should redirect to /login when session exists but user is undefined', async () => {
      const mockSession = {
        accessToken: 'test_token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      await expect(authHelpers.requireAuth()).rejects.toThrow()
      const { redirect } = await import('next/navigation')
      expect(redirect).toHaveBeenCalledWith('/login')
    })

    it('should redirect to /login when session exists but user is null', async () => {
      const mockSession = {
        user: null,
        accessToken: 'test_token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      await expect(authHelpers.requireAuth()).rejects.toThrow()
      const { redirect } = await import('next/navigation')
      expect(redirect).toHaveBeenCalledWith('/login')
    })
  })

  describe('getGitHubToken', () => {
    it('should return access token when session has valid token', async () => {
      const mockSession = {
        user: {
          id: '12345',
          name: 'Test User',
          email: 'test@example.com'
        },
        accessToken: 'test_access_token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      const result = await authHelpers.getGitHubToken()

      expect(result).toBe('test_access_token')
    })

    it('should throw error when session is null', async () => {
      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any)

      await expect(authHelpers.getGitHubToken()).rejects.toThrow(
        'No GitHub access token available'
      )
    })

    it('should throw error when session exists but accessToken is undefined', async () => {
      const mockSession = {
        user: {
          id: '12345',
          name: 'Test User',
          email: 'test@example.com'
        },
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      await expect(authHelpers.getGitHubToken()).rejects.toThrow(
        'No GitHub access token available'
      )
    })

    it('should throw error when session exists but accessToken is null', async () => {
      const mockSession = {
        user: {
          id: '12345',
          name: 'Test User',
          email: 'test@example.com'
        },
        accessToken: null,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      await expect(authHelpers.getGitHubToken()).rejects.toThrow(
        'No GitHub access token available'
      )
    })

    it('should throw error when session exists but accessToken is empty string', async () => {
      const mockSession = {
        user: {
          id: '12345',
          name: 'Test User',
          email: 'test@example.com'
        },
        accessToken: '',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        expires: new Date().toISOString()
      }

      const { auth } = await import('@/auth')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(mockSession as any)

      await expect(authHelpers.getGitHubToken()).rejects.toThrow(
        'No GitHub access token available'
      )
    })
  })
})
