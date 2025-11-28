/**
 * Tests for CSSAnalyzer
 */

import { describe, it, expect } from 'vitest'
import { CSSAnalyzer } from '../css-analyzer'

describe('CSSAnalyzer', () => {
  const analyzer = new CSSAnalyzer()

  describe('parseCSS', () => {
    it('should parse simple CSS classes', async () => {
      const css = `
        .btn {
          padding: 10px 20px;
          background-color: blue;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.classes).toHaveLength(2)
      expect(result.classes[0].name).toBe('btn')
      expect(result.classes[0].properties).toHaveLength(2)
      expect(result.classes[1].name).toBe('container')
    })

    it('should extract CSS properties correctly', async () => {
      const css = `
        .text-center {
          text-align: center;
          font-size: 16px;
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.classes[0].properties).toEqual([
        { property: 'text-align', value: 'center', important: false },
        { property: 'font-size', value: '16px', important: false },
      ])
    })

    it('should handle important declarations', async () => {
      const css = `
        .override {
          color: red !important;
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.classes[0].properties[0].important).toBe(true)
    })

    it('should handle multiple classes in selector', async () => {
      const css = `
        .btn.primary {
          background: blue;
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.classes).toHaveLength(2)
      expect(result.classes.map(c => c.name)).toContain('btn')
      expect(result.classes.map(c => c.name)).toContain('primary')
    })

    it('should extract media queries', async () => {
      const css = `
        @media (min-width: 768px) {
          .container {
            max-width: 720px;
          }
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.mediaQueries).toContain('(min-width: 768px)')
      expect(result.classes[0].mediaQuery).toBe('(min-width: 768px)')
    })

    it('should extract pseudo-classes', async () => {
      const css = `
        .btn:hover {
          background-color: darkblue;
        }
        
        .link:focus {
          outline: 2px solid blue;
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.classes[0].pseudoClass).toBe('hover')
      expect(result.classes[1].pseudoClass).toBe('focus')
    })

    it('should extract CSS custom properties', async () => {
      const css = `
        :root {
          --primary-color: #3490dc;
          --secondary-color: #ffed4e;
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.customProperties.get('--primary-color')).toBe('#3490dc')
      expect(result.customProperties.get('--secondary-color')).toBe('#ffed4e')
    })

    it('should identify global styles', async () => {
      const css = `
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          font-family: Arial;
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.globalStyles.length).toBeGreaterThan(0)
    })

    it('should calculate specificity correctly', async () => {
      const css = `
        .btn { color: blue; }
        #header .btn { color: red; }
        .container .btn.primary { color: green; }
      `

      const result = await analyzer.parseCSS(css)

      // .btn = 10
      expect(result.classes.find(c => c.selector === '.btn')?.specificity).toBe(10)
      
      // #header .btn = 110
      expect(result.classes.find(c => c.selector === '#header .btn')?.specificity).toBe(110)
      
      // .container .btn.primary = 30
      expect(result.classes.find(c => c.selector === '.container .btn.primary')?.specificity).toBe(30)
    })
  })

  describe('findClassUsages', () => {
    it('should find classes in className attributes', () => {
      const code = `
        function Button() {
          return <button className="btn primary">Click</button>
        }
      `

      const classes = analyzer.findClassUsages(code)

      expect(classes.has('btn')).toBe(true)
      expect(classes.has('primary')).toBe(true)
    })

    it('should handle single quotes', () => {
      const code = `<div className='container flex'></div>`

      const classes = analyzer.findClassUsages(code)

      expect(classes.has('container')).toBe(true)
      expect(classes.has('flex')).toBe(true)
    })

    it('should handle template literals', () => {
      const code = `<div className={\`btn \${variant}\`}></div>`

      const classes = analyzer.findClassUsages(code)

      expect(classes.has('btn')).toBe(true)
    })

    it('should handle className in JSX expressions', () => {
      const code = `<div className={"container"}></div>`

      const classes = analyzer.findClassUsages(code)

      expect(classes.has('container')).toBe(true)
    })

    it('should handle multiple className attributes', () => {
      const code = `
        <div>
          <header className="header">
            <nav className="nav">
              <button className="btn">Menu</button>
            </nav>
          </header>
        </div>
      `

      const classes = analyzer.findClassUsages(code)

      expect(classes.has('header')).toBe(true)
      expect(classes.has('nav')).toBe(true)
      expect(classes.has('btn')).toBe(true)
    })
  })

  describe('analyzeComponentStyles', () => {
    it('should return only classes used in component', async () => {
      const css = `
        .btn { padding: 10px; }
        .container { max-width: 1200px; }
        .unused { display: none; }
      `

      const component = `
        function App() {
          return (
            <div className="container">
              <button className="btn">Click</button>
            </div>
          )
        }
      `

      const result = await analyzer.analyzeComponentStyles(css, component)

      expect(result.classes).toHaveLength(2)
      expect(result.classes.map(c => c.name)).toContain('btn')
      expect(result.classes.map(c => c.name)).toContain('container')
      expect(result.classes.map(c => c.name)).not.toContain('unused')
    })
  })

  describe('groupByMediaQuery', () => {
    it('should group classes by media query', async () => {
      const css = `
        .container { max-width: 100%; }
        
        @media (min-width: 768px) {
          .container { max-width: 720px; }
        }
        
        @media (min-width: 1024px) {
          .container { max-width: 960px; }
        }
      `

      const result = await analyzer.parseCSS(css)
      const grouped = analyzer.groupByMediaQuery(result.classes)

      expect(grouped.has('base')).toBe(true)
      expect(grouped.has('(min-width: 768px)')).toBe(true)
      expect(grouped.has('(min-width: 1024px)')).toBe(true)
    })
  })

  describe('extractColorPalette', () => {
    it('should extract hex colors', async () => {
      const css = `
        .primary { color: #3490dc; }
        .secondary { background-color: #ffed4e; }
        .border { border-color: #e3e8ee; }
      `

      const result = await analyzer.parseCSS(css)
      const colors = analyzer.extractColorPalette(result.classes)

      expect(colors.get('text-primary')).toBe('#3490dc')
      expect(colors.get('bg-secondary')).toBe('#ffed4e')
      expect(colors.get('border-border')).toBe('#e3e8ee')
    })

    it('should extract rgb colors', async () => {
      const css = `
        .text { color: rgb(52, 144, 220); }
        .bg { background-color: rgba(255, 237, 78, 0.5); }
      `

      const result = await analyzer.parseCSS(css)
      const colors = analyzer.extractColorPalette(result.classes)

      expect(colors.get('text-text')).toBe('rgb(52, 144, 220)')
      expect(colors.get('bg-bg')).toBe('rgba(255, 237, 78, 0.5)')
    })
  })

  describe('edge cases', () => {
    it('should handle empty CSS', async () => {
      const result = await analyzer.parseCSS('')

      expect(result.classes).toHaveLength(0)
      expect(result.globalStyles).toHaveLength(0)
    })

    it('should handle CSS with comments', async () => {
      const css = `
        /* Button styles */
        .btn {
          padding: 10px;
          /* background: blue; */
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.classes).toHaveLength(1)
      expect(result.classes[0].properties).toHaveLength(1)
    })

    it('should handle malformed CSS gracefully', async () => {
      const css = `
        .btn {
          padding: 10px
          background: blue;
        }
      `

      // Should not throw
      const result = await analyzer.parseCSS(css)
      expect(result).toBeDefined()
    })

    it('should handle nested selectors', async () => {
      const css = `
        .container .btn {
          padding: 10px;
        }
      `

      const result = await analyzer.parseCSS(css)

      expect(result.classes.map(c => c.name)).toContain('container')
      expect(result.classes.map(c => c.name)).toContain('btn')
    })
  })
})
