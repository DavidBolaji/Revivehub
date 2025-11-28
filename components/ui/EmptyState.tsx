import Link from 'next/link'

interface EmptyStateProps {
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({
  title = 'No repositories yet',
  description = 'Start by connecting a repository to analyze and modernize your legacy code.',
  actionLabel = 'Add Repository',
  actionHref = '/dashboard/repositories/new',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Spooky ghost animation */}
      <div className="relative mb-6">
        <div className="text-8xl animate-bounce">👻</div>
        <div className="absolute -bottom-2 left-1/2 h-8 w-16 -translate-x-1/2 rounded-full bg-purple-500/20 blur-xl" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-purple-300 max-w-md mb-6">{description}</p>

      {/* Action button */}
      <Link
        href={actionHref}
        className="group relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-orange-600 px-6 py-3 font-medium text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
      >
        <span className="text-xl group-hover:animate-pulse">🎃</span>
        <span>{actionLabel}</span>
        <span className="text-xl group-hover:animate-pulse">✨</span>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600 to-orange-600 opacity-0 blur-xl transition-opacity group-hover:opacity-50" />
      </Link>

      {/* Additional help text */}
      <p className="mt-6 text-sm text-purple-400">
        Need help? Check out our{' '}
        <Link
          href="/docs"
          className="underline decoration-purple-500/50 underline-offset-2 transition-colors hover:text-orange-400 hover:decoration-orange-500/50"
        >
          documentation
        </Link>
      </p>
    </div>
  )
}
