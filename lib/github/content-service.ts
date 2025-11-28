/**
 * GitHub Content Fetching Service
 * Handles fetching repository files with recursive directory traversal,
 * base64 decoding, caching, and rate limit handling
 * 
 * Requirements: 3A.1, 3A.2, 11B.4
 */

import { Octokit } from '@octokit/rest'
import { handleGitHubError, withExponentialBackoff } from './errors'
import { cachedGitHubRequest, CacheKeys, CacheTTL } from './cache'
import type { RepositoryContent } from '@/types/repository'
import type { RepositoryFile } from '@/types/transformer'

export interface FetchRepositoryFilesOptions {
  /**
   * Branch or commit SHA to fetch from (defaults to default branch)
   */
  ref?: string
  
  /**
   * Maximum depth for recursive traversal (defaults to unlimited)
   */
  maxDepth?: number
  
  /**
   * File patterns to include (glob patterns)
   */
  includePatterns?: string[]
  
  /**
   * File patterns to exclude (glob patterns)
   */
  excludePatterns?: string[]
  
  /**
   * Maximum file size in bytes (files larger than this will be skipped)
   */
  maxFileSize?: number
  
  /**
   * Whether to use caching (defaults to true)
   */
  useCache?: boolean
}

export interface FetchRepositoryFilesResult {
  files: RepositoryFile[]
  totalFiles: number
  totalSize: number
  skippedFiles: Array<{ path: string; reason: string }>
}

/**
 * GitHub Content Service for fetching repository files
 */
export class GitHubContentService {
  constructor(private octokit: Octokit) {}

  /**
   * Fetch all files from a repository with recursive directory traversal
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param options - Fetch options
   * @returns Repository files with content
   */
  async fetchRepositoryFiles(
    owner: string,
    repo: string,
    options: FetchRepositoryFilesOptions = {}
  ): Promise<FetchRepositoryFilesResult> {
    const {
      ref,
      maxDepth = Infinity,
      includePatterns = [],
      excludePatterns = [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.lock',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
      ],
      maxFileSize = 1024 * 1024, // 1MB default
      useCache = true,
    } = options

    try {
      // Get repository info to determine default branch if ref not provided
      const branch = ref || await this.getDefaultBranch(owner, repo)
      
      // Use Git Tree API for efficient recursive fetching
      const tree = await this.fetchGitTree(owner, repo, branch, useCache)
      
      // Filter and fetch file contents
      const result = await this.processGitTree(
        owner,
        repo,
        tree,
        {
          maxDepth,
          includePatterns,
          excludePatterns,
          maxFileSize,
          useCache,
        }
      )
      
      return result
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  /**
   * Get the default branch for a repository
   */
  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    try {
      const { data } = await withExponentialBackoff(() =>
        this.octokit.repos.get({ owner, repo })
      )
      return data.default_branch
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  /**
   * Fetch Git tree (recursive) for efficient file listing
   */
  private async fetchGitTree(
    owner: string,
    repo: string,
    ref: string,
    useCache: boolean
  ): Promise<any[]> {
    const fetchTree = async () => {
      // Get the commit SHA for the ref
      const { data: refData } = await withExponentialBackoff(() =>
        this.octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${ref}`,
        })
      )
      
      const commitSha = refData.object.sha
      
      // Fetch the tree recursively
      const { data: treeData } = await withExponentialBackoff(() =>
        this.octokit.git.getTree({
          owner,
          repo,
          tree_sha: commitSha,
          recursive: 'true',
        })
      )
      
      return treeData.tree
    }

    if (useCache) {
      return cachedGitHubRequest(
        CacheKeys.repoTree(owner, repo, ref),
        CacheTTL.FILE_TREE,
        fetchTree
      )
    }
    
    return fetchTree()
  }

  /**
   * Process Git tree and fetch file contents
   */
  private async processGitTree(
    owner: string,
    repo: string,
    tree: any[],
    options: Required<Omit<FetchRepositoryFilesOptions, 'ref'>>
  ): Promise<FetchRepositoryFilesResult> {
    const files: RepositoryFile[] = []
    const skippedFiles: Array<{ path: string; reason: string }> = []
    let totalSize = 0

    // Filter tree items to only files
    const fileItems = tree.filter(item => item.type === 'blob')

    for (const item of fileItems) {
      const path = item.path as string
      const size = item.size as number

      // Check depth
      const depth = path.split('/').length - 1
      if (depth > options.maxDepth) {
        skippedFiles.push({ path, reason: 'Exceeds max depth' })
        continue
      }

      // Check exclude patterns
      if (this.matchesPatterns(path, options.excludePatterns)) {
        skippedFiles.push({ path, reason: 'Matches exclude pattern' })
        continue
      }

      // Check include patterns (if specified)
      if (options.includePatterns.length > 0 && !this.matchesPatterns(path, options.includePatterns)) {
        skippedFiles.push({ path, reason: 'Does not match include pattern' })
        continue
      }

      // Check file size
      if (size > options.maxFileSize) {
        skippedFiles.push({ path, reason: `File too large (${size} bytes)` })
        continue
      }

      // Fetch file content
      try {
        const content = await this.fetchFileContent(
          owner,
          repo,
          path,
          item.sha,
          options.useCache
        )

        files.push({
          path,
          content,
          size,
          sha: item.sha,
          type: 'file',
        })

        totalSize += size
      } catch (error) {
        console.warn(`Failed to fetch content for ${path}:`, error)
        skippedFiles.push({ 
          path, 
          reason: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return {
      files,
      totalFiles: files.length,
      totalSize,
      skippedFiles,
    }
  }

  /**
   * Fetch and decode file content
   */
  private async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    sha: string,
    useCache: boolean
  ): Promise<string> {
    const fetchContent = async () => {
      // Use blob API for efficient content fetching
      const { data } = await withExponentialBackoff(() =>
        this.octokit.git.getBlob({
          owner,
          repo,
          file_sha: sha,
        })
      )

      // Decode base64 content
      if (data.encoding === 'base64') {
        return this.decodeBase64Content(data.content)
      }

      return data.content
    }

    if (useCache) {
      return cachedGitHubRequest(
        `${CacheKeys.repoContent(owner, repo, path)}:${sha}`,
        CacheTTL.FILE_CONTENTS,
        fetchContent
      )
    }

    return fetchContent()
  }

  /**
   * Decode base64 content to UTF-8 string
   */
  private decodeBase64Content(base64Content: string): string {
    // Remove newlines that GitHub API adds
    const cleanBase64 = base64Content.replace(/\n/g, '')
    
    // Decode base64 to buffer
    const buffer = Buffer.from(cleanBase64, 'base64')
    
    // Convert buffer to UTF-8 string
    return buffer.toString('utf-8')
  }

  /**
   * Check if a path matches any of the given glob patterns
   */
  private matchesPatterns(path: string, patterns: string[]): boolean {
    if (patterns.length === 0) return false

    return patterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
      
      const regex = new RegExp(`^${regexPattern}$`)
      return regex.test(path)
    })
  }

  /**
   * Fetch a single file's content by path
   */
  async fetchFileByPath(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<RepositoryFile> {
    try {
      const { data } = await withExponentialBackoff(() =>
        this.octokit.repos.getContent({
          owner,
          repo,
          path,
          ref,
        })
      )

      // Ensure it's a file, not a directory
      if (Array.isArray(data) || data.type !== 'file') {
        throw new Error(`Path ${path} is not a file`)
      }

      const content = data.content
        ? this.decodeBase64Content(data.content)
        : ''

      return {
        path: data.path,
        content,
        size: data.size,
        sha: data.sha,
        type: 'file',
      }
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  /**
   * Fetch directory contents (non-recursive)
   */
  async fetchDirectoryContents(
    owner: string,
    repo: string,
    path: string = '',
    ref?: string
  ): Promise<RepositoryContent[]> {
    try {
      const { data } = await withExponentialBackoff(() =>
        this.octokit.repos.getContent({
          owner,
          repo,
          path,
          ref,
        })
      )

      // Ensure it's a directory
      if (!Array.isArray(data)) {
        throw new Error(`Path ${path} is not a directory`)
      }

      return data.map(item => ({
        type: item.type as 'file' | 'dir' | 'symlink' | 'submodule',
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        url: item.url,
        htmlUrl: item.html_url,
        downloadUrl: item.download_url,
      }))
    } catch (error) {
      return handleGitHubError(error)
    }
  }
}
