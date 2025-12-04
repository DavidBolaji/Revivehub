/**
 * GitHub Repository Fetcher for Phase 3 Code Migration
 * Fetches repository metadata, file trees, and file contents with caching and rate limiting
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 15.1, 15.5
 */

import { Octokit } from '@octokit/rest'
import { createOctokit, checkRateLimit } from '@/lib/github/octokit'
import { handleGitHubError, GitHubAPIError, withExponentialBackoff } from '@/lib/github/errors'
import { cachedGitHubRequest, CacheKeys, CacheTTL } from '@/lib/github/cache'
import type {
  RepositoryMetadata,
  FileTreeNode,
  RepositoryFile,
} from '@/types/migration'
import type { SourceStack } from '@/types/transformer'

/**
 * Progress callback for tracking fetch operations
 */
export type FetchProgressCallback = (progress: {
  stage: string
  current: number
  total: number
  message: string
}) => void

/**
 * GitHubRepositoryFetcher class
 * Handles all GitHub API operations for fetching repository data
 */
export class GitHubRepositoryFetcher {
  private octokit: Octokit

  constructor(accessToken: string) {
    this.octokit = createOctokit(accessToken)
  }

  /**
   * Fetch repository metadata
   * Requirements: 4.1, 4.5
   */
  async fetchRepositoryMetadata(
    owner: string,
    repo: string
  ): Promise<RepositoryMetadata> {
    try {
      // Check rate limit before expensive operation
      await this.checkRateLimitOrThrow()

      return await cachedGitHubRequest(
        CacheKeys.repo(owner, repo),
        CacheTTL.REPO_METADATA,
        async () => {
          const { data } = await this.octokit.repos.get({ owner, repo })

          return {
            name: data.name,
            owner: data.owner.login,
            defaultBranch: data.default_branch,
            language: data.language || 'unknown',
            size: data.size,
            fileCount: 0, // Will be updated after fetching file tree
          }
        }
      )
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  /**
   * Check rate limit and throw if exhausted
   * Requirements: 4.6
   */
  private async checkRateLimitOrThrow(): Promise<void> {
    const rateLimit = await checkRateLimit(this.octokit)

    if (rateLimit.core.remaining < 10) {
      const waitTime = rateLimit.core.reset.getTime() - Date.now()
      throw new GitHubAPIError(
        `GitHub API rate limit nearly exhausted. ${rateLimit.core.remaining} requests remaining. Resets in ${Math.ceil(waitTime / 1000 / 60)} minutes.`,
        429,
        {
          limit: rateLimit.core.limit,
          remaining: rateLimit.core.remaining,
          reset: rateLimit.core.reset,
        }
      )
    }
  }

  /**
   * Fetch repository file tree structure
   * Requirements: 4.2, 4.3, 15.1
   */
  async fetchFileTree(
    owner: string,
    repo: string,
    branch?: string
  ): Promise<FileTreeNode[]> {
    try {
      // Check rate limit before expensive operation
      await this.checkRateLimitOrThrow()

      // Get repository metadata to determine default branch if not provided
      const metadata = await this.fetchRepositoryMetadata(owner, repo)
      const targetBranch = branch || metadata.defaultBranch

      // Get the tree SHA for the branch
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`,
      })

      const treeSha = refData.object.sha

      // Fetch the tree recursively with caching
      return await cachedGitHubRequest(
        CacheKeys.repoTree(owner, repo, treeSha),
        CacheTTL.FILE_TREE,
        async () => {
          const { data: treeData } = await this.octokit.git.getTree({
            owner,
            repo,
            tree_sha: treeSha,
            recursive: 'true',
          })

          // Filter and map tree items to FileTreeNode
          const nodes: FileTreeNode[] = treeData.tree
            .filter((item) => {
              // Filter out .gitignore patterns and common excludes
              return (
                item.path &&
                !this.shouldIgnoreFile(item.path) &&
                (item.type === 'blob' || item.type === 'tree')
              )
            })
            .map((item) => ({
              path: item.path!,
              type: item.type === 'blob' ? 'file' : 'dir',
              sha: item.sha!,
              size: item.size || 0,
            }))

          // Build hierarchical structure
          return this.buildFileTreeHierarchy(nodes)
        }
      )
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  /**
   * Check if a file should be ignored based on common patterns
   * Requirements: 4.3
   */
  private shouldIgnoreFile(path: string): boolean {
    const ignorePatterns = [
      /^\.git\//,
      /node_modules\//,
      /\.next\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.cache\//,
      /\.vscode\//,
      /\.idea\//,
      /\.DS_Store$/,
      /\.env$/,
      /\.env\.local$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
      /\.log$/,
      /\.map$/,
    ]

    return ignorePatterns.some((pattern) => pattern.test(path))
  }

  /**
   * Build hierarchical file tree structure from flat list
   * Requirements: 4.2
   */
  private buildFileTreeHierarchy(nodes: FileTreeNode[]): FileTreeNode[] {
    const root: FileTreeNode[] = []
    const nodeMap = new Map<string, FileTreeNode>()

    // First pass: create all nodes
    for (const node of nodes) {
      nodeMap.set(node.path, { ...node, children: node.type === 'dir' ? [] : undefined })
    }

    // Second pass: build hierarchy
    for (const node of nodes) {
      const parts = node.path.split('/')
      if (parts.length === 1) {
        // Root level
        root.push(nodeMap.get(node.path)!)
      } else {
        // Find parent
        const parentPath = parts.slice(0, -1).join('/')
        const parent = nodeMap.get(parentPath)
        if (parent && parent.children) {
          parent.children.push(nodeMap.get(node.path)!)
        }
      }
    }

    return root
  }

  /**
   * Fetch file content for a single file
   * Requirements: 4.4, 15.1
   */
  private async fetchFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    try {
      return await cachedGitHubRequest(
        CacheKeys.repoContent(owner, repo, path),
        CacheTTL.FILE_CONTENTS,
        async () => {
          const { data } = await this.octokit.repos.getContent({
            owner,
            repo,
            path,
          })

          // Handle file content (base64 encoded)
          if ('content' in data && data.content) {
            return Buffer.from(data.content, 'base64').toString('utf-8')
          }

          throw new Error(`Unable to fetch content for ${path}`)
        }
      )
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  /**
   * Fetch batch of files in parallel with progress tracking
   * Requirements: 4.4, 15.2, 15.5
   */
  async fetchBatchFiles(
    owner: string,
    repo: string,
    paths: string[],
    progressCallback?: FetchProgressCallback
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    const batchSize = 20 // Process 20 files per batch
    const totalBatches = Math.ceil(paths.length / batchSize)

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize)
      const currentBatch = Math.floor(i / batchSize) + 1

      // Report progress
      if (progressCallback) {
        progressCallback({
          stage: 'Fetching file contents',
          current: i,
          total: paths.length,
          message: `Processing batch ${currentBatch}/${totalBatches} (${batch.length} files)`,
        })
      }

      // Check rate limit before each batch
      await this.checkRateLimitOrThrow()

      // Fetch files in parallel within the batch
      const batchPromises = batch.map(async (path) => {
        try {
          const content = await withExponentialBackoff(
            () => this.fetchFileContent(owner, repo, path),
            3,
            1000
          )
          return { path, content }
        } catch (error) {
          console.warn(`Failed to fetch ${path}:`, error)
          return { path, content: null }
        }
      })

      const batchResults = await Promise.all(batchPromises)

      // Add successful results to map
      for (const { path, content } of batchResults) {
        if (content !== null) {
          results.set(path, content)
        }
      }
    }

    // Final progress update
    if (progressCallback) {
      progressCallback({
        stage: 'Fetching file contents',
        current: paths.length,
        total: paths.length,
        message: `Completed fetching ${results.size}/${paths.length} files`,
      })
    }

    return results
  }

  /**
   * Fetch all source code files from repository
   * Requirements: 4.2, 4.3, 4.4
   */
  async fetchAllSourceFiles(
    owner: string,
    repo: string,
    branch?: string,
    progressCallback?: FetchProgressCallback
  ): Promise<RepositoryFile[]> {
    try {
      // Fetch file tree
      if (progressCallback) {
        progressCallback({
          stage: 'Fetching file tree',
          current: 0,
          total: 1,
          message: 'Loading repository structure...',
        })
      }

      const fileTree = await this.fetchFileTree(owner, repo, branch)
      const filePaths = this.extractFilePaths(fileTree).filter((path) =>
        this.isSourceFile(path)
      )

      if (progressCallback) {
        progressCallback({
          stage: 'Fetching file tree',
          current: 1,
          total: 1,
          message: `Found ${filePaths.length} source files`,
        })
      }

      // Fetch file contents in batches
      const fileContents = await this.fetchBatchFiles(
        owner,
        repo,
        filePaths,
        progressCallback
      )

      // Convert to RepositoryFile array
      const repositoryFiles: RepositoryFile[] = []
      for (const [path, content] of fileContents) {
        const fileNode = fileTree.find(n => n.path === path)
        repositoryFiles.push({
          path,
          content,
          sha: fileNode?.sha || '',
          size: fileNode?.size || 0,
          type: 'file',
        })
      }

      return repositoryFiles
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  /**
   * Extract all file paths from file tree
   */
  private extractFilePaths(nodes: FileTreeNode[]): string[] {
    const paths: string[] = []

    for (const node of nodes) {
      if (node.type === 'file') {
        paths.push(node.path)
      }
      if (node.children) {
        paths.push(...this.extractFilePaths(node.children))
      }
    }

    return paths
  }

  /**
   * Check if a file is a source code file
   */
  private isSourceFile(path: string): boolean {
    const sourceExtensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.py',
      '.vue',
      '.svelte',
      '.php',
      '.rb',
      '.go',
      '.java',
      '.cs',
      '.cpp',
      '.c',
      '.h',
      '.swift',
      '.kt',
      '.rs',
      '.scala',
      '.json',
      '.yaml',
      '.yml',
      '.toml',
      '.md',
      '.css',
      '.scss',
      '.sass',
      '.less',
    ]

    return sourceExtensions.some((ext) => path.endsWith(ext))
  }

  /**
   * Detect source stack from repository
   * Requirements: 4.1
   */
  async detectSourceStack(
    owner: string,
    repo: string
  ): Promise<SourceStack> {
    try {
      // Fetch package.json to analyze dependencies
      const packageJsonContent = await this.fetchFileContent(owner, repo, 'package.json')
      const packageJson = JSON.parse(packageJsonContent)

      // Extract dependencies
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      // Detect framework
      const framework = this.detectFramework(dependencies)

      // Detect framework version
      const version = this.detectFrameworkVersion(framework, dependencies)

      // Detect language
      const language = this.detectLanguage(packageJson, dependencies)

      // Detect build tool
      const buildTool = this.detectBuildTool(packageJson, dependencies)

      // Detect package manager
      const packageManager = await this.detectPackageManager(owner, repo)

      return {
        framework,
        version,
        language,
        dependencies,
        buildTool,
        packageManager,
      }
    } catch (error) {
      // If package.json doesn't exist or can't be parsed, return minimal info
      console.warn('Failed to detect source stack:', error)
      return {
        framework: 'unknown',
        version: 'unknown',
        language: 'unknown',
        dependencies: {},
      }
    }
  }

  /**
   * Detect framework from dependencies
   * Requirements: 4.1
   */
  private detectFramework(dependencies: Record<string, string>): string {
    // Check for frameworks in order of specificity
    if (dependencies['next']) return 'Next.js'
    if (dependencies['react']) return 'React'
    if (dependencies['vue']) return 'Vue'
    if (dependencies['@angular/core']) return 'Angular'
    if (dependencies['svelte']) return 'Svelte'
    if (dependencies['express']) return 'Express'
    if (dependencies['fastify']) return 'Fastify'
    if (dependencies['@nestjs/core']) return 'NestJS'
    if (dependencies['flask']) return 'Flask'
    if (dependencies['fastapi']) return 'FastAPI'
    if (dependencies['django']) return 'Django'
    if (dependencies['rails']) return 'Ruby on Rails'

    return 'unknown'
  }

  /**
   * Detect framework version from dependencies
   * Requirements: 4.1
   */
  private detectFrameworkVersion(
    framework: string,
    dependencies: Record<string, string>
  ): string {
    const frameworkPackageMap: Record<string, string> = {
      'Next.js': 'next',
      'React': 'react',
      'Vue': 'vue',
      'Angular': '@angular/core',
      'Svelte': 'svelte',
      'Express': 'express',
      'Fastify': 'fastify',
      'NestJS': '@nestjs/core',
      'Flask': 'flask',
      'FastAPI': 'fastapi',
      'Django': 'django',
      'Ruby on Rails': 'rails',
    }

    const packageName = frameworkPackageMap[framework]
    if (!packageName) return 'unknown'

    const version = dependencies[packageName]
    if (!version) return 'unknown'

    // Extract major.minor version (remove ^ ~ >= etc.)
    const versionMatch = version.match(/(\d+\.\d+(?:\.\d+)?)/)
    return versionMatch ? versionMatch[1] : version
  }

  /**
   * Detect primary language from package.json and dependencies
   * Requirements: 4.1
   */
  private detectLanguage(
    packageJson: any,
    dependencies: Record<string, string>
  ): string {
    // Check for TypeScript
    if (
      dependencies['typescript'] ||
      dependencies['@types/node'] ||
      packageJson.devDependencies?.['typescript']
    ) {
      return 'TypeScript'
    }

    // Check for Python
    if (dependencies['flask'] || dependencies['fastapi'] || dependencies['django']) {
      return 'Python'
    }

    // Check for Ruby
    if (dependencies['rails']) {
      return 'Ruby'
    }

    // Default to JavaScript for Node.js projects
    if (packageJson.name) {
      return 'JavaScript'
    }

    return 'unknown'
  }

  /**
   * Detect build tool from package.json and dependencies
   * Requirements: 4.1
   */
  private detectBuildTool(
    packageJson: any,
    dependencies: Record<string, string>
  ): string | undefined {
    // Check scripts for build tools
    const scripts = packageJson.scripts || {}

    if (scripts.build?.includes('vite') || dependencies['vite']) {
      return 'Vite'
    }

    if (scripts.build?.includes('webpack') || dependencies['webpack']) {
      return 'Webpack'
    }

    if (scripts.build?.includes('rollup') || dependencies['rollup']) {
      return 'Rollup'
    }

    if (scripts.build?.includes('esbuild') || dependencies['esbuild']) {
      return 'esbuild'
    }

    if (scripts.build?.includes('parcel') || dependencies['parcel']) {
      return 'Parcel'
    }

    if (dependencies['next']) {
      return 'Next.js (built-in)'
    }

    if (dependencies['@angular/cli']) {
      return 'Angular CLI'
    }

    return undefined
  }

  /**
   * Detect package manager from lock files
   * Requirements: 4.1
   */
  private async detectPackageManager(
    owner: string,
    repo: string
  ): Promise<string | undefined> {
    try {
      // Get repository metadata to determine default branch
      const { data: repoData } = await this.octokit.repos.get({ owner, repo })
      const defaultBranch = repoData.default_branch

      // Get the tree SHA for the branch
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      })

      const treeSha = refData.object.sha

      // Fetch the tree (non-recursive, just root level)
      const { data: treeData } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: treeSha,
        recursive: 'false',
      })

      const rootFiles = treeData.tree.map((item) => item.path || '')

      if (rootFiles.includes('pnpm-lock.yaml')) {
        return 'pnpm'
      }

      if (rootFiles.includes('yarn.lock')) {
        return 'yarn'
      }

      if (rootFiles.includes('package-lock.json')) {
        return 'npm'
      }

      if (rootFiles.includes('bun.lockb')) {
        return 'bun'
      }

      return undefined
    } catch (error) {
      console.warn('Failed to detect package manager:', error)
      return undefined
    }
  }

}
