/**
 * TypeScript types for GitHub API responses and operations
 * Requirements: 7.4
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
  htmlUrl: string
  cloneUrl: string
  size: number
  archived: boolean
  disabled: boolean
  hasIssues: boolean
  hasWiki: boolean
  topics: string[]
}

export interface RepositoryContent {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  name: string
  path: string
  sha: string
  size: number
  url: string
  htmlUrl: string | null
  downloadUrl: string | null
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
  tree: {
    sha: string
    url: string
  }
  url: string
  htmlUrl: string
}

export interface GitHubUser {
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
}

export interface RepositoryListOptions {
  sort?: 'created' | 'updated' | 'pushed' | 'full_name'
  direction?: 'asc' | 'desc'
  perPage?: number
  page?: number
  type?: 'all' | 'owner' | 'public' | 'private' | 'member'
  affiliation?: string
}

export interface PaginationInfo {
  page: number
  perPage: number
  totalCount?: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface GitHubRateLimit {
  limit: number
  remaining: number
  reset: Date
  used: number
}

export interface GitHubRateLimitResponse {
  core: GitHubRateLimit
  search: GitHubRateLimit
  graphql: GitHubRateLimit
}

export interface RepositoryValidation {
  exists: boolean
  accessible: boolean
  hasWriteAccess: boolean
  isArchived: boolean
  defaultBranch: string
  errors: string[]
}

export interface CreateCommitParams {
  owner: string
  repo: string
  branch: string
  message: string
  files: Array<{
    path: string
    content: string
    mode: '100644' | '100755' | '040000' | '160000' | '120000'
  }>
  parentSHA: string
}

export interface TreeItem {
  path: string
  mode: '100644' | '100755' | '040000' | '160000' | '120000'
  type: 'blob' | 'tree' | 'commit'
  sha?: string
  content?: string
}

export interface CreatePRParams {
  owner: string
  repo: string
  title: string
  body: string
  head: string // Feature branch
  base: string // Base branch
  draft: boolean
}

export interface PullRequest {
  number: number
  id: number
  title: string
  body: string | null
  state: 'open' | 'closed' | 'merged'
  draft: boolean
  url: string
  htmlUrl: string
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
  user: GitHubUser
  createdAt: Date
  updatedAt: Date
  mergedAt: Date | null
  closedAt: Date | null
}

export interface ApplyChangesRequest {
  repository: {
    owner: string
    name: string
  }
  migrationJobId: string
  acceptedFiles: string[]
  transformations: Record<string, Phase3TransformResult>
  migrationSpec: MigrationSpecification
  baseBranch?: string // Defaults to repository default branch
}

export interface Phase3TransformResult {
  originalCode: string
  transformedCode: string
  confidence: number
  changes: string[]
  warnings: string[]
}

export interface MigrationSpecification {
  sourceFramework: {
    name: string
    version: string
  }
  targetFramework: {
    name: string
    version: string
  }
  options: Record<string, any>
}

export interface ApplyChangesResult {
  operationId: string
  status: 'success' | 'partial' | 'failed'
  branchName: string
  pullRequest: {
    number: number
    url: string
    htmlUrl: string
  }
  commits: Array<{
    sha: string
    message: string
    filesCount: number
  }>
  errors?: Array<{
    step: string
    message: string
    details?: any
  }>
}

export interface ApplyProgress {
  operationId: string
  step: 'validating' | 'creating_branch' | 'committing' | 'creating_pr' | 'complete' | 'error'
  message: string
  percentage: number
  currentBatch?: number
  totalBatches?: number
  timestamp: Date
}

export interface RollbackResult {
  success: boolean
  message: string
  branchDeleted: boolean
  prClosed: boolean
  errors?: string[]
}

export interface BranchNameParams {
  framework: string
  timestamp?: Date
}

export interface GitReference {
  ref: string
  nodeId: string
  url: string
  object: {
    type: string
    sha: string
    url: string
  }
}

export interface GitTree {
  sha: string
  url: string
  tree: TreeItem[]
  truncated: boolean
}

export interface GitCommit {
  sha: string
  nodeId: string
  url: string
  author: {
    name: string
    email: string
    date: string
  }
  committer: {
    name: string
    email: string
    date: string
  }
  message: string
  tree: {
    sha: string
    url: string
  }
  parents: Array<{
    sha: string
    url: string
    htmlUrl: string
  }>
  verification: {
    verified: boolean
    reason: string
    signature: string | null
    payload: string | null
  }
}
