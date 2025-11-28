/**
 * Skeleton loading component with shimmer effect
 * Requirements: 3.3, 5.4
 */

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-800/50',
        className
      )}
      {...props}
    />
  )
}

interface ShimmerSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function ShimmerSkeleton({ className, ...props }: ShimmerSkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-slate-800/50',
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />
    </div>
  )
}
