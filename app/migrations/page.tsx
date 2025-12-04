'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, GitBranch, Calendar, ArrowRight } from 'lucide-react'

interface Migration {
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
  pullRequest?: {
    number: number
    htmlUrl: string
  }
  summary?: {
    filesChanged: number
  }
}

export default function MigrationsPage() {
  const router = useRouter()
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMigrations()
  }, [])

  const fetchMigrations = async () => {
    try {
      const response = await fetch('/api/migrations/list')
      
      if (!response.ok) {
        throw new Error('Failed to fetch migrations')
      }

      const data = await response.json()
      setMigrations(data.migrations || [])
    } catch (err) {
      console.error('Failed to fetch migrations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load migrations')
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Migrations' }]} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-purple-200">Loading migrations...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Migrations' }]} />
        <Card className="border-red-500/20 bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-200">{error}</p>
              <Button 
                onClick={fetchMigrations}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Migrations' }]} />

      {/* Header */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-slate-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <GitBranch className="h-6 w-6 text-purple-400" />
                  Migration History
                </CardTitle>
                <p className="text-purple-200 mt-2">
                  View all your code migrations and their status
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {migrations.length} Total
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Migrations Table */}
        <Card className="border-purple-500/20 bg-slate-900/40">
          <CardContent className="pt-6">
            {migrations.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="h-16 w-16 text-purple-400/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Migrations Yet</h3>
                <p className="text-purple-200">
                  Start your first migration to see it appear here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-purple-500/20 hover:bg-purple-900/20">
                      <TableHead className="text-purple-200">Migration ID</TableHead>
                      <TableHead className="text-purple-200">Repository</TableHead>
                      <TableHead className="text-purple-200">Migration Path</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Files</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {migrations.map((migration) => (
                      <TableRow 
                        key={migration.id}
                        className="border-purple-500/20 hover:bg-purple-900/20 cursor-pointer transition-colors"
                        onClick={() => router.push(`/migrations/${migration.id}`)}
                      >
                        <TableCell className="font-mono text-sm text-purple-300">
                          {migration.id.substring(0, 20)}...
                        </TableCell>
                        <TableCell className="text-white">
                          {migration.repository.owner}/{migration.repository.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-purple-200">
                              {migration.sourceFramework.name}
                            </span>
                            <ArrowRight className="h-3 w-3 text-purple-400" />
                            <span className="text-green-200">
                              {migration.targetFramework.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(migration.status)}
                        </TableCell>
                        <TableCell className="text-purple-200">
                          {migration.summary?.filesChanged || 0}
                        </TableCell>
                        <TableCell className="text-purple-200">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(migration.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/migrations/${migration.id}`)
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
