'use client'

import { Repository } from '@/types/repository'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface RepositoryCardProps {
  repository: Repository
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const lastUpdated = formatDistanceToNow(new Date(repository.updatedAt), {
    addSuffix: true,
  })

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsNavigating(true)
    router.push(`/dashboard/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`)
  }

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <div className="group relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-slate-900 to-slate-800 p-3 sm:p-4 lg:p-5 transition-colors hover:border-purple-500/40 h-full flex flex-col">
        {/* Loading overlay */}
        {isNavigating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500" />
              <span className="text-xs text-purple-300">Loading...</span>
            </div>
          </div>
        )}

        {/* Spooky glow effect on hover - simplified */}
        <div className="pointer-events-none absolute inset-0 bg-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="relative z-10 space-y-2 sm:space-y-3 lg:space-y-4 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                {repository.name}
              </h3>
              <p className="text-xs sm:text-sm text-purple-300/70 truncate">{repository.owner}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-purple-200/80 line-clamp-2 h-[2.5rem] sm:h-[2.75rem]">
            {repository.description || (
              <span className="italic text-purple-300/50">
                No description provided
              </span>
            )}
          </p>

          {/* Language and Topics */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 flex-1">
            {repository.language && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-orange-500/30 bg-orange-900/30 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-orange-200">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-orange-400" />
                {repository.language}
              </span>
            )}
            {repository.topics.slice(0, 2).map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-900/30 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-purple-200"
              >
                {topic}
              </span>
            ))}
            {repository.topics.length > 2 && (
              <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-slate-900/40 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-purple-300/70">
                +{repository.topics.length - 2}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 text-[10px] sm:text-xs lg:text-sm text-purple-300/80">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span>⭐</span>
              <span>{repository.stargazersCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span>🔱</span>
              <span>{repository.forksCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span>🐛</span>
              <span>{repository.openIssuesCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs w-full sm:w-auto sm:ml-auto">
              <span>🕐</span>
              <span className="truncate">{lastUpdated}</span>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 text-[10px] sm:text-xs">
            {repository.private && (
              <span className="inline-flex items-center gap-1 text-purple-400/70">
                <span>🔒</span>
                <span className="hidden sm:inline">Private</span>
              </span>
            )}
            {repository.archived && (
              <span className="inline-flex items-center gap-1 text-orange-400/70">
                <span>📦</span>
                <span className="hidden sm:inline">Archived</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
