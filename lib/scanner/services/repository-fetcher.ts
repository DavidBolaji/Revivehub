import type { Octokit } from '@octokit/rest'
import type { RepositoryContext, FileTree, FileNode, RepositoryMetadata } from '../types'
import { getScannerConfig } from '../config'

/**
 * RepositoryFetcher handles fetching repository data from GitHub API
 * with performance optimizations like batching and file size limits
 */
export class RepositoryFetcher {
  private readonly maxFileSizeMB: number
  private readonly batchSize: number

  constructor(
    private octokit: Octokit,
    maxFileSizeMB?: number,
    batchSize: number = 50
  ) {
    // Use configuration value if not explicitly provided
    const config = getScannerConfig()
    this.maxFileSizeMB = maxFileSizeMB ?? config.maxFileSizeMB
    this.batchSize = batchSize
  }

  /**
   * Fetch complete repository context including metadata, file tree, and relevant file contents
   */
  async fetchRepositoryContext(owner: string, repo: string): Promise<RepositoryContext> {
    // Fetch repository metadata
    const metadata = await this.fetchRepositoryMetadata(owner, repo)

    // Fetch file tree
    const fileTree = await this.fetchFileTree(owner, repo, metadata.defaultBranch)

    // Identify configuration files to fetch
    const configFiles = this.identifyConfigFiles(fileTree)

    // Fetch file contents in batches
    const contents = await this.fetchFileContents(owner, repo, configFiles)

    return {
      owner,
      repo,
      files: fileTree,
      contents,
      metadata
    }
  }

  /**
   * Fetch repository metadata
   */
  private async fetchRepositoryMetadata(owner: string, repo: string): Promise<RepositoryMetadata> {
    const { data } = await this.octokit.repos.get({ owner, repo })

    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      language: data.language,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      pushedAt: new Date(data.pushed_at),
      size: data.size,
      stargazersCount: data.stargazers_count,
      forksCount: data.forks_count
    }
  }

  /**
   * Fetch file tree using GitHub Trees API
   */
  private async fetchFileTree(owner: string, repo: string, branch: string): Promise<FileTree> {
    const { data } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: 'true'
    })

    const files: FileNode[] = data.tree
      .filter(node => node.path && node.sha)
      .map(node => ({
        path: node.path!,
        type: (node.type === 'tree' ? 'dir' : 'file') as 'file' | 'dir',
        size: node.size || 0,
        sha: node.sha!
      }))

    const totalSize = files.reduce((sum, file) => sum + file.size, 0)

    return {
      files,
      totalFiles: files.length,
      totalSize
    }
  }

  /**
   * Identify configuration files that should be fetched for analysis
   */
  private identifyConfigFiles(fileTree: FileTree): string[] {
    const configPatterns = [
      // Package manager files
      'package.json',
      'requirements.txt',
      'Gemfile',
      'composer.json',
      'go.mod',
      'pom.xml',
      'build.gradle',
      
      // TypeScript config
      'tsconfig.json',
      
      // Build tool configs
      'webpack.config.js',
      'webpack.config.ts',
      'vite.config.js',
      'vite.config.ts',
      'rollup.config.js',
      'esbuild.config.js',
      '.parcelrc',
      'turbo.json',
      
      // Framework configs
      'next.config.js',
      'next.config.ts',
      'nuxt.config.js',
      'vue.config.js',
      'angular.json',
      'svelte.config.js',
      'nest-cli.json',
      
      // Documentation
      'README.md',
      'readme.md',
      'README'
    ]

    const maxFileSizeBytes = this.maxFileSizeMB * 1024 * 1024
    const configFiles: string[] = []

    for (const file of fileTree.files) {
      if (file.type !== 'file') continue
      
      // Skip files that are too large
      if (file.size > maxFileSizeBytes) continue

      // Check if file matches any config pattern
      const fileName = file.path.split('/').pop() || ''
      if (configPatterns.includes(fileName)) {
        configFiles.push(file.path)
      }
    }

    return configFiles
  }

  /**
   * Fetch file contents in batches with parallel requests
   */
  private async fetchFileContents(
    owner: string,
    repo: string,
    filePaths: string[]
  ): Promise<Map<string, string>> {
    const contents = new Map<string, string>()

    // Process files in batches
    for (let i = 0; i < filePaths.length; i += this.batchSize) {
      const batch = filePaths.slice(i, i + this.batchSize)

      // Fetch batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(path => this.fetchFileContent(owner, repo, path))
      )

      // Process results
      batch.forEach((path, index) => {
        const result = batchResults[index]
        if (result.status === 'fulfilled' && result.value) {
          contents.set(path, result.value)
        }
      })
    }

    return contents
  }

  /**
   * Fetch a single file's content
   */
  private async fetchFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path
      })

      // Handle file content (not directory)
      if ('content' in data && data.content) {
        // Decode base64 content
        return Buffer.from(data.content, 'base64').toString('utf-8')
      }

      return null
    } catch (error) {
      // File not found or other error - return null to continue gracefully
      return null
    }
  }
}
