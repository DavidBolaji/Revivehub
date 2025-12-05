/**
 * CSSAnalyzer
 * 
 * Parses CSS files and extracts class definitions for Tailwind conversion.
 * Uses PostCSS for accurate CSS parsing while preserving formatting.
 * 
 * Requirements: CSS to Tailwind conversion for Next.js migration
 */

import postcss, { Rule, Declaration, AtRule } from 'postcss'

export interface CSSClass {
  name: string
  properties: CSSProperty[]
  selector: string
  specificity: number
  mediaQuery?: string
  pseudoClass?: string
}

export interface CSSProperty {
  property: string
  value: string
  important: boolean
}

export interface CSSAnalysisResult {
  classes: CSSClass[]
  globalStyles: CSSProperty[]
  mediaQueries: string[]
  customProperties: Map<string, string>
}

export class CSSAnalyzer {
  /**
   * Parse CSS file and extract class definitions
   * 
   * @param cssContent - CSS file content
   * @returns Analysis result with classes and global styles
   */
  async parseCSS(cssContent: string): Promise<CSSAnalysisResult> {
    const classes: CSSClass[] = []
    const globalStyles: CSSProperty[] = []
    const mediaQueries = new Set<string>()
    const customProperties = new Map<string, string>()
    
    try {
      const root = postcss.parse(cssContent)
      
      // Walk through all rules
      root.walkRules((rule) => {
        // Check if rule is inside media query
        const mediaQuery = this.getMediaQuery(rule)
        if (mediaQuery) {
          mediaQueries.add(mediaQuery)
        }
        
        // Extract pseudo-class if present
        const pseudoClass = this.extractPseudoClass(rule.selector)
        
        // Process class selectors
        if (rule.selector.includes('.')) {
          const classNames = this.extractClassNames(rule.selector)
          
          for (const className of classNames) {
            const properties = this.extractProperties(rule)
            
            classes.push({
              name: className,
              properties,
              selector: rule.selector,
              specificity: this.calculateSpecificity(rule.selector),
              mediaQuery,
              pseudoClass,
            })
          }
        }
        
        // Process global styles (element selectors)
        if (this.isGlobalSelector(rule.selector)) {
          const properties = this.extractProperties(rule)
          globalStyles.push(...properties)
        }
      })
      
      // Extract CSS custom properties (variables)
      root.walkDecls((decl) => {
        if (decl.prop.startsWith('--')) {
          customProperties.set(decl.prop, decl.value)
        }
      })
    } catch (error) {
      console.error('[CSSAnalyzer] CSS parsing error:', error)
    }
    
    return {
      classes,
      globalStyles,
      mediaQueries: Array.from(mediaQueries),
      customProperties,
    }
  }

  /**
   * Extract class names from selector
   * 
   * Examples:
   * - .btn → ['btn']
   * - .btn.primary → ['btn', 'primary']
   * - .container .btn → ['container', 'btn']
   * 
   * @param selector - CSS selector
   * @returns Array of class names
   */
  private extractClassNames(selector: string): string[] {
    const classRegex = /\.([a-zA-Z0-9_-]+)/g
    const matches = selector.matchAll(classRegex)
    return Array.from(matches, m => m[1])
  }

  /**
   * Extract CSS properties from rule
   * 
   * @param rule - PostCSS rule
   * @returns Array of CSS properties
   */
  private extractProperties(rule: Rule): CSSProperty[] {
    const properties: CSSProperty[] = []
    
    rule.walkDecls((decl: Declaration) => {
      properties.push({
        property: decl.prop,
        value: decl.value,
        important: decl.important || false,
      })
    })
    
    return properties
  }

  /**
   * Calculate selector specificity
   * 
   * Specificity calculation:
   * - IDs: 100 points each
   * - Classes, attributes, pseudo-classes: 10 points each
   * - Elements, pseudo-elements: 1 point each
   * 
   * @param selector - CSS selector
   * @returns Specificity score
   */
  private calculateSpecificity(selector: string): number {
    // Remove pseudo-elements and pseudo-classes for counting
    const cleanSelector = selector.replace(/::[a-z-]+/g, '').replace(/:[a-z-]+/g, '')
    
    const ids = (cleanSelector.match(/#/g) || []).length
    const classes = (cleanSelector.match(/\./g) || []).length
    const attributes = (cleanSelector.match(/\[/g) || []).length
    
    // Count only element selectors (not class names or IDs)
    // Remove classes and IDs first, then count remaining elements
    const elementsOnly = cleanSelector.replace(/[#.][a-zA-Z0-9_-]+/g, '')
    const elements = (elementsOnly.match(/\b[a-z]+\b/g) || []).length
    
    return ids * 100 + (classes + attributes) * 10 + elements
  }

  /**
   * Check if selector is a global selector (element, *, :root, etc.)
   * 
   * @param selector - CSS selector
   * @returns True if selector is global
   */
  private isGlobalSelector(selector: string): boolean {
    // Global selectors: *, html, body, :root, element names
    const globalPatterns = [
      /^\*$/,                    // Universal selector
      /^:root$/,                 // Root pseudo-class
      /^html$/,                  // HTML element
      /^body$/,                  // Body element
      /^[a-z]+$/,                // Single element selector
      /^[a-z]+\s+[a-z]+$/,       // Descendant element selectors
    ]
    
    return globalPatterns.some(pattern => pattern.test(selector.trim()))
  }

  /**
   * Get media query for a rule
   * 
   * @param rule - PostCSS rule
   * @returns Media query string or undefined
   */
  private getMediaQuery(rule: Rule): string | undefined {
    let parent = rule.parent
    
    while (parent) {
      if (parent.type === 'atrule' && (parent as AtRule).name === 'media') {
        return (parent as AtRule).params
      }
      parent = parent.parent as unknown as any
    }
    
    return undefined
  }

  /**
   * Extract pseudo-class from selector
   * 
   * Examples:
   * - .btn:hover → 'hover'
   * - .link:focus → 'focus'
   * - .input:disabled → 'disabled'
   * 
   * @param selector - CSS selector
   * @returns Pseudo-class name or undefined
   */
  private extractPseudoClass(selector: string): string | undefined {
    const pseudoMatch = selector.match(/:([a-z-]+)/)
    return pseudoMatch ? pseudoMatch[1] : undefined
  }

  /**
   * Find all CSS classes used in component code
   * 
   * Searches for className attributes in JSX/TSX code.
   * 
   * @param code - Component source code
   * @returns Set of class names used in the component
   */
  findClassUsages(code: string): Set<string> {
    const classes = new Set<string>()
    
    // Match className="..." and className={'...'}
    const patterns = [
      /className\s*=\s*"([^"]+)"/g,           // className="..."
      /className\s*=\s*'([^']+)'/g,           // className='...'
      /className\s*=\s*{`([^`]+)`}/g,         // className={`...`}
      /className\s*=\s*{\s*"([^"]+)"\s*}/g,   // className={"..."}
      /className\s*=\s*{\s*'([^']+)'\s*}/g,   // className={'...'}
    ]
    
    for (const pattern of patterns) {
      const matches = code.matchAll(pattern)
      
      for (const match of matches) {
        const classString = match[1]
        // Split by spaces to get individual classes
        const individualClasses = classString
          .split(/\s+/)
          .filter(c => c.length > 0 && !c.includes('${')) // Filter out template variables
        
        individualClasses.forEach(c => classes.add(c))
      }
    }
    
    return classes
  }

  /**
   * Analyze CSS file and component to find relevant classes
   * 
   * This method combines CSS parsing with component analysis to identify
   * which CSS classes are actually used in the component.
   * 
   * @param cssContent - CSS file content
   * @param componentCode - Component source code
   * @returns Analysis result with only used classes
   */
  async analyzeComponentStyles(
    cssContent: string,
    componentCode: string
  ): Promise<CSSAnalysisResult> {
    // Parse all CSS classes
    const fullAnalysis = await this.parseCSS(cssContent)
    
    // Find classes used in component
    const usedClasses = this.findClassUsages(componentCode)
    
    // Filter to only used classes
    const relevantClasses = fullAnalysis.classes.filter(cssClass =>
      usedClasses.has(cssClass.name)
    )
    
    return {
      ...fullAnalysis,
      classes: relevantClasses,
    }
  }

  /**
   * Group classes by media query
   * 
   * Useful for generating responsive Tailwind classes.
   * 
   * @param classes - Array of CSS classes
   * @returns Map of media query to classes
   */
  groupByMediaQuery(classes: CSSClass[]): Map<string, CSSClass[]> {
    const grouped = new Map<string, CSSClass[]>()
    
    for (const cssClass of classes) {
      const key = cssClass.mediaQuery || 'base'
      
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      
      grouped.get(key)!.push(cssClass)
    }
    
    return grouped
  }

  /**
   * Extract color palette from CSS
   * 
   * Finds all color values used in the CSS for Tailwind config generation.
   * 
   * @param classes - Array of CSS classes
   * @returns Map of color names to values
   */
  extractColorPalette(classes: CSSClass[]): Map<string, string> {
    const colors = new Map<string, string>()
    
    for (const cssClass of classes) {
      for (const prop of cssClass.properties) {
        if (
          prop.property === 'color' ||
          prop.property === 'background-color' ||
          prop.property === 'border-color'
        ) {
          // Extract hex colors
          if (prop.value.startsWith('#')) {
            const colorName = this.generateColorName(cssClass.name, prop.property)
            colors.set(colorName, prop.value)
          }
          
          // Extract rgb/rgba colors
          if (prop.value.startsWith('rgb')) {
            const colorName = this.generateColorName(cssClass.name, prop.property)
            colors.set(colorName, prop.value)
          }
        }
      }
    }
    
    return colors
  }

  /**
   * Generate color name from class name and property
   * 
   * @param className - CSS class name
   * @param property - CSS property name
   * @returns Generated color name
   */
  private generateColorName(className: string, property: string): string {
    const prefix = property.includes('background') ? 'bg' : 
                   property.includes('border') ? 'border' : 'text'
    return `${prefix}-${className}`
  }
}
