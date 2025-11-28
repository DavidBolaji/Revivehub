/**
 * React hook for fetching repository file/directory contents
 */

import { useState, useEffect, useCallback } from 'react'
import type { RepositoryContent } from '@/types/repository'

interface UseRepositoryContentsResult {
  contents: RepositoryContent | RepositoryContent[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRepositoryContents(
  owner: string,
  repo: string,
  path: string = ''
): UseRepositoryContentsResult {
  const [contents, setContents] = useState<RepositoryContent | RepositoryContent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContents = useCallback(async () => {
    if (!owner || !repo) {
      setError('Owner and repository name are required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (path) {
        params.append('path', path)
      }

      const response = await fetch(
        `/api/repos/${owner}/${repo}/contents?${params.toString()}`
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch repository contents')
      }

      const result = await response.json()
      setContents(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching repository contents:', err)
    } finally {
      setLoading(false)
    }
  }, [owner, repo, path])

  const refetch = useCallback(async () => {
    await fetchContents()
  }, [fetchContents])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  return {
    contents,
    loading,
    error,
    refetch,
  }
}
