'use client'

import { useEffect, useState } from 'react'

interface MetricCardsProps {
  stars: number
  forks: number
  openIssues: number
  language?: string | null
}

interface MetricCardData {
  label: string
  value: number
  icon: string
  gradient: string
  borderColor: string
  iconBg: string
}

export function MetricCards({ stars, forks, openIssues }: MetricCardsProps) {
  const [animatedValues, setAnimatedValues] = useState({
    stars: 0,
    forks: 0,
    openIssues: 0,
  })

  // Animated count-up effect on mount
  useEffect(() => {
    const duration = 1000 // 1 second
    const steps = 30
    const interval = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps

      setAnimatedValues({
        stars: Math.floor(stars * progress),
        forks: Math.floor(forks * progress),
        openIssues: Math.floor(openIssues * progress),
      })

      if (currentStep >= steps) {
        setAnimatedValues({ stars, forks, openIssues })
        clearInterval(timer)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [stars, forks, openIssues])

  const metrics: MetricCardData[] = [
    {
      label: 'Stars',
      value: animatedValues.stars,
      icon: '⭐',
      gradient: 'from-purple-900/40 to-purple-800/40',
      borderColor: 'border-purple-500/30',
      iconBg: 'bg-purple-500/20',
    },
    {
      label: 'Forks',
      value: animatedValues.forks,
      icon: '🔱',
      gradient: 'from-orange-900/40 to-orange-800/40',
      borderColor: 'border-orange-500/30',
      iconBg: 'bg-orange-500/20',
    },
    {
      label: 'Open Issues',
      value: animatedValues.openIssues,
      icon: '🐛',
      gradient: 'from-purple-900/40 to-orange-900/40',
      borderColor: 'border-purple-500/20',
      iconBg: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {metrics.map((metric, index) => (
        <MetricCard key={metric.label} metric={metric} index={index} />
      ))}
    </div>
  )
}

interface MetricCardProps {
  metric: MetricCardData
  index: number
}

function MetricCard({ metric, index }: MetricCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-lg border ${metric.borderColor} bg-gradient-to-br ${metric.gradient} p-6 transition-all duration-300 hover:border-opacity-60 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20`}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Spooky glow effect on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/10 to-orange-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 flex items-center gap-4">
        {/* Icon */}
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${metric.iconBg} text-2xl transition-transform duration-300 group-hover:scale-110`}
        >
          {metric.icon}
        </div>

        {/* Value and Label */}
        <div className="flex-1 min-w-0">
          <div className="text-3xl font-bold text-white transition-colors duration-300 group-hover:text-purple-200">
            {metric.value.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-purple-300/80 transition-colors duration-300 group-hover:text-purple-200/90">
            {metric.label}
          </div>
        </div>
      </div>

      {/* Decorative corner accent */}
      <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/10 to-orange-500/10 blur-xl transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
    </div>
  )
}
