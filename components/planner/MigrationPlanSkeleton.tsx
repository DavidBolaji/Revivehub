/**
 * Skeleton loading component for migration plan
 * Requirements: 5.4
 */

import { ShimmerSkeleton } from '@/components/ui/skeleton'

export function MigrationPlanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="rounded-lg border border-purple-500/20 bg-slate-900 p-6">
        <ShimmerSkeleton className="h-8 w-64 mb-4" />
        <ShimmerSkeleton className="h-4 w-full mb-2" />
        <ShimmerSkeleton className="h-4 w-3/4" />
      </div>

      {/* Overview skeleton */}
      <div className="rounded-lg border border-purple-500/20 bg-slate-900 p-6">
        <ShimmerSkeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="space-y-2">
              <ShimmerSkeleton className="h-4 w-24" />
              <ShimmerSkeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Phases skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((phaseIndex) => (
          <div
            key={phaseIndex}
            className="rounded-lg border border-purple-500/20 bg-slate-900 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <ShimmerSkeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <ShimmerSkeleton className="h-6 w-48 mb-2" />
                <ShimmerSkeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Tasks skeleton */}
            <div className="space-y-3 ml-13">
              {[1, 2, 3].map((taskIndex) => (
                <div key={taskIndex} className="flex items-start gap-3">
                  <ShimmerSkeleton className="h-5 w-5 rounded mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <ShimmerSkeleton className="h-4 w-full" />
                    <ShimmerSkeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights skeleton */}
      <div className="rounded-lg border border-purple-500/20 bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShimmerSkeleton className="h-6 w-6" />
          <ShimmerSkeleton className="h-6 w-32" />
        </div>
        <div className="space-y-2">
          <ShimmerSkeleton className="h-4 w-full" />
          <ShimmerSkeleton className="h-4 w-full" />
          <ShimmerSkeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}
