/**
 * Reusable loading skeleton for lazy-loaded planner components
 */

interface ComponentLoadingSkeletonProps {
  type?: 'timeline' | 'details' | 'customizer' | 'insights'
  className?: string
}

export function ComponentLoadingSkeleton({ 
  type = 'details',
  className = ''
}: ComponentLoadingSkeletonProps) {
  if (type === 'timeline') {
    return (
      <div className={`rounded-lg border border-purple-500/20 bg-slate-900 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-800 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4">
                <div className="h-12 w-12 bg-slate-800 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-800 rounded" />
                  <div className="h-3 w-1/2 bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'customizer') {
    return (
      <div className={`rounded-lg border border-purple-500/20 bg-slate-900 p-6 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-slate-800 rounded" />
          <div className="h-4 w-full bg-slate-800 rounded" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'insights') {
    return (
      <div className={`rounded-lg border border-purple-500/20 bg-slate-900 p-6 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 bg-slate-800 rounded" />
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-16 w-full bg-slate-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Default: details type
  return (
    <div className={`rounded-lg border border-purple-500/20 bg-slate-900 p-6 ${className}`}>
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-64 bg-slate-800 rounded" />
        <div className="h-4 w-full bg-slate-800 rounded" />
        <div className="h-4 w-3/4 bg-slate-800 rounded" />
      </div>
    </div>
  )
}
