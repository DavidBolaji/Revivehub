'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MetricCards } from './MetricCards'
import { ScanButton } from './ScanButton'
import { MigrationPlanButton } from './MigrationPlanButton'
import { ScanResultsSkeleton } from './ScanResultsSkeleton'
import { HealthScore } from '@/components/dashboard/HealthScore'
import { MigrationPlanSkeleton } from '@/components/planner/MigrationPlanSkeleton'
import { ClientCache, CacheKeys, CacheTTL } from '@/lib/cache/client-cache'
import { recordAnalysis } from '@/lib/stats/statistics-service'
import type { Repository } from '@/types/repository'
import type { AnalysisReport, Issue } from '@/lib/scanner/types'
import type { EnhancedMigrationPlan } from '@/lib/planner/ai-enhancer'

// Lazy load MigrationPlanView for better performance
const MigrationPlanView = dynamic(
  () => import('@/components/planner/MigrationPlanView').then(mod => ({ default: mod.MigrationPlanView })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    ),
  }
)

// Issues Detail Section Component
function IssuesDetailSection({ issues }: { issues: Issue[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const criticalIssues = issues.filter(i => i.severity === 'critical')
  const warningIssues = issues.filter(i => i.severity === 'warning')
  const infoIssues = issues.filter(i => i.severity === 'info')

  return (
    <div className="mt-6 rounded-lg border border-purple-500/20 bg-slate-800/50 overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-slate-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-semibold text-white">
              Issues Found
            </h4>
            <div className="flex gap-2">
              {criticalIssues.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-300 border border-red-500/30">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {criticalIssues.length} Critical
                </span>
              )}
              {warningIssues.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-300 border border-yellow-500/30">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  {warningIssues.length} Warning
                </span>
              )}
              {infoIssues.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-300 border border-blue-500/30">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  {infoIssues.length} Info
                </span>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-purple-300" />
          ) : (
            <ChevronRight className="h-4 w-4 text-purple-300" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Critical Issues */}
          {criticalIssues.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-red-300 mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Critical 
              </h5>
              <div className="space-y-2">
                {criticalIssues.map((issue, i) => (
                  <div key={i} className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <div className="">
                      {/* <span className="text-red-400 mt-0.5">•</span> */}
                      <div className="text-left">
                        <p className="text-sm text-red-200 font-medium ">{issue.title}</p>
                        <p className="text-xs text-red-300/80 mt-1">{issue.description}</p>
                        {issue.affectedFiles && issue.affectedFiles.length > 0 && (
                          <div className="text-xs text-red-400/60 mt-2 space-y-1">
                            {issue.affectedFiles.slice(0, 3).map((file, idx) => (
                              <p key={idx} className="font-mono">{file}</p>
                            ))}
                            {issue.affectedFiles.length > 3 && (
                              <p className="text-red-400/40">+{issue.affectedFiles.length - 3} more files</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warningIssues.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                Warnings 
              </h5>
              <div className="space-y-2">
                {warningIssues.map((issue, i) => (
                  <div key={i} className="rounded-lg items-start align-left bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <div className="flex items-start gap-2">
                      {/* <span className="text-yellow-400 mt-0.5">•</span> */}
                      <div className="text-left">
                        <p className="text-sm text-yellow-200 font-medium">{issue.title}</p>
                        <p className="text-xs text-yellow-300/80 mt-1">{issue.description}</p>
                        {issue.affectedFiles && issue.affectedFiles.length > 0 && (
                          <div className="text-xs text-yellow-400/60 mt-2 space-y-1">
                            {issue.affectedFiles.slice(0, 3).map((file, idx) => (
                              <p key={idx} className="font-mono">{file}</p>
                            ))}
                            {issue.affectedFiles.length > 3 && (
                              <p className="text-yellow-400/40">+{issue.affectedFiles.length - 3} more files</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          {infoIssues.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-blue-300 mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Info 
              </h5>
              <div className="space-y-2">
                {infoIssues.map((issue, i) => (
                  <div key={i} className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                    <div className="flex items-start gap-2">
                      {/* <span className="text-blue-400 mt-0.5">ℹ</span> */}
                      <div className="text-left">
                        <p className="text-sm text-blue-200 font-medium">{issue.title}</p>
                        <p className="text-xs text-blue-300/80 mt-1">{issue.description}</p>
                        {issue.affectedFiles && issue.affectedFiles.length > 0 && (
                          <div className="text-xs text-blue-400/60 mt-2 space-y-1">
                            {issue.affectedFiles.slice(0, 3).map((file, idx) => (
                              <p key={idx} className="font-mono">{file}</p>
                            ))}
                            {issue.affectedFiles.length > 3 && (
                              <p className="text-blue-400/40">+{issue.affectedFiles.length - 3} more files</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface RepositoryDetailClientProps {
  repository: Repository
  owner: string
  repo: string
}

export function RepositoryDetailClient({
  repository,
  owner,
  repo,
}: RepositoryDetailClientProps) {
  const [scanResults, setScanResults] = useState<AnalysisReport | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [showHealthScore, setShowHealthScore] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [migrationPlan, setMigrationPlan] = useState<EnhancedMigrationPlan | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)

  console.log('[MIGRATION_PLAN]', migrationPlan)

  // Load cached scan results on mount
  useEffect(() => {
    const cachedResults = ClientCache.get<AnalysisReport>(
      CacheKeys.scanResults(owner, repo)
    )
    if (cachedResults) {
      setScanResults(cachedResults)
      setShowHealthScore(true)
    }

    const cachedPlan = ClientCache.get<EnhancedMigrationPlan>(
      CacheKeys.migrationPlan(owner, repo)
    )
    if (cachedPlan) {
      setMigrationPlan(cachedPlan)
    }
  }, [owner, repo])

  const handleScanStart = () => {
    setIsScanning(true)
    setScanError(null)
  }

  const handleScanComplete = (results: AnalysisReport) => {
    setScanResults(results)
    setScanError(null)
    setIsScanning(false)
    
    // Cache the scan results for 5 minutes
    ClientCache.set(
      CacheKeys.scanResults(owner, repo),
      results,
      CacheTTL.SCAN_RESULTS
    )
    
    // Record analysis statistics
    recordAnalysis({
      repositoryFullName: `${owner}/${repo}`,
      patternsFound: results?.patterns?.length || 0,
      filesScanned: results?.summary?.totalFiles || 0,
    })
    
    // Dispatch custom event to update stats in dashboard
    window.dispatchEvent(new Event('revivehub-stats-updated'))
    
    // Trigger animation by showing health score after a brief delay
    setTimeout(() => {
      setShowHealthScore(true)
    }, 100)
  }

  const handleScanError = (error: string) => {
    setScanError(error)
    setScanResults(null)
    setShowHealthScore(false)
    setIsScanning(false)
  }

  const handlePlanStart = () => {
    setIsGeneratingPlan(true)
    setPlanError(null)
  }

  const handlePlanGenerated = (plan: EnhancedMigrationPlan) => {
    setMigrationPlan(plan)
    setPlanError(null)
    setIsGeneratingPlan(false)
    
    // Cache the migration plan for 15 minutes
    ClientCache.set(
      CacheKeys.migrationPlan(owner, repo),
      plan,
      CacheTTL.MIGRATION_PLAN
    )
  }

  const handlePlanError = (error: string) => {
    setPlanError(error)
    setMigrationPlan(null)
    setIsGeneratingPlan(false)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Metric cards */}
      <MetricCards
        stars={repository.stargazersCount}
        forks={repository.forksCount}
        openIssues={repository.openIssuesCount}
        language={repository.language}
      />

      {/* Scan section */}
      <div className="rounded-lg border border-purple-500/20 bg-slate-900 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Repository Health Scan
          </h2>
          <p className="text-sm text-purple-200 mb-4">
            Scan this repository to detect legacy patterns and health issues
          </p>

          {/* Scan button */}
          {!scanResults && !isScanning && (
            <ScanButton
              owner={owner}
              repo={repo}
              onScanComplete={handleScanComplete}
              onScanError={handleScanError}
              onScanStart={handleScanStart}
            />
          )}

          {/* Scanning skeleton */}
          {isScanning && !scanResults && (
            <ScanResultsSkeleton />
          )}

          {/* Error display */}
          {scanError && (
            <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-900/20 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-orange-200 mb-1">
                    Scan Failed
                  </h3>
                  <p className="text-sm text-orange-200/80 whitespace-pre-line">{scanError}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setScanError(null)
                      }}
                      className="rounded-lg border border-orange-500/30 bg-orange-900/30 px-4 py-2 text-sm font-medium text-orange-200 transition-all hover:border-orange-500/50 hover:bg-orange-900/40 flex items-center gap-2"
                      aria-label="Retry repository scan"
                    >
                      <span>🔄</span>
                      <span>Retry Scan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Health score display */}
          {scanResults && showHealthScore && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col items-center gap-4">
                <h3 className="text-lg font-semibold text-white">
                  Overall Health Score
                </h3>
                <HealthScore
                  score={scanResults.healthScore.total}
                  size="lg"
                  showLabel={true}
                  animated={true}
                />
              </div>

              {/* Health categories breakdown */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(scanResults.healthScore.categories).map(
                  ([key, category]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-purple-500/20 bg-slate-800/50 p-3"
                    >
                      <div className="text-xs text-purple-300 mb-1 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {category.score}
                        <span className="text-sm text-purple-300">
                          /{category.maxScore}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Issues summary */}
              {scanResults.issues.length > 0 && (
                <IssuesDetailSection issues={scanResults.issues} />
              )}

              {/* Migration Plan Button */}
              {!migrationPlan && !isGeneratingPlan && (
                <div className="mt-6">
                  <MigrationPlanButton
                    scanResults={scanResults}
                    owner={owner}
                    repo={repo}
                    onPlanGenerated={handlePlanGenerated}
                    onPlanError={handlePlanError}
                    onPlanStart={handlePlanStart}
                  />
                </div>
              )}

              {/* Plan generation skeleton */}
              {isGeneratingPlan && !migrationPlan && (
                <div className="mt-6">
                  <MigrationPlanSkeleton />
                </div>
              )}

              {/* Plan Error Display */}
              {planError && (
                <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-900/20 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold text-orange-200 mb-1">
                        Plan Generation Failed
                      </h3>
                      <p className="text-sm text-orange-200/80 whitespace-pre-line">{planError}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            setPlanError(null)
                          }}
                          className="rounded-lg border border-orange-500/30 bg-orange-900/30 px-4 py-2 text-sm font-medium text-orange-200 transition-all hover:border-orange-500/50 hover:bg-orange-900/40 flex items-center gap-2"
                          aria-label="Retry plan generation"
                        >
                          <span>🔄</span>
                          <span>Retry Plan</span>
                        </button>
                        {planError.includes('AI service') && (
                          <button
                            onClick={() => {
                              // TODO: Generate basic plan without AI
                              setPlanError('Basic plan generation not yet implemented')
                            }}
                            className="rounded-lg border border-purple-500/30 bg-purple-900/30 px-4 py-2 text-sm font-medium text-purple-200 transition-all hover:border-purple-500/50 hover:bg-purple-900/40"
                            aria-label="Generate basic plan without AI"
                          >
                            Use Basic Plan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rescan button */}
              <button
                onClick={() => {
                  // Invalidate cache on rescan
                  ClientCache.remove(CacheKeys.scanResults(owner, repo))
                  ClientCache.remove(CacheKeys.migrationPlan(owner, repo))
                  
                  setScanResults(null)
                  setShowHealthScore(false)
                  setScanError(null)
                  setMigrationPlan(null)
                  setPlanError(null)
                  setIsScanning(false)
                  setIsGeneratingPlan(false)
                }}
                className="mt-4 rounded-lg border border-purple-500/30 bg-slate-800 px-4 py-2 text-sm font-medium text-purple-200 transition-all hover:border-purple-500/50 hover:bg-slate-700"
              >
                Rescan Repository
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Migration Plan Display */}
      {migrationPlan && (
        <div className="mt-6">
          <MigrationPlanView
            plan={migrationPlan}
            repositoryName={`${owner}/${repo}`}
            onStartTransformation={() => {
              // TODO: Implement transformation execution
              console.log('Start transformation clicked')
            }}
          />
        </div>
      )}
    </div>
  )
}
