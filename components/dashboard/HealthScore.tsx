'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface HealthScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
}

export function HealthScore({ 
  score, 
  size = 'md', 
  showLabel = true,
  animated = true 
}: HealthScoreProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Determine color based on score
  const getColor = (score: number) => {
    if (score >= 71) return { stroke: '#22c55e', bg: '#dcfce7', text: 'text-green-600' }
    if (score >= 41) return { stroke: '#eab308', bg: '#fef9c3', text: 'text-yellow-600' }
    return { stroke: '#ef4444', bg: '#fee2e2', text: 'text-red-600' }
  }

  const getLabel = (score: number) => {
    if (score >= 71) return 'Healthy'
    if (score >= 41) return 'Fair'
    return 'Needs Attention'
  }

  const sizes = {
    sm: { radius: 30, strokeWidth: 4, fontSize: 'text-lg', containerSize: 'w-20 h-20' },
    md: { radius: 45, strokeWidth: 6, fontSize: 'text-2xl', containerSize: 'w-32 h-32' },
    lg: { radius: 60, strokeWidth: 8, fontSize: 'text-4xl', containerSize: 'w-40 h-40' }
  }

  const { radius, strokeWidth, fontSize, containerSize } = sizes[size]
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = getColor(score)

  return (
    <div 
      className="flex flex-col items-center gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative ${containerSize} flex items-center justify-center`}>
        {/* Background circle */}
        <svg className="absolute transform -rotate-90" width="100%" height="100%">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        
        {/* Score text */}
        <motion.div 
          className={`${fontSize} font-bold ${color.text}`}
          initial={animated ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: isHovered ? 1.1 : 1 }}
          transition={{ duration: 0.5 }}
        >
          {score}
        </motion.div>
      </div>
      
      {showLabel && (
        <motion.div
          className={`text-sm font-medium ${color.text}`}
          initial={animated ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {getLabel(score)}
        </motion.div>
      )}
    </div>
  )
}
