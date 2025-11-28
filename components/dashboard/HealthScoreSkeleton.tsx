'use client'

import { motion } from 'framer-motion'

export function HealthScoreSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="absolute transform -rotate-90" width="100%" height="100%">
          <circle
            cx="50%"
            cy="50%"
            r={30}
            stroke="#e5e7eb"
            strokeWidth={4}
            fill="none"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r={30}
            stroke="#a855f7"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 30}
            strokeDashoffset={2 * Math.PI * 30 * 0.75}
            animate={{
              strokeDashoffset: [
                2 * Math.PI * 30 * 0.75,
                2 * Math.PI * 30 * 0.25,
                2 * Math.PI * 30 * 0.75,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </svg>
        <motion.div
          className="text-lg font-bold text-purple-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ...
        </motion.div>
      </div>
      <motion.div
        className="text-sm font-medium text-purple-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Analyzing
      </motion.div>
    </div>
  )
}
