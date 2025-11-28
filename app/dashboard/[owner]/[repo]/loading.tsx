/**
 * Loading state for repository detail page
 * Requirements: 3.3
 */

import { MetricCardsSkeleton } from '@/components/repository/MetricCardsSkeleton'
import { ShimmerSkeleton } from '@/components/ui/skeleton'

export default function RepositoryDetailLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb skeleton */}
      <nav className="flex items-center gap-2">
        <ShimmerSkeleton className="h-4 w-20" />
        <span className="text-purple-500/50">/</span>
        <ShimmerSkeleton className="h-4 w-24" />
        <span className="text-purple-500/50">/</span>
        <ShimmerSkeleton className="h-4 w-32" />
      </nav>

      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        <ShimmerSkeleton className="h-10 w-32 rounded-lg" />
        
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <ShimmerSkeleton className="h-8 w-8" />
            <ShimmerSkeleton className="h-8 w-64" />
          </div>
          <ShimmerSkeleton className="h-4 w-full sm:w-96 mt-2" />
        </div>
      </div>

      {/* Metric cards skeleton */}
      <MetricCardsSkeleton />

      {/* Scan section skeleton */}
      <div className="rounded-lg border border-purple-500/20 bg-slate-900 p-6">
        <div className="text-center space-y-4">
          <ShimmerSkeleton className="h-6 w-48 mx-auto" />
          <ShimmerSkeleton className="h-4 w-64 mx-auto" />
          <ShimmerSkeleton className="h-12 w-48 mx-auto rounded-lg" />
        </div>
      </div>
    </div>
  )
}
