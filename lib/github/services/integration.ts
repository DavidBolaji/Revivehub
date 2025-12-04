/**
 * GitHub Integration Service for repository operations
 * Handles repository validation, branch operations, and metadata retrieval
 * Requirements: 6.1, 6.2, 6.4
 */

import type { OctokitInstance } from '../client'
import { handleGitHubError } from '../errors'
import { cachedGitHubRequest, CacheKeys as GitHubCacheKeys, CacheTTL as GitHubCacheTTL } from '../cache'
import type { 
  RepositoryValidation, 
  CreateCommitParams, 
  CreatePRParams, 
  PullRequest,
  Phase3TransformResult,
  MigrationSpecification
} from '../types'

/**
 * Helper function to map GitHub user data to our GitHubUser type
 * Handles optional fields that may not be present in all API responses
 */
function mapGitHubUser(user: any): {
  id: number
  login: string
  name: string | null
  email: string | null
  avatarUrl: string
  bio: string | null
  company: string | null
  location: string | null
  blog: string | null
  htmlUrl: string
} {
  return {
    id: user?.id || 0,
    login: user?.login || '',
    name: user?.name || null,
    email: user?.email || null,
    avatarUrl: user?.avatar_url || '',
    bio: user?.bio || null,
    company: user?.company || null,
    location: user?.location || null,
    blog: user?.blog || null,
    htmlUrl: user?.html_url || '',
  }
}

/**
 * GitHubIntegrationService provides core repository operations
 * with caching and error handling
 * Requirements: 6.1, 6.2, 6.4, 7.5
 */
export class GitHubIntegrationService {
  constructor(private octokit: OctokitInstance) {}

  /**
   * Validates repository state before applying changes
   * Checks existence, accessibility, permissions, and archived status
   * Requirements: 6.1, 6.2, 6.4
   */
  async validateRepository(owner: string, repo: string): Promise<RepositoryValidation> {
    const errors: string[] = []
    let exists = false
    let accessible = false
    let hasWriteAccess = false
    let isArchived = false
    let defaultBranch = 'main'

    try {
      const repoData = await cachedGitHubRequest(
        GitHubCacheKeys.repo(owner, repo),
        GitHubCacheTTL.REPO_METADATA,
        async () => {
          const { data } = await this.octokit.repos.get({ owner, repo })
          return data
        }
      )

      exists = true
      accessible = true
      defaultBranch = repoData.default_branch

      if (repoData.archived) {
        isArchived = true
        errors.push('Repository is archived and cannot be modified')
      }

      if (repoData.disabled) {
        errors.push('Repository is disabled and cannot be accessed')
      }

      const permissions = repoData.permissions
      if (permissions) {
        hasWriteAccess = permissions.push === true || permissions.admin === true
        if (!hasWriteAccess) {
          errors.push('Insufficient permissions: write access required')
        }
      } else {
        errors.push('Unable to determine repository permissions')
      }
    } catch (error) {
      handleGitHubError(error)
    }

    return {
      exists,
      accessible,
      hasWriteAccess,
      isArchived,
      defaultBranch,
      errors,
    }
  }

  /**
   * Gets the default branch name for a repository
   * Requirements: 6.2
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    try {
      const repoData = await cachedGitHubRequest(
        GitHubCacheKeys.repo(owner, repo),
        GitHubCacheTTL.REPO_METADATA,
        async () => {
          const { data } = await this.octokit.repos.get({ owner, repo })
          return data
        }
      )

      return repoData.default_branch
    } catch (error) {
      handleGitHubError(error)
    }
  }

  /**
   * Gets the SHA of the latest commit on a branch
   * Requirements: 6.2
   */
  async getBranchSHA(owner: string, repo: string, branch: string): Promise<string> {
    try {
      const branchData = await cachedGitHubRequest(
        GitHubCacheKeys.branch(owner, repo, branch),
        GitHubCacheTTL.BRANCH_INFO,
        async () => {
          const { data } = await this.octokit.repos.getBranch({ owner, repo, branch })
          return data
        }
      )

      return branchData.commit.sha
    } catch (error) {
      handleGitHubError(error)
    }
  }

  /**
   * Creates a new branch in the repository
   * Uses GitHub refs API to create a reference pointing to the specified SHA
   * Requirements: 1.1, 1.3, 9.2
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param branchName - Name of the branch to create (without refs/heads/ prefix)
   * @param sha - SHA of the commit to point the branch to
   * @throws {GitHubError} If branch creation fails
   */
  async createBranch(owner: string, repo: string, branchName: string, sha: string): Promise<void> {
    try {
      // Create a git reference for the new branch
      // The ref must be in the format refs/heads/{branchName}
      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha,
      })

      console.log(`[GitHub] Created branch ${branchName} at SHA ${sha.substring(0, 7)}`)
    } catch (error) {
      // Add context to the error for better debugging
      console.error(`[GitHub] Failed to create branch ${branchName}`, {
        owner,
        repo,
        branchName,
        sha: sha.substring(0, 7),
        error: error instanceof Error ? error.message : String(error),
      })
      handleGitHubError(error)
    }
  }

  /**
   * Deletes a branch from the repository
   * Uses GitHub refs API to delete the branch reference
   * Requirements: 9.2
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param branchName - Name of the branch to delete (without refs/heads/ prefix)
   * @throws {GitHubError} If branch deletion fails
   */
  async deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
    try {
      // Delete the git reference for the branch
      // The ref must be in the format heads/{branchName} (note: no refs/ prefix for delete)
      await this.octokit.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      })

      console.log(`[GitHub] Deleted branch ${branchName}`)
    } catch (error) {
      // Add context to the error for better debugging
      console.error(`[GitHub] Failed to delete branch ${branchName}`, {
        owner,
        repo,
        branchName,
        error: error instanceof Error ? error.message : String(error),
      })
      handleGitHubError(error)
    }
  }

  /**
   * Checks if a branch exists in the repository
   * Requirements: 1.4
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param branchName - Name of the branch to check (without refs/heads/ prefix)
   * @returns true if the branch exists, false otherwise
   */
  async branchExists(owner: string, repo: string, branchName: string): Promise<boolean> {
    try {
      // Try to get the branch reference
      await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      })

      return true
    } catch (error) {
      // If the error is a 404 (not found), the branch doesn't exist
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false
      }

      // For other errors, propagate them
      console.error(`[GitHub] Error checking if branch ${branchName} exists`, {
        owner,
        repo,
        branchName,
        error: error instanceof Error ? error.message : String(error),
      })
      handleGitHubError(error)
    }
  }

  /**
   * Creates a Git tree object containing multiple files
   * Uses GitHub's tree API to create a tree with multiple file changes atomically
   * Requirements: 10.2
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param tree - Array of tree items (files) to include in the tree
   * @param baseSHA - SHA of the base tree to build upon
   * @returns SHA of the created tree
   * @throws {GitHubError} If tree creation fails
   */
  async createTree(
    owner: string,
    repo: string,
    tree: Array<{
      path: string
      mode: '100644' | '100755' | '040000' | '160000' | '120000'
      type: 'blob' | 'tree' | 'commit'
      content?: string
      sha?: string
    }>,
    baseSHA: string
  ): Promise<string> {
    try {
      // Create a new tree based on the base tree
      const { data } = await this.octokit.git.createTree({
        owner,
        repo,
        tree,
        base_tree: baseSHA,
      })

      console.log(`[GitHub] Created tree ${data.sha.substring(0, 7)} with ${tree.length} items`)
      return data.sha
    } catch (error) {
      console.error(`[GitHub] Failed to create tree`, {
        owner,
        repo,
        baseSHA: baseSHA.substring(0, 7),
        itemCount: tree.length,
        error: error instanceof Error ? error.message : String(error),
      })
      handleGitHubError(error)
    }
  }

  /**
   * Creates a Git commit with the specified tree and parent
   * Handles batching of files (max 20 per commit) and formats commit messages
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4
   * 
   * @param params - Commit creation parameters
   * @returns SHA of the created commit
   * @throws {GitHubError} If commit creation fails
   */
  async createCommit(params: CreateCommitParams): Promise<string> {
    const { owner, repo, branch, message, files, parentSHA } = params

    try {
      // Validate batch size (max 20 files per commit)
      // Requirement 2.2, 10.1
      if (files.length > 20) {
        throw new Error(
          `Batch size exceeds limit: ${files.length} files (max 20). ` +
          `Please split files into smaller batches.`
        )
      }

      // Get the base tree from the parent commit
      const { data: parentCommit } = await this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: parentSHA,
      })

      // Build tree items from files
      // Requirements: 2.4 (file path preservation), 2.5 (create vs update)
      const treeItems = files.map(file => ({
        path: file.path, // Preserve original file path (Requirement 2.4)
        mode: file.mode,
        type: 'blob' as const,
        content: file.content,
      }))

      // Create tree using GitHub tree API (Requirement 10.2)
      const treeSHA = await this.createTree(owner, repo, treeItems, parentCommit.tree.sha)

      // Create the commit with the new tree
      // Requirement 10.3: commit message includes batch info
      const { data: commit } = await this.octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: treeSHA,
        parents: [parentSHA],
      })

      // Update the branch reference to point to the new commit
      await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commit.sha,
      })

      console.log(`[GitHub] Created commit ${commit.sha.substring(0, 7)} with ${files.length} files`)
      console.log(`[GitHub] Commit message: ${message}`)

      return commit.sha
    } catch (error) {
      console.error(`[GitHub] Failed to create commit`, {
        owner,
        repo,
        branch,
        parentSHA: parentSHA.substring(0, 7),
        fileCount: files.length,
        error: error instanceof Error ? error.message : String(error),
      })
      handleGitHubError(error)
    }
  }

  /**
   * Creates multiple commits in batches for a large set of files
   * Automatically splits files into batches of 20 and creates sequential commits
   * Requirements: 2.1, 2.2, 2.3, 10.1, 10.3, 10.4
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param branch - Branch name to commit to
   * @param files - Array of files to commit
   * @param parentSHA - SHA of the parent commit
   * @param baseMessage - Base message for commits (batch info will be appended)
   * @returns Array of commit SHAs created
   * @throws {GitHubError} If any commit creation fails
   */
  async createBatchedCommits(
    owner: string,
    repo: string,
    branch: string,
    files: Array<{
      path: string
      content: string
      mode: '100644' | '100755' | '040000' | '160000' | '120000'
    }>,
    parentSHA: string,
    baseMessage: string
  ): Promise<string[]> {
    const BATCH_SIZE = 20 // Requirement 2.2, 10.1
    const commitSHAs: string[] = []
    
    // Calculate total batches
    const totalBatches = Math.ceil(files.length / BATCH_SIZE)
    
    console.log(`[GitHub] Creating ${totalBatches} batched commits for ${files.length} files`)

    let currentParentSHA = parentSHA

    // Create commits sequentially (Requirement 10.4)
    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * BATCH_SIZE
      const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length)
      const batchFiles = files.slice(batchStart, batchEnd)
      
      // Format commit message with batch info (Requirement 2.3, 10.3)
      const batchNumber = i + 1
      const commitMessage = `${baseMessage} (batch ${batchNumber}/${totalBatches}: ${batchFiles.length} files)`

      // Create commit for this batch
      const commitSHA = await this.createCommit({
        owner,
        repo,
        branch,
        message: commitMessage,
        files: batchFiles,
        parentSHA: currentParentSHA,
      })

      commitSHAs.push(commitSHA)
      
      // Use this commit as parent for next batch (Requirement 10.4)
      currentParentSHA = commitSHA

      console.log(
        `[GitHub] Batch ${batchNumber}/${totalBatches} complete: ` +
        `${batchFiles.length} files committed (${commitSHA.substring(0, 7)})`
      )
    }

    console.log(`[GitHub] All ${totalBatches} batches committed successfully`)
    return commitSHAs
  }

  /**
   * Creates a pull request from the feature branch to the base branch
   * Formats PR title and body with migration information and statistics
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5
   * 
   * @param params - Pull request creation parameters
   * @returns Created pull request information
   * @throws {GitHubError} If PR creation fails
   */
  async createPullRequest(params: CreatePRParams): Promise<PullRequest> {
    const { owner, repo, title, body, head, base, draft } = params

    try {
      // Create the pull request
      // Requirement 3.5: Set draft flag to true
      const { data } = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base,
        draft,
      })

      console.log(`[GitHub] Created pull request #${data.number}: ${title}`)
      console.log(`[GitHub] PR URL: ${data.html_url}`)

      // Map the response to our PullRequest type
      return {
        number: data.number,
        id: data.id,
        title: data.title,
        body: data.body,
        state: data.state as 'open' | 'closed' | 'merged',
        draft: data.draft || false,
        url: data.url,
        htmlUrl: data.html_url,
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        user: mapGitHubUser(data.user),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        mergedAt: data.merged_at ? new Date(data.merged_at) : null,
        closedAt: data.closed_at ? new Date(data.closed_at) : null,
      }
    } catch (error) {
      console.error(`[GitHub] Failed to create pull request`, {
        owner,
        repo,
        head,
        base,
        title,
        error: error instanceof Error ? error.message : String(error),
      })
      handleGitHubError(error)
    }
  }

  /**
   * Closes an existing pull request
   * Requirements: 9.1
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number to close
   * @throws {GitHubError} If PR closure fails
   */
  async closePullRequest(owner: string, repo: string, prNumber: number): Promise<void> {
    try {
      await this.octokit.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        state: 'closed',
      })

      console.log(`[GitHub] Closed pull request #${prNumber}`)
    } catch (error) {
      console.error(`[GitHub] Failed to close pull request #${prNumber}`, {
        owner,
        repo,
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      })
      handleGitHubError(error)
    }
  }

  /**
   * Gets information about an existing pull request
   * Requirements: 9.1
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number to retrieve
   * @returns Pull request information
   * @throws {GitHubError} If PR retrieval fails
   */
  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<PullRequest> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      })

      // Map the response to our PullRequest type
      return {
        number: data.number,
        id: data.id,
        title: data.title,
        body: data.body,
        state: data.state as 'open' | 'closed' | 'merged',
        draft: data.draft || false,
        url: data.url,
        htmlUrl: data.html_url,
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        user: mapGitHubUser(data.user),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        mergedAt: data.merged_at ? new Date(data.merged_at) : null,
        closedAt: data.closed_at ? new Date(data.closed_at) : null,
      }
    } catch (error) {
      console.error(`[GitHub] Failed to get pull request #${prNumber}`, {
        owner,
        repo,
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      })
      handleGitHubError(error)
    }
  }

  /**
   * Generates a formatted PR title following the pattern
   * "ReviveHub Migration: {source} to {target}"
   * Requirements: 3.2
   * 
   * @param sourceFramework - Source framework name
   * @param targetFramework - Target framework name
   * @returns Formatted PR title
   */
  generatePRTitle(sourceFramework: string, targetFramework: string): string {
    return `ReviveHub Migration: ${sourceFramework} to ${targetFramework}`
  }

  /**
   * Generates a comprehensive PR body with migration information
   * Includes statistics, warnings, framework info, low-confidence files, and ReviveHub link
   * Requirements: 3.3, 3.4, 8.1, 8.2, 8.3, 8.4, 8.5
   * 
   * @param params - Parameters for PR body generation
   * @returns Formatted PR body in Markdown
   */
  generatePRBody(params: {
    migrationSpec: MigrationSpecification
    transformations: Record<string, Phase3TransformResult>
    acceptedFiles: string[]
    migrationJobId: string
    commits: Array<{ sha: string; message: string; filesCount: number }>
  }): string {
    const { migrationSpec, transformations, acceptedFiles, migrationJobId, commits } = params

    // Calculate statistics (Requirement 3.3, 8.3)
    let totalLinesAdded = 0
    let totalLinesRemoved = 0
    let dependenciesAdded = 0
    let dependenciesRemoved = 0
    const lowConfidenceFiles: Array<{ path: string; confidence: number }> = []

    acceptedFiles.forEach(filePath => {
      const transformation = transformations[filePath]
      if (transformation) {
        // Calculate line changes
        const originalLines = transformation.originalCode.split('\n').length
        const transformedLines = transformation.transformedCode.split('\n').length
        const lineDiff = transformedLines - originalLines

        if (lineDiff > 0) {
          totalLinesAdded += lineDiff
        } else {
          totalLinesRemoved += Math.abs(lineDiff)
        }

        // Track low-confidence files (< 80%)
        if (transformation.confidence < 80) {
          lowConfidenceFiles.push({
            path: filePath,
            confidence: transformation.confidence,
          })
        }

        // Count dependency changes (simplified - looks for import/require changes)
        const originalImports = (transformation.originalCode.match(/import|require/g) || []).length
        const transformedImports = (transformation.transformedCode.match(/import|require/g) || []).length
        const importDiff = transformedImports - originalImports

        if (importDiff > 0) {
          dependenciesAdded += importDiff
        } else {
          dependenciesRemoved += Math.abs(importDiff)
        }
      }
    })

    // Build PR body
    let body = '# 🚀 ReviveHub Migration\n\n'

    // Warning message (Requirement 3.4)
    body += '> ⚠️ **Important**: Please carefully review all changes before merging. '
    body += 'This is an automated migration and may require manual adjustments.\n\n'

    // Source and target framework info (Requirements 8.1, 8.2)
    body += '## Migration Details\n\n'
    body += `**Source Framework:** ${migrationSpec.sourceFramework.name} ${migrationSpec.sourceFramework.version}\n`
    body += `**Target Framework:** ${migrationSpec.targetFramework.name} ${migrationSpec.targetFramework.version}\n\n`

    // Statistics table (Requirement 3.3, 8.3)
    body += '## Statistics\n\n'
    body += '| Metric | Count |\n'
    body += '|--------|-------|\n'
    body += `| Files Changed | ${acceptedFiles.length} |\n`
    body += `| Lines Added | ${totalLinesAdded} |\n`
    body += `| Lines Removed | ${totalLinesRemoved} |\n`
    body += `| Dependencies Added | ${dependenciesAdded} |\n`
    body += `| Dependencies Removed | ${dependenciesRemoved} |\n`
    body += `| Commits Created | ${commits.length} |\n\n`

    // Low-confidence files list (Requirement 8.4)
    if (lowConfidenceFiles.length > 0) {
      body += '## ⚠️ Files Requiring Manual Review\n\n'
      body += 'The following files have low confidence scores and should be carefully reviewed:\n\n'
      body += '| File | Confidence |\n'
      body += '|------|------------|\n'
      lowConfidenceFiles
        .sort((a, b) => a.confidence - b.confidence)
        .forEach(file => {
          body += `| \`${file.path}\` | ${file.confidence}% |\n`
        })
      body += '\n'
    }

    // Commit details
    body += '## Commits\n\n'
    commits.forEach((commit, index) => {
      body += `${index + 1}. ${commit.message} (\`${commit.sha.substring(0, 7)}\`)\n`
    })
    body += '\n'

    // ReviveHub link (Requirement 8.5)
    body += '## 🔗 ReviveHub\n\n'
    body += `View this migration in ReviveHub: [Migration Job ${migrationJobId}](${process.env.NEXT_PUBLIC_APP_URL || 'https://revivehub.dev'}/migrations/${migrationJobId})\n\n`

    // Footer
    body += '---\n'
    body += '*This pull request was automatically generated by [ReviveHub](https://revivehub.dev)*\n'

    return body
  }
}
