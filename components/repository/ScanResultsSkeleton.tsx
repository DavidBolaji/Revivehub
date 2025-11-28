/**
 * Skeleton loading component for scan results
 * Requirements: 3.3
 */

import { ShimmerSkeleton } from '@/components/ui/skeleton'

export function ScanResultsSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {/* Health score skeleton */}
      <div className="flex flex-col items-center gap-4">
        <ShimmerSkeleton className="h-6 w-48" />
        <ShimmerSkeleton className="h-32 w-32 rounded-full" />
      </div>

      {/* Health categories skeleton */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <div
            key={index}
            className="rounded-lg border border-purple-500/20 bg-slate-800/50 p-3"
          >
            <ShimmerSkeleton className="h-3 w-24 mb-2" />
            <ShimmerSkeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Issues summary skeleton */}
      <div className="mt-6 rounded-lg border border-purple-500/20 bg-slate-800/50 p-4">
        <ShimmerSkeleton className="h-4 w-32 mb-3" />
        <div className="flex gap-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-2">
              <ShimmerSkeleton className="h-3 w-3 rounded-full" />
              <ShimmerSkeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
