/**
 * Route Mapper for Next.js Pages to App Router Migration
 * 
 * Handles file path conversion from Pages Router to App Router structure:
 * - /pages/index.tsx -> /app/page.tsx
 * - /pages/about.tsx -> /app/about/page.tsx
 * - /pages/blog/[slug].tsx -> /app/blog/[slug]/page.tsx
 * - /pages/api/users.ts -> /app/api/users/route.ts
 * - /pages/_app.tsx -> /app/layout.tsx
 * - /pages/_document.tsx -> /app/layout.tsx (merged)
 */

export interface RouteMapping {
  originalPath: string
  newPath: string
  type: 'page' | 'api' | 'layout' | 'document'
  isIndex: boolean
  isDynamic: boolean
  segments: string[]
}

export class RouteMapper {
  /**
   * Maps a Pages Router path to App Router path
   * 
   * @param pagePath - Original path in pages directory
   * @returns Route mapping with new path and metadata
   */
  mapPageToApp(pagePath: string): RouteMapping {
    // Normalize path separators
    const normalizedPath = pagePath.replace(/\\/g, '/')
    
    // Determine file type
    const type = this.determineFileType(normalizedPath)
    
    // Extract segments from path
    const segments = this.extractSegments(normalizedPath)
    
    // Check if it's an index file
    const isIndex = this.isIndexFile(normalizedPath)
    
    // Check if it has dynamic segments
    const isDynamic = this.hasDynamicSegments(segments.join('/'))
    
    // Generate new path based on type
    let newPath: string
    
    switch (type) {
      case 'layout':
        newPath = 'app/layout.tsx'
        break
      case 'document':
        newPath = 'app/layout.tsx' // Will be merged with _app
        break
      case 'api':
        newPath = this.mapApiRoute(normalizedPath, segments)
        break
      case 'page':
      default:
        newPath = this.mapPageRoute(normalizedPath, segments, isIndex)
        break
    }
    
    return {
      originalPath: pagePath,
      newPath,
      type,
      isIndex,
      isDynamic,
      segments,
    }
  }
  
  /**
   * Determines the file type based on path
   */
  private determineFileType(path: string): 'page' | 'api' | 'layout' | 'document' {
    if (path.includes('/_app.')) {
      return 'layout'
    }
    if (path.includes('/_document.')) {
      return 'document'
    }
    if (path.includes('/api/')) {
      return 'api'
    }
    return 'page'
  }
  
  /**
   * Extracts path segments from file path
   */
  private extractSegments(path: string): string[] {
    // Remove pages/ prefix and file extension
    let cleanPath = path
      .replace(/^.*\/pages\//, '')
      .replace(/\.(tsx?|jsx?)$/, '')
    
    // Remove /api/ prefix for API routes
    cleanPath = cleanPath.replace(/^api\//, '')
    
    // Split into segments
    const segments = cleanPath.split('/').filter(s => s && s !== 'index')
    
    return segments
  }
  
  /**
   * Checks if path represents an index file
   */
  private isIndexFile(path: string): boolean {
    return /\/index\.(tsx?|jsx?)$/.test(path) || /\/pages\/(index\.(tsx?|jsx?)|$)/.test(path)
  }
  
  /**
   * Checks if path contains dynamic segments
   */
  private hasDynamicSegments(path: string): boolean {
    return /\[.*?\]/.test(path)
  }
  
  /**
   * Maps a page route to App Router structure
   */
  private mapPageRoute(_path: string, segments: string[], isIndex: boolean): string {
    if (segments.length === 0 || isIndex) {
      // Root index -> app/page.tsx
      return 'app/page.tsx'
    }
    
    // Regular page -> app/[segments]/page.tsx
    return `app/${segments.join('/')}/page.tsx`
  }
  
  /**
   * Maps an API route to Route Handler structure
   */
  private mapApiRoute(_path: string, segments: string[]): string {
    if (segments.length === 0) {
      return 'app/api/route.ts'
    }
    
    // API route -> app/api/[segments]/route.ts
    return `app/api/${segments.join('/')}/route.ts`
  }
  
  /**
   * Converts dynamic segment notation if needed
   * Pages Router: [id] or [...slug]
   * App Router: [id] or [...slug] (same, but different usage)
   */
  convertDynamicSegment(segment: string): string {
    // Catch-all routes remain the same
    if (segment.startsWith('[...') && segment.endsWith(']')) {
      return segment
    }
    
    // Optional catch-all: [[...slug]] (App Router feature)
    // Pages Router doesn't have this, so no conversion needed
    
    // Regular dynamic segment remains the same
    return segment
  }
  
  /**
   * Gets the directory path for a new App Router file
   */
  getDirectoryPath(newPath: string): string {
    const parts = newPath.split('/')
    parts.pop() // Remove filename
    return parts.join('/')
  }
  
  /**
   * Checks if two paths will conflict in App Router
   */
  willConflict(newPath1: string, newPath2: string): boolean {
    const dir1 = this.getDirectoryPath(newPath1)
    const dir2 = this.getDirectoryPath(newPath2)
    return dir1 === dir2
  }
}
