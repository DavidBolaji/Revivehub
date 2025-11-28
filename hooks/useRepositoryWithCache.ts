/**
 * React hook for fetching repository details with SWR caching
 */

import useSWR from 'swr'
import type { Repository } from '@/types/repository'

interface UseRepositoryWithCacheResult {
  repository: Repository | undefined
  loading: boolean
  error: Error | undefined
  mutate: () => Promise<Repository | undefined>
}

const fetcher = async (url: string): Promise<Repository> => {
  const response = await fetch(url)
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch repository')
  }

  const result = await response.json()
  return result.data
}

/**
 * Hook to fetch repository metadata with SWR caching
 * Automatically revalidates on focus and refetches stale data
 */
export function useRepositoryWithCache(
  owner: string,
  repo: string
): UseRepositoryWithCacheResult {
  const { data, error, isLoading, mutate } = useSWR<Repository>(
    owner && repo ? `/api/repos/${owner}/${repo}` : null,
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
    repository: data,
    loading: isLoading,
    error,
    mutate,
  }
}
