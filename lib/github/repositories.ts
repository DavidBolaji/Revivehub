/**
 * GitHub repository operations with caching and error handling
 */

import { Octokit } from '@octokit/rest'
import { cachedGitHubRequest, CacheKeys } from './cache'
import { handleGitHubError } from './errors'
import type {
  Repository,
  RepositoryContent,
  RepositoryListOptions,
  PaginationInfo,
} from '@/types/repository'

/**
 * Map GitHub API repository response to our Repository type
 */
function mapRepository(data: any): Repository {
  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    owner: data.owner.login,
    description: data.description,
    private: data.private,
    language: data.language,
    stargazersCount: data.stargazers_count,
    forksCount: data.forks_count,
    openIssuesCount: data.open_issues_count,
    defaultBranch: data.default_branch,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    pushedAt: new Date(data.pushed_at),
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
    size: data.size,
    archived: data.archived,
    disabled: data.disabled,
    hasIssues: data.has_issues,
    hasWiki: data.has_wiki,
    topics: data.topics || [],
  }
}

/**
 * Map GitHub API content response to our RepositoryContent type
 */
function mapContent(data: any): RepositoryContent {
  return {
    type: data.type,
    name: data.name,
    path: data.path,
    sha: data.sha,
    size: data.size,
    url: data.url,
    htmlUrl: data.html_url,
    downloadUrl: data.download_url,
    content: data.content,
    encoding: data.encoding,
  }
}

/**
 * Fetch all repositories for the authenticated user
 * Cached for 3 minutes per page
 */
export async function getUserRepositories(
  octokit: Octokit,
  options: RepositoryListOptions = {}
): Promise<{ repositories: Repository[]; pagination: PaginationInfo }> {
  try {
    const {
      sort = 'updated',
      direction = 'desc',
      perPage = 30,
      page = 1,
      type,
      affiliation,
    } = options

    // GitHub API doesn't allow both type and affiliation parameters
    // Use affiliation if provided, otherwise use type
    const params: any = {
      sort,
      direction,
      per_page: perPage,
      page,
    }

    if (affiliation) {
      params.affiliation = affiliation
    } else if (type) {
      params.type = type
    }

    const { data, headers } = await octokit.repos.listForAuthenticatedUser(params)

    const repositories = data.map(mapRepository)

    // Parse Link header for pagination
    const linkHeader = headers.link || ''
    const hasNextPage = linkHeader.includes('rel="next"')
    const hasPreviousPage = linkHeader.includes('rel="prev"')

    return {
      repositories,
      pagination: {
        page,
        perPage,
        hasNextPage,
        hasPreviousPage,
      },
    }
  } catch (error) {
    return handleGitHubError(error)
  }
}

/**
 * Get details for a single repository
 * Cached for 5 minutes
 */
export async function getRepositoryDetails(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<Repository> {
  try {
    return await cachedGitHubRequest(
      CacheKeys.repo(owner, repo),
      300, // 5 minutes
      async () => {
        const { data } = await octokit.repos.get({ owner, repo })
        return mapRepository(data)
      }
    )
  } catch (error) {
    return handleGitHubError(error)
  }
}

/**
 * Get contents of a file or directory in a repository
 * Cached for 5 minutes
 */
export async function getRepositoryContents(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = ''
): Promise<RepositoryContent | RepositoryContent[]> {
  try {
    return await cachedGitHubRequest(
      CacheKeys.repoContent(owner, repo, path),
      300, // 5 minutes
      async () => {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path,
        })

        // Handle array response (directory listing)
        if (Array.isArray(data)) {
          return data.map(mapContent)
        }

        // Handle single file response
        return mapContent(data)
      }
    )
  } catch (error) {
    return handleGitHubError(error)
  }
}

/**
 * Fetch all repositories with pagination support
 * Returns an async generator for efficient memory usage
 */
export async function* iterateUserRepositories(
  octokit: Octokit,
  options: RepositoryListOptions = {}
): AsyncGenerator<Repository[]> {
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      const result = await getUserRepositories(octokit, {
        ...options,
        page,
      })

      if (result.repositories.length === 0) {
        hasMore = false
        break
      }

      yield result.repositories
      hasMore = result.pagination.hasNextPage
      page++
    } catch (error) {
      return handleGitHubError(error)
    }
  }
}
