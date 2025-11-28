/**
 * Unit tests for GitHub Content Service
 * Tests file fetching, recursive traversal, base64 decoding, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHubContentService } from '@/lib/github/content-service'
import { GitHubAPIError } from '@/lib/github/errors'
import type { Octokit } from '@octokit/rest'

// Mock Octokit
function createMockOctokit(overrides = {}) {
  return {
    repos: {
      get: vi.fn(),
      getContent: vi.fn(),
    },
    git: {
      getRef: vi.fn(),
      getTree: vi.fn(),
      getBlob: vi.fn(),
    },
    rateLimit: {
      get: vi.fn().mockResolvedValue({
        data: {
          resources: {
            core: { limit: 5000, remaining: 4999, reset: Date.now() / 1000 + 3600, used: 1 },
            search: { limit: 30, remaining: 30, reset: Date.now() / 1000 + 60, used: 0 },
          },
        },
      }),
    },
    ...overrides,
  } as unknown as Octokit
}

describe('GitHubContentService', () => {
  let service: GitHubContentService
  let mockOctokit: Octokit

  beforeEach(() => {
    mockOctokit = createMockOctokit()
    service = new GitHubContentService(mockOctokit)
  })

  describe('fetchRepositoryFiles', () => {
    it('should fetch all files from repository', async () => {
      // Mock repository info
      vi.mocked(mockOctokit.repos.get).mockResolvedValue({
        data: {
          default_branch: 'main',
        },
      } as any)

      // Mock git ref
      vi.mocked(mockOctokit.git.getRef).mockResolvedValue({
        data: {
          object: { sha: 'commit-sha-123' },
        },
      } as any)

      // Mock git tree
      vi.mocked(mockOctokit.git.getTree).mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'src/index.ts', size: 100, sha: 'file-sha-1' },
            { type: 'blob', path: 'src/utils.ts', size: 200, sha: 'file-sha-2' },
            { type: 'tree', path: 'src', size: 0, sha: 'tree-sha-1' },
          ],
        },
      } as any)

      // Mock blob content
      vi.mocked(mockOctokit.git.getBlob)
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('console.log("index")').toString('base64'),
            encoding: 'base64',
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('export const util = () => {}').toString('base64'),
            encoding: 'base64',
          },
        } as any)

      const result = await service.fetchRepositoryFiles('owner', 'repo')

      expect(result.files).toHaveLength(2)
      expect(result.totalFiles).toBe(2)
      expect(result.files[0].path).toBe('src/index.ts')
      expect(result.files[0].content).toBe('console.log("index")')
      expect(result.files[1].path).toBe('src/utils.ts')
      expect(result.files[1].content).toBe('export const util = () => {}')
    })

    it('should respect exclude patterns', async () => {
      vi.mocked(mockOctokit.repos.get).mockResolvedValue({
        data: { default_branch: 'main' },
      } as any)

      vi.mocked(mockOctokit.git.getRef).mockResolvedValue({
        data: { object: { sha: 'commit-sha' } },
      } as any)

      vi.mocked(mockOctokit.git.getTree).mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'src/index.ts', size: 100, sha: 'sha-1' },
            { type: 'blob', path: 'node_modules/lib.js', size: 200, sha: 'sha-2' },
            { type: 'blob', path: 'package-lock.json', size: 300, sha: 'sha-3' },
          ],
        },
      } as any)

      vi.mocked(mockOctokit.git.getBlob).mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          encoding: 'base64',
        },
      } as any)

      const result = await service.fetchRepositoryFiles('owner', 'repo')

      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('src/index.ts')
      expect(result.skippedFiles).toHaveLength(2)
      expect(result.skippedFiles[0].path).toBe('node_modules/lib.js')
      expect(result.skippedFiles[1].path).toBe('package-lock.json')
    })

    it('should respect include patterns', async () => {
      vi.mocked(mockOctokit.repos.get).mockResolvedValue({
        data: { default_branch: 'main' },
      } as any)

      vi.mocked(mockOctokit.git.getRef).mockResolvedValue({
        data: { object: { sha: 'commit-sha' } },
      } as any)

      vi.mocked(mockOctokit.git.getTree).mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'src/index.ts', size: 100, sha: 'sha-1' },
            { type: 'blob', path: 'src/utils.js', size: 200, sha: 'sha-2' },
            { type: 'blob', path: 'README.md', size: 300, sha: 'sha-3' },
          ],
        },
      } as any)

      vi.mocked(mockOctokit.git.getBlob).mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          encoding: 'base64',
        },
      } as any)

      const result = await service.fetchRepositoryFiles('owner', 'repo', {
        includePatterns: ['*.ts'],
        excludePatterns: [], // Override default excludes
      })

      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('src/index.ts')
    })

    it('should respect max file size', async () => {
      vi.mocked(mockOctokit.repos.get).mockResolvedValue({
        data: { default_branch: 'main' },
      } as any)

      vi.mocked(mockOctokit.git.getRef).mockResolvedValue({
        data: { object: { sha: 'commit-sha' } },
      } as any)

      vi.mocked(mockOctokit.git.getTree).mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'small.ts', size: 100, sha: 'sha-1' },
            { type: 'blob', path: 'large.ts', size: 2000000, sha: 'sha-2' },
          ],
        },
      } as any)

      vi.mocked(mockOctokit.git.getBlob).mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          encoding: 'base64',
        },
      } as any)

      const result = await service.fetchRepositoryFiles('owner', 'repo', {
        maxFileSize: 1000,
      })

      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('small.ts')
      expect(result.skippedFiles).toHaveLength(1)
      expect(result.skippedFiles[0].reason).toContain('too large')
    })

    it('should respect max depth', async () => {
      vi.mocked(mockOctokit.repos.get).mockResolvedValue({
        data: { default_branch: 'main' },
      } as any)

      vi.mocked(mockOctokit.git.getRef).mockResolvedValue({
        data: { object: { sha: 'commit-sha' } },
      } as any)

      vi.mocked(mockOctokit.git.getTree).mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'index.ts', size: 100, sha: 'sha-1' },
            { type: 'blob', path: 'src/utils.ts', size: 200, sha: 'sha-2' },
            { type: 'blob', path: 'src/lib/helper.ts', size: 300, sha: 'sha-3' },
          ],
        },
      } as any)

      vi.mocked(mockOctokit.git.getBlob).mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          encoding: 'base64',
        },
      } as any)

      const result = await service.fetchRepositoryFiles('owner', 'repo', {
        maxDepth: 1,
        excludePatterns: [],
      })

      expect(result.files).toHaveLength(2)
      expect(result.files.map(f => f.path)).toEqual(['index.ts', 'src/utils.ts'])
      expect(result.skippedFiles).toHaveLength(1)
      expect(result.skippedFiles[0].reason).toContain('max depth')
    })

    it('should use specified ref/branch', async () => {
      vi.mocked(mockOctokit.git.getRef).mockResolvedValue({
        data: { object: { sha: 'commit-sha' } },
      } as any)

      vi.mocked(mockOctokit.git.getTree).mockResolvedValue({
        data: { tree: [] },
      } as any)

      await service.fetchRepositoryFiles('owner', 'repo', {
        ref: 'develop',
      })

      expect(mockOctokit.git.getRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'heads/develop',
      })
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(mockOctokit.repos.get).mockRejectedValue(
        new Error('Repository not found')
      )

      await expect(
        service.fetchRepositoryFiles('owner', 'repo')
      ).rejects.toThrow(GitHubAPIError)
    })
  })

  describe('fetchFileByPath', () => {
    it('should fetch single file content', async () => {
      vi.mocked(mockOctokit.repos.getContent).mockResolvedValue({
        data: {
          type: 'file',
          path: 'src/index.ts',
          size: 100,
          sha: 'file-sha',
          content: Buffer.from('console.log("hello")').toString('base64'),
          encoding: 'base64',
        },
      } as any)

      const result = await service.fetchFileByPath('owner', 'repo', 'src/index.ts')

      expect(result.path).toBe('src/index.ts')
      expect(result.content).toBe('console.log("hello")')
      expect(result.size).toBe(100)
      expect(result.sha).toBe('file-sha')
    })

    it('should throw error for directory path', async () => {
      vi.mocked(mockOctokit.repos.getContent).mockResolvedValue({
        data: [
          { type: 'file', name: 'file1.ts' },
          { type: 'file', name: 'file2.ts' },
        ],
      } as any)

      await expect(
        service.fetchFileByPath('owner', 'repo', 'src')
      ).rejects.toThrow('not a file')
    })

    it('should use specified ref', async () => {
      vi.mocked(mockOctokit.repos.getContent).mockResolvedValue({
        data: {
          type: 'file',
          path: 'index.ts',
          size: 100,
          sha: 'sha',
          content: Buffer.from('content').toString('base64'),
        },
      } as any)

      await service.fetchFileByPath('owner', 'repo', 'index.ts', 'develop')

      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'index.ts',
        ref: 'develop',
      })
    })
  })

  describe('fetchDirectoryContents', () => {
    it('should fetch directory contents', async () => {
      vi.mocked(mockOctokit.repos.getContent).mockResolvedValue({
        data: [
          {
            type: 'file',
            name: 'index.ts',
            path: 'src/index.ts',
            sha: 'sha-1',
            size: 100,
            url: 'url-1',
            html_url: 'html-1',
            download_url: 'download-1',
          },
          {
            type: 'dir',
            name: 'utils',
            path: 'src/utils',
            sha: 'sha-2',
            size: 0,
            url: 'url-2',
            html_url: 'html-2',
            download_url: null,
          },
        ],
      } as any)

      const result = await service.fetchDirectoryContents('owner', 'repo', 'src')

      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('file')
      expect(result[0].name).toBe('index.ts')
      expect(result[1].type).toBe('dir')
      expect(result[1].name).toBe('utils')
    })

    it('should throw error for file path', async () => {
      vi.mocked(mockOctokit.repos.getContent).mockResolvedValue({
        data: {
          type: 'file',
          name: 'index.ts',
        },
      } as any)

      await expect(
        service.fetchDirectoryContents('owner', 'repo', 'src/index.ts')
      ).rejects.toThrow('not a directory')
    })

    it('should fetch root directory when path is empty', async () => {
      vi.mocked(mockOctokit.repos.getContent).mockResolvedValue({
        data: [
          { type: 'file', name: 'README.md', path: 'README.md', sha: 'sha', size: 100, url: '', html_url: '', download_url: '' },
        ],
      } as any)

      await service.fetchDirectoryContents('owner', 'repo')

      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: '',
        ref: undefined,
      })
    })
  })

  describe('base64 decoding', () => {
    it('should correctly decode base64 content with newlines', async () => {
      const content = 'Hello\nWorld\nWith\nMultiple\nLines'
      const base64WithNewlines = Buffer.from(content).toString('base64').match(/.{1,60}/g)?.join('\n') || ''

      vi.mocked(mockOctokit.repos.getContent).mockResolvedValue({
        data: {
          type: 'file',
          path: 'test.txt',
          size: content.length,
          sha: 'sha',
          content: base64WithNewlines,
          encoding: 'base64',
        },
      } as any)

      const result = await service.fetchFileByPath('owner', 'repo', 'test.txt')

      expect(result.content).toBe(content)
    })

    it('should handle UTF-8 content correctly', async () => {
      const content = '你好世界 🌍 Привет мир'

      vi.mocked(mockOctokit.repos.getContent).mockResolvedValue({
        data: {
          type: 'file',
          path: 'test.txt',
          size: Buffer.from(content).length,
          sha: 'sha',
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64',
        },
      } as any)

      const result = await service.fetchFileByPath('owner', 'repo', 'test.txt')

      expect(result.content).toBe(content)
    })
  })
})
