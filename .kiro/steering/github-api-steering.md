---
title: GitHub API Integration Guidelines
description: Best practices for GitHub API integration in ReviveHub
inclusion: always
---

# GitHub API Integration Guidelines for ReviveHub

This document provides guidelines for implementing GitHub API integrations in ReviveHub using Octokit SDK.

## 1. Octokit SDK Setup and Best Practices

### Installation
```bash
pnpm add @octokit/rest @octokit/auth-oauth-app @octokit/plugin-retry @octokit/plugin-throttling
```

### Octokit Instance Creation
Always create authenticated Octokit instances with retry and throttling plugins:

```typescript
import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

const OctokitWithPlugins = Octokit.plugin(retry, throttling)

export function createOctokit(accessToken: string) {
  return new OctokitWithPlugins({
    auth: accessToken,
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(`Rate limit hit for ${options.method} ${options.url}`)
        if (retryCount < 2) {
          octokit.log.info(`Retrying after ${retryAfter} seconds`)
          return true
        }
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(`Secondary rate limit hit for ${options.method} ${options.url}`)
      },
    },
    retry: {
      doNotRetry: ['429'], // Handle rate limits separately
    },
  })
}
```

## 2. Error Handling for Rate Limits

### Rate Limit Error Handler
Create a centralized error handler for GitHub API errors:

```typescript
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
      const resetTime = error.response.headers['x-ratelimit-reset']
      const resetDate = new Date(parseInt(resetTime) * 1000)
      
      throw new GitHubAPIError(
        `GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`,
        403,
        {
          limit: parseInt(error.response.headers['x-ratelimit-limit']),
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
```

### Check Rate Limit Before Operations
Always check rate limits before expensive operations:

```typescript
export async function checkRateLimit(octokit: Octokit) {
  const { data } = await octokit.rateLimit.get()
  
  return {
    core: {
      limit: data.resources.core.limit,
      remaining: data.resources.core.remaining,
      reset: new Date(data.resources.core.reset * 1000),
    },
    search: {
      limit: data.resources.search.limit,
      remaining: data.resources.search.remaining,
      reset: new Date(data.resources.search.reset * 1000),
    },
  }
}
```

## 3. Caching GitHub API Responses

### Cache Strategy
Use Redis or in-memory cache with appropriate TTLs:

```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function cachedGitHubRequest<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await redis.get<T>(cacheKey)
  if (cached) {
    return cached
  }
  
  // Fetch fresh data
  const data = await fetchFn()
  
  // Store in cache
  await redis.setex(cacheKey, ttlSeconds, JSON.stringify(data))
  
  return data
}
```

### Cache TTL Guidelines
- Repository metadata: 5 minutes
- File contents: 10 minutes
- User profile: 15 minutes
- Repository list: 3 minutes
- Commit history: 30 minutes

### Cache Key Patterns
```typescript
export const CacheKeys = {
  repo: (owner: string, repo: string) => `gh:repo:${owner}:${repo}`,
  repoContent: (owner: string, repo: string, path: string) => 
    `gh:content:${owner}:${repo}:${path}`,
  userRepos: (username: string) => `gh:user:${username}:repos`,
  commits: (owner: string, repo: string, branch: string) => 
    `gh:commits:${owner}:${repo}:${branch}`,
}
```

## 4. GitHub Service Module Structure

### Directory Structure
```
lib/
  github/
    client.ts          # Octokit instance creation
    errors.ts          # Error handling utilities
    cache.ts           # Caching utilities
    types.ts           # TypeScript types
    services/
      repository.ts    # Repository operations
      content.ts       # File content operations
      commits.ts       # Commit operations
      analysis.ts      # Code analysis operations
```

### Service Module Pattern
```typescript
// lib/github/services/repository.ts
import { Octokit } from '@octokit/rest'
import { cachedGitHubRequest, CacheKeys } from '../cache'
import { handleGitHubError } from '../errors'
import type { Repository, RepositoryListOptions } from '../types'

export class GitHubRepositoryService {
  constructor(private octokit: Octokit) {}

  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      return await cachedGitHubRequest(
        CacheKeys.repo(owner, repo),
        300, // 5 minutes
        async () => {
          const { data } = await this.octokit.repos.get({ owner, repo })
          return this.mapRepository(data)
        }
      )
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  async listUserRepositories(options?: RepositoryListOptions): Promise<Repository[]> {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: options?.sort || 'updated',
        direction: options?.direction || 'desc',
        per_page: options?.perPage || 30,
        page: options?.page || 1,
      })
      
      return data.map(this.mapRepository)
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  private mapRepository(data: any): Repository {
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
      defaultBranch: data.default_branch,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      pushedAt: new Date(data.pushed_at),
    }
  }
}
```

## 5. TypeScript Types for GitHub Responses

### Core Types
```typescript
// lib/github/types.ts

export interface Repository {
  id: number
  name: string
  fullName: string
  owner: string
  description: string | null
  private: boolean
  language: string | null
  stargazersCount: number
  forksCount: number
  defaultBranch: string
  createdAt: Date
  updatedAt: Date
  pushedAt: Date
}

export interface RepositoryContent {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  name: string
  path: string
  sha: string
  size: number
  url: string
  content?: string // Base64 encoded for files
  encoding?: string
}

export interface Commit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: Date
  }
  committer: {
    name: string
    email: string
    date: Date
  }
  parents: Array<{ sha: string }>
}

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatarUrl: string
  bio: string | null
}

export interface RepositoryListOptions {
  sort?: 'created' | 'updated' | 'pushed' | 'full_name'
  direction?: 'asc' | 'desc'
  perPage?: number
  page?: number
}

export interface PaginationInfo {
  page: number
  perPage: number
  totalCount?: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}
```

## 6. Pagination Handling

### Pagination Helper
```typescript
export async function paginateGitHubRequest<T>(
  octokit: Octokit,
  endpoint: string,
  params: any = {},
  maxPages: number = 10
): Promise<T[]> {
  const results: T[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage && page <= maxPages) {
    try {
      const response = await octokit.request(`GET ${endpoint}`, {
        ...params,
        per_page: 100,
        page,
      })

      results.push(...response.data)

      // Check for next page in Link header
      const linkHeader = response.headers.link
      hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false
      page++
    } catch (error) {
      return handleGitHubError(error)
    }
  }

  return results
}
```

### Iterator Pattern for Large Datasets
```typescript
export async function* iterateRepositoryCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch?: string
): AsyncGenerator<Commit[]> {
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      const { data } = await octokit.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: 100,
        page,
      })

      if (data.length === 0) {
        hasMore = false
        break
      }

      yield data.map(mapCommit)
      page++
    } catch (error) {
      return handleGitHubError(error)
    }
  }
}

// Usage:
for await (const commits of iterateRepositoryCommits(octokit, 'owner', 'repo')) {
  // Process batch of commits
  console.log(`Processing ${commits.length} commits`)
}
```

## 7. Server-Side Usage Pattern

### API Route Example
```typescript
// app/api/repositories/[owner]/[repo]/route.ts
import { auth } from '@/auth'
import { createOctokit } from '@/lib/github/client'
import { GitHubRepositoryService } from '@/lib/github/services/repository'

export async function GET(
  request: Request,
  { params }: { params: { owner: string; repo: string } }
) {
  const session = await auth()
  
  if (!session?.accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const octokit = createOctokit(session.accessToken)
    const repoService = new GitHubRepositoryService(octokit)
    
    const repository = await repoService.getRepository(
      params.owner,
      params.repo
    )
    
    return Response.json(repository)
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      return Response.json(
        { error: error.message, rateLimit: error.rateLimit },
        { status: error.statusCode || 500 }
      )
    }
    
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## 8. Testing Guidelines

### Mock Octokit for Tests
```typescript
import { vi } from 'vitest'

export function createMockOctokit(overrides = {}) {
  return {
    repos: {
      get: vi.fn(),
      listForAuthenticatedUser: vi.fn(),
    },
    rateLimit: {
      get: vi.fn().mockResolvedValue({
        data: {
          resources: {
            core: { limit: 5000, remaining: 4999, reset: Date.now() / 1000 + 3600 },
            search: { limit: 30, remaining: 30, reset: Date.now() / 1000 + 60 },
          },
        },
      }),
    },
    ...overrides,
  } as any
}
```

## Summary

When implementing GitHub API integrations in ReviveHub:

1. ✅ Always use Octokit with retry and throttling plugins
2. ✅ Implement comprehensive error handling for rate limits
3. ✅ Cache responses with appropriate TTLs
4. ✅ Structure services in modular, testable classes
5. ✅ Define strict TypeScript types for all responses
6. ✅ Use pagination helpers for large datasets
7. ✅ Check rate limits before expensive operations
8. ✅ Use async generators for streaming large data
9. ✅ Mock Octokit in tests for reliability
10. ✅ Handle authentication tokens securely from session
