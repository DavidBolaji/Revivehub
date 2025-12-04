/**
 * Repository-related type definitions
 */

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
  openIssuesCount: number
  defaultBranch: string
  createdAt: Date
  updatedAt: Date
  pushedAt: Date
  topics: string[]
  archived: boolean
  htmlUrl: string
  cloneUrl: string
  size: number
  disabled: boolean
  hasIssues: boolean
  hasWiki: boolean
}

export interface RepositoryContent {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  name: string
  path: string
  sha: string
  size: number
  url: string
  htmlUrl?: string
  downloadUrl?: string | null
  content?: string // Base64 encoded for files
  encoding?: string
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