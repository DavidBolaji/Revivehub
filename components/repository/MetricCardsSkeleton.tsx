/**
 * Skeleton loading component for metric cards
 * Requirements: 3.3
 */

import { ShimmerSkeleton } from '@/components/ui/skeleton'

export function MetricCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-purple-800/40 p-6"
        >
          <div className="flex items-center gap-4">
            {/* Icon skeleton */}
            <ShimmerSkeleton className="h-12 w-12 rounded-lg" />

            {/* Value and Label skeleton */}
            <div className="flex-1 space-y-2">
              <ShimmerSkeleton className="h-8 w-20" />
              <ShimmerSkeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
