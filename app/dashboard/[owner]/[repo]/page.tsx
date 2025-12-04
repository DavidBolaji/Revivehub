import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createOctokit } from '@/lib/github/octokit'
import { getRepositoryDetails } from '@/lib/github/repositories'
import { GitHubAPIError } from '@/lib/github/errors'
import type { Repository } from '@/types/repository'
import { RepositoryDetailClient } from '@/components/repository/RepositoryDetailClient'

interface RepositoryDetailPageProps {
  params: {
    owner: string
    repo: string
  }
}

export default async function RepositoryDetailPage({
  params,
}: RepositoryDetailPageProps) {
  const session = await auth()

  if (!session?.accessToken) {
    redirect('/login')
  }

  // Fetch repository metadata
  let repository: Repository | null = null
  let error: string | null = null
  let rateLimit: { limit: number; remaining: number; reset: Date } | null = null

  try {
    const octokit = createOctokit(session.accessToken)
    repository = await getRepositoryDetails(octokit, params.owner, params.repo)
  } catch (err) {
    if (err instanceof GitHubAPIError) {
      error = err.message
      rateLimit = err.rateLimit || null
      
      // For 404 errors, show a specific message
      if (err.statusCode === 404) {
        error = 'Repository not found or you do not have access to it.'
      }
    } else {
      error = err instanceof Error ? err.message : 'Failed to fetch repository details'
    }
    console.error('Error fetching repository:', err)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: params.owner },
          { label: params.repo },
        ]}
      />

      {/* Header with back button and repository name */}
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-slate-900 px-3 py-2 text-sm text-purple-200 transition-all hover:border-purple-500/40 hover:bg-slate-800 hover:shadow-lg hover:shadow-purple-500/10"
          aria-label="Back to Dashboard"
        >
          <span>←</span>
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Link>
        
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl">📦</span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white break-words">
              <span className="text-purple-300">{params.owner}</span>
              <span className="text-purple-500/50 mx-1 sm:mx-2">/</span>
              <span>{params.repo}</span>
            </h1>
          </div>
          {repository?.description && (
            <p className="text-xs sm:text-sm text-purple-200 mt-2 line-clamp-2 break-words">
              {repository.description}
            </p>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-900/20 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-200 mb-1">
                Error Loading Repository
              </h3>
              <p className="text-sm text-orange-200/80">{error}</p>
              {rateLimit && (
                <p className="text-xs text-orange-300 mt-2">
                  Rate limit: {rateLimit.remaining} / {rateLimit.limit} remaining.
                  Resets at {rateLimit.reset.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Repository content */}
      {repository && (
        <RepositoryDetailClient
          repository={repository}
          owner={params.owner}
          repo={params.repo}
        />
      )}
    </div>
  )
}
