'use client'

import { useEffect, useState } from 'react'
import { getUserStatistics, type UserStatistics } from '@/lib/stats/statistics-service'

interface DashboardStatsProps {
  repositoryCount: number
}

export function DashboardStats({ repositoryCount }: DashboardStatsProps) {
  const [stats, setStats] = useState<UserStatistics | null>(null)

  useEffect(() => {
    // Load statistics on mount
    const loadStats = () => {
      const userStats = getUserStatistics()
      setStats(userStats)
    }

    loadStats()

    // Listen for storage events to update stats when they change in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('revivehub_')) {
        loadStats()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events from the same tab
    const handleCustomUpdate = () => {
      loadStats()
    }
    
    window.addEventListener('revivehub-stats-updated', handleCustomUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('revivehub-stats-updated', handleCustomUpdate)
    }
  }, [])

  return (
    <div className="grid gap-2.5 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3">
      <StatCard
        icon="🎃"
        title="Repositories"
        value={repositoryCount.toString()}
        description="Haunted codebases"
        gradient="from-orange-900 to-orange-800"
      />
      <StatCard
        icon="⚡"
        title="Analyses"
        value={stats?.totalAnalyses.toString() || '0'}
        description="Spells cast"
        gradient="from-purple-900 to-purple-800"
        subtitle={stats && stats.totalPatternsFound > 0 ? `${stats.totalPatternsFound} patterns found` : undefined}
      />
      <StatCard
        icon="🔮"
        title="Transformations"
        value={stats?.totalTransformations.toString() || '0'}
        description="Code revived"
        gradient="from-violet-900 to-violet-800"
        subtitle={stats && stats.totalFilesTransformed > 0 ? `${stats.totalFilesTransformed} files transformed` : undefined}
      />
    </div>
  )
}

function StatCard({
  icon,
  title,
  value,
  description,
  gradient,
  subtitle,
}: {
  icon: string
  title: string
  value: string
  description: string
  gradient: string
  subtitle?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br ${gradient} p-4 sm:p-5 lg:p-6 backdrop-blur-sm transition-all hover:scale-105 hover:border-purple-500/40`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-purple-200">{title}</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-1 sm:mt-2">{value}</p>
          <p className="text-xs text-purple-300 mt-0.5 sm:mt-1">{description}</p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-purple-400/80 mt-1 italic">{subtitle}</p>
          )}
        </div>
        <span className="text-3xl sm:text-4xl opacity-50 flex-shrink-0">{icon}</span>
      </div>
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/0 to-purple-500/10 opacity-0 transition-opacity hover:opacity-100" />
    </div>
  )
}
