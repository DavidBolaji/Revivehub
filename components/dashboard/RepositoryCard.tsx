'use client'

import { Repository } from '@/types/repository'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface RepositoryCardProps {
  repository: Repository
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  const lastUpdated = formatDistanceToNow(new Date(repository.updatedAt), {
    addSuffix: true,
  })

  return (
    <Link href={`/dashboard/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`}>
      <div className="group relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-5 transition-colors hover:border-purple-500/40 cursor-pointer">
        {/* Spooky glow effect on hover - simplified */}
        <div className="pointer-events-none absolute inset-0 bg-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="relative z-10 space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                {repository.name}
              </h3>
              <p className="text-sm text-purple-300/70">{repository.owner}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-purple-200/80 line-clamp-2 min-h-[2.5rem]">
            {repository.description || (
              <span className="italic text-purple-300/50">
                No description provided
              </span>
            )}
          </p>

          {/* Language and Topics */}
          <div className="flex flex-wrap gap-2">
            {repository.language && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-900/30 px-3 py-1 text-xs font-medium text-orange-200">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                {repository.language}
              </span>
            )}
            {repository.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-900/30 px-3 py-1 text-xs font-medium text-purple-200"
              >
                {topic}
              </span>
            ))}
            {repository.topics.length > 3 && (
              <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-slate-900/40 px-3 py-1 text-xs font-medium text-purple-300/70">
                +{repository.topics.length - 3}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-purple-300/80">
            <div className="flex items-center gap-1.5">
              <span>⭐</span>
              <span>{repository.stargazersCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>🔱</span>
              <span>{repository.forksCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>🐛</span>
              <span>{repository.openIssuesCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto sm:ml-auto">
              <span>🕐</span>
              <span className="truncate">{lastUpdated}</span>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 text-xs">
            {repository.private && (
              <span className="inline-flex items-center gap-1 text-purple-400/70">
                <span>🔒</span>
                Private
              </span>
            )}
            {repository.archived && (
              <span className="inline-flex items-center gap-1 text-orange-400/70">
                <span>📦</span>
                Archived
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
