/**
 * PagesToAppTransformer - Converts Next.js Pages Router to App Router
 * 
 * Transforms Next.js applications from Pages Router to App Router structure:
 * - Converts page files to app directory structure
 * - Transforms data fetching (getStaticProps, getServerSideProps, getStaticPaths)
 * - Converts _app.tsx to layout.tsx
 * - Converts _document.tsx to layout.tsx (merged)
 * - Converts API routes to Route Handlers
 * - Updates imports (next/head -> metadata exports)
 * 
 * Supports Next.js 13+ App Router migration
 * 
 * @example
 * ```typescript
 * const transformer = new PagesToAppTransformer()
 * const result = await transformer.transform(pageCode, options, task)
 * ```
 */

import { BaseTransformer } from '../base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
} from '@/types/transformer'
import { RouteMapper } from './route-mapper'
import { DataFetchingConverter } from './data-fetching-converter'
import { LayoutGenerator } from './layout-generator'

export class PagesToAppTransformer extends BaseTransformer {
  private routeMapper: RouteMapper
  private dataFetchingConverter: DataFetchingConverter
  private layoutGenerator: LayoutGenerator

  constructor() {
    super('PagesToAppTransformer', ['structural'], ['Next.js'])
    this.routeMapper = new RouteMapper()
    this.dataFetchingConverter = new DataFetchingConverter()
    this.layoutGenerator = new LayoutGenerator()
  }

  /**
   * Transforms Next.js Pages Router code to App Router
   * 
   * Process:
   * 1. Determine file type (page, API route, _app, _document)
   * 2. Map file path from pages/ to app/ structure
   * 3. Convert data fetching methods
   * 4. Transform component structure
   * 5. Update imports and exports
   * 6. Generate diff and metadata
   * 
   * @param code - Source code to transform
   * @param options - Transformation options
   * @param task - Task containing file path and pattern information
   * @returns Transformation result with converted code
   */
  async transform(
    code: string,
    _options: TransformOptions,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata([], 70)
    const warnings: string[] = []

    try {
      // Validate syntax
      const validation = await this.validateSyntax(code, 'typescript')
      if (!validation.isValid) {
        return {
          success: false,
          metadata,
          errors: validation.errors.map((e) => ({
            message: e.message,
            code: 'SYNTAX_ERROR',
            suggestions: ['Fix syntax errors before transformation'],
            severity: 'error' as const,
          })),
          warnings: validation.warnings,
        }
      }

      // Get file path from task
      const filePath = task?.affectedFiles?.[0] || 'unknown'
      
      // Create backup
      const backupId = this.createBackup(code, filePath)

      try {
        // Map route to new structure
        const routeMapping = this.routeMapper.mapPageToApp(filePath)

        let transformedCode: string
        const transformationsApplied: string[] = []

        // Transform based on file type
        switch (routeMapping.type) {
          case 'layout':
            transformedCode = await this.transformApp(code, warnings)
            transformationsApplied.push('Converted _app.tsx to layout.tsx')
            break

          case 'document':
            transformedCode = await this.transformDocument(code, warnings)
            transformationsApplied.push('Converted _document.tsx to layout.tsx')
            break

          case 'api':
            transformedCode = await this.transformApiRoute(code, warnings)
            transformationsApplied.push(`Converted API route to Route Handler: ${routeMapping.newPath}`)
            break

          case 'page':
          default:
            transformedCode = await this.transformPage(code, warnings)
            transformationsApplied.push(`Converted page to App Router: ${routeMapping.newPath}`)
            break
        }

        // Generate diff
        const diff = this.generateDiff(code, transformedCode)

        // Update metadata
        metadata.filesModified = [routeMapping.newPath]
        metadata.linesAdded = diff.visual.filter((l) => l.type === 'added').length
        metadata.linesRemoved = diff.visual.filter((l) => l.type === 'removed').length
        metadata.transformationsApplied = transformationsApplied
        metadata.confidenceScore = warnings.length > 0 ? 65 : 75
        metadata.requiresManualReview = warnings.length > 0 || routeMapping.isDynamic

        // Calculate risk score
        const riskScore = this.calculateRiskScore({
          success: true,
          code: transformedCode,
          diff,
          metadata,
          errors: [],
          warnings,
        })
        metadata.riskScore = riskScore

        // Add migration notes as warnings
        if (routeMapping.isDynamic) {
          warnings.push('Dynamic route detected - review params usage')
        }
        if (routeMapping.type === 'layout') {
          warnings.push('Review global providers and client component boundaries')
        }

        // Cleanup backup
        this.cleanupBackup(backupId)

        return {
          success: true,
          code: transformedCode,
          diff,
          metadata,
          errors: [],
          warnings,
        }
      } catch (error: any) {
        // Restore from backup on error
        await this.restoreBackup(backupId)
        throw error
      }
    } catch (error: any) {
      return {
        success: false,
        metadata,
        errors: [
          {
            message: error.message || 'Transformation failed',
            code: 'TRANSFORM_ERROR',
            suggestions: [
              'Ensure the code is valid Next.js',
              'Check for unsupported patterns',
              'Review file structure',
            ],
            severity: 'error' as const,
          },
        ],
        warnings,
      }
    }
  }

  /**
   * Transforms a regular page component
   */
  private async transformPage(code: string, warnings: string[]): Promise<string> {
    
    // Check for getInitialProps (legacy, needs manual migration)
    if (this.dataFetchingConverter.hasGetInitialProps(code)) {
      warnings.push('getInitialProps detected - requires manual migration')
      warnings.push('Consider using Server Components with async/await')
      return code // Return original code for manual review
    }

    // Convert data fetching methods
    const conversion = this.dataFetchingConverter.convert(code)
    
    // Add migration notes as warnings
    const notes = this.dataFetchingConverter.generateMigrationNotes(conversion)
    warnings.push(...notes)

    // Convert Head component to metadata
    let transformedCode = conversion.convertedCode
    
    // Add generateStaticParams if needed
    if (conversion.generateStaticParamsCode) {
      transformedCode = conversion.generateStaticParamsCode + '\n' + transformedCode
    }

    // Replace next/head imports with metadata comment
    transformedCode = transformedCode.replace(
      /import\s+Head\s+from\s+['"]next\/head['"]/g,
      '// TODO: Convert Head usage to metadata export'
    )

    // Remove Head component usage (should be in metadata)
    transformedCode = transformedCode.replace(
      /<Head>[\s\S]*?<\/Head>/g,
      '// TODO: Move Head content to metadata export'
    )

    return transformedCode
  }

  /**
   * Transforms _app.tsx to layout.tsx
   */
  private async transformApp(code: string, warnings: string[]): Promise<string> {
    
    const conversion = this.layoutGenerator.convertApp(code)
    
    // Add warnings from conversion
    warnings.push(...conversion.warnings)
    
    // Add migration notes
    const notes = this.layoutGenerator.generateMigrationNotes(conversion)
    warnings.push(...notes)

    return conversion.layoutCode
  }

  /**
   * Transforms _document.tsx to layout.tsx
   */
  private async transformDocument(code: string, warnings: string[]): Promise<string> {
    
    const conversion = this.layoutGenerator.convertDocument(code)
    
    // Add warnings from conversion
    if (conversion.warnings) {
      warnings.push(...conversion.warnings)
    }

    warnings.push('_document.tsx should be merged with _app.tsx layout')
    warnings.push('Review HTML structure and metadata exports')

    return conversion.metadataExports || '// TODO: Merge with layout.tsx'
  }

  /**
   * Transforms API route to Route Handler
   */
  private async transformApiRoute(code: string, warnings: string[]): Promise<string> {
    // Convert API route handler to Route Handler format
    let transformedCode = code

    // Replace default export with named exports (GET, POST, etc.)
    transformedCode = this.convertApiHandler(transformedCode, warnings)

    warnings.push('API route converted to Route Handler')
    warnings.push('Review request/response handling')
    warnings.push('Update imports from next/server')

    return transformedCode
  }

  /**
   * Converts API route handler to Route Handler format
   */
  private convertApiHandler(code: string, warnings: string[]): string {
    // This is a simplified conversion
    // Real implementation would use AST to properly transform the handler

    // Check for different HTTP methods
    const hasMethodCheck = /req\.method\s*===?\s*['"](\w+)['"]/g.test(code)

    if (hasMethodCheck) {
      warnings.push('Multiple HTTP methods detected - split into separate exports')
      
      // Extract method handlers
      let converted = code

      // Replace default export with named exports
      converted = converted.replace(
        /export\s+default\s+(?:async\s+)?function\s+handler/g,
        'export async function GET'
      )

      // Add comment about splitting methods
      converted = `// TODO: Split HTTP methods into separate exports (GET, POST, PUT, DELETE)\n${converted}`

      return converted
    }

    // Simple case: single method handler
    // Assume GET if no method specified
    let converted = code.replace(
      /export\s+default\s+(?:async\s+)?function\s+handler/g,
      'export async function GET'
    )

    // Update imports
    converted = converted.replace(
      /import\s+type\s+\{\s*NextApiRequest,\s*NextApiResponse\s*\}\s+from\s+['"]next['"]/g,
      "import { NextRequest, NextResponse } from 'next/server'"
    )

    // Update function signature
    converted = converted.replace(
      /\(\s*req:\s*NextApiRequest,\s*res:\s*NextApiResponse\s*\)/g,
      '(request: NextRequest)'
    )

    // Update response methods
    converted = converted.replace(
      /res\.status\((\d+)\)\.json\(([^)]+)\)/g,
      'NextResponse.json($2, { status: $1 })'
    )

    converted = converted.replace(
      /res\.json\(([^)]+)\)/g,
      'NextResponse.json($1)'
    )

    return converted
  }
}
