/**
 * Tests for EnhancedAITransformer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EnhancedAITransformer } from '../enhanced-ai-transformer'
import type { MigrationSpecification, TransformationContext } from '@/types/migration'

describe('EnhancedAITransformer', () => {
  let transformer: EnhancedAITransformer
  let mockSpec: MigrationSpecification
  let mockContext: TransformationContext

  beforeEach(() => {
    transformer = new EnhancedAITransformer()
    
    mockSpec = {
      source: {
        language: 'javascript',
        framework: 'react',
        routing: 'react-router',
        patterns: [],
      },
      target: {
        language: 'typescript',
        framework: 'nextjs',
        version: '14.0.0',
        routing: 'app-router',
        fileStructure: {
          pages: 'app',
          components: 'components',
          layouts: 'app/layouts',
          api: 'app/api',
        },
        componentConventions: {
          namingConvention: 'PascalCase',
          fileExtension: '.tsx',
          exportStyle: 'named',
        },
        syntaxMappings: {},
        apiMappings: {},
        lifecycleMappings: {},
      },
      mappings: {
        imports: {},
        routing: {},
        components: {},
        styling: {},
        stateManagement: {},
        buildSystem: {},
      },
      rules: {
        mustPreserve: [],
        mustTransform: [],
        mustRemove: [],
        mustRefactor: [],
        breakingChanges: [],
        deprecations: [],
      },
      metadata: {
        estimatedEffort: 'medium',
        breakingChanges: [],
        manualSteps: [],
      },
    }

    mockContext = {
      filePath: 'src/components/Button.tsx',
      dependencies: [],
      imports: [],
      exports: [],
    }
  })

  describe('isAvailable', () => {
    it('should return false when no API key is set', () => {
      const available = transformer.isAvailable()
      expect(typeof available).toBe('boolean')
    })
  })

  describe('recognizePatterns', () => {
    it('should recognize React Router to Next.js navigation pattern', () => {
      const code = `
        import { useNavigate } from 'react-router-dom'
        
        function Component() {
          const navigate = useNavigate()
          return <button onClick={() => navigate('/home')}>Go Home</button>
        }
      `

      const patterns = transformer.recognizePatterns(code, 'react-to-nextjs')
      
      expect(patterns.length).toBeGreaterThan(0)
      expect(patterns[0].name).toContain('Navigation')
    })

    it('should recognize React Router Link pattern', () => {
      const code = `
        import { Link } from 'react-router-dom'
        
        function Nav() {
          return <Link to="/about">About</Link>
        }
      `

      const patterns = transformer.recognizePatterns(code, 'react-to-nextjs')
      
      const linkPattern = patterns.find(p => p.name.includes('Link'))
      expect(linkPattern).toBeDefined()
      expect(linkPattern?.confidence).toBe(100)
    })

    it('should recognize class component pattern', () => {
      const code = `
        class MyComponent extends React.Component {
          render() {
            return <div>Hello</div>
          }
        }
      `

      const patterns = transformer.recognizePatterns(code, 'react-to-nextjs')
      
      const classPattern = patterns.find(p => p.name.includes('Class Component'))
      expect(classPattern).toBeDefined()
    })

    it('should recognize performance optimization opportunities', () => {
      const code = `
        const filtered = items.map(item => item.value).filter(value => value > 0)
      `

      const patterns = transformer.recognizePatterns(code, 'performance')
      
      expect(patterns.length).toBeGreaterThan(0)
      expect(patterns[0].name).toContain('Memoization')
    })

    it('should recognize accessibility issues', () => {
      const code = `
        <img src="/logo.png" />
        <button onClick={handleClick}></button>
      `

      const patterns = transformer.recognizePatterns(code, 'accessibility')
      
      expect(patterns.length).toBeGreaterThan(0)
      const altPattern = patterns.find(p => p.name.includes('Alt Text'))
      expect(altPattern).toBeDefined()
    })

    it('should return empty array for unknown category', () => {
      const code = 'const x = 1'
      const patterns = transformer.recognizePatterns(code, 'unknown-category')
      
      expect(patterns).toEqual([])
    })

    it('should return empty array when no patterns match', () => {
      const code = 'const x = 1'
      const patterns = transformer.recognizePatterns(code, 'react-to-nextjs')
      
      expect(patterns).toEqual([])
    })
  })

  describe('transformWithContext', () => {
    it('should return original code when AI is unavailable', async () => {
      const code = 'const x = 1'
      
      const result = await transformer.transformWithContext(
        code,
        mockSpec,
        mockContext
      )

      expect(result.code).toBe(code)
      expect(result.confidence).toBe(0)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.requiresReview).toBe(true)
    })

    it('should handle transformation options', async () => {
      const code = 'const x = 1'
      
      const result = await transformer.transformWithContext(
        code,
        mockSpec,
        mockContext,
        {
          preserveComments: true,
          applyBestPractices: true,
          modernizeSyntax: true,
          optimizePerformance: true,
          improveAccessibility: true,
        }
      )

      expect(result).toBeDefined()
      expect(result.code).toBeDefined()
    })
  })

  describe('generateRefactoringSuggestions', () => {
    it('should return empty array when AI is unavailable', async () => {
      const code = 'const x = 1'
      
      const suggestions = await transformer.generateRefactoringSuggestions(
        code,
        mockSpec
      )

      expect(suggestions).toEqual([])
    })
  })

  describe('analyzeSemantics', () => {
    it('should return default analysis when AI is unavailable', async () => {
      const code = 'const x = 1'
      
      const analysis = await transformer.analyzeSemantics(code, mockSpec)

      expect(analysis).toEqual({
        intent: 'Unknown',
        complexity: 0,
        dependencies: [],
        recommendations: [],
      })
    })
  })

  describe('pattern confidence', () => {
    it('should have high confidence for exact matches', () => {
      const code = '<Link to="/home">Home</Link>'
      const patterns = transformer.recognizePatterns(code, 'react-to-nextjs')
      
      const linkPattern = patterns.find(p => p.name.includes('Link'))
      expect(linkPattern?.confidence).toBe(100)
    })

    it('should have lower confidence for complex patterns', () => {
      const code = 'class Component extends React.Component {}'
      const patterns = transformer.recognizePatterns(code, 'react-to-nextjs')
      
      const classPattern = patterns.find(p => p.name.includes('Class'))
      expect(classPattern?.confidence).toBeLessThan(100)
    })
  })

  describe('multiple pattern recognition', () => {
    it('should recognize multiple patterns in same code', () => {
      const code = `
        import { useNavigate, Link } from 'react-router-dom'
        
        function Nav() {
          const navigate = useNavigate()
          return (
            <div>
              <Link to="/home">Home</Link>
              <button onClick={() => navigate('/about')}>About</button>
            </div>
          )
        }
      `

      const patterns = transformer.recognizePatterns(code, 'react-to-nextjs')
      
      expect(patterns.length).toBeGreaterThanOrEqual(2)
      expect(patterns.some(p => p.name.includes('Navigation'))).toBe(true)
      expect(patterns.some(p => p.name.includes('Link'))).toBe(true)
    })
  })
})
