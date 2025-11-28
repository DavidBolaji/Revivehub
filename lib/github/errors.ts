import { RequestError } from '@octokit/request-error'

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimit?: {
      limit: number
      remaining: number
      reset: Date
    }
  ) {
    super(message)
    this.name = 'GitHubAPIError'
  }
}

export async function handleGitHubError(error: unknown): Promise<never> {
  if (error instanceof RequestError) {
    // Rate limit exceeded
    if (error.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
      const resetTime = error.response.headers['x-ratelimit-reset'] || '0'
      const resetDate = new Date(parseInt(resetTime) * 1000)
      
      throw new GitHubAPIError(
        `GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`,
        403,
        {
          limit: parseInt(error.response.headers['x-ratelimit-limit'] || '0'),
          remaining: 0,
          reset: resetDate,
        }
      )
    }
    
    // Other GitHub API errors
    throw new GitHubAPIError(
      error.message || 'GitHub API request failed',
      error.status
    )
  }
  
  throw error
}

/**
 * Exponential backoff retry utility for GitHub API calls
 */
export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('No attempts made')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Check if it's a retryable error
      if (error instanceof RequestError) {
        // Don't retry on authentication errors or not found
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          throw error
        }
        
        // Retry on rate limits, server errors, and network issues
        if (error.status === 429 || error.status >= 500 || !error.status) {
          const delay = baseDelay * Math.pow(2, attempt)
          console.log(`GitHub API retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      // Don't retry other types of errors
      throw error
    }
  }
  
  throw lastError
}