import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

interface ComplexityBadgeProps {
  level: 'low' | 'medium' | 'high'
  estimatedHours?: number
  className?: string
}

const complexityConfig = {
  low: {
    label: 'Low Complexity',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '🟢',
  },
  medium: {
    label: 'Medium Complexity',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '🟡',
  },
  high: {
    label: 'High Complexity',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '🔴',
  },
}

export function ComplexityBadge({ level, estimatedHours, className = '' }: ComplexityBadgeProps) {
  const config = complexityConfig[level]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className={config.color}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </Badge>
      {estimatedHours !== undefined && (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {estimatedHours}h
        </span>
      )}
    </div>
  )
}
