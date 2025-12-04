'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '🎃',
    description: 'Overview',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/90 border border-purple-500/30 text-white backdrop-blur-xl shadow-lg"
      >
        <span className="text-xl">{isMobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex flex-col border-r border-purple-500/20 bg-slate-900/80 backdrop-blur-xl transition-all duration-300 z-40',
          'lg:relative fixed inset-y-0 left-0',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo section */}
        <div className="flex h-16 items-center border-b border-purple-500/20 px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 font-bold text-white transition-all hover:text-orange-400"
          >
            <span className="text-2xl">🧟‍♂️</span>
            {!isCollapsed && (
              <span className="bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                ReviveHub
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/40 to-orange-600/40 text-white shadow-lg shadow-purple-500/20'
                    : 'text-purple-200 hover:bg-purple-900/30 hover:text-white'
                )}
              >
                <span className="text-xl transition-transform group-hover:scale-110">
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <div className="flex-1">
                    <div>{item.name}</div>
                    <div className="text-xs text-purple-300/70">
                      {item.description}
                    </div>
                  </div>
                )}
                {isActive && (
                  <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="hidden lg:block border-t border-purple-500/20 p-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-900/30 px-3 py-2 text-sm text-purple-200 transition-all hover:bg-purple-900/50 hover:text-white"
          >
            <span className="text-lg">{isCollapsed ? '👉' : '👈'}</span>
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Spooky glow effect */}
        <div className="absolute -right-px top-1/4 h-32 w-px bg-gradient-to-b from-transparent via-purple-500 to-transparent" />
      </aside>
    </>
  )
}
