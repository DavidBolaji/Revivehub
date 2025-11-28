'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  GitBranch,
  ExternalLink,
  Loader2,
  AlertTriangle
} from 'lucide-react'

interface MigrationDetails {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  repository: {
    owner: string
    name: string
  }
  sourceFramework: {
    name: string
    version: string
  }
  targetFramework: {
    name: string
    version: string
  }
  createdAt: string
  completedAt?: string
  pullRequest?: {
    number: number
    url: string
    htmlUrl: string
  }
  progress?: {
    currentPhase: string
    totalPhases: number
    completedPhases: number
    filesProcessed: number
    totalFiles: number
  }
  summary?: {
    filesChanged: number
    linesAdded: number
    linesRemoved: number
    errors: string[]
    warnings: string[]
  }
}

export default function MigrationDetailsPage() {
  const params = useParams()
  const migrationId = params.migrationId as string
  const [migration, setMigration] = useState<MigrationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMigrationDetails = async () => {
      try {
        const response = await fetch(`/api/migration/details/${migrationId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Migration not found')
          } else {
            setError('Failed to load migration details')
          }
          return
        }

        const data = await response.json()
        setMigration(data)
      } catch (err) {
        setError('Failed to load migration details')
        console.error('Error fetching migration:', err)
      } finally {
        setLoading(false)
      }
    }

    if (migrationId) {
      fetchMigrationDetails()
    }
  }, [migrationId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-purple-200">Loading migration details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-500/20 bg-red-900/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Migration Not Found</h2>
                <p className="text-red-200 mb-4">{error}</p>
                <Button 
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="border-red-500/50 text-red-200 hover:bg-red-500/10"
                >
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!migration) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-400" />
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-400" />
      case 'running':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      default:
        return <Clock className="h-6 w-6 text-yellow-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-500/20 text-green-300 border-green-500/30',
      failed: 'bg-red-500/20 text-red-300 border-red-500/30',
      running: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    }
    
    return (
      <Badge className={`${variants[status as keyof typeof variants]} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-slate-900">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-3">
                  {getStatusIcon(migration.status)}
                  Migration Details
                </CardTitle>
                <p className="text-purple-200 mt-2">
                  {migration.repository.owner}/{migration.repository.name}
                </p>
              </div>
              {getStatusBadge(migration.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-purple-200 mb-2">Migration Path</h4>
                <div className="flex items-center gap-2 text-white">
                  <span>{migration.sourceFramework.name} {migration.sourceFramework.version}</span>
                  <span className="text-purple-300">→</span>
                  <span>{migration.targetFramework.name} {migration.targetFramework.version}</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-purple-200 mb-2">Created</h4>
                <p className="text-white">
                  {new Date(migration.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        {migration.progress && (
          <Card className="border-blue-500/20 bg-blue-900/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-blue-200 mb-2">
                    <span>Phase Progress</span>
                    <span>{migration.progress.completedPhases}/{migration.progress.totalPhases}</span>
                  </div>
                  <div className="w-full bg-blue-900/50 rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(migration.progress.completedPhases / migration.progress.totalPhases) * 100}%` 
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-blue-200 mb-2">
                    <span>Files Processed</span>
                    <span>{migration.progress.filesProcessed}/{migration.progress.totalFiles}</span>
                  </div>
                  <div className="w-full bg-blue-900/50 rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(migration.progress.filesProcessed / migration.progress.totalFiles) * 100}%` 
                      }}
                    />
                  </div>
                </div>
                <p className="text-blue-200 text-sm">
                  Current Phase: {migration.progress.currentPhase}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pull Request */}
        {migration.pullRequest && (
          <Card className="border-green-500/20 bg-green-900/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-green-400" />
                Pull Request Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200">
                    Pull Request #{migration.pullRequest.number}
                  </p>
                  <p className="text-sm text-green-300 mt-1">
                    Migration changes have been applied to your repository
                  </p>
                </div>
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <a 
                    href={migration.pullRequest.htmlUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    View PR
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {migration.summary && (
          <Card className="border-purple-500/20 bg-purple-900/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Migration Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-white">
                    {migration.summary.filesChanged}
                  </div>
                  <div className="text-sm text-purple-200">Files Changed</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    +{migration.summary.linesAdded}
                  </div>
                  <div className="text-sm text-purple-200">Lines Added</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">
                    -{migration.summary.linesRemoved}
                  </div>
                  <div className="text-sm text-purple-200">Lines Removed</div>
                </div>
              </div>

              {migration.summary.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-red-300 font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Errors ({migration.summary.errors.length})
                  </h4>
                  <ul className="space-y-1">
                    {migration.summary.errors.map((error, i) => (
                      <li key={i} className="text-red-200 text-sm bg-red-900/20 p-2 rounded">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {migration.summary.warnings.length > 0 && (
                <div>
                  <h4 className="text-yellow-300 font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({migration.summary.warnings.length})
                  </h4>
                  <ul className="space-y-1">
                    {migration.summary.warnings.map((warning, i) => (
                      <li key={i} className="text-yellow-200 text-sm bg-yellow-900/20 p-2 rounded">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card className="border-slate-500/20 bg-slate-900/40">
          <CardContent className="pt-6">
            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => window.history.back()}
                variant="outline"
                className="border-slate-500/50 text-slate-200 hover:bg-slate-500/10"
              >
                Go Back
              </Button>
              {migration.pullRequest && (
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <a 
                    href={migration.pullRequest.htmlUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    View Pull Request
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}