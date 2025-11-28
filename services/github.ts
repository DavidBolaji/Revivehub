import type { Repository, CodeFile } from '@/types'
import { getGitHubToken } from '@/lib/auth'

const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://api.github.com'

/**
 * GitHub Service
 * Handles all interactions with the GitHub API using authenticated user tokens
 * Requirements: 4.3, 9.4, 10.3
 */
export class GitHubService {
  /**
   * Gets headers with authenticated GitHub token
   * Requirements: 4.3, 10.3
   * 
   * @returns Headers with Authorization token
   * @throws Error if token is missing or invalid
   */
  private async getHeaders(): Promise<HeadersInit> {
    try {
      const token = await getGitHubToken()
      return {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token}`,
      }
    } catch (error) {
      throw new Error('Failed to get GitHub access token. Please sign in again.')
    }
  }

  /**
   * Gets the authenticated user's GitHub profile
   * Requirements: 4.3, 9.4
   * 
   * @returns GitHub user profile data
   * @throws Error if request fails or token is invalid
   */
  async getAuthenticatedUser() {
    const headers = await this.getHeaders()
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired GitHub token. Please sign in again.')
      }
      throw new Error(`Failed to fetch user data: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Gets repositories for the authenticated user with pagination support
   * Requirements: 9.4
   * 
   * @param page - Page number (default: 1)
   * @param perPage - Results per page (default: 100, max: 100)
   * @returns Array of user repositories
   * @throws Error if request fails or token is invalid
   */
  async getUserRepositories(page = 1, perPage = 100) {
    const headers = await this.getHeaders()
    const response = await fetch(
      `${GITHUB_API_URL}/user/repos?page=${page}&per_page=${perPage}&sort=updated`,
      {
        headers,
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired GitHub token. Please sign in again.')
      }
      throw new Error(`Failed to fetch repositories: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Gets a specific repository by owner and name
   * Requirements: 4.3, 9.4, 10.3
   * 
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @returns Repository data
   * @throws Error if request fails or token is invalid
   */
  async getRepository(owner: string, repo: string): Promise<Repository> {
    const headers = await this.getHeaders()
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired GitHub token. Please sign in again.')
      }
      if (response.status === 404) {
        throw new Error('Repository not found or you do not have access to it.')
      }
      throw new Error(`Failed to fetch repository: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      id: data.id.toString(),
      name: data.name,
      owner: data.owner.login,
      url: data.html_url,
      language: data.language,
      description: data.description,
    }
  }

  /**
   * Gets the content of a file from a repository
   * Requirements: 4.3, 10.3
   * 
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @param path - File path within the repository
   * @returns File content and metadata
   * @throws Error if request fails or token is invalid
   */
  async getFileContent(owner: string, repo: string, path: string): Promise<CodeFile> {
    const headers = await this.getHeaders()
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, {
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired GitHub token. Please sign in again.')
      }
      if (response.status === 404) {
        throw new Error('File not found or you do not have access to it.')
      }
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.type !== 'file') {
      throw new Error('Path is not a file')
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8')

    return {
      path: data.path,
      content,
      language: this.detectLanguage(data.path),
      size: data.size,
    }
  }

  /**
   * Gets the file tree of a repository
   * Requirements: 4.3, 10.3
   * 
   * @param owner - Repository owner username
   * @param repo - Repository name
   * @param branch - Branch name (default: 'main')
   * @returns Array of file paths in the repository
   * @throws Error if request fails or token is invalid
   */
  async getRepositoryTree(owner: string, repo: string, branch = 'main'): Promise<string[]> {
    const headers = await this.getHeaders()
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers,
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired GitHub token. Please sign in again.')
      }
      if (response.status === 404) {
        throw new Error('Repository or branch not found.')
      }
      throw new Error(`Failed to fetch repository tree: ${response.statusText}`)
    }

    const data = await response.json()

    return data.tree
      .filter((item: any) => item.type === 'blob')
      .map((item: any) => item.path)
  }

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      php: 'php',
      cs: 'csharp',
    }
    return languageMap[ext || ''] || 'unknown'
  }
}
