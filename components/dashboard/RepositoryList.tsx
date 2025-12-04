'use client'

import { useState, useMemo } from 'react'
import { Repository } from '@/types/repository'
import { RepositoryCard } from './RepositoryCard'
import {
  RepositoryFilters,
  SortOption,
  SortDirection,
  ActivityStatus,
} from './RepositoryFilters'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface RepositoryListProps {
  repositories: Repository[]
}

const ITEMS_PER_PAGE = 12

export function RepositoryList({ repositories }: RepositoryListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [selectedFramework, setSelectedFramework] = useState<string | null>(
    null
  )
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Extract unique languages and frameworks
  const { availableLanguages, availableFrameworks } = useMemo(() => {
    const languages = new Set<string>()
    const frameworks = new Set<string>()

    repositories.forEach((repo) => {
      if (repo.language) {
        languages.add(repo.language)
      }
      // Extract frameworks from topics (common framework names)
      const frameworkTopics = repo.topics.filter((topic) =>
        [
          'react',
          'vue',
          'angular',
          'svelte',
          'nextjs',
          'nuxt',
          'express',
          'django',
          'flask',
          'rails',
          'laravel',
          'spring',
          'dotnet',
        ].includes(topic.toLowerCase())
      )
      frameworkTopics.forEach((fw) => frameworks.add(fw))
    })

    return {
      availableLanguages: Array.from(languages).sort(),
      availableFrameworks: Array.from(frameworks).sort(),
    }
  }, [repositories])

  // Filter and sort repositories
  const filteredAndSortedRepos = useMemo(() => {
    let filtered = [...repositories]

    // Filter by language
    if (selectedLanguage) {
      filtered = filtered.filter((repo) => repo.language === selectedLanguage)
    }

    // Filter by framework
    if (selectedFramework) {
      filtered = filtered.filter((repo) =>
        repo.topics.some(
          (topic) => topic.toLowerCase() === selectedFramework.toLowerCase()
        )
      )
    }

    // Filter by activity status
    if (activityStatus !== 'all') {
      const now = new Date()
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6))

      filtered = filtered.filter((repo) => {
        if (activityStatus === 'archived') {
          return repo.archived
        }
        if (activityStatus === 'active') {
          return (
            !repo.archived && new Date(repo.pushedAt) > sixMonthsAgo
          )
        }
        if (activityStatus === 'stale') {
          return (
            !repo.archived && new Date(repo.pushedAt) <= sixMonthsAgo
          )
        }
        return true
      })
    }

    // Sort repositories
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'stars':
          comparison = a.stargazersCount - b.stargazersCount
          break
        case 'updated':
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'health':
          // Placeholder: random health score for now
          // TODO: Replace with actual health score calculation
          comparison = Math.random() - 0.5
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [
    repositories,
    sortBy,
    sortDirection,
    selectedLanguage,
    selectedFramework,
    activityStatus,
  ])

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedRepos.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentRepos = filteredAndSortedRepos.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: any) => void) => (value: any) => {
    setter(value)
    setCurrentPage(1)
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <RepositoryFilters
        sortBy={sortBy}
        sortDirection={sortDirection}
        selectedLanguage={selectedLanguage}
        selectedFramework={selectedFramework}
        activityStatus={activityStatus}
        onSortChange={handleFilterChange(setSortBy)}
        onDirectionChange={handleFilterChange(setSortDirection)}
        onLanguageChange={handleFilterChange(setSelectedLanguage)}
        onFrameworkChange={handleFilterChange(setSelectedFramework)}
        onActivityStatusChange={handleFilterChange(setActivityStatus)}
        availableLanguages={availableLanguages}
        availableFrameworks={availableFrameworks}
      />

      {/* Results count and pagination info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-purple-300">
        <span>
          Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedRepos.length)} of{' '}
          {filteredAndSortedRepos.length} repositories
        </span>
        {filteredAndSortedRepos.length === 0 && repositories.length > 0 && (
          <span className="text-orange-400">
            👻 No repositories match your filters
          </span>
        )}
        {totalPages > 1 && (
          <span className="text-purple-400">
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* Repository grid - optimized for mobile */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {currentRepos.map((repo) => (
          <RepositoryCard key={repo.id} repository={repo} />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          {/* Previous button */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-purple-500/30 bg-slate-900/60 text-purple-200 transition-all hover:border-purple-500/50 hover:bg-slate-900/80 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-purple-500/30 disabled:hover:bg-slate-900/60"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)

              if (!showPage) {
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="text-purple-400 px-2">
                      ...
                    </span>
                  )
                }
                return null
              }

              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`min-w-[2.5rem] h-10 px-3 rounded-lg border transition-all ${
                    page === currentPage
                      ? 'border-purple-500 bg-purple-600/80 text-white font-semibold'
                      : 'border-purple-500/30 bg-slate-900/60 text-purple-200 hover:border-purple-500/50 hover:bg-slate-900/80'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>

          {/* Next button */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-purple-500/30 bg-slate-900/60 text-purple-200 transition-all hover:border-purple-500/50 hover:bg-slate-900/80 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-purple-500/30 disabled:hover:bg-slate-900/60"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
