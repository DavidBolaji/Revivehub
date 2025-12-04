'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'

interface DashboardHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    githubLogin?: string | null
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    const displayName = user.githubLogin || user.name
    if (displayName) {
      return displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  // Get display name - prioritize GitHub username
  const displayName = user.githubLogin || user.name || 'User'

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center border-b border-purple-500/20 bg-slate-900/80 backdrop-blur-xl px-3 sm:px-4 lg:px-6">
      <div className="flex flex-1 items-center justify-between gap-2 sm:gap-4">
        {/* Search bar - hidden on small mobile, shown on larger screens */}
        <div className="hidden sm:flex flex-1 max-w-md">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm">
              🔍
            </span>
            <input
              type="search"
              placeholder="Search repositories..."
              className="w-full rounded-lg border border-purple-500/20 bg-slate-800/50 py-2 pl-9 pr-3 text-sm text-white placeholder:text-purple-300/50 focus:border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>
        
        {/* Mobile search button */}
        <button className="sm:hidden rounded-lg p-2 text-purple-200 transition-all hover:bg-purple-900/30 hover:text-white">
          <span className="text-lg">🔍</span>
        </button>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 sm:gap-3 rounded-lg border border-purple-500/20 bg-slate-800/50 px-2 py-1.5 sm:px-3 sm:py-2 transition-all hover:border-purple-500/40 hover:bg-slate-800"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'User avatar'}
                  width={32}
                  height={32}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                />
              ) : (
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials()}
                </div>
              )}
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-white">{displayName}</div>
                {user.githubLogin && (
                  <div className="text-xs text-purple-300">@{user.githubLogin}</div>
                )}
              </div>
              <span className="hidden sm:inline text-purple-400 text-xs">{isMenuOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-purple-500/20 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-purple-500/10">
                <div className="p-2">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-orange-400 transition-all hover:bg-orange-900/30 hover:text-orange-300"
                  >
                    <span>🚪</span>
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
