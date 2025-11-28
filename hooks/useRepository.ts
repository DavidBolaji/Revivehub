/**
 * React hook for fetching single repository details
 */

import { useState, useEffect, useCallback } from 'react'
import type { Repository } from '@/types/repository'

interface UseRepositoryResult {
  repository: Repository | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRepository(owner: string, repo: string): UseRepositoryResult {
  const [repository, setRepository] = useState<Repository | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRepository = useCallback(async () => {
    if (!owner || !repo) {
      setError('Owner and repository name are required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/repos/${owner}/${repo}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch repository')
      }

      const result = await response.json()
      setRepository(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching repository:', err)
    } finally {
      setLoading(false)
    }
  }, [owner, repo])

  const refetch = useCallback(async () => {
    await fetchRepository()
  }, [fetchRepository])

  useEffect(() => {
    fetchRepository()
  }, [fetchRepository])

  return {
    repository,
    loading,
    error,
    refetch,
  }
}
