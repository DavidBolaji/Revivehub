import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { OperationLockManager, getLockManager, resetLockManager } from '@/lib/github/lock-manager'

describe('OperationLockManager', () => {
  let lockManager: OperationLockManager

  beforeEach(() => {
    lockManager = new OperationLockManager()
  })

  describe('acquireLock', () => {
    it('should acquire a lock for a repository', () => {
      const result = lockManager.acquireLock('owner/repo')
      expect(result).toBe(true)
      expect(lockManager.isLocked('owner/repo')).toBe(true)
    })

    it('should return false when trying to acquire an already locked repository', () => {
      lockManager.acquireLock('owner/repo')
      const result = lockManager.acquireLock('owner/repo')
      expect(result).toBe(false)
    })

    it('should allow acquiring locks for different repositories', () => {
      const result1 = lockManager.acquireLock('owner1/repo1')
      const result2 = lockManager.acquireLock('owner2/repo2')
      
      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(lockManager.isLocked('owner1/repo1')).toBe(true)
      expect(lockManager.isLocked('owner2/repo2')).toBe(true)
    })

    it('should allow re-acquiring a lock after it expires', () => {
      // Mock Date to control time
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner/repo')
      expect(lockManager.isLocked('owner/repo')).toBe(true)

      // Advance time by 11 minutes (past expiration)
      const later = new Date('2024-01-01T00:11:00Z')
      vi.setSystemTime(later)

      expect(lockManager.isLocked('owner/repo')).toBe(false)
      
      const result = lockManager.acquireLock('owner/repo')
      expect(result).toBe(true)
    })
  })

  describe('releaseLock', () => {
    it('should release a lock for a repository', () => {
      lockManager.acquireLock('owner/repo')
      expect(lockManager.isLocked('owner/repo')).toBe(true)

      lockManager.releaseLock('owner/repo')
      expect(lockManager.isLocked('owner/repo')).toBe(false)
    })

    it('should not throw when releasing a non-existent lock', () => {
      expect(() => lockManager.releaseLock('owner/repo')).not.toThrow()
    })

    it('should allow re-acquiring after release', () => {
      lockManager.acquireLock('owner/repo')
      lockManager.releaseLock('owner/repo')
      
      const result = lockManager.acquireLock('owner/repo')
      expect(result).toBe(true)
    })
  })

  describe('isLocked', () => {
    it('should return false for unlocked repository', () => {
      expect(lockManager.isLocked('owner/repo')).toBe(false)
    })

    it('should return true for locked repository', () => {
      lockManager.acquireLock('owner/repo')
      expect(lockManager.isLocked('owner/repo')).toBe(true)
    })

    it('should return false for expired lock', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner/repo')
      expect(lockManager.isLocked('owner/repo')).toBe(true)

      // Advance time by 11 minutes
      const later = new Date('2024-01-01T00:11:00Z')
      vi.setSystemTime(later)

      expect(lockManager.isLocked('owner/repo')).toBe(false)
    })

    it('should clean up expired lock when checking', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner/repo')
      expect(lockManager.getActiveLockCount()).toBe(1)

      // Advance time by 11 minutes
      const later = new Date('2024-01-01T00:11:00Z')
      vi.setSystemTime(later)

      lockManager.isLocked('owner/repo')
      expect(lockManager.getActiveLockCount()).toBe(0)
    })
  })

  describe('getLockInfo', () => {
    it('should return null for non-existent lock', () => {
      const info = lockManager.getLockInfo('owner/repo')
      expect(info).toBeNull()
    })

    it('should return lock information for active lock', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner/repo')
      const info = lockManager.getLockInfo('owner/repo')

      expect(info).not.toBeNull()
      expect(info?.repositoryKey).toBe('owner/repo')
      expect(info?.acquiredAt).toEqual(now)
      expect(info?.expiresAt).toEqual(new Date('2024-01-01T00:10:00Z'))
    })

    it('should return null for expired lock', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner/repo')

      // Advance time by 11 minutes
      const later = new Date('2024-01-01T00:11:00Z')
      vi.setSystemTime(later)

      const info = lockManager.getLockInfo('owner/repo')
      expect(info).toBeNull()
    })
  })

  describe('getActiveLocks', () => {
    it('should return empty array when no locks', () => {
      const locks = lockManager.getActiveLocks()
      expect(locks).toEqual([])
    })

    it('should return all active locks', () => {
      lockManager.acquireLock('owner1/repo1')
      lockManager.acquireLock('owner2/repo2')

      const locks = lockManager.getActiveLocks()
      expect(locks).toHaveLength(2)
      expect(locks.map(l => l.repositoryKey)).toContain('owner1/repo1')
      expect(locks.map(l => l.repositoryKey)).toContain('owner2/repo2')
    })

    it('should not include expired locks', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner1/repo1')
      lockManager.acquireLock('owner2/repo2')

      // Advance time by 11 minutes
      const later = new Date('2024-01-01T00:11:00Z')
      vi.setSystemTime(later)

      const locks = lockManager.getActiveLocks()
      expect(locks).toHaveLength(0)
    })
  })

  describe('clearAllLocks', () => {
    it('should clear all locks', () => {
      lockManager.acquireLock('owner1/repo1')
      lockManager.acquireLock('owner2/repo2')
      expect(lockManager.getActiveLockCount()).toBe(2)

      lockManager.clearAllLocks()
      expect(lockManager.getActiveLockCount()).toBe(0)
    })
  })

  describe('getActiveLockCount', () => {
    it('should return 0 when no locks', () => {
      expect(lockManager.getActiveLockCount()).toBe(0)
    })

    it('should return correct count of active locks', () => {
      lockManager.acquireLock('owner1/repo1')
      expect(lockManager.getActiveLockCount()).toBe(1)

      lockManager.acquireLock('owner2/repo2')
      expect(lockManager.getActiveLockCount()).toBe(2)

      lockManager.releaseLock('owner1/repo1')
      expect(lockManager.getActiveLockCount()).toBe(1)
    })

    it('should not count expired locks', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner1/repo1')
      lockManager.acquireLock('owner2/repo2')
      expect(lockManager.getActiveLockCount()).toBe(2)

      // Advance time by 11 minutes
      const later = new Date('2024-01-01T00:11:00Z')
      vi.setSystemTime(later)

      expect(lockManager.getActiveLockCount()).toBe(0)
    })
  })

  describe('lock expiration', () => {
    it('should expire locks after 10 minutes', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner/repo')
      expect(lockManager.isLocked('owner/repo')).toBe(true)

      // 9 minutes later - still locked
      vi.setSystemTime(new Date('2024-01-01T00:09:00Z'))
      expect(lockManager.isLocked('owner/repo')).toBe(true)

      // 10 minutes later - expired
      vi.setSystemTime(new Date('2024-01-01T00:10:00Z'))
      expect(lockManager.isLocked('owner/repo')).toBe(false)
    })

    it('should clean up multiple expired locks', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(now)

      lockManager.acquireLock('owner1/repo1')
      lockManager.acquireLock('owner2/repo2')
      lockManager.acquireLock('owner3/repo3')
      expect(lockManager.getActiveLockCount()).toBe(3)

      // Advance time by 11 minutes
      vi.setSystemTime(new Date('2024-01-01T00:11:00Z'))

      // Trigger cleanup by checking any lock
      lockManager.isLocked('owner1/repo1')
      expect(lockManager.getActiveLockCount()).toBe(0)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})

describe('getLockManager singleton', () => {
  beforeEach(() => {
    resetLockManager()
  })

  it('should return the same instance on multiple calls', () => {
    const instance1 = getLockManager()
    const instance2 = getLockManager()
    expect(instance1).toBe(instance2)
  })

  it('should maintain state across calls', () => {
    const manager1 = getLockManager()
    manager1.acquireLock('owner/repo')

    const manager2 = getLockManager()
    expect(manager2.isLocked('owner/repo')).toBe(true)
  })

  it('should reset instance when resetLockManager is called', () => {
    const manager1 = getLockManager()
    manager1.acquireLock('owner/repo')

    resetLockManager()

    const manager2 = getLockManager()
    expect(manager2.isLocked('owner/repo')).toBe(false)
  })
})
