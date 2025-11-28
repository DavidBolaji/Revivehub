/**
 * Example component demonstrating useRepositories hook
 * Displays user's GitHub repositories with loading and error states
 */

'use client'

import { useRepositories } from '@/hooks/useRepositories'
import type { Repository } from '@/types/repository'

export function RepositoryList() {
  const { repositories, loading, error, refetch } = useRepositories({
    sort: 'updated',
    direction: 'desc',
    perPage: 10,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading repositories...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <h3 className="font-semibold text-destructive">Error</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        {error.rateLimit && (
          <p className="mt-2 text-xs text-muted-foreground">
            Rate limit: {error.rateLimit.remaining}/{error.rateLimit.limit} remaining
            <br />
            Resets at: {error.rateLimit.reset.toLocaleString()}
          </p>
        )}
        <button
          onClick={refetch}
          className="mt-3 rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  if (repositories.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No repositories found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Repositories</h2>
        <button
          onClick={refetch}
          className="rounded bg-secondary px-3 py-1 text-sm hover:bg-secondary/80"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid gap-4">
        {repositories.map((repo: Repository) => (
          <div
            key={repo.id}
            className="rounded-lg border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {repo.name}
                  </a>
                </h3>
                {repo.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {repo.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-primary" />
                      {repo.language}
                    </span>
                  )}
                  <span>⭐ {repo.stargazersCount}</span>
                  <span>🍴 {repo.forksCount}</span>
                  {repo.private && (
                    <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-yellow-700 dark:text-yellow-300">
                      Private
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
