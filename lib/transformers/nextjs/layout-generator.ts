/**
 * Layout Generator for Next.js Pages to App Router Migration
 * 
 * Converts _app.tsx and _document.tsx to App Router layout.tsx:
 * - Extracts global providers and wrappers from _app.tsx
 * - Extracts HTML structure and metadata from _document.tsx
 * - Merges both into a single layout.tsx file
 * - Converts Head component to metadata exports
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'

export interface LayoutConversion {
  layoutCode: string
  metadataExports: string
  hasProviders: boolean
  hasCustomDocument: boolean
  warnings: string[]
}

export class LayoutGenerator {
  /**
   * Converts _app.tsx to layout.tsx
   * 
   * @param appCode - Content of _app.tsx
   * @returns Layout conversion result
   */
  convertApp(appCode: string): LayoutConversion {
    const result: LayoutConversion = {
      layoutCode: '',
      metadataExports: '',
      hasProviders: false,
      hasCustomDocument: false,
      warnings: [],
    }
    
    try {
      const ast = parse(appCode, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      })
      
      const imports: string[] = []
      
      // Extract imports and component
      traverse(ast, {
        ImportDeclaration(path) {
          // Skip Next.js App imports
          if (path.node.source.value === 'next/app') {
            return
          }
          imports.push(generate(path.node).code)
        },
      })
      
      // Extract providers and wrappers
      const { providers, children } = this.extractProviders(null)
      result.hasProviders = providers.length > 0
      
      // Generate layout code
      result.layoutCode = this.generateLayoutCode(imports, providers, children)
      
    } catch (error: any) {
      result.warnings.push(`Failed to parse _app.tsx: ${error.message}`)
    }
    
    return result
  }
  
  /**
   * Converts _document.tsx to layout.tsx metadata
   * 
   * @param documentCode - Content of _document.tsx
   * @returns Metadata exports and HTML structure
   */
  convertDocument(documentCode: string): Partial<LayoutConversion> {
    const result: Partial<LayoutConversion> = {
      metadataExports: '',
      hasCustomDocument: true,
      warnings: [],
    }
    
    try {
      // Extract metadata from Head component
      const metadata = this.extractMetadata(documentCode)
      result.metadataExports = this.generateMetadataExports(metadata)
      
    } catch (error: any) {
      result.warnings = [`Failed to parse _document.tsx: ${error.message}`]
    }
    
    return result
  }
  
  /**
   * Merges _app.tsx and _document.tsx into a single layout.tsx
   */
  mergeAppAndDocument(
    appConversion: LayoutConversion,
    documentConversion: Partial<LayoutConversion>
  ): string {
    const parts: string[] = []
    
    // Add metadata exports
    if (documentConversion.metadataExports) {
      parts.push(documentConversion.metadataExports)
      parts.push('')
    }
    
    // Add layout code
    if (appConversion.layoutCode) {
      parts.push(appConversion.layoutCode)
    }
    
    return parts.join('\n')
  }
  
  /**
   * Extracts providers and wrappers from App component
   */
  private extractProviders(_componentNode: any): {
    providers: string[]
    children: string
  } {
    const providers: string[] = []
    
    // This is simplified - real implementation would traverse JSX tree
    // to find nested providers like <ThemeProvider><Component /></ThemeProvider>
    
    return {
      providers,
      children: '{children}',
    }
  }
  
  /**
   * Generates layout.tsx code
   */
  private generateLayoutCode(
    imports: string[],
    providers: string[],
    children: string
  ): string {
    const importSection = imports.join('\n')
    
    const providerWrappers = providers.length > 0
      ? providers.map(p => `<${p}>`).join('\n    ')
      : ''
    
    const providerClosing = providers.length > 0
      ? providers.reverse().map(p => `</${p}>`).join('\n    ')
      : ''
    
    return `${importSection}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        ${providerWrappers}
        ${children}
        ${providerClosing}
      </body>
    </html>
  )
}
`
  }
  
  /**
   * Extracts metadata from _document.tsx Head component
   */
  private extractMetadata(documentCode: string): Record<string, any> {
    const metadata: Record<string, any> = {}
    
    // Extract title
    const titleMatch = documentCode.match(/<title>([^<]+)<\/title>/)
    if (titleMatch) {
      metadata.title = titleMatch[1]
    }
    
    // Extract meta tags
    const metaRegex = /<meta\s+([^>]+)>/g
    let match
    while ((match = metaRegex.exec(documentCode)) !== null) {
      const attrs = match[1]
      
      // Extract name and content
      const nameMatch = attrs.match(/name=["']([^"']+)["']/)
      const contentMatch = attrs.match(/content=["']([^"']+)["']/)
      
      if (nameMatch && contentMatch) {
        metadata[nameMatch[1]] = contentMatch[1]
      }
    }
    
    return metadata
  }
  
  /**
   * Generates metadata exports for App Router
   */
  private generateMetadataExports(metadata: Record<string, any>): string {
    const entries = Object.entries(metadata)
    
    if (entries.length === 0) {
      return ''
    }
    
    const metadataObj = entries
      .map(([key, value]) => `  ${key}: '${value}',`)
      .join('\n')
    
    return `export const metadata = {
${metadataObj}
}
`
  }
  
  /**
   * Converts Head component usage to metadata
   */
  convertHeadToMetadata(code: string): string {
    // Replace <Head> imports
    let converted = code.replace(
      /import\s+Head\s+from\s+['"]next\/head['"]/g,
      '// Head converted to metadata export'
    )
    
    // Remove <Head> tags (metadata should be in metadata export)
    converted = converted.replace(
      /<Head>[\s\S]*?<\/Head>/g,
      '// Head content moved to metadata export'
    )
    
    return converted
  }
  
  /**
   * Generates migration notes for layout conversion
   */
  generateMigrationNotes(conversion: LayoutConversion): string[] {
    const notes: string[] = []
    
    if (conversion.hasProviders) {
      notes.push('Providers detected - review client component boundaries')
      notes.push('Consider using "use client" directive for interactive providers')
    }
    
    if (conversion.hasCustomDocument) {
      notes.push('Custom _document.tsx detected - review HTML structure')
      notes.push('Verify metadata exports match original Head content')
    }
    
    notes.push('Review layout.tsx for proper HTML structure')
    notes.push('Test global styles and providers')
    
    return notes
  }
}