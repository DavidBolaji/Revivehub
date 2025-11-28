/**
 * React hook for fetching repositories list with SWR caching
 */

import useSWR from 'swr'
import type { Repository, RepositoryListOptions, PaginationInfo } from '@/types/repository'

interface RepositoriesResponse {
  data: Repository[]
  pagination: PaginationInfo
  rateLimit: {
    remaining: number
    limit: number
    reset: Date
  }
}

interface UseRepositoriesWithCacheResult {
  repositories: Repository[]
  loading: boolean
  error: Error | undefined
  pagination: PaginationInfo | null
  rateLimit: {
    remaining: number
    limit: number
    reset: Date
  } | null
  mutate: () => Promise<RepositoriesResponse | undefined>
}

const fetcher = async (url: string): Promise<RepositoriesResponse> => {
  const response = await fetch(url)
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch repositories')
  }

  return response.json()
}

/**
 * Hook to fetch repositories list with SWR caching
 * Automatically revalidates on focus and refetches stale data
 */
export function useRepositoriesWithCache(
  options: RepositoryListOptions = {}
): UseRepositoriesWithCacheResult {
  const params = new URLSearchParams({
    sort: options.sort || 'updated',
    direction: options.direction || 'desc',
    perPage: String(options.perPage || 30),
    page: String(options.page || 1),
    type: options.type || 'all',
  })

  if (options.affiliation) {
    params.append('affiliation', options.affiliation)
  }

  const { data, error, isLoading, mutate } = useSWR<RepositoriesResponse>(
    `/api/repos?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
      refreshInterval: 0, // Don't auto-refresh
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )

  return {
    repositories: data?.data || [],
    loading: isLoading,
    error,
    pagination: data?.pagination || null,
    rateLimit: data?.rateLimit || null,
    mutate,
  }
}
