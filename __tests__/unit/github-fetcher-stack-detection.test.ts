/**
 * Unit tests for GitHub Repository Fetcher - Source Stack Detection
 * Requirements: 4.1, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHubRepositoryFetcher } from '@/lib/migration/github-fetcher'

// Mock the GitHub client and cache
vi.mock('@/lib/github/client', () => ({
  createOctokit: vi.fn(() => ({
    repos: {
      get: vi.fn(),
      getContent: vi.fn(),
    },
    git: {
      getRef: vi.fn(),
      getTree: vi.fn(),
    },
  })),
  checkRateLimit: vi.fn(() =>
    Promise.resolve({
      core: { limit: 5000, remaining: 4999, reset: new Date() },
      search: { limit: 30, remaining: 30, reset: new Date() },
    })
  ),
}))

vi.mock('@/lib/github/cache', () => ({
  cachedGitHubRequest: vi.fn((_key, _ttl, fetchFn) => fetchFn()),
  CacheKeys: {
    repo: (owner: string, repo: string) => `gh:repo:${owner}:${repo}`,
    repoContent: (owner: string, repo: string, path: string) =>
      `gh:content:${owner}:${repo}:${path}`,
    repoTree: (owner: string, repo: string, sha: string) =>
      `gh:tree:${owner}:${repo}:${sha}`,
  },
  CacheTTL: {
    REPO_METADATA: 300,
    FILE_CONTENTS: 600,
    FILE_TREE: 600,
  },
}))

vi.mock('@/lib/github/errors', () => ({
  handleGitHubError: vi.fn((error) => {
    throw error
  }),
  GitHubAPIError: class GitHubAPIError extends Error {},
  withExponentialBackoff: vi.fn((fn) => fn()),
}))

describe('GitHubRepositoryFetcher - Source Stack Detection', () => {
  let fetcher: GitHubRepositoryFetcher
  let mockOctokit: any

  beforeEach(() => {
    fetcher = new GitHubRepositoryFetcher('test-token')
    mockOctokit = (fetcher as any).octokit
  })

  describe('detectSourceStack', () => {
    it('should detect Next.js project with TypeScript', async () => {
      const mockPackageJson = {
        name: 'test-nextjs-app',
        dependencies: {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          '@types/node': '^20.0.0',
          '@types/react': '^18.0.0',
        },
        scripts: {
          dev: 'next dev',
          build: 'next build',
        },
      }

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockPackageJson)).toString('base64'),
        },
      })

      mockOctokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' },
      })

      mockOctokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      })

      mockOctokit.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'package-lock.json', type: 'blob', sha: 'def456', size: 1000 },
          ],
        },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.framework).toBe('Next.js')
      expect(result.version).toBe('14.0.0')
      expect(result.language).toBe('TypeScript')
      expect(result.buildTool).toBe('Next.js (built-in)')
      expect(result.packageManager).toBe('npm')
      expect(result.dependencies).toHaveProperty('next')
      expect(result.dependencies).toHaveProperty('typescript')
    })

    it('should detect React project with JavaScript', async () => {
      const mockPackageJson = {
        name: 'test-react-app',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'react-router-dom': '^6.0.0',
        },
        devDependencies: {
          vite: '^5.0.0',
        },
        scripts: {
          dev: 'vite',
          build: 'vite build',
        },
      }

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockPackageJson)).toString('base64'),
        },
      })

      mockOctokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' },
      })

      mockOctokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      })

      mockOctokit.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'pnpm-lock.yaml', type: 'blob', sha: 'def456', size: 1000 },
          ],
        },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.framework).toBe('React')
      expect(result.version).toBe('18.2.0')
      expect(result.language).toBe('JavaScript')
      expect(result.buildTool).toBe('Vite')
      expect(result.packageManager).toBe('pnpm')
    })

    it('should detect Vue project', async () => {
      const mockPackageJson = {
        name: 'test-vue-app',
        dependencies: {
          vue: '^3.3.0',
          'vue-router': '^4.0.0',
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^4.0.0',
          vite: '^5.0.0',
        },
        scripts: {
          dev: 'vite',
          build: 'vite build',
        },
      }

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockPackageJson)).toString('base64'),
        },
      })

      mockOctokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' },
      })

      mockOctokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      })

      mockOctokit.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'yarn.lock', type: 'blob', sha: 'def456', size: 1000 },
          ],
        },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.framework).toBe('Vue')
      expect(result.version).toBe('3.3.0')
      expect(result.language).toBe('JavaScript')
      expect(result.buildTool).toBe('Vite')
      expect(result.packageManager).toBe('yarn')
    })

    it('should detect Angular project', async () => {
      const mockPackageJson = {
        name: 'test-angular-app',
        dependencies: {
          '@angular/core': '^17.0.0',
          '@angular/common': '^17.0.0',
          '@angular/platform-browser': '^17.0.0',
        },
        devDependencies: {
          '@angular/cli': '^17.0.0',
          typescript: '^5.0.0',
        },
        scripts: {
          start: 'ng serve',
          build: 'ng build',
        },
      }

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockPackageJson)).toString('base64'),
        },
      })

      mockOctokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' },
      })

      mockOctokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      })

      mockOctokit.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'package-lock.json', type: 'blob', sha: 'def456', size: 1000 },
          ],
        },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.framework).toBe('Angular')
      expect(result.version).toBe('17.0.0')
      expect(result.language).toBe('TypeScript')
      expect(result.buildTool).toBe('Angular CLI')
      expect(result.packageManager).toBe('npm')
    })

    it('should detect Express backend project', async () => {
      const mockPackageJson = {
        name: 'test-express-api',
        dependencies: {
          express: '^4.18.0',
          cors: '^2.8.5',
          dotenv: '^16.0.0',
        },
        devDependencies: {
          nodemon: '^3.0.0',
        },
        scripts: {
          start: 'node server.js',
          dev: 'nodemon server.js',
        },
      }

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockPackageJson)).toString('base64'),
        },
      })

      mockOctokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' },
      })

      mockOctokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      })

      mockOctokit.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'package-lock.json', type: 'blob', sha: 'def456', size: 1000 },
          ],
        },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.framework).toBe('Express')
      expect(result.version).toBe('4.18.0')
      expect(result.language).toBe('JavaScript')
      expect(result.packageManager).toBe('npm')
    })

    it('should handle version strings with caret and tilde', async () => {
      const mockPackageJson = {
        name: 'test-app',
        dependencies: {
          react: '~18.2.0',
          next: '^14.1.0',
        },
      }

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockPackageJson)).toString('base64'),
        },
      })

      mockOctokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      })

      mockOctokit.git.getTree.mockResolvedValue({
        data: { tree: [] },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.framework).toBe('Next.js')
      expect(result.version).toBe('14.1.0')
    })

    it('should handle missing package.json gracefully', async () => {
      mockOctokit.repos.getContent.mockRejectedValue(
        new Error('Not Found')
      )

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.framework).toBe('unknown')
      expect(result.version).toBe('unknown')
      expect(result.language).toBe('unknown')
      expect(result.dependencies).toEqual({})
    })

    it('should handle malformed package.json gracefully', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from('invalid json').toString('base64'),
        },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.framework).toBe('unknown')
      expect(result.version).toBe('unknown')
      expect(result.language).toBe('unknown')
      expect(result.dependencies).toEqual({})
    })

    it('should detect Webpack as build tool', async () => {
      const mockPackageJson = {
        name: 'test-app',
        dependencies: {
          react: '^18.2.0',
        },
        devDependencies: {
          webpack: '^5.0.0',
          'webpack-cli': '^5.0.0',
        },
        scripts: {
          build: 'webpack --mode production',
        },
      }

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockPackageJson)).toString('base64'),
        },
      })

      mockOctokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      })

      mockOctokit.git.getTree.mockResolvedValue({
        data: { tree: [] },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.buildTool).toBe('Webpack')
    })

    it('should detect bun as package manager', async () => {
      const mockPackageJson = {
        name: 'test-app',
        dependencies: {
          react: '^18.2.0',
        },
      }

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockPackageJson)).toString('base64'),
        },
      })

      mockOctokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' },
      })

      mockOctokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      })

      mockOctokit.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { path: 'bun.lockb', type: 'blob', sha: 'def456', size: 1000 },
          ],
        },
      })

      const result = await fetcher.detectSourceStack('owner', 'repo')

      expect(result.packageManager).toBe('bun')
    })
  })
})
