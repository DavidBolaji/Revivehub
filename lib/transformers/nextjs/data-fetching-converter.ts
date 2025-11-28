/**
 * Data Fetching Converter for Next.js Pages to App Router Migration
 * 
 * Converts Pages Router data fetching methods to App Router patterns:
 * - getStaticProps -> async Server Component with fetch
 * - getServerSideProps -> async Server Component with fetch (no-cache)
 * - getStaticPaths -> generateStaticParams
 */

import { parse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'

export interface DataFetchingConversion {
  hasGetStaticProps: boolean
  hasGetServerSideProps: boolean
  hasGetStaticPaths: boolean
  convertedCode: string
  dataFetchingLogic: string
  generateStaticParamsCode?: string
}

/**
 * Extracts function name from declaration (helper function)
 */
function getFunctionName(declaration: t.FunctionDeclaration | t.VariableDeclaration): string | null {
  if (t.isFunctionDeclaration(declaration) && declaration.id) {
    return declaration.id.name
  }
  
  if (t.isVariableDeclaration(declaration)) {
    const declarator = declaration.declarations[0]
    if (t.isIdentifier(declarator.id)) {
      return declarator.id.name
    }
  }
  
  return null
}

export class DataFetchingConverter {
  /**
   * Converts data fetching methods from Pages to App Router
   * 
   * @param code - Original page component code
   * @returns Conversion result with transformed code
   */
  convert(code: string): DataFetchingConversion {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })
    
    const result: DataFetchingConversion = {
      hasGetStaticProps: false,
      hasGetServerSideProps: false,
      hasGetStaticPaths: false,
      convertedCode: code,
      dataFetchingLogic: '',
    }
    
    let getStaticPropsNode: NodePath | null = null
    let getServerSidePropsNode: NodePath | null = null
    let getStaticPathsNode: NodePath | null = null
    let pageComponentNode: NodePath | null = null
    
    // Find data fetching functions and page component
    traverse(ast, {
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration
        
        if (t.isFunctionDeclaration(declaration) || t.isVariableDeclaration(declaration)) {
          const name = getFunctionName(declaration)
          
          if (name === 'getStaticProps') {
            result.hasGetStaticProps = true
            getStaticPropsNode = path as any
          } else if (name === 'getServerSideProps') {
            result.hasGetServerSideProps = true
            getServerSidePropsNode = path as any
          } else if (name === 'getStaticPaths') {
            result.hasGetStaticPaths = true
            getStaticPathsNode = path as any
          }
        }
      },
      
      ExportDefaultDeclaration(path) {
        pageComponentNode = path as any
      },
    })
    
    // Convert getStaticProps or getServerSideProps
    if (getStaticPropsNode) {
      result.dataFetchingLogic = this.convertGetStaticProps(getStaticPropsNode)
      ;(getStaticPropsNode as any).remove()
    } else if (getServerSidePropsNode) {
      result.dataFetchingLogic = this.convertGetServerSideProps(getServerSidePropsNode)
      ;(getServerSidePropsNode as any).remove()
    }
    
    // Convert getStaticPaths
    if (getStaticPathsNode) {
      result.generateStaticParamsCode = this.convertGetStaticPaths(getStaticPathsNode)
      ;(getStaticPathsNode as any).remove()
    }
    
    // Make page component async if it has data fetching
    if (pageComponentNode && (result.hasGetStaticProps || result.hasGetServerSideProps)) {
      this.makeComponentAsync(pageComponentNode, result.dataFetchingLogic)
    }
    
    result.convertedCode = generate(ast, {
      retainLines: false,
      comments: true,
    }).code
    
    return result
  }
  
  /**
   * Converts getStaticProps to async component data fetching
   */
  private convertGetStaticProps(path: NodePath): string {
    const code = generate(path.node).code
    
    // Extract the fetch logic from getStaticProps
    // This is a simplified conversion - real implementation would parse the AST
    const fetchLogic = this.extractFetchLogic(code)
    
    return `
  // Data fetching (converted from getStaticProps)
  const data = await fetch('${fetchLogic.url || 'YOUR_API_URL'}', {
    next: { revalidate: ${fetchLogic.revalidate || 3600} }
  }).then(res => res.json())
`
  }
  
  /**
   * Converts getServerSideProps to async component data fetching
   */
  private convertGetServerSideProps(path: NodePath): string {
    const code = generate(path.node).code
    
    // Extract the fetch logic from getServerSideProps
    const fetchLogic = this.extractFetchLogic(code)
    
    return `
  // Data fetching (converted from getServerSideProps)
  const data = await fetch('${fetchLogic.url || 'YOUR_API_URL'}', {
    cache: 'no-store' // Equivalent to getServerSideProps
  }).then(res => res.json())
`
  }
  
  /**
   * Converts getStaticPaths to generateStaticParams
   */
  private convertGetStaticPaths(path: NodePath): string {
    const code = generate(path.node).code
    
    // Extract paths generation logic
    const pathsLogic = this.extractPathsLogic(code)
    
    return `
export async function generateStaticParams() {
  // Converted from getStaticPaths
  ${pathsLogic}
  
  return paths.map((path) => ({
    // Map your dynamic segments here
    // Example: slug: path.params.slug
  }))
}
`
  }
  
  /**
   * Makes a component async and adds data fetching
   */
  private makeComponentAsync(path: NodePath, dataFetchingLogic: string): void {
    const declaration = (path as any).node.declaration
    
    if (t.isFunctionDeclaration(declaration)) {
      // Make function async
      declaration.async = true
      
      // Add data fetching at the start of the function body
      if (declaration.body && t.isBlockStatement(declaration.body)) {
        const fetchStatement = parse(dataFetchingLogic, {
          sourceType: 'module',
        }).program.body[0]
        
        declaration.body.body.unshift(fetchStatement as any)
      }
    } else if (t.isArrowFunctionExpression(declaration) || t.isFunctionExpression(declaration)) {
      // Handle arrow functions and function expressions
      declaration.async = true
    }
  }
  
  /**
   * Extracts fetch logic from getStaticProps/getServerSideProps
   * This is a simplified version - real implementation would use AST traversal
   */
  private extractFetchLogic(code: string): { url?: string; revalidate?: number } {
    const result: { url?: string; revalidate?: number } = {}
    
    // Try to find fetch calls
    const fetchMatch = code.match(/fetch\(['"`]([^'"`]+)['"`]/)
    if (fetchMatch) {
      result.url = fetchMatch[1]
    }
    
    // Try to find revalidate value
    const revalidateMatch = code.match(/revalidate:\s*(\d+)/)
    if (revalidateMatch) {
      result.revalidate = parseInt(revalidateMatch[1], 10)
    }
    
    return result
  }
  
  /**
   * Extracts paths generation logic from getStaticPaths
   */
  private extractPathsLogic(code: string): string {
    // Extract the logic that generates paths
    // This is simplified - real implementation would parse AST
    const pathsMatch = code.match(/paths:\s*\[([^\]]+)\]/)
    if (pathsMatch) {
      return `const paths = [${pathsMatch[1]}]`
    }
    
    return '// TODO: Add your paths generation logic here'
  }
  
  /**
   * Converts props destructuring from Pages Router to App Router
   * Pages: function Page({ data }) - props from getStaticProps
   * App: async function Page() - fetch data directly
   */
  convertPropsToDirectFetch(componentCode: string, propsUsed: string[]): string {
    // Remove props parameter and replace with direct data usage
    let converted = componentCode
    
    // This is simplified - real implementation would use AST
    propsUsed.forEach(prop => {
      // Replace {prop} destructuring with direct usage
      converted = converted.replace(
        new RegExp(`\\{\\s*${prop}\\s*\\}`, 'g'),
        ''
      )
    })
    
    return converted
  }
  
  /**
   * Checks if code uses getInitialProps (legacy, needs manual migration)
   */
  hasGetInitialProps(code: string): boolean {
    return code.includes('getInitialProps')
  }
  
  /**
   * Generates migration notes for manual review
   */
  generateMigrationNotes(conversion: DataFetchingConversion): string[] {
    const notes: string[] = []
    
    if (conversion.hasGetStaticProps) {
      notes.push('Converted getStaticProps to async Server Component with revalidation')
      notes.push('Review the fetch URL and revalidation time')
    }
    
    if (conversion.hasGetServerSideProps) {
      notes.push('Converted getServerSideProps to async Server Component with no-cache')
      notes.push('Review the fetch URL and caching strategy')
    }
    
    if (conversion.hasGetStaticPaths) {
      notes.push('Converted getStaticPaths to generateStaticParams')
      notes.push('Review the params mapping for dynamic routes')
    }
    
    if (!conversion.hasGetStaticProps && !conversion.hasGetServerSideProps) {
      notes.push('No data fetching methods found - component can remain as-is')
    }
    
    return notes
  }
}
