/**
 * FileStructureManager
 * 
 * Manages file structure transformations for framework migrations.
 * Handles directory creation, file relocation, and route-specific file generation.
 * 
 * Requirements: File structure transformation for React → Next.js and Pages → App Router
 */

import type { MigrationSpecification } from '@/types/migration'
import { RouteSegmentExtractor } from './route-segment-extractor'

console.log('[FileStructureManager] Module loaded - version 3.1 - setupTests MOVED NOT DELETED - ' + new Date().toISOString())

export interface FileStructureChange {
  originalPath: string
  newPath: string
  action: 'move' | 'create' | 'delete' | 'rename'
  fileType: 'page' | 'layout' | 'loading' | 'error' | 'api' | 'component' | 'style' | 'config' | 'other'
  content?: string
  metadata: {
    isRouteFile: boolean
    routeSegment?: string
    requiresLayout?: boolean
    requiresLoading?: boolean
    requiresError?: boolean
  }
}

export class FileStructureManager {
  private routeExtractor: RouteSegmentExtractor

  constructor() {
    this.routeExtractor = new RouteSegmentExtractor()
  }

  /**
   * Plan all file structure changes for migration
   * 
   * @param files - Map of file paths to content
   * @param spec - Migration specification
   * @returns Array of planned file structure changes
   */
  planStructureChanges(
    files: Map<string, string>,
    spec: MigrationSpecification
  ): FileStructureChange[] {
    console.log(`[FileStructureManager] !!!!! METHOD CALLED !!!!!`)
    console.log(`[FileStructureManager] files type:`, typeof files, files instanceof Map)
    console.log(`[FileStructureManager] spec type:`, typeof spec)
    
    try {
      console.log(`[FileStructureManager] ========================================`)
      console.log(`[FileStructureManager] Starting planStructureChanges`)
      console.log(`[FileStructureManager] Files to process: ${files.size}`)
      console.log(`[FileStructureManager] File paths:`, Array.from(files.keys()))
      console.log(`[FileStructureManager] Target framework: ${spec.target.framework}`)
      console.log(`[FileStructureManager] Target routing: ${spec.target.routing}`)
      console.log(`[FileStructureManager] Source framework: ${spec.source.framework}`)
      console.log(`[FileStructureManager] ========================================`)
      
      const changes: FileStructureChange[] = []

      // Step 1: Analyze existing files and plan moves
      for (const [filePath, content] of files) {
        const change = this.planFileChange(filePath, content, spec)
        if (change) {
          changes.push(change)
        }
      }

      // Step 2: Identify missing required files
      const missingFiles = this.identifyMissingFiles(changes, spec)
      changes.push(...missingFiles)

      // Step 3: Sort changes by dependency order
      const sorted = this.sortChangesByDependency(changes)
      
      console.log(`[FileStructureManager] ========================================`)
      console.log(`[FileStructureManager] Completed planStructureChanges`)
      console.log(`[FileStructureManager] Total changes: ${sorted.length}`)
      console.log(`[FileStructureManager] Changes:`, sorted.map(c => `${c.action}: ${c.originalPath} → ${c.newPath}`))
      console.log(`[FileStructureManager] ========================================`)
      
      return sorted
    } catch (error) {
      console.error(`[FileStructureManager] ERROR in planStructureChanges:`, error)
      console.error(`[FileStructureManager] Stack:`, error instanceof Error ? error.stack : 'No stack')
      return []
    }
  }

  /**
   * Plan change for a single file
   * 
   * @param filePath - Original file path
   * @param content - File content
   * @param spec - Migration specification
   * @returns Planned file structure change or null if no change needed
   */
  private planFileChange(
    filePath: string,
    content: string,
    spec: MigrationSpecification
  ): FileStructureChange | null {
    const normalized = filePath.replace(/\\/g, '/')
    
    console.log(`[FileStructureManager] ===== Planning change for: ${normalized} =====`)
    
    // Check if file should be removed during React → Next.js migration
    const shouldDelete = this.shouldRemoveFile(normalized, spec)
    console.log(`[FileStructureManager] Should delete: ${shouldDelete}`)
    
    if (shouldDelete) {
      console.log(`[FileStructureManager] ✓ Marking ${filePath} for DELETION`)
      return {
        originalPath: filePath,
        newPath: '', // Empty path indicates deletion
        action: 'delete',
        fileType: 'other',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    const fileType = this.determineFileType(filePath, content)
    
    console.log(`[FileStructureManager] File type determined: ${fileType}`)
    
    // Handle different file types
    switch (fileType) {
      case 'page':
        return this.planPageFileChange(filePath, content, spec)
      case 'api':
        return this.planApiFileChange(filePath, content, spec)
      case 'component':
        return this.planComponentFileChange(filePath, content, spec)
      case 'style':
        return this.planStyleFileChange(filePath, content, spec)
      case 'config':
        return this.planConfigFileChange(filePath, content, spec)
      default:
        console.log(`[FileStructureManager] No change needed for ${filePath} (type: ${fileType})`)
        return null
    }
  }

  /**
   * Check if a file should be removed during migration
   * 
   * @param filePath - Normalized file path
   * @param spec - Migration specification
   * @returns True if file should be removed
   */
  private shouldRemoveFile(
    filePath: string,
    spec: MigrationSpecification
  ): boolean {
    // Normalize path to use forward slashes
    const normalized = filePath.replace(/\\/g, '/')
    
    // Only remove files when migrating from React to Next.js
    // Use case-insensitive comparison
    const sourceFramework = spec.source.framework.toLowerCase()
    const targetFramework = spec.target.framework.toLowerCase()
    
    const isReactToNextJs = 
      (sourceFramework === 'react' || sourceFramework === 'cra') &&
      (targetFramework === 'nextjs' || 
       targetFramework === 'nextjs-app' || 
       targetFramework.includes('next'))
    
    console.log(`[FileStructureManager] shouldRemoveFile check for ${normalized}:`)
    console.log(`[FileStructureManager]   - Original path: ${filePath}`)
    console.log(`[FileStructureManager]   - Normalized path: ${normalized}`)
    console.log(`[FileStructureManager]   - Source: ${spec.source.framework} (${sourceFramework})`)
    console.log(`[FileStructureManager]   - Target: ${spec.target.framework} (${targetFramework})`)
    console.log(`[FileStructureManager]   - Is React to Next.js: ${isReactToNextJs}`)
    
    if (!isReactToNextJs) {
      console.log(`[FileStructureManager]   - Not React to Next.js migration, skipping deletion check`)
      return false
    }
    
    // Files to remove during React → Next.js migration
    const filesToRemove = [
      'src/index.js',
      'src/index.jsx',
      'src/index.ts',
      'src/index.tsx',
      'src/reportWebVitals.js',
      'src/reportWebVitals.ts',
      'public/index.html', // React's HTML template not needed in Next.js
    ]
    
    const shouldRemove = filesToRemove.some(pattern => normalized === pattern)
    console.log(`[FileStructureManager]   - Checking against patterns:`, filesToRemove)
    console.log(`[FileStructureManager]   - Should remove: ${shouldRemove}`)
    
    return shouldRemove
  }

  /**
   * Plan page file transformation (pages/ → app/ or src/App.js → app/page.tsx)
   * 
   * @param filePath - Original page file path
   * @param content - File content
   * @param spec - Migration specification
   * @returns Planned file structure change
   */
  private planPageFileChange(
    filePath: string,
    content: string,
    _spec: MigrationSpecification
  ): FileStructureChange {
    const normalized = filePath.replace(/\\/g, '/')
    
    console.log(`[FileStructureManager] Planning page change for: ${normalized}`)
    
    // Handle React App.js → Next.js app/page.tsx
    if (/src\/App\.(tsx?|jsx?)$/i.test(normalized)) {
      console.log(`[FileStructureManager] Detected React App.js → app/page.tsx`)
      return {
        originalPath: filePath,
        newPath: 'app/page.tsx',
        action: 'move',
        fileType: 'page',
        content,
        metadata: {
          isRouteFile: true,
          routeSegment: '(root)',
          requiresLayout: true,
          requiresLoading: false,
          requiresError: false,
        }
      }
    }
    
    // Handle Next.js Pages Router → App Router
    const newPath = this.routeExtractor.convertToAppRouterPath(filePath, 'page')
    const segments = this.routeExtractor.extractSegments(filePath)
    const routeSegment = this.routeExtractor.buildAppRouterPath(segments)
    
    console.log(`[FileStructureManager] Pages Router → App Router: ${filePath} → ${newPath}`)
    
    return {
      originalPath: filePath,
      newPath,
      action: 'move',
      fileType: 'page',
      content,
      metadata: {
        isRouteFile: true,
        routeSegment,
        requiresLayout: this.shouldGenerateLayout(routeSegment, content),
        requiresLoading: this.shouldGenerateLoading(content),
        requiresError: this.shouldGenerateError(content),
      }
    }
  }

  /**
   * Plan API route transformation (pages/api/ → app/api/)
   * 
   * @param filePath - Original API route path
   * @param content - File content
   * @param spec - Migration specification
   * @returns Planned file structure change
   */
  private planApiFileChange(
    filePath: string,
    content: string,
    _spec: MigrationSpecification
  ): FileStructureChange {
    // Convert to App Router API route
    const newPath = this.routeExtractor.convertToAppRouterPath(filePath, 'route')
    const segments = this.routeExtractor.extractSegments(filePath)
    const routeSegment = this.routeExtractor.buildAppRouterPath(segments)
    
    return {
      originalPath: filePath,
      newPath,
      action: 'move',
      fileType: 'api',
      content,
      metadata: {
        isRouteFile: true,
        routeSegment,
        requiresLayout: false,
        requiresLoading: false,
        requiresError: false,
      }
    }
  }

  /**
   * Plan component file change
   * 
   * @param filePath - Original component file path
   * @param content - File content
   * @param spec - Migration specification
   * @returns Planned file structure change or null if no change needed
   */
  private planComponentFileChange(
    filePath: string,
    content: string,
    spec: MigrationSpecification
  ): FileStructureChange | null {
    const normalized = filePath.replace(/\\/g, '/')
    
    console.log(`[FileStructureManager] Checking component: ${normalized}`)
    
    // Handle test files - move to __tests__ directory
    if (this.isTestFile(normalized)) {
      const testName = normalized.split('/').pop() || ''
      // Change extension to .tsx if needed
      const newName = testName.replace(/\.jsx?$/, '.tsx')
      console.log(`[FileStructureManager] Moving test ${normalized} → __tests__/${newName}`)
      return {
        originalPath: filePath,
        newPath: `__tests__/${newName}`,
        action: 'move',
        fileType: 'component',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    // Move src/components/ to components/ for React → Next.js
    if (normalized.startsWith('src/components/')) {
      const componentName = normalized.replace('src/components/', '')
      // Change extension to .tsx if needed
      const newName = componentName.replace(/\.jsx?$/, '.tsx')
      console.log(`[FileStructureManager] Moving ${normalized} → components/${newName}`)
      return {
        originalPath: filePath,
        newPath: `components/${newName}`,
        action: 'move',
        fileType: 'component',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    // Handle src/context/ → context/ for React → Next.js (NOT app/context/)
    if (normalized.startsWith('src/context/')) {
      const contextName = normalized.replace('src/context/', '')
      // Change extension to .tsx if needed
      const newName = contextName.replace(/\.jsx?$/, '.tsx')
      console.log(`[FileStructureManager] Moving context ${normalized} → context/${newName}`)
      return {
        originalPath: filePath,
        newPath: `context/${newName}`,
        action: 'move',
        fileType: 'component',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    // Handle src/hooks/ → hooks/ for React → Next.js
    if (normalized.startsWith('src/hooks/')) {
      const hookName = normalized.replace('src/hooks/', '')
      // Change extension to .tsx (keep .tsx for consistency)
      const newName = hookName.replace(/\.jsx?$/, '.tsx')
      console.log(`[FileStructureManager] Moving hook ${normalized} → hooks/${newName}`)
      return {
        originalPath: filePath,
        newPath: `hooks/${newName}`,
        action: 'move',
        fileType: 'component',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    // Components typically stay in the same location
    // Only change if target has different component directory structure
    const targetComponentDir = spec.target.fileStructure?.components
    
    if (targetComponentDir && filePath.startsWith('components/') && targetComponentDir !== 'components') {
      const newPath = filePath.replace('components/', `${targetComponentDir}/`)
      return {
        originalPath: filePath,
        newPath,
        action: 'move',
        fileType: 'component',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    console.log(`[FileStructureManager] No component change needed for ${normalized}`)
    return null
  }

  /**
   * Check if a file is a test file
   * 
   * @param filePath - Normalized file path
   * @returns True if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    // Match .test.js, .spec.js, or setupTests.js files
    return /\.(test|spec)\.(tsx?|jsx?)$/i.test(filePath) || 
           /setupTests\.(tsx?|jsx?)$/i.test(filePath)
  }

  /**
   * Plan style file change
   * 
   * @param filePath - Original style file path
   * @param content - File content
   * @param spec - Migration specification
   * @returns Planned file structure change or null if no change needed
   */
  private planStyleFileChange(
    filePath: string,
    content: string,
    _spec: MigrationSpecification
  ): FileStructureChange | null {
    const normalized = filePath.replace(/\\/g, '/')
    
    // Handle React index.css → Next.js app/globals.css
    // Will be merged with App.css in hybrid engine
    if (/src\/index\.css$/i.test(normalized)) {
      return {
        originalPath: filePath,
        newPath: 'app/globals.css',
        action: 'move',
        fileType: 'style',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    // Handle React App.css → merge into app/globals.css
    // Will be merged with index.css in hybrid engine
    if (/src\/App\.css$/i.test(normalized)) {
      return {
        originalPath: filePath,
        newPath: 'app/globals.css',
        action: 'move',
        fileType: 'style',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    // Handle globals.css move to app directory
    if (filePath.includes('globals.css') || filePath.includes('global.css')) {
      return {
        originalPath: filePath,
        newPath: 'app/globals.css',
        action: 'move',
        fileType: 'style',
        content,
        metadata: {
          isRouteFile: false,
        }
      }
    }
    
    // Module CSS files stay with their components
    return null
  }

  /**
   * Plan config file change
   * 
   * @param filePath - Original config file path
   * @param content - File content
   * @param spec - Migration specification
   * @returns Planned file structure change or null if no change needed
   */
  private planConfigFileChange(
    _filePath: string,
    _content: string,
    _spec: MigrationSpecification
  ): FileStructureChange | null {
    // Config files typically stay at root
    return null
  }

  /**
   * Determine file type from path and content
   * 
   * @param filePath - File path
   * @param content - File content
   * @returns File type
   */
  private determineFileType(
    filePath: string,
    _content: string
  ): 'page' | 'api' | 'component' | 'style' | 'config' | 'other' {
    const normalized = filePath.replace(/\\/g, '/')
    
    // Check if it's a test file first (before other checks)
    if (this.isTestFile(normalized)) {
      console.log(`[FileStructureManager] Detected test file: ${normalized}`)
      return 'component' // Treat test files as components so they get processed
    }
    
    // Check if it's an API route
    if (this.routeExtractor.isApiRoute(filePath)) {
      return 'api'
    }
    
    // Check if it's a page route (Next.js Pages Router)
    if (this.routeExtractor.isPageRoute(filePath)) {
      return 'page'
    }
    
    // Check if it's a React app entry point (src/App.js, src/App.tsx)
    if (/src\/App\.(tsx?|jsx?)$/i.test(normalized)) {
      return 'page'
    }
    
    // Check if it's a style file
    if (/\.(css|scss|sass|less)$/.test(filePath)) {
      return 'style'
    }
    
    // Check if it's a config file
    if (this.isConfigFile(filePath)) {
      return 'config'
    }
    
    // Check if it's a component (including context and hooks)
    if (/\.(tsx?|jsx?)$/.test(filePath) && 
        (filePath.includes('components/') || 
         filePath.includes('context/') || 
         filePath.includes('hooks/'))) {
      return 'component'
    }
    
    console.log(`[FileStructureManager] File type 'other' for: ${normalized}`)
    return 'other'
  }

  /**
   * Check if file is a config file
   * 
   * @param filePath - File path
   * @returns True if file is a config file
   */
  private isConfigFile(filePath: string): boolean {
    const configFiles = [
      'next.config',
      'tailwind.config',
      'tsconfig.json',
      'package.json',
      'vite.config',
      'webpack.config',
    ]
    
    return configFiles.some(config => filePath.includes(config))
  }

  /**
   * Identify missing required files
   * 
   * @param changes - Existing planned changes
   * @param spec - Migration specification
   * @returns Array of missing file changes
   */
  private identifyMissingFiles(
    changes: FileStructureChange[],
    spec: MigrationSpecification
  ): FileStructureChange[] {
    const missing: FileStructureChange[] = []
    const existingPaths = new Set(changes.map(c => c.newPath))
    
    console.log(`[FileStructureManager] Identifying missing files...`)
    console.log(`[FileStructureManager] Target framework: ${spec.target.framework}`)
    console.log(`[FileStructureManager] Target routing: ${spec.target.routing}`)
    console.log(`[FileStructureManager] Existing paths:`, Array.from(existingPaths))
    
    // Only generate files for Next.js App Router
    // Accept both 'app-router' and 'app' as valid routing values
    // Accept 'nextjs', 'nextjs-app', or any framework containing 'next'
    const isNextJsAppRouter = 
      (spec.target.framework === 'nextjs' || 
       spec.target.framework === 'nextjs-app' || 
       spec.target.framework.toLowerCase().includes('next')) &&
      (spec.target.routing === 'app-router' || spec.target.routing === 'app')
    
    if (!isNextJsAppRouter) {
      console.log(`[FileStructureManager] Not Next.js App Router, skipping file generation`)
      console.log(`[FileStructureManager] Framework: ${spec.target.framework}, Routing: ${spec.target.routing}`)
      return missing
    }
    
    console.log(`[FileStructureManager] ✓ Detected Next.js App Router migration`)
    
    // Check for root layout
    if (!existingPaths.has('app/layout.tsx')) {
      console.log(`[FileStructureManager] Adding app/layout.tsx`)
      missing.push(this.createRootLayoutChange(spec))
    }
    
    // Check for root error boundary
    if (!existingPaths.has('app/error.tsx')) {
      console.log(`[FileStructureManager] Adding app/error.tsx`)
      missing.push(this.createRootErrorChange(spec))
    }
    
    // Check for not-found page
    if (!existingPaths.has('app/not-found.tsx')) {
      console.log(`[FileStructureManager] Adding app/not-found.tsx`)
      missing.push(this.createNotFoundChange(spec))
    }
    
    // Check for globals.css (only if not already being moved/merged from source files)
    const hasGlobalsCss = existingPaths.has('app/globals.css') || 
                          changes.some(c => c.newPath === 'app/globals.css')
    
    if (!hasGlobalsCss) {
      console.log(`[FileStructureManager] Adding app/globals.css`)
      missing.push(this.createGlobalsCssChange(spec))
    } else {
      console.log(`[FileStructureManager] app/globals.css already planned from source files`)
    }
    
    console.log(`[FileStructureManager] Total missing files: ${missing.length}`)
    
    return missing
  }

  /**
   * Create root layout change
   */
  private createRootLayoutChange(_spec: MigrationSpecification): FileStructureChange {
    return {
      originalPath: '',
      newPath: 'app/layout.tsx',
      action: 'create',
      fileType: 'layout',
      metadata: {
        isRouteFile: true,
        routeSegment: '(root)',
        requiresLayout: false,
        requiresLoading: false,
        requiresError: false,
      }
    }
  }

  /**
   * Create root error change
   */
  private createRootErrorChange(_spec: MigrationSpecification): FileStructureChange {
    return {
      originalPath: '',
      newPath: 'app/error.tsx',
      action: 'create',
      fileType: 'error',
      metadata: {
        isRouteFile: true,
        routeSegment: '(root)',
        requiresLayout: false,
        requiresLoading: false,
        requiresError: false,
      }
    }
  }

  /**
   * Create not-found change
   */
  private createNotFoundChange(_spec: MigrationSpecification): FileStructureChange {
    return {
      originalPath: '',
      newPath: 'app/not-found.tsx',
      action: 'create',
      fileType: 'page',
      metadata: {
        isRouteFile: true,
        routeSegment: '(root)',
        requiresLayout: false,
        requiresLoading: false,
        requiresError: false,
      }
    }
  }

  /**
   * Create globals.css change
   */
  private createGlobalsCssChange(_spec: MigrationSpecification): FileStructureChange {
    return {
      originalPath: '',
      newPath: 'app/globals.css',
      action: 'create',
      fileType: 'style',
      metadata: {
        isRouteFile: false,
      }
    }
  }

  /**
   * Check if route should generate layout
   */
  private shouldGenerateLayout(routeSegment: string, _content: string): boolean {
    // Don't generate layout for root (it's required and will be generated separately)
    if (routeSegment === '(root)') {
      return false
    }
    
    // Generate layout for top-level routes with multiple pages
    const segments = routeSegment.split('/')
    return segments.length === 1 && segments[0] !== '(root)'
  }

  /**
   * Check if route should generate loading component
   */
  private shouldGenerateLoading(content: string): boolean {
    // Check if content has async data fetching
    return content.includes('async') && content.includes('fetch')
  }

  /**
   * Check if route should generate error boundary
   */
  private shouldGenerateError(content: string): boolean {
    // Check if content has error handling
    return content.includes('try') && content.includes('catch')
  }

  /**
   * Sort changes by dependency order
   * 
   * Ensures that:
   * 1. Layouts are created before pages
   * 2. Parent directories are created before children
   * 3. Deletions happen after moves
   * 
   * @param changes - Array of file structure changes
   * @returns Sorted array of changes
   */
  private sortChangesByDependency(changes: FileStructureChange[]): FileStructureChange[] {
    return changes.sort((a, b) => {
      // Layouts first
      if (a.fileType === 'layout' && b.fileType !== 'layout') return -1
      if (b.fileType === 'layout' && a.fileType !== 'layout') return 1
      
      // Creates before moves
      if (a.action === 'create' && b.action === 'move') return -1
      if (b.action === 'create' && a.action === 'move') return 1
      
      // Moves before deletes
      if (a.action === 'move' && b.action === 'delete') return -1
      if (b.action === 'move' && a.action === 'delete') return 1
      
      // Sort by path depth (shallower first)
      const aDepth = a.newPath.split('/').length
      const bDepth = b.newPath.split('/').length
      return aDepth - bDepth
    })
  }
}
