/**
 * Example component demonstrating useRepositories hook usage
 * This shows how to fetch and display repositories with pagination
 */

'use client'

import { useRepositories } from '@/hooks/useRepositories'
import { Button } from '@/components/ui/button'

export function RepositoryListExample() {
  const {
    repositories,
    loading,
    error,
    pagination,
    rateLimit,
    refetch,
    fetchMore,
  } = useRepositories({
    sort: 'updated',
    direction: 'desc',
    perPage: 10,
  })

  if (loading && repositories.length === 0) {
    return <div className="p-4">Loading repositories...</div>
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>Error: {error}</p>
        <Button onClick={refetch} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Rate limit info */}
      {rateLimit && (
        <div className="mb-4 text-sm text-gray-600">
          API Rate Limit: {rateLimit.remaining} / {rateLimit.limit} remaining
          (resets at {rateLimit.reset.toLocaleTimeString()})
        </div>
      )}

      {/* Repository list */}
      <div className="space-y-4">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold">{repo.fullName}</h3>
            {repo.description && (
              <p className="text-gray-600 mt-1">{repo.description}</p>
            )}
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              {repo.language && <span>🔵 {repo.language}</span>}
              <span>⭐ {repo.stargazersCount}</span>
              <span>🍴 {repo.forksCount}</span>
              <span>Updated: {repo.updatedAt.toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      {pagination && (
        <div className="mt-6 flex gap-2">
          <Button onClick={refetch} variant="outline">
            Refresh
          </Button>
          {pagination.hasNextPage && (
            <Button onClick={fetchMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
