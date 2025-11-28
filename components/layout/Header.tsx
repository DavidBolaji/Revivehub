'use client'

import { useState } from 'react'
import Link from 'next/link'

export function DashboardHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-purple-500/20 bg-slate-900/80 backdrop-blur-xl px-6">
      <div className="flex flex-1 items-center justify-between">
        {/* Search bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400">
              🔍
            </span>
            <input
              type="search"
              placeholder="Search repositories..."
              className="w-full rounded-lg border border-purple-500/20 bg-slate-800/50 py-2 pl-10 pr-4 text-sm text-white placeholder:text-purple-300/50 focus:border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-purple-200 transition-all hover:bg-purple-900/30 hover:text-white">
            <span className="text-xl">🔔</span>
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-slate-800/50 px-3 py-2 transition-all hover:border-purple-500/40 hover:bg-slate-800"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-white font-bold">
                U
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-white">User</div>
                <div className="text-xs text-purple-300">user@example.com</div>
              </div>
              <span className="text-purple-400">{isMenuOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-purple-500/20 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-purple-500/10">
                <div className="p-2">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-purple-200 transition-all hover:bg-purple-900/30 hover:text-white"
                  >
                    <span>👤</span>
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-purple-200 transition-all hover:bg-purple-900/30 hover:text-white"
                  >
                    <span>⚙️</span>
                    <span>Settings</span>
                  </Link>
                  <div className="my-1 h-px bg-purple-500/20" />
                  <button
                    onClick={() => {
                      // TODO: Implement logout
                      console.log('Logout')
                    }}
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
