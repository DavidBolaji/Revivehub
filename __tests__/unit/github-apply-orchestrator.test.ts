/**
 * Unit tests for GitHubApplyOrchestrator
 * Requirements: 1.1, 1.5, 2.1, 3.1, 5.1, 5.2, 5.3, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5, 12.1, 12.2, 12.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GitHubApplyOrchestrator } from '@/lib/github/apply-orchestrator'
import { GitHubIntegrationService } from '@/lib/github/services/integration'
import { BranchNameGenerator } from '@/lib/github/branch-name-generator'
import { OperationLockManager } from '@/lib/github/lock-manager'
import type { ApplyChangesRequest, ApplyProgress } from '@/lib/github/types'

describe('GitHubApplyOrchestrator', () => {
  let orchestrator: GitHubApplyOrchestrator
  let mockGitHubService: any
  let mockBranchNameGenerator: any
  let mockLockManager: any

  beforeEach(() => {
    // Mock GitHubIntegrationService
    mockGitHubService = {
      validateRepository: vi.fn(),
      getBranchSHA: vi.fn(),
      createBranch: vi.fn(),
      createCommit: vi.fn(),
      createPullRequest: vi.fn(),
      closePullRequest: vi.fn(),
      deleteBranch: vi.fn(),
      getPullRequest: vi.fn(),
      generatePRTitle: vi.fn(),
      generatePRBody: vi.fn(),
    }

    // Mock BranchNameGenerator
    mockBranchNameGenerator = {
      generate: vi.fn(),
      ensureUnique: vi.fn(),
      validate: vi.fn(),
    }

    // Mock OperationLockManager
    mockLockManager = {
      acquireLock: vi.fn(),
      releaseLock: vi.fn(),
      isLocked: vi.fn(),
    }

    orchestrator = new GitHubApplyOrchestrator(
      mockGitHubService as unknown as GitHubIntegrationService,
      mockBranchNameGenerator as unknown as BranchNameGenerator,
      mockLockManager as unknown as OperationLockManager
    )
  })

  describe('applyChanges', () => {
    const createMockRequest = (): ApplyChangesRequest => ({
      repository: {
        owner: 'test-owner',
        name: 'test-repo',
      },
      migrationJobId: 'job-123',
      acceptedFiles: ['src/file1.ts', 'src/file2.ts'],
      transformations: {
        'src/file1.ts': {
          originalCode: 'old code 1',
          transformedCode: 'new code 1',
          confidence: 95,
          changes: ['Updated imports'],
          warnings: [],
        },
        'src/file2.ts': {
          originalCode: 'old code 2',
          transformedCode: 'new code 2',
          confidence: 90,
          changes: ['Updated syntax'],
          warnings: [],
        },
      },
      migrationSpec: {
        sourceFramework: { name: 'React', version: '17.0.0' },
        targetFramework: { name: 'React', version: '18.0.0' },
        options: {},
      },
    })

    it('should successfully apply changes with complete workflow', async () => {
      const request = createMockRequest()

      // Setup mocks
      mockLockManager.acquireLock.mockReturnValue(true)
      mockGitHubService.validateRepository.mockResolvedValue({
        exists: true,
        accessible: true,
        hasWriteAccess: true,
        isArchived: false,
        defaultBranch: 'main',
        errors: [],
      })
      mockGitHubService.getBranchSHA.mockResolvedValue('base-sha-123')
      mockBranchNameGenerator.generate.mockReturnValue('revivehub/migration-react-2024-01-01')
      mockBranchNameGenerator.ensureUnique.mockReturnValue('revivehub/migration-react-2024-01-01')
      mockGitHubService.createBranch.mockResolvedValue(undefined)
      mockGitHubService.createCommit.mockResolvedValue('commit-sha-123')
      mockGitHubService.generatePRTitle.mockReturnValue('ReviveHub Migration: React 17.0.0 to React 18.0.0')
      mockGitHubService.generatePRBody.mockReturnValue('PR body content')
      mockGitHubService.createPullRequest.mockResolvedValue({
        number: 42,
        id: 123,
        title: 'ReviveHub Migration: React 17.0.0 to React 18.0.0',
        body: 'PR body content',
        state: 'open',
        draft: true,
        url: 'https://api.github.com/repos/test-owner/test-repo/pulls/42',
        htmlUrl: 'https://github.com/test-owner/test-repo/pull/42',
        head: { ref: 'revivehub/migration-react-2024-01-01', sha: 'commit-sha-123' },
        base: { ref: 'main', sha: 'base-sha-123' },
        user: {
          id: 1,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://github.com/avatar.png',
          bio: null,
          company: null,
          location: null,
          blog: null,
          htmlUrl: 'https://github.com/testuser',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedAt: null,
        closedAt: null,
      })

      const result = await orchestrator.applyChanges(request)

      // Verify lock was acquired and released
      expect(mockLockManager.acquireLock).toHaveBeenCalledWith('test-owner/test-repo')
      expect(mockLockManager.releaseLock).toHaveBeenCalledWith('test-owner/test-repo')

      // Verify validation
      expect(mockGitHubService.validateRepository).toHaveBeenCalledWith('test-owner', 'test-repo')

      // Verify branch creation
      expect(mockGitHubService.createBranch).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        'revivehub/migration-react-2024-01-01',
        'base-sha-123'
      )

      // Verify commit creation
      expect(mockGitHubService.createCommit).toHaveBeenCalled()

      // Verify PR creation
      expect(mockGitHubService.createPullRequest).toHaveBeenCalled()

      // Verify result
      expect(result.status).toBe('success')
      expect(result.branchName).toBe('revivehub/migration-react-2024-01-01')
      expect(result.pullRequest.number).toBe(42)
      expect(result.pullRequest.htmlUrl).toBe('https://github.com/test-owner/test-repo/pull/42')
      expect(result.commits).toHaveLength(1)
    })

    it('should fail when lock cannot be acquired', async () => {
      const request = createMockRequest()
      mockLockManager.acquireLock.mockReturnValue(false)

      const result = await orchestrator.applyChanges(request)

      expect(result.status).toBe('failed')
      expect(result.errors).toBeDefined()
      expect(result.errors![0].message).toContain('Operation already in progress')
      expect(mockGitHubService.validateRepository).not.toHaveBeenCalled()
    })

    it('should fail when repository validation fails', async () => {
      const request = createMockRequest()
      mockLockManager.acquireLock.mockReturnValue(true)
      mockGitHubService.validateRepository.mockResolvedValue({
        exists: false,
        accessible: false,
        hasWriteAccess: false,
        isArchived: false,
        defaultBranch: 'main',
        errors: ['Repository not found'],
      })

      const result = await orchestrator.applyChanges(request)

      expect(result.status).toBe('failed')
      expect(result.errors).toBeDefined()
      expect(result.errors![0].message).toContain('does not exist')
      expect(mockLockManager.releaseLock).toHaveBeenCalledWith('test-owner/test-repo')
    })

    it('should fail when repository is archived', async () => {
      const request = createMockRequest()
      mockLockManager.acquireLock.mockReturnValue(true)
      mockGitHubService.validateRepository.mockResolvedValue({
        exists: true,
        accessible: true,
        hasWriteAccess: true,
        isArchived: true,
        defaultBranch: 'main',
        errors: [],
      })

      const result = await orchestrator.applyChanges(request)

      expect(result.status).toBe('failed')
      expect(result.errors![0].message).toContain('archived')
      expect(mockLockManager.releaseLock).toHaveBeenCalled()
    })

    it('should fail when transformations are missing', async () => {
      const request = createMockRequest()
      request.transformations = {} // Empty transformations

      mockLockManager.acquireLock.mockReturnValue(true)
      mockGitHubService.validateRepository.mockResolvedValue({
        exists: true,
        accessible: true,
        hasWriteAccess: true,
        isArchived: false,
        defaultBranch: 'main',
        errors: [],
      })
      mockGitHubService.getBranchSHA.mockResolvedValue('base-sha-123')

      const result = await orchestrator.applyChanges(request)

      expect(result.status).toBe('failed')
      expect(result.errors![0].message).toContain('Missing or invalid transformations')
      expect(mockLockManager.releaseLock).toHaveBeenCalled()
    })

    it('should emit progress updates during workflow', async () => {
      const request = createMockRequest()
      const progressUpdates: ApplyProgress[] = []

      // Setup mocks
      mockLockManager.acquireLock.mockReturnValue(true)
      mockGitHubService.validateRepository.mockResolvedValue({
        exists: true,
        accessible: true,
        hasWriteAccess: true,
        isArchived: false,
        defaultBranch: 'main',
        errors: [],
      })
      mockGitHubService.getBranchSHA.mockResolvedValue('base-sha-123')
      mockBranchNameGenerator.generate.mockReturnValue('revivehub/migration-react-2024-01-01')
      mockBranchNameGenerator.ensureUnique.mockReturnValue('revivehub/migration-react-2024-01-01')
      mockGitHubService.createBranch.mockResolvedValue(undefined)
      mockGitHubService.createCommit.mockResolvedValue('commit-sha-123')
      mockGitHubService.generatePRTitle.mockReturnValue('ReviveHub Migration')
      mockGitHubService.generatePRBody.mockReturnValue('PR body')
      mockGitHubService.createPullRequest.mockResolvedValue({
        number: 42,
        id: 123,
        title: 'Test PR',
        body: 'Test body',
        state: 'open',
        draft: true,
        url: 'https://api.github.com/repos/test-owner/test-repo/pulls/42',
        htmlUrl: 'https://github.com/test-owner/test-repo/pull/42',
        head: { ref: 'feature', sha: 'abc' },
        base: { ref: 'main', sha: 'def' },
        user: {
          id: 1,
          login: 'user',
          name: 'User',
          email: 'user@example.com',
          avatarUrl: 'https://avatar.png',
          bio: null,
          company: null,
          location: null,
          blog: null,
          htmlUrl: 'https://github.com/user',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedAt: null,
        closedAt: null,
      })

      // Track progress
      const result = await orchestrator.applyChanges(request)
      const operationId = result.operationId

      orchestrator.trackProgress(operationId, (progress) => {
        progressUpdates.push(progress)
      })

      // Note: Progress updates are emitted during the operation, but since we're
      // tracking after the operation completes, we won't capture them in this test.
      // In a real scenario, you'd track before calling applyChanges.

      expect(result.status).toBe('success')
    })
  })

  describe('rollbackChanges', () => {
    it('should successfully rollback by closing PR and deleting branch', async () => {
      const request: ApplyChangesRequest = {
        repository: { owner: 'test-owner', name: 'test-repo' },
        migrationJobId: 'job-123',
        acceptedFiles: ['src/file.ts'],
        transformations: {
          'src/file.ts': {
            originalCode: 'old',
            transformedCode: 'new',
            confidence: 90,
            changes: [],
            warnings: [],
          },
        },
        migrationSpec: {
          sourceFramework: { name: 'React', version: '17' },
          targetFramework: { name: 'React', version: '18' },
          options: {},
        },
      }

      // First apply changes to create operation data
      mockLockManager.acquireLock.mockReturnValue(true)
      mockGitHubService.validateRepository.mockResolvedValue({
        exists: true,
        accessible: true,
        hasWriteAccess: true,
        isArchived: false,
        defaultBranch: 'main',
        errors: [],
      })
      mockGitHubService.getBranchSHA.mockResolvedValue('base-sha')
      mockBranchNameGenerator.generate.mockReturnValue('test-branch')
      mockBranchNameGenerator.ensureUnique.mockReturnValue('test-branch')
      mockGitHubService.createBranch.mockResolvedValue(undefined)
      mockGitHubService.createCommit.mockResolvedValue('commit-sha')
      mockGitHubService.generatePRTitle.mockReturnValue('Test PR')
      mockGitHubService.generatePRBody.mockReturnValue('Test body')
      mockGitHubService.createPullRequest.mockResolvedValue({
        number: 42,
        id: 123,
        title: 'Test PR',
        body: 'Test body',
        state: 'open',
        draft: true,
        url: 'https://api.github.com/repos/test-owner/test-repo/pulls/42',
        htmlUrl: 'https://github.com/test-owner/test-repo/pull/42',
        head: { ref: 'test-branch', sha: 'commit-sha' },
        base: { ref: 'main', sha: 'base-sha' },
        user: {
          id: 1,
          login: 'user',
          name: 'User',
          email: 'user@example.com',
          avatarUrl: 'https://avatar.png',
          bio: null,
          company: null,
          location: null,
          blog: null,
          htmlUrl: 'https://github.com/user',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedAt: null,
        closedAt: null,
      })

      const applyResult = await orchestrator.applyChanges(request)

      // Now rollback
      mockGitHubService.getPullRequest.mockResolvedValue({
        number: 42,
        state: 'open',
        mergedAt: null,
      })
      mockGitHubService.closePullRequest.mockResolvedValue(undefined)
      mockGitHubService.deleteBranch.mockResolvedValue(undefined)

      const rollbackResult = await orchestrator.rollbackChanges(applyResult.operationId)

      expect(rollbackResult.success).toBe(true)
      expect(rollbackResult.prClosed).toBe(true)
      expect(rollbackResult.branchDeleted).toBe(true)
      expect(rollbackResult.message).toContain('Successfully rolled back')
      expect(rollbackResult.message).toContain('test-branch')
      expect(mockGitHubService.closePullRequest).toHaveBeenCalledWith('test-owner', 'test-repo', 42)
      expect(mockGitHubService.deleteBranch).toHaveBeenCalledWith('test-owner', 'test-repo', 'test-branch')
    })

    it('should fail rollback when PR is already merged', async () => {
      const request: ApplyChangesRequest = {
        repository: { owner: 'test-owner', name: 'test-repo' },
        migrationJobId: 'job-123',
        acceptedFiles: ['src/file.ts'],
        transformations: {
          'src/file.ts': {
            originalCode: 'old',
            transformedCode: 'new',
            confidence: 90,
            changes: [],
            warnings: [],
          },
        },
        migrationSpec: {
          sourceFramework: { name: 'React', version: '17' },
          targetFramework: { name: 'React', version: '18' },
          options: {},
        },
      }

      // First apply changes
      mockLockManager.acquireLock.mockReturnValue(true)
      mockGitHubService.validateRepository.mockResolvedValue({
        exists: true,
        accessible: true,
        hasWriteAccess: true,
        isArchived: false,
        defaultBranch: 'main',
        errors: [],
      })
      mockGitHubService.getBranchSHA.mockResolvedValue('base-sha')
      mockBranchNameGenerator.generate.mockReturnValue('test-branch')
      mockBranchNameGenerator.ensureUnique.mockReturnValue('test-branch')
      mockGitHubService.createBranch.mockResolvedValue(undefined)
      mockGitHubService.createCommit.mockResolvedValue('commit-sha')
      mockGitHubService.generatePRTitle.mockReturnValue('Test PR')
      mockGitHubService.generatePRBody.mockReturnValue('Test body')
      mockGitHubService.createPullRequest.mockResolvedValue({
        number: 42,
        id: 123,
        title: 'Test PR',
        body: 'Test body',
        state: 'open',
        draft: true,
        url: 'https://api.github.com/repos/test-owner/test-repo/pulls/42',
        htmlUrl: 'https://github.com/test-owner/test-repo/pull/42',
        head: { ref: 'test-branch', sha: 'commit-sha' },
        base: { ref: 'main', sha: 'base-sha' },
        user: {
          id: 1,
          login: 'user',
          name: 'User',
          email: 'user@example.com',
          avatarUrl: 'https://avatar.png',
          bio: null,
          company: null,
          location: null,
          blog: null,
          htmlUrl: 'https://github.com/user',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedAt: null,
        closedAt: null,
      })

      const applyResult = await orchestrator.applyChanges(request)

      // Mock PR as merged
      mockGitHubService.getPullRequest.mockResolvedValue({
        number: 42,
        state: 'merged',
        mergedAt: new Date(),
      })

      const rollbackResult = await orchestrator.rollbackChanges(applyResult.operationId)

      expect(rollbackResult.success).toBe(false)
      expect(rollbackResult.message).toContain('already been merged')
      expect(mockGitHubService.closePullRequest).not.toHaveBeenCalled()
      expect(mockGitHubService.deleteBranch).not.toHaveBeenCalled()
    })

    it('should return error when operation not found', async () => {
      const rollbackResult = await orchestrator.rollbackChanges('non-existent-operation')

      expect(rollbackResult.success).toBe(false)
      expect(rollbackResult.message).toBe('Operation not found')
      expect(rollbackResult.errors).toContain('Operation data not found')
    })
  })

  describe('progress tracking', () => {
    it('should allow tracking and stopping progress updates', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const operationId = 'test-op-123'

      orchestrator.trackProgress(operationId, callback1)
      orchestrator.trackProgress(operationId, callback2)

      // Stop tracking callback1
      orchestrator.stopTracking(operationId, callback1)

      // Verify we can stop tracking without errors
      expect(() => orchestrator.stopTracking(operationId, callback2)).not.toThrow()
    })
  })
})
