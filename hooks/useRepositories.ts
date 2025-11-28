/**
 * React hook for fetching and managing repositories
 */

import { useState, useEffect, useCallback } from 'react'
import type { Repository, RepositoryListOptions, PaginationInfo } from '@/types/repository'

interface UseRepositoriesResult {
  repositories: Repository[]
  loading: boolean
  error: string | null
  pagination: PaginationInfo | null
  rateLimit: {
    remaining: number
    limit: number
    reset: Date
  } | null
  refetch: () => Promise<void>
  fetchMore: () => Promise<void>
}

export function useRepositories(options: RepositoryListOptions = {}): UseRepositoriesResult {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [rateLimit, setRateLimit] = useState<{
    remaining: number
    limit: number
    reset: Date
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(options.page || 1)

  const fetchRepositories = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        perPage: String(options.perPage || 30),
        page: String(page),
        type: options.type || 'all',
      })

      if (options.affiliation) {
        params.append('affiliation', options.affiliation)
      }

      const response = await fetch(`/api/repos?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch repositories')
      }

      const result = await response.json()

      if (append) {
        setRepositories(prev => [...prev, ...result.data])
      } else {
        setRepositories(result.data)
      }
      
      setPagination(result.pagination)
      setRateLimit(result.rateLimit)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching repositories:', err)
    } finally {
      setLoading(false)
    }
  }, [options])

  const refetch = useCallback(async () => {
    await fetchRepositories(1, false)
  }, [fetchRepositories])

  const fetchMore = useCallback(async () => {
    if (pagination?.hasNextPage) {
      await fetchRepositories(currentPage + 1, true)
    }
  }, [fetchRepositories, pagination, currentPage])

  useEffect(() => {
    fetchRepositories(options.page || 1)
  }, []) // Only run on mount

  return {
    repositories,
    loading,
    error,
    pagination,
    rateLimit,
    refetch,
    fetchMore,
  }
}
