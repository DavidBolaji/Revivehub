'use client'

import { useState } from 'react'

export type SortOption = 'name' | 'stars' | 'updated' | 'health'
export type SortDirection = 'asc' | 'desc'
export type ActivityStatus = 'all' | 'active' | 'stale' | 'archived'

interface RepositoryFiltersProps {
  sortBy: SortOption
  sortDirection: SortDirection
  selectedLanguage: string | null
  selectedFramework: string | null
  activityStatus: ActivityStatus
  onSortChange: (sort: SortOption) => void
  onDirectionChange: (direction: SortDirection) => void
  onLanguageChange: (language: string | null) => void
  onFrameworkChange: (framework: string | null) => void
  onActivityStatusChange: (status: ActivityStatus) => void
  availableLanguages: string[]
  availableFrameworks: string[]
}

export function RepositoryFilters({
  sortBy,
  sortDirection,
  selectedLanguage,
  selectedFramework,
  activityStatus,
  onSortChange,
  onDirectionChange,
  onLanguageChange,
  onFrameworkChange,
  onActivityStatusChange,
  availableLanguages,
  availableFrameworks,
}: RepositoryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="space-y-4 rounded-lg border border-purple-500/20 bg-slate-900/40 p-4 backdrop-blur-sm">
      {/* Main controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort by */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-purple-200">
            <span className="mr-1">🎯</span>
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="rounded-lg border border-purple-500/30 bg-slate-900/80 px-3 py-1.5 text-sm text-white transition-colors hover:border-purple-500/50 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="name">Name</option>
            <option value="stars">Stars</option>
            <option value="updated">Last Updated</option>
            <option value="health">Health Score</option>
          </select>
        </div>

        {/* Sort direction */}
        <button
          onClick={() =>
            onDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')
          }
          className="rounded-lg border border-purple-500/30 bg-slate-900/80 px-3 py-1.5 text-sm text-white transition-all hover:border-purple-500/50 hover:bg-slate-900"
          title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortDirection === 'asc' ? '⬆️' : '⬇️'}
        </button>

        {/* Activity status */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-purple-200">
            <span className="mr-1">⚡</span>
            Activity:
          </label>
          <select
            value={activityStatus}
            onChange={(e) =>
              onActivityStatusChange(e.target.value as ActivityStatus)
            }
            className="rounded-lg border border-purple-500/30 bg-slate-900/80 px-3 py-1.5 text-sm text-white transition-colors hover:border-purple-500/50 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="stale">Stale</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Expand filters button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto rounded-lg border border-purple-500/30 bg-slate-900/80 px-3 py-1.5 text-sm text-purple-200 transition-all hover:border-purple-500/50 hover:bg-slate-900"
        >
          {isExpanded ? '🔼' : '🔽'} {isExpanded ? 'Less' : 'More'} Filters
        </button>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="flex flex-wrap items-center gap-3 border-t border-purple-500/20 pt-4">
          {/* Language filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-purple-200">
              <span className="mr-1">💻</span>
              Language:
            </label>
            <select
              value={selectedLanguage || ''}
              onChange={(e) =>
                onLanguageChange(e.target.value || null)
              }
              className="rounded-lg border border-purple-500/30 bg-slate-900/80 px-3 py-1.5 text-sm text-white transition-colors hover:border-purple-500/50 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Framework filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-purple-200">
              <span className="mr-1">🏗️</span>
              Framework:
            </label>
            <select
              value={selectedFramework || ''}
              onChange={(e) =>
                onFrameworkChange(e.target.value || null)
              }
              className="rounded-lg border border-purple-500/30 bg-slate-900/80 px-3 py-1.5 text-sm text-white transition-colors hover:border-purple-500/50 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="">All Frameworks</option>
              {availableFrameworks.map((framework) => (
                <option key={framework} value={framework}>
                  {framework}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {(selectedLanguage || selectedFramework || activityStatus !== 'all') && (
            <button
              onClick={() => {
                onLanguageChange(null)
                onFrameworkChange(null)
                onActivityStatusChange('all')
              }}
              className="ml-auto rounded-lg border border-orange-500/30 bg-orange-900/30 px-3 py-1.5 text-sm text-orange-200 transition-all hover:border-orange-500/50 hover:bg-orange-900/50"
            >
              <span className="mr-1">🧹</span>
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
