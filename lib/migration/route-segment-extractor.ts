/**
 * RouteSegmentExtractor
 * 
 * Extracts and normalizes route segments from file paths for Next.js App Router migration.
 * Handles dynamic routes, catch-all routes, and optional catch-all routes.
 * 
 * Requirements: File structure transformation for React → Next.js and Pages → App Router
 */

export interface RouteSegment {
  segment: string
  isDynamic: boolean
  isCatchAll: boolean
  isOptionalCatchAll: boolean
  paramName?: string
}

export class RouteSegmentExtractor {
  /**
   * Extract all route segments from a file path
   * 
   * Examples:
   * - pages/blog/[id]/comments.tsx → ['blog', '[id]', 'comments']
   * - pages/api/users/[userId]/posts.ts → ['api', 'users', '[userId]', 'posts']
   * - pages/shop/[...slug].tsx → ['shop', '[...slug]']
   * - pages/docs/[[...slug]].tsx → ['docs', '[[...slug]]']
   * 
   * @param filePath - File path to extract segments from
   * @returns Array of route segment strings
   */
  extractSegments(filePath: string): string[] {
    const normalized = filePath.replace(/\\/g, '/')
    
    // Remove common prefixes
    let path = normalized
      .replace(/^src\//, '')
      .replace(/^pages\//, '')
      .replace(/^app\//, '')
    
    // Remove file extension
    path = path.replace(/\.(tsx?|jsx?|js|ts)$/, '')
    
    // Split into segments
    const segments = path.split('/').filter(s => s.length > 0)
    
    // Remove 'index' segments
    return segments.filter(s => s !== 'index')
  }

  /**
   * Extract detailed route segment information
   * 
   * @param filePath - File path to analyze
   * @returns Array of RouteSegment objects with metadata
   */
  extractDetailedSegments(filePath: string): RouteSegment[] {
    const segments = this.extractSegments(filePath)
    
    return segments.map(segment => ({
      segment,
      isDynamic: this.isDynamicSegment(segment),
      isCatchAll: this.isCatchAllSegment(segment),
      isOptionalCatchAll: this.isOptionalCatchAllSegment(segment),
      paramName: this.extractParamName(segment),
    }))
  }

  /**
   * Check if segment is dynamic ([id], [slug], etc.)
   * 
   * @param segment - Route segment to check
   * @returns True if segment is dynamic
   */
  isDynamicSegment(segment: string): boolean {
    return /^\[.+\]$/.test(segment)
  }

  /**
   * Check if segment is catch-all ([...slug])
   * 
   * @param segment - Route segment to check
   * @returns True if segment is catch-all
   */
  isCatchAllSegment(segment: string): boolean {
    return /^\[\.{3}.+\]$/.test(segment)
  }

  /**
   * Check if segment is optional catch-all ([[...slug]])
   * 
   * @param segment - Route segment to check
   * @returns True if segment is optional catch-all
   */
  isOptionalCatchAllSegment(segment: string): boolean {
    return /^\[\[\.{3}.+\]\]$/.test(segment)
  }

  /**
   * Extract parameter name from dynamic segment
   * 
   * Examples:
   * - [id] → id
   * - [slug] → slug
   * - [...slug] → slug
   * - [[...slug]] → slug
   * 
   * @param segment - Dynamic route segment
   * @returns Parameter name or undefined if not dynamic
   */
  extractParamName(segment: string): string | undefined {
    if (!this.isDynamicSegment(segment)) {
      return undefined
    }

    // Remove brackets and ellipsis
    return segment
      .replace(/^\[+/, '')
      .replace(/\]+$/, '')
      .replace(/^\.{3}/, '')
  }

  /**
   * Build App Router path from segments
   * 
   * Examples:
   * - ['blog', '[id]'] → 'blog/[id]'
   * - [] → '(root)'
   * 
   * @param segments - Array of route segments
   * @returns App Router path
   */
  buildAppRouterPath(segments: string[]): string {
    if (segments.length === 0) {
      return '(root)'
    }
    
    return segments.join('/')
  }

  /**
   * Convert Pages Router path to App Router path
   * 
   * Examples:
   * - pages/index.tsx → app/page.tsx
   * - pages/about.tsx → app/about/page.tsx
   * - pages/blog/[id].tsx → app/blog/[id]/page.tsx
   * - pages/api/users.ts → app/api/users/route.ts
   * 
   * @param pagesPath - Pages Router file path
   * @param fileType - Type of file (page, api, etc.)
   * @returns App Router file path
   */
  convertToAppRouterPath(
    pagesPath: string,
    fileType: 'page' | 'route' = 'page'
  ): string {
    const segments = this.extractSegments(pagesPath)
    
    // Handle root index
    if (segments.length === 0) {
      return `app/${fileType}.tsx`
    }

    // Handle API routes
    if (segments[0] === 'api') {
      const apiSegments = segments.slice(1)
      if (apiSegments.length === 0) {
        return 'app/api/route.ts'
      }
      return `app/api/${apiSegments.join('/')}/route.ts`
    }

    // Handle regular pages
    return `app/${segments.join('/')}/${fileType}.tsx`
  }

  /**
   * Check if path is an API route
   * 
   * @param filePath - File path to check
   * @returns True if path is an API route
   */
  isApiRoute(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/')
    return normalized.includes('/api/') || normalized.startsWith('api/')
  }

  /**
   * Check if path is a page route
   * 
   * @param filePath - File path to check
   * @returns True if path is a page route
   */
  isPageRoute(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/')
    return (
      (normalized.includes('/pages/') || normalized.startsWith('pages/')) &&
      !this.isApiRoute(filePath)
    )
  }
}
