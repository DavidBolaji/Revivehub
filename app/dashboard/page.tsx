import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { RepositoryList } from '@/components/dashboard/RepositoryList'
import { createOctokit } from '@/lib/github/octokit'
import { getUserRepositories } from '@/lib/github/repositories'
import type { Repository } from '@/types/repository'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.accessToken) {
    redirect('/login')
  }

  // Fetch user's repositories
  let repositories: Repository[] = []
  let error: string | null = null

  try {
    const octokit = createOctokit(session.accessToken)
    const result = await getUserRepositories(octokit, {
      sort: 'updated',
      direction: 'desc',
      perPage: 100,
    })
    repositories = result.repositories
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch repositories'
    console.error('Error fetching repositories:', err)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome section */}
      <div className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-900 to-orange-900 p-4 sm:p-6">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
            <span className="text-3xl sm:text-4xl">🧟‍♂️</span>
            <span>Welcome to ReviveHub</span>
          </h1>
          <p className="text-sm sm:text-base text-purple-200">
            Resurrect your legacy code with AI-powered modernization
          </p>
        </div>
        {/* Spooky glow effect - hidden on mobile for performance */}
        <div className="hidden sm:block absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          icon="🎃"
          title="Repositories"
          value={repositories.length.toString()}
          description="Haunted codebases"
          gradient="from-orange-900 to-orange-800"
        />
        <StatCard
          icon="⚡"
          title="Analyses"
          value="0"
          description="Spells cast"
          gradient="from-purple-900 to-purple-800"
        />
        <StatCard
          icon="🔮"
          title="Transformations"
          value="0"
          description="Code revived"
          gradient="from-violet-900 to-violet-800"
        />
      </div>

      {/* Repositories section */}
      <div className="rounded-lg border border-purple-500/20 bg-slate-900">
        <div className="border-b border-purple-500/20 p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
            <span>👻</span>
            <span>Your Repositories</span>
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {error ? (
            <div className="rounded-lg border border-orange-500/30 bg-orange-900/20 p-3 sm:p-4 text-sm sm:text-base text-orange-200">
              <p className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </p>
            </div>
          ) : repositories.length === 0 ? (
            <EmptyState />
          ) : (
            <RepositoryList repositories={repositories} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  title,
  value,
  description,
  gradient,
}: {
  icon: string
  title: string
  value: string
  description: string
  gradient: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br ${gradient} p-6 backdrop-blur-sm transition-all hover:scale-105 hover:border-purple-500/40`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-purple-200">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          <p className="text-xs text-purple-300 mt-1">{description}</p>
        </div>
        <span className="text-4xl opacity-50">{icon}</span>
      </div>
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/0 to-purple-500/10 opacity-0 transition-opacity hover:opacity-100" />
    </div>
  )
}
