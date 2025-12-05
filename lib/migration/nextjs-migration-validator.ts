/**
 * Next.js Migration Validator
 * 
 * Validates and fixes React to Next.js migration results according to Next.js conventions.
 * This validator runs after transformations to ensure proper file structure and naming.
 * 
 * Rules enforced:
 * 1. Remove CRA-specific files (index.js, reportWebVitals.js, setupTests.js)
 * 2. Fix incorrect file naming (Usetodos.tsx -> useTodos.ts)
 * 3. Move context files from src/ to lib/context/
 * 4. Ensure hooks use proper naming and extensions
 * 5. Handle PWA manifest configuration
 */

import type { Phase3TransformResult, MigrationSpecification } from '@/types/migration'

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  severity: 'critical' | 'high' | 'medium' | 'low'
  filePath: string
  message: string
  suggestedAction: string
  autoFixable: boolean
}

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  fixedTransformations: Map<string, Phase3TransformResult>
  removedFiles: string[]
  renamedFiles: Map<string, string> // old path -> new path
}

/**
 * Next.js Migration Validator
 * 
 * Validates transformation results and applies Next.js-specific fixes
 */
export class NextJSMigrationValidator {
  // Files that should NOT exist in Next.js
  private readonly FORBIDDEN_FILES = [
    'src/index.js',
    'src/Index.tsx',
    'src/index.tsx',
    'src/reportWebVitals.js',
    'src/Reportwebvitals.tsx',
    'src/reportWebVitals.tsx',
    'src/setupTests.js',
    'src/Setuptests.tsx',
    'src/setupTests.tsx',
    'public/index.html', // CRA entry point
  ]

  // Correct file path mappings
  private readonly FILE_CORRECTIONS: Record<string, string> = {
    // Hook naming corrections
    'src/hooks/Usetodos.tsx': 'hooks/useTodos.ts',
    'src/hooks/Usetodos.ts': 'hooks/useTodos.ts',
    'hooks/Usetodos.tsx': 'hooks/useTodos.ts',
    'hooks/Usetodos.ts': 'hooks/useTodos.ts',
    
    // Context location and naming corrections
    'src/context/Todocontext.tsx': 'lib/context/TodoContext.tsx',
    'src/context/TodoContext.tsx': 'lib/context/TodoContext.tsx',
    'src/context/todocontext.tsx': 'lib/context/TodoContext.tsx',
    
    // Test setup should be at root
    'src/setupTests.js': 'jest.setup.ts',
    'src/Setuptests.tsx': 'jest.setup.ts',
  }

  /**
   * Validate transformation results and apply fixes
   */
  async validate(
    transformations: Map<string, Phase3TransformResult>,
    spec: MigrationSpecification
  ): Promise<ValidationResult> {
    console.log('[NextJS Validator] Starting validation of', transformations.size, 'transformations')

    const issues: ValidationIssue[] = []
    const fixedTransformations = new Map<string, Phase3TransformResult>()
    const removedFiles: string[] = []
    const renamedFiles = new Map<string, string>()

    // Step 1: Check for forbidden files
    this.checkForbiddenFiles(transformations, issues, removedFiles)

    // Step 2: Fix incorrect naming and locations
    this.fixNamingAndLocations(transformations, fixedTransformations, renamedFiles, issues)

    // Step 3: Validate hook naming conventions
    this.validateHookNaming(fixedTransformations, issues)

    // Step 4: Validate context file locations
    this.validateContextLocations(fixedTransformations, issues)

    // Step 5: Check for PWA manifest configuration
    this.checkPWAManifest(transformations, spec, issues)

    // Step 6: Validate required Next.js files
    this.validateRequiredFiles(fixedTransformations, issues)

    const isValid = !issues.some(issue => issue.type === 'error')

    console.log('[NextJS Validator] Validation complete:', {
      isValid,
      issuesCount: issues.length,
      removedFiles: removedFiles.length,
      renamedFiles: renamedFiles.size,
    })

    return {
      isValid,
      issues,
      fixedTransformations,
      removedFiles,
      renamedFiles,
    }
  }

  /**
   * Check for files that should not exist in Next.js
   */
  private checkForbiddenFiles(
    transformations: Map<string, Phase3TransformResult>,
    issues: ValidationIssue[],
    removedFiles: string[]
  ): void {
    for (const filePath of transformations.keys()) {
      if (this.FORBIDDEN_FILES.includes(filePath)) {
        issues.push({
          type: 'error',
          severity: 'critical',
          filePath,
          message: `This file should not exist in Next.js: ${filePath}`,
          suggestedAction: this.getForbiddenFileAction(filePath),
          autoFixable: true,
        })
        removedFiles.push(filePath)
      }
    }
  }

  /**
   * Get suggested action for forbidden files
   */
  private getForbiddenFileAction(filePath: string): string {
    if (filePath.includes('index.js') || filePath.includes('Index.tsx')) {
      return 'Remove this file. Next.js boots from app/layout.tsx + app/page.tsx'
    }
    if (filePath.includes('reportWebVitals') || filePath.includes('Reportwebvitals')) {
      return 'Delete this file. Next.js does not use CRA\'s performance reporting tool'
    }
    if (filePath.includes('setupTests') || filePath.includes('Setuptests')) {
      return 'Move to jest.setup.ts at the root or /tests directory'
    }
    if (filePath.includes('index.html')) {
      return 'Remove this file. Next.js generates HTML automatically'
    }
    return 'Remove this file - it is not needed in Next.js'
  }

  /**
   * Fix incorrect naming and file locations
   */
  private fixNamingAndLocations(
    transformations: Map<string, Phase3TransformResult>,
    fixedTransformations: Map<string, Phase3TransformResult>,
    renamedFiles: Map<string, string>,
    issues: ValidationIssue[]
  ): void {
    for (const [filePath, transformation] of transformations.entries()) {
      // Skip forbidden files
      if (this.FORBIDDEN_FILES.includes(filePath)) {
        continue
      }

      // Check if file needs correction
      const correctPath = this.FILE_CORRECTIONS[filePath]
      
      if (correctPath) {
        // File needs to be renamed/moved
        issues.push({
          type: 'warning',
          severity: 'high',
          filePath,
          message: `Incorrect file path: ${filePath}`,
          suggestedAction: `Rename/move to: ${correctPath}`,
          autoFixable: true,
        })

        renamedFiles.set(filePath, correctPath)
        
        // Create corrected transformation
        fixedTransformations.set(correctPath, {
          ...transformation,
          newFilePath: correctPath,
          filePath: correctPath,
        })
      } else {
        // Check for pattern-based corrections
        const correctedPath = this.getCorrectedPath(filePath)
        
        if (correctedPath !== filePath) {
          issues.push({
            type: 'warning',
            severity: 'medium',
            filePath,
            message: `File path should follow Next.js conventions`,
            suggestedAction: `Rename to: ${correctedPath}`,
            autoFixable: true,
          })

          renamedFiles.set(filePath, correctedPath)
          
          fixedTransformations.set(correctedPath, {
            ...transformation,
            newFilePath: correctedPath,
            filePath: correctedPath,
          })
        } else {
          // No correction needed
          fixedTransformations.set(filePath, transformation)
        }
      }
    }
  }

  /**
   * Get corrected path based on patterns
   */
  private getCorrectedPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    
    // Fix hook naming: Usetodos -> useTodos
    if (filePath.includes('/hooks/') && fileName.match(/^[A-Z][a-z]*use/)) {
      const correctedName = fileName.replace(/^([A-Z])([a-z]*)use/, (_, first, rest) => 
        `use${first}${rest}`
      )
      return filePath.replace(fileName, correctedName).replace('.tsx', '.ts')
    }

    // Fix context naming: Todocontext -> TodoContext
    if (filePath.includes('context') && fileName.match(/^[a-z][a-z]*context/i)) {
      const correctedName = fileName.replace(/^([a-z])([a-z]*)context/i, (_, first, rest) => 
        `${first.toUpperCase()}${rest}Context`
      )
      
      // Move from src/context to lib/context
      if (filePath.startsWith('src/context/')) {
        return filePath.replace('src/context/', 'lib/context/').replace(fileName, correctedName)
      }
      
      return filePath.replace(fileName, correctedName)
    }

    return filePath
  }

  /**
   * Validate hook naming conventions
   */
  private validateHookNaming(
    transformations: Map<string, Phase3TransformResult>,
    issues: ValidationIssue[]
  ): void {
    for (const [filePath, transformation] of transformations.entries()) {
      if (!filePath.includes('/hooks/')) continue

      const fileName = filePath.split('/').pop() || ''
      
      // Check if hook starts with lowercase 'use'
      if (!fileName.startsWith('use')) {
        issues.push({
          type: 'error',
          severity: 'high',
          filePath,
          message: 'Hook files must start with "use" (camelCase)',
          suggestedAction: `Rename to use${fileName.charAt(0).toUpperCase()}${fileName.slice(1)}`,
          autoFixable: false,
        })
      }

      // Check if hook uses .tsx when it shouldn't
      if (fileName.endsWith('.tsx')) {
        const hasJSX = transformation.code?.includes('JSX') || 
                       transformation.code?.includes('<') ||
                       transformation.code?.includes('React.createElement')
        
        if (!hasJSX) {
          issues.push({
            type: 'warning',
            severity: 'low',
            filePath,
            message: 'Hooks should use .ts extension unless returning JSX',
            suggestedAction: `Rename to ${fileName.replace('.tsx', '.ts')}`,
            autoFixable: true,
          })
        }
      }
    }
  }

  /**
   * Validate context file locations
   */
  private validateContextLocations(
    transformations: Map<string, Phase3TransformResult>,
    issues: ValidationIssue[]
  ): void {
    for (const filePath of transformations.keys()) {
      // Check if context file is in src/
      if (filePath.startsWith('src/context/')) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          filePath,
          message: 'Context files should not be in src/ directory',
          suggestedAction: 'Move to lib/context/ or app/context/',
          autoFixable: true,
        })
      }

      // Check context file naming
      if (filePath.includes('context') && filePath.includes('/')) {
        const fileName = filePath.split('/').pop() || ''
        if (fileName.match(/^[a-z]/)) {
          issues.push({
            type: 'warning',
            severity: 'medium',
            filePath,
            message: 'Context files should use PascalCase naming',
            suggestedAction: `Rename to ${fileName.charAt(0).toUpperCase()}${fileName.slice(1)}`,
            autoFixable: true,
          })
        }
      }
    }
  }

  /**
   * Check PWA manifest configuration
   */
  private checkPWAManifest(
    transformations: Map<string, Phase3TransformResult>,
    spec: MigrationSpecification,
    issues: ValidationIssue[]
  ): void {
    const hasManifest = transformations.has('public/manifest.json')
    
    if (hasManifest) {
      // Check if next-pwa is configured
      const isNextJS = spec.target.framework === 'nextjs' || 
                       spec.target.framework === 'Next.js'

      if (isNextJS) {
        issues.push({
          type: 'info',
          severity: 'low',
          filePath: 'public/manifest.json',
          message: 'PWA manifest found but next-pwa is not configured',
          suggestedAction: 'Install and configure next-pwa plugin, or remove manifest.json',
          autoFixable: false,
        })
      }
    }
  }

  /**
   * Validate required Next.js files exist
   */
  private validateRequiredFiles(
    transformations: Map<string, Phase3TransformResult>,
    issues: ValidationIssue[]
  ): void {
    const requiredFiles = [
      'app/layout.tsx',
      'app/page.tsx',
    ]

    for (const requiredFile of requiredFiles) {
      if (!transformations.has(requiredFile)) {
        issues.push({
          type: 'error',
          severity: 'critical',
          filePath: requiredFile,
          message: `Required Next.js file is missing: ${requiredFile}`,
          suggestedAction: 'Create this required file for Next.js App Router',
          autoFixable: false,
        })
      }
    }
  }

  /**
   * Generate validation report
   */
  generateReport(result: ValidationResult): string {
    const lines: string[] = []
    
    lines.push('='.repeat(60))
    lines.push('Next.js Migration Validation Report')
    lines.push('='.repeat(60))
    lines.push('')

    if (result.isValid) {
      lines.push('✅ All validation checks passed!')
    } else {
      lines.push('❌ Validation failed - issues found')
    }

    lines.push('')
    lines.push(`Total Issues: ${result.issues.length}`)
    lines.push(`Files Removed: ${result.removedFiles.length}`)
    lines.push(`Files Renamed: ${result.renamedFiles.size}`)
    lines.push('')

    // Group issues by type
    const errors = result.issues.filter(i => i.type === 'error')
    const warnings = result.issues.filter(i => i.type === 'warning')
    const info = result.issues.filter(i => i.type === 'info')

    if (errors.length > 0) {
      lines.push('🚨 ERRORS (must fix):')
      lines.push('')
      errors.forEach((issue, index) => {
        lines.push(`${index + 1}. ${issue.message}`)
        lines.push(`   File: ${issue.filePath}`)
        lines.push(`   Action: ${issue.suggestedAction}`)
        lines.push('')
      })
    }

    if (warnings.length > 0) {
      lines.push('⚠️  WARNINGS (should fix):')
      lines.push('')
      warnings.forEach((issue, index) => {
        lines.push(`${index + 1}. ${issue.message}`)
        lines.push(`   File: ${issue.filePath}`)
        lines.push(`   Action: ${issue.suggestedAction}`)
        lines.push('')
      })
    }

    if (info.length > 0) {
      lines.push('ℹ️  INFO:')
      lines.push('')
      info.forEach((issue, index) => {
        lines.push(`${index + 1}. ${issue.message}`)
        lines.push(`   File: ${issue.filePath}`)
        lines.push(`   Action: ${issue.suggestedAction}`)
        lines.push('')
      })
    }

    if (result.removedFiles.length > 0) {
      lines.push('🗑️  Files Removed:')
      result.removedFiles.forEach(file => {
        lines.push(`   - ${file}`)
      })
      lines.push('')
    }

    if (result.renamedFiles.size > 0) {
      lines.push('📝 Files Renamed:')
      result.renamedFiles.forEach((newPath, oldPath) => {
        lines.push(`   ${oldPath} → ${newPath}`)
      })
      lines.push('')
    }

    lines.push('='.repeat(60))

    return lines.join('\n')
  }
}

/**
 * Create a new Next.js migration validator instance
 */
export function createNextJSValidator(): NextJSMigrationValidator {
  return new NextJSMigrationValidator()
}
