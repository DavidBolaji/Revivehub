'use client'

import { useState } from 'react'
import { CheckCircle, ExternalLink, X } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  pullRequestUrl?: string
  pullRequestNumber?: number
  type?: 'transformation' | 'migration'
  showViewPullRequest?: boolean
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  pullRequestUrl,
  pullRequestNumber,
  type = 'transformation',
  showViewPullRequest = true
}: SuccessModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    if (dontShowAgain) {
      // Store preference in localStorage
      localStorage.setItem(`hideSuccessModal_${type}`, 'true')
    }
    onClose()
  }

  const getIcon = () => {
    switch (type) {
      case 'migration':
        return '🚀'
      case 'transformation':
        return '🔄'
      default:
        return '✅'
    }
  }

  const getGradient = () => {
    switch (type) {
      case 'migration':
        return 'from-purple-900 to-pink-900'
      case 'transformation':
        return 'from-blue-900 to-cyan-900'
      default:
        return 'from-green-900 to-emerald-900'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-gradient-to-br ${getGradient()} rounded-lg shadow-2xl max-w-md w-full border border-white/20 relative overflow-hidden`}>
        {/* Animated background effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-pulse delay-1000" />
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{getIcon()}</div>
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-green-400 animate-bounce" />
              <div className="absolute inset-0 h-16 w-16 text-green-400 animate-ping opacity-20">
                <CheckCircle className="h-16 w-16" />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-white/90 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          {/* Pull Request Info */}
          {pullRequestUrl && showViewPullRequest && (
            <Card className="bg-white/10 border-white/20 mb-4">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">
                      Pull Request Created
                    </p>
                    {pullRequestNumber && (
                      <p className="text-white/60 text-xs">
                        #{pullRequestNumber}
                      </p>
                    )}
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <a
                      href={pullRequestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      View PR
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Don't show again checkbox */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-white/30 bg-white/10 text-white focus:ring-white/50"
            />
            <label htmlFor="dontShowAgain" className="text-white/70 text-sm">
              Don't show this again for {type}s
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {pullRequestUrl && showViewPullRequest && (
              <Button
                asChild
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <a
                  href={pullRequestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Pull Request
                </a>
              </Button>
            )}
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-white/30 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to check if modal should be shown
export function useSuccessModal() {
  const shouldShow = (type: 'transformation' | 'migration') => {
    if (typeof window === 'undefined') return true
    return !localStorage.getItem(`hideSuccessModal_${type}`)
  }

  return { shouldShow }
}