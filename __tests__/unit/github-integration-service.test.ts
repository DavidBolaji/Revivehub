/**
 * Unit tests for GitHubIntegrationService branch and commit operations
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 9.2, 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GitHubIntegrationService } from '@/lib/github/services/integration'

describe('GitHubIntegrationService - Branch Operations', () => {
  let service: GitHubIntegrationService
  let mockOctokit: any

  beforeEach(() => {
    mockOctokit = {
      repos: {
        get: vi.fn(),
        getBranch: vi.fn(),
      },
      git: {
        createRef: vi.fn(),
        deleteRef: vi.fn(),
        getRef: vi.fn(),
        createTree: vi.fn(),
        createCommit: vi.fn(),
        getCommit: vi.fn(),
        updateRef: vi.fn(),
      },
    }
    service = new GitHubIntegrationService(mockOctokit)
  })

  describe('createBranch', () => {
    it('should create a branch with correct ref format', async () => {
      mockOctokit.git.createRef.mockResolvedValue({
        data: {
          ref: 'refs/heads/test-branch',
          object: { sha: 'abc123' },
        },
      })

      await service.createBranch('owner', 'repo', 'test-branch', 'abc123')

      expect(mockOctokit.git.createRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'refs/heads/test-branch',
        sha: 'abc123',
      })
    })

    it('should handle branch creation errors', async () => {
      mockOctokit.git.createRef.mockRejectedValue(
        new Error('Branch already exists')
      )

      await expect(
        service.createBranch('owner', 'repo', 'test-branch', 'abc123')
      ).rejects.toThrow()
    })
  })

  describe('deleteBranch', () => {
    it('should delete a branch with correct ref format', async () => {
      mockOctokit.git.deleteRef.mockResolvedValue({ data: {} })

      await service.deleteBranch('owner', 'repo', 'test-branch')

      expect(mockOctokit.git.deleteRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'heads/test-branch',
      })
    })

    it('should handle branch deletion errors', async () => {
      mockOctokit.git.deleteRef.mockRejectedValue(
        new Error('Branch not found')
      )

      await expect(
        service.deleteBranch('owner', 'repo', 'test-branch')
      ).rejects.toThrow()
    })
  })

  describe('branchExists', () => {
    it('should return true when branch exists', async () => {
      mockOctokit.git.getRef.mockResolvedValue({
        data: {
          ref: 'refs/heads/test-branch',
          object: { sha: 'abc123' },
        },
      })

      const exists = await service.branchExists('owner', 'repo', 'test-branch')

      expect(exists).toBe(true)
      expect(mockOctokit.git.getRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'heads/test-branch',
      })
    })

    it('should return false when branch does not exist (404)', async () => {
      const error = new Error('Not Found')
      ;(error as any).status = 404
      mockOctokit.git.getRef.mockRejectedValue(error)

      const exists = await service.branchExists('owner', 'repo', 'test-branch')

      expect(exists).toBe(false)
    })

    it('should throw error for non-404 errors', async () => {
      const error = new Error('Server Error')
      ;(error as any).status = 500
      mockOctokit.git.getRef.mockRejectedValue(error)

      await expect(
        service.branchExists('owner', 'repo', 'test-branch')
      ).rejects.toThrow()
    })
  })

  describe('createTree', () => {
    it('should create a tree with multiple files', async () => {
      const treeSHA = 'tree123abc'
      mockOctokit.git.createTree.mockResolvedValue({
        data: {
          sha: treeSHA,
          tree: [],
        },
      })

      const treeItems = [
        { path: 'file1.ts', mode: '100644' as const, type: 'blob' as const, content: 'content1' },
        { path: 'file2.ts', mode: '100644' as const, type: 'blob' as const, content: 'content2' },
      ]

      const result = await service.createTree('owner', 'repo', treeItems, 'base123')

      expect(result).toBe(treeSHA)
      expect(mockOctokit.git.createTree).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        tree: treeItems,
        base_tree: 'base123',
      })
    })

    it('should handle tree creation errors', async () => {
      mockOctokit.git.createTree.mockRejectedValue(
        new Error('Tree creation failed')
      )

      await expect(
        service.createTree('owner', 'repo', [], 'base123')
      ).rejects.toThrow()
    })
  })

  describe('createCommit', () => {
    it('should create a commit with files', async () => {
      const parentSHA = 'parent123'
      const treeSHA = 'tree456'
      const commitSHA = 'commit789'

      mockOctokit.git.getCommit.mockResolvedValue({
        data: {
          sha: parentSHA,
          tree: { sha: 'oldtree123' },
        },
      })

      mockOctokit.git.createTree.mockResolvedValue({
        data: { sha: treeSHA },
      })

      mockOctokit.git.createCommit.mockResolvedValue({
        data: { sha: commitSHA },
      })

      mockOctokit.git.updateRef.mockResolvedValue({
        data: { ref: 'refs/heads/test-branch' },
      })

      const files = [
        { path: 'src/file1.ts', content: 'content1', mode: '100644' as const },
        { path: 'src/file2.ts', content: 'content2', mode: '100644' as const },
      ]

      const result = await service.createCommit({
        owner: 'owner',
        repo: 'repo',
        branch: 'test-branch',
        message: 'Test commit',
        files,
        parentSHA,
      })

      expect(result).toBe(commitSHA)
      expect(mockOctokit.git.getCommit).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        commit_sha: parentSHA,
      })
      expect(mockOctokit.git.createCommit).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        message: 'Test commit',
        tree: treeSHA,
        parents: [parentSHA],
      })
      expect(mockOctokit.git.updateRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'heads/test-branch',
        sha: commitSHA,
      })
    })

    it('should reject commits with more than 20 files', async () => {
      const files = Array.from({ length: 21 }, (_, i) => ({
        path: `file${i}.ts`,
        content: `content${i}`,
        mode: '100644' as const,
      }))

      await expect(
        service.createCommit({
          owner: 'owner',
          repo: 'repo',
          branch: 'test-branch',
          message: 'Test commit',
          files,
          parentSHA: 'parent123',
        })
      ).rejects.toThrow(/Batch size exceeds limit/)
    })

    it('should preserve file paths in tree items', async () => {
      const parentSHA = 'parent123'
      const treeSHA = 'tree456'
      const commitSHA = 'commit789'

      mockOctokit.git.getCommit.mockResolvedValue({
        data: {
          sha: parentSHA,
          tree: { sha: 'oldtree123' },
        },
      })

      mockOctokit.git.createTree.mockResolvedValue({
        data: { sha: treeSHA },
      })

      mockOctokit.git.createCommit.mockResolvedValue({
        data: { sha: commitSHA },
      })

      mockOctokit.git.updateRef.mockResolvedValue({
        data: { ref: 'refs/heads/test-branch' },
      })

      const files = [
        { path: 'deeply/nested/path/file.ts', content: 'content', mode: '100644' as const },
      ]

      await service.createCommit({
        owner: 'owner',
        repo: 'repo',
        branch: 'test-branch',
        message: 'Test commit',
        files,
        parentSHA,
      })

      expect(mockOctokit.git.createTree).toHaveBeenCalledWith(
        expect.objectContaining({
          tree: expect.arrayContaining([
            expect.objectContaining({
              path: 'deeply/nested/path/file.ts',
            }),
          ]),
        })
      )
    })
  })

  describe('createBatchedCommits', () => {
    it('should create multiple commits for large file sets', async () => {
      const parentSHA = 'parent123'
      const commit1SHA = 'commit1'
      const commit2SHA = 'commit2'

      mockOctokit.git.getCommit
        .mockResolvedValueOnce({
          data: { sha: parentSHA, tree: { sha: 'tree1' } },
        })
        .mockResolvedValueOnce({
          data: { sha: commit1SHA, tree: { sha: 'tree2' } },
        })

      mockOctokit.git.createTree
        .mockResolvedValueOnce({ data: { sha: 'newtree1' } })
        .mockResolvedValueOnce({ data: { sha: 'newtree2' } })

      mockOctokit.git.createCommit
        .mockResolvedValueOnce({ data: { sha: commit1SHA } })
        .mockResolvedValueOnce({ data: { sha: commit2SHA } })

      mockOctokit.git.updateRef.mockResolvedValue({
        data: { ref: 'refs/heads/test-branch' },
      })

      // Create 25 files (should result in 2 batches)
      const files = Array.from({ length: 25 }, (_, i) => ({
        path: `file${i}.ts`,
        content: `content${i}`,
        mode: '100644' as const,
      }))

      const result = await service.createBatchedCommits(
        'owner',
        'repo',
        'test-branch',
        files,
        parentSHA,
        'Migration changes'
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toBe(commit1SHA)
      expect(result[1]).toBe(commit2SHA)

      // Verify batch messages
      expect(mockOctokit.git.createCommit).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          message: 'Migration changes (batch 1/2: 20 files)',
        })
      )
      expect(mockOctokit.git.createCommit).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          message: 'Migration changes (batch 2/2: 5 files)',
        })
      )
    })

    it('should create single commit for small file sets', async () => {
      const parentSHA = 'parent123'
      const commitSHA = 'commit1'

      mockOctokit.git.getCommit.mockResolvedValue({
        data: { sha: parentSHA, tree: { sha: 'tree1' } },
      })

      mockOctokit.git.createTree.mockResolvedValue({
        data: { sha: 'newtree1' },
      })

      mockOctokit.git.createCommit.mockResolvedValue({
        data: { sha: commitSHA },
      })

      mockOctokit.git.updateRef.mockResolvedValue({
        data: { ref: 'refs/heads/test-branch' },
      })

      const files = Array.from({ length: 10 }, (_, i) => ({
        path: `file${i}.ts`,
        content: `content${i}`,
        mode: '100644' as const,
      }))

      const result = await service.createBatchedCommits(
        'owner',
        'repo',
        'test-branch',
        files,
        parentSHA,
        'Migration changes'
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(commitSHA)
      expect(mockOctokit.git.createCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Migration changes (batch 1/1: 10 files)',
        })
      )
    })

    it('should use previous commit as parent for next batch', async () => {
      const parentSHA = 'parent123'
      const commit1SHA = 'commit1'
      const commit2SHA = 'commit2'

      mockOctokit.git.getCommit
        .mockResolvedValueOnce({
          data: { sha: parentSHA, tree: { sha: 'tree1' } },
        })
        .mockResolvedValueOnce({
          data: { sha: commit1SHA, tree: { sha: 'tree2' } },
        })

      mockOctokit.git.createTree
        .mockResolvedValueOnce({ data: { sha: 'newtree1' } })
        .mockResolvedValueOnce({ data: { sha: 'newtree2' } })

      mockOctokit.git.createCommit
        .mockResolvedValueOnce({ data: { sha: commit1SHA } })
        .mockResolvedValueOnce({ data: { sha: commit2SHA } })

      mockOctokit.git.updateRef.mockResolvedValue({
        data: { ref: 'refs/heads/test-branch' },
      })

      const files = Array.from({ length: 25 }, (_, i) => ({
        path: `file${i}.ts`,
        content: `content${i}`,
        mode: '100644' as const,
      }))

      await service.createBatchedCommits(
        'owner',
        'repo',
        'test-branch',
        files,
        parentSHA,
        'Migration changes'
      )

      // First commit should use original parent
      expect(mockOctokit.git.getCommit).toHaveBeenNthCalledWith(1, {
        owner: 'owner',
        repo: 'repo',
        commit_sha: parentSHA,
      })

      // Second commit should use first commit as parent
      expect(mockOctokit.git.getCommit).toHaveBeenNthCalledWith(2, {
        owner: 'owner',
        repo: 'repo',
        commit_sha: commit1SHA,
      })
    })
  })
})

describe('GitHubIntegrationService - Pull Request Operations', () => {
  let service: GitHubIntegrationService
  let mockOctokit: any

  beforeEach(() => {
    mockOctokit = {
      pulls: {
        create: vi.fn(),
        update: vi.fn(),
        get: vi.fn(),
      },
    }
    service = new GitHubIntegrationService(mockOctokit)
  })

  describe('createPullRequest', () => {
    it('should create a pull request with correct parameters', async () => {
      const mockPRData = {
        number: 123,
        id: 456,
        title: 'Test PR',
        body: 'Test body',
        state: 'open',
        draft: true,
        url: 'https://api.github.com/repos/owner/repo/pulls/123',
        html_url: 'https://github.com/owner/repo/pull/123',
        head: {
          ref: 'feature-branch',
          sha: 'abc123',
        },
        base: {
          ref: 'main',
          sha: 'def456',
        },
        user: {
          id: 1,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://github.com/avatar.png',
          bio: 'Test bio',
          company: 'Test Co',
          location: 'Test City',
          blog: 'https://test.com',
          html_url: 'https://github.com/testuser',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        merged_at: null,
        closed_at: null,
      }

      mockOctokit.pulls.create.mockResolvedValue({ data: mockPRData })

      const result = await service.createPullRequest({
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        body: 'Test body',
        head: 'feature-branch',
        base: 'main',
        draft: true,
      })

      expect(mockOctokit.pulls.create).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        body: 'Test body',
        head: 'feature-branch',
        base: 'main',
        draft: true,
      })

      expect(result.number).toBe(123)
      expect(result.title).toBe('Test PR')
      expect(result.draft).toBe(true)
      expect(result.state).toBe('open')
      expect(result.htmlUrl).toBe('https://github.com/owner/repo/pull/123')
    })

    it('should handle PR creation errors', async () => {
      mockOctokit.pulls.create.mockRejectedValue(
        new Error('PR creation failed')
      )

      await expect(
        service.createPullRequest({
          owner: 'owner',
          repo: 'repo',
          title: 'Test PR',
          body: 'Test body',
          head: 'feature-branch',
          base: 'main',
          draft: true,
        })
      ).rejects.toThrow()
    })
  })

  describe('closePullRequest', () => {
    it('should close a pull request', async () => {
      mockOctokit.pulls.update.mockResolvedValue({
        data: { state: 'closed' },
      })

      await service.closePullRequest('owner', 'repo', 123)

      expect(mockOctokit.pulls.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
        state: 'closed',
      })
    })

    it('should handle PR closure errors', async () => {
      mockOctokit.pulls.update.mockRejectedValue(
        new Error('PR not found')
      )

      await expect(
        service.closePullRequest('owner', 'repo', 123)
      ).rejects.toThrow()
    })
  })

  describe('getPullRequest', () => {
    it('should retrieve pull request information', async () => {
      const mockPRData = {
        number: 123,
        id: 456,
        title: 'Test PR',
        body: 'Test body',
        state: 'open',
        draft: false,
        url: 'https://api.github.com/repos/owner/repo/pulls/123',
        html_url: 'https://github.com/owner/repo/pull/123',
        head: {
          ref: 'feature-branch',
          sha: 'abc123',
        },
        base: {
          ref: 'main',
          sha: 'def456',
        },
        user: {
          id: 1,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://github.com/avatar.png',
          bio: 'Test bio',
          company: 'Test Co',
          location: 'Test City',
          blog: 'https://test.com',
          html_url: 'https://github.com/testuser',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        merged_at: null,
        closed_at: null,
      }

      mockOctokit.pulls.get.mockResolvedValue({ data: mockPRData })

      const result = await service.getPullRequest('owner', 'repo', 123)

      expect(mockOctokit.pulls.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
      })

      expect(result.number).toBe(123)
      expect(result.title).toBe('Test PR')
      expect(result.state).toBe('open')
    })

    it('should handle PR retrieval errors', async () => {
      mockOctokit.pulls.get.mockRejectedValue(
        new Error('PR not found')
      )

      await expect(
        service.getPullRequest('owner', 'repo', 123)
      ).rejects.toThrow()
    })
  })

  describe('generatePRTitle', () => {
    it('should generate correct PR title format', () => {
      const title = service.generatePRTitle('React 17', 'React 18')
      expect(title).toBe('ReviveHub Migration: React 17 to React 18')
    })

    it('should handle framework names with versions', () => {
      const title = service.generatePRTitle('Next.js 12', 'Next.js 13')
      expect(title).toBe('ReviveHub Migration: Next.js 12 to Next.js 13')
    })
  })

  describe('generatePRBody', () => {
    it('should generate comprehensive PR body with all required sections', () => {
      const params = {
        migrationSpec: {
          sourceFramework: { name: 'React', version: '17.0.0' },
          targetFramework: { name: 'React', version: '18.0.0' },
          options: {},
        },
        transformations: {
          'src/App.tsx': {
            originalCode: 'import React from "react"\n\nfunction App() {}',
            transformedCode: 'import React from "react"\nimport { useState } from "react"\n\nfunction App() {}',
            confidence: 95,
            changes: ['Added useState import'],
            warnings: [],
          },
          'src/utils.ts': {
            originalCode: 'export const util = () => {}',
            transformedCode: 'export const util = () => {\n  // Updated\n}',
            confidence: 65,
            changes: ['Updated function'],
            warnings: ['Low confidence'],
          },
        },
        acceptedFiles: ['src/App.tsx', 'src/utils.ts'],
        migrationJobId: 'job-123',
        commits: [
          { sha: 'abc123', message: 'Migration batch 1/1', filesCount: 2 },
        ],
      }

      const body = service.generatePRBody(params)

      // Check for required sections
      expect(body).toContain('# 🚀 ReviveHub Migration')
      expect(body).toContain('⚠️ **Important**')
      expect(body).toContain('Please carefully review all changes')
      expect(body).toContain('**Source Framework:** React 17.0.0')
      expect(body).toContain('**Target Framework:** React 18.0.0')
      expect(body).toContain('## Statistics')
      expect(body).toContain('| Files Changed | 2 |')
      expect(body).toContain('## ⚠️ Files Requiring Manual Review')
      expect(body).toContain('`src/utils.ts`')
      expect(body).toContain('65%')
      expect(body).toContain('## Commits')
      expect(body).toContain('Migration batch 1/1')
      expect(body).toContain('## 🔗 ReviveHub')
      expect(body).toContain('Migration Job job-123')
      expect(body).toContain('ReviveHub](https://revivehub.dev)')
    })

    it('should not show low-confidence section when all files have high confidence', () => {
      const params = {
        migrationSpec: {
          sourceFramework: { name: 'React', version: '17.0.0' },
          targetFramework: { name: 'React', version: '18.0.0' },
          options: {},
        },
        transformations: {
          'src/App.tsx': {
            originalCode: 'code',
            transformedCode: 'new code',
            confidence: 95,
            changes: [],
            warnings: [],
          },
        },
        acceptedFiles: ['src/App.tsx'],
        migrationJobId: 'job-123',
        commits: [
          { sha: 'abc123', message: 'Migration batch 1/1', filesCount: 1 },
        ],
      }

      const body = service.generatePRBody(params)

      expect(body).not.toContain('## ⚠️ Files Requiring Manual Review')
    })

    it('should calculate statistics correctly', () => {
      const params = {
        migrationSpec: {
          sourceFramework: { name: 'React', version: '17.0.0' },
          targetFramework: { name: 'React', version: '18.0.0' },
          options: {},
        },
        transformations: {
          'src/file1.tsx': {
            originalCode: 'line1\nline2\nline3',
            transformedCode: 'line1\nline2\nline3\nline4\nline5',
            confidence: 90,
            changes: [],
            warnings: [],
          },
          'src/file2.tsx': {
            originalCode: 'line1\nline2\nline3\nline4\nline5',
            transformedCode: 'line1\nline2',
            confidence: 85,
            changes: [],
            warnings: [],
          },
        },
        acceptedFiles: ['src/file1.tsx', 'src/file2.tsx'],
        migrationJobId: 'job-123',
        commits: [
          { sha: 'abc123', message: 'Migration', filesCount: 2 },
        ],
      }

      const body = service.generatePRBody(params)

      expect(body).toContain('| Files Changed | 2 |')
      expect(body).toContain('| Lines Added | 2 |')
      expect(body).toContain('| Lines Removed | 3 |')
    })

    it('should sort low-confidence files by confidence score', () => {
      const params = {
        migrationSpec: {
          sourceFramework: { name: 'React', version: '17.0.0' },
          targetFramework: { name: 'React', version: '18.0.0' },
          options: {},
        },
        transformations: {
          'src/file1.tsx': {
            originalCode: 'code',
            transformedCode: 'new code',
            confidence: 75,
            changes: [],
            warnings: [],
          },
          'src/file2.tsx': {
            originalCode: 'code',
            transformedCode: 'new code',
            confidence: 50,
            changes: [],
            warnings: [],
          },
          'src/file3.tsx': {
            originalCode: 'code',
            transformedCode: 'new code',
            confidence: 65,
            changes: [],
            warnings: [],
          },
        },
        acceptedFiles: ['src/file1.tsx', 'src/file2.tsx', 'src/file3.tsx'],
        migrationJobId: 'job-123',
        commits: [
          { sha: 'abc123', message: 'Migration', filesCount: 3 },
        ],
      }

      const body = service.generatePRBody(params)

      // Check that files are sorted by confidence (lowest first)
      const file2Index = body.indexOf('src/file2.tsx')
      const file3Index = body.indexOf('src/file3.tsx')
      const file1Index = body.indexOf('src/file1.tsx')

      expect(file2Index).toBeLessThan(file3Index)
      expect(file3Index).toBeLessThan(file1Index)
    })
  })
})
