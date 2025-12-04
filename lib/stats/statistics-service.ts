/**
 * Statistics Service - Tracks user analyses and transformations
 * Uses localStorage for client-side persistence
 */

export interface AnalysisRecord {
  id: string
  repositoryFullName: string
  timestamp: Date
  patternsFound: number
  filesScanned: number
}

export interface TransformationRecord {
  id: string
  repositoryFullName: string
  timestamp: Date
  tasksCompleted: number
  filesTransformed: number
  status: 'success' | 'partial' | 'failed'
}

export interface UserStatistics {
  totalAnalyses: number
  totalTransformations: number
  successfulTransformations: number
  totalFilesTransformed: number
  totalPatternsFound: number
  recentAnalyses: AnalysisRecord[]
  recentTransformations: TransformationRecord[]
}

const STORAGE_KEY_ANALYSES = 'revivehub_analyses'
const STORAGE_KEY_TRANSFORMATIONS = 'revivehub_transformations'

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Record a new analysis
 */
export function recordAnalysis(record: Omit<AnalysisRecord, 'id' | 'timestamp'>): void {
  if (!isLocalStorageAvailable()) return

  try {
    const analyses = getAnalyses()
    const newRecord: AnalysisRecord = {
      ...record,
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    
    analyses.push(newRecord)
    
    // Keep only last 100 analyses
    const trimmed = analyses.slice(-100)
    
    localStorage.setItem(STORAGE_KEY_ANALYSES, JSON.stringify(trimmed))
  } catch (error) {
    console.error('Failed to record analysis:', error)
  }
}

/**
 * Record a new transformation
 */
export function recordTransformation(record: Omit<TransformationRecord, 'id' | 'timestamp'>): void {
  if (!isLocalStorageAvailable()) return

  try {
    const transformations = getTransformations()
    const newRecord: TransformationRecord = {
      ...record,
      id: `transform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    
    transformations.push(newRecord)
    
    // Keep only last 100 transformations
    const trimmed = transformations.slice(-100)
    
    localStorage.setItem(STORAGE_KEY_TRANSFORMATIONS, JSON.stringify(trimmed))
  } catch (error) {
    console.error('Failed to record transformation:', error)
  }
}

/**
 * Get all analyses
 */
function getAnalyses(): AnalysisRecord[] {
  if (!isLocalStorageAvailable()) return []

  try {
    const data = localStorage.getItem(STORAGE_KEY_ANALYSES)
    if (!data) return []
    
    const parsed = JSON.parse(data)
    // Convert timestamp strings back to Date objects
    return parsed.map((record: any) => ({
      ...record,
      timestamp: new Date(record.timestamp),
    }))
  } catch (error) {
    console.error('Failed to get analyses:', error)
    return []
  }
}

/**
 * Get all transformations
 */
function getTransformations(): TransformationRecord[] {
  if (!isLocalStorageAvailable()) return []

  try {
    const data = localStorage.getItem(STORAGE_KEY_TRANSFORMATIONS)
    if (!data) return []
    
    const parsed = JSON.parse(data)
    // Convert timestamp strings back to Date objects
    return parsed.map((record: any) => ({
      ...record,
      timestamp: new Date(record.timestamp),
    }))
  } catch (error) {
    console.error('Failed to get transformations:', error)
    return []
  }
}

/**
 * Get user statistics
 */
export function getUserStatistics(): UserStatistics {
  const analyses = getAnalyses()
  const transformations = getTransformations()

  return {
    totalAnalyses: analyses.length,
    totalTransformations: transformations.length,
    successfulTransformations: transformations.filter(t => t.status === 'success').length,
    totalFilesTransformed: transformations.reduce((sum, t) => sum + t.filesTransformed, 0),
    totalPatternsFound: analyses.reduce((sum, a) => sum + a.patternsFound, 0),
    recentAnalyses: analyses.slice(-10).reverse(),
    recentTransformations: transformations.slice(-10).reverse(),
  }
}

/**
 * Clear all statistics (for testing or reset)
 */
export function clearStatistics(): void {
  if (!isLocalStorageAvailable()) return

  try {
    localStorage.removeItem(STORAGE_KEY_ANALYSES)
    localStorage.removeItem(STORAGE_KEY_TRANSFORMATIONS)
  } catch (error) {
    console.error('Failed to clear statistics:', error)
  }
}
