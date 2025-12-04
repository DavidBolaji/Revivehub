import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { RepositoryList } from '@/components/dashboard/RepositoryList'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { Breadcrumb } from '@/components/ui/breadcrumb'
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Dashboard' }]} />

      {/* Welcome section */}
      <div className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-900 to-orange-900 p-4 sm:p-5 lg:p-6">
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1.5 sm:mb-2 flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl lg:text-4xl">🧟‍♂️</span>
            <span>Welcome to ReviveHub</span>
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-purple-200">
            Resurrect your legacy code with AI-powered modernization
          </p>
        </div>
        {/* Spooky glow effect - hidden on mobile for performance */}
        <div className="hidden md:block absolute top-0 right-0 w-48 h-48 lg:w-64 lg:h-64 bg-orange-500/20 rounded-full blur-3xl" />
      </div>

      {/* Stats cards */}
      <DashboardStats repositoryCount={repositories.length} />

      {/* Repositories section */}
      <div className="rounded-lg border border-purple-500/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="border-b border-purple-500/20 p-3 sm:p-4 lg:p-5">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white flex items-center gap-2">
            <span>👻</span>
            <span>Your Repositories</span>
          </h2>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          {error ? (
            <div className="rounded-lg border border-orange-500/30 bg-orange-900/20 p-3 sm:p-4 text-xs sm:text-sm lg:text-base text-orange-200">
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
