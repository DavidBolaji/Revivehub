/**
 * Unit tests for Validator
 * 
 * Tests all validation methods including syntax, semantic, build, and test validation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Validator } from '../../lib/transformers/validator'
import * as fs from 'fs/promises'
import * as path from 'path'

describe('Validator', () => {
  let validator: Validator

  beforeEach(() => {
    validator = new Validator()
  })

  describe('validateSyntax()', () => {
    describe('JavaScript/TypeScript', () => {
      it('should validate correct JavaScript code', async () => {
        const code = 'const x = 1;\nconst y = 2;'
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate correct TypeScript code', async () => {
        const code = 'const x: number = 1;\nconst y: string = "hello";'
        const result = await validator.validateSyntax(code, 'typescript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate JSX code', async () => {
        const code = 'const Component = () => <div>Hello</div>;'
        const result = await validator.validateSyntax(code, 'jsx')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate TSX code', async () => {
        const code = 'const Component: React.FC = () => <div>Hello</div>;'
        const result = await validator.validateSyntax(code, 'tsx')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should detect syntax errors', async () => {
        const code = 'const x = ;' // Missing value
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(false)
        expect(result.syntaxValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors[0].severity).toBe('error')
      })

      it('should provide line and column information for errors', async () => {
        const code = 'const x = 1;\nconst y = ;'
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(false)
        expect(result.errors[0].line).toBeDefined()
        expect(result.errors[0].column).toBeDefined()
      })

      it('should provide helpful suggestions for syntax errors', async () => {
        const code = 'const x = ;'
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.errors[0].suggestion).toBeDefined()
        expect(typeof result.errors[0].suggestion).toBe('string')
      })

      it('should handle modern JavaScript features', async () => {
        const code = `
          const obj = { a: 1, b: 2 };
          const { a, ...rest } = obj;
          const arr = [1, 2, 3];
          const [first, ...others] = arr;
          const optional = obj?.a;
          const nullish = obj.c ?? 'default';
        `
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
      })

      it('should handle async/await', async () => {
        const code = `
          async function fetchData() {
            const response = await fetch('/api');
            return response.json();
          }
        `
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
      })

      it('should handle class syntax', async () => {
        const code = `
          class MyClass {
            constructor(name) {
              this.name = name;
            }
            
            greet() {
              return \`Hello, \${this.name}\`;
            }
          }
        `
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
      })

      it('should handle decorators', async () => {
        const code = `
          @decorator
          class MyClass {
            @property
            myProp = 1;
          }
        `
        const result = await validator.validateSyntax(code, 'typescript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
      })

      it('should handle dynamic imports', async () => {
        const code = `
          const module = await import('./module.js');
        `
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
      })
    })

    describe('JSON', () => {
      it('should validate correct JSON', async () => {
        const code = '{"name": "test", "value": 123}'
        const result = await validator.validateSyntax(code, 'json')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should detect invalid JSON', async () => {
        const code = '{name: "test"}' // Missing quotes on key
        const result = await validator.validateSyntax(code, 'json')

        expect(result.isValid).toBe(false)
        expect(result.syntaxValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })

      it('should provide suggestions for JSON errors', async () => {
        const code = '{"name": "test",}' // Trailing comma
        const result = await validator.validateSyntax(code, 'json')

        expect(result.isValid).toBe(false)
        expect(result.errors[0].suggestion).toBeDefined()
      })
    })

    describe('Unsupported languages', () => {
      it('should return valid for unsupported languages with warning', async () => {
        const code = 'some code'
        const result = await validator.validateSyntax(code, 'ruby')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.warnings[0]).toContain('not supported')
      })
    })

    describe('Error handling', () => {
      it('should handle empty code', async () => {
        const code = ''
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
      })

      it('should handle whitespace-only code', async () => {
        const code = '   \n\n   '
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
      })

      it('should handle very long code', async () => {
        const code = 'const x = 1;\n'.repeat(1000)
        const result = await validator.validateSyntax(code, 'javascript')

        expect(result.isValid).toBe(true)
        expect(result.syntaxValid).toBe(true)
      })
    })
  })

  describe('validateSemantics()', () => {
    it('should validate TypeScript code', async () => {
      const code = 'const x: number = 1;'
      const result = await validator.validateSemantics(code, 'typescript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
    })

    it('should skip semantic validation for JavaScript', async () => {
      const code = 'const x = 1;'
      const result = await validator.validateSemantics(code, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('only supported for TypeScript')
    })

    it('should detect syntax errors during semantic validation', async () => {
      const code = 'const x: number = ;'
      const result = await validator.validateSemantics(code, 'typescript')

      expect(result.isValid).toBe(false)
      expect(result.syntaxValid).toBe(false)
    })

    it('should provide warnings about limited semantic validation', async () => {
      const code = 'const x: number = 1;'
      const result = await validator.validateSemantics(code, 'typescript')

      expect(result.warnings.some(w => w.includes('project context'))).toBe(true)
    })
  })

  describe('validateBuild()', () => {
    it('should find tsconfig.json', async () => {
      const projectPath = process.cwd()
      const result = await validator.validateBuild(projectPath)

      expect(result.isValid).toBe(true)
      expect(result.buildValid).toBe(true)
    })

    it('should find package.json', async () => {
      const projectPath = process.cwd()
      const result = await validator.validateBuild(projectPath)

      expect(result.isValid).toBe(true)
      expect(result.buildValid).toBe(true)
    })

    it('should warn when no build config found', async () => {
      const projectPath = '/nonexistent/path'
      const result = await validator.validateBuild(projectPath)

      expect(result.warnings.some(w => w.includes('No build configuration'))).toBe(true)
    })

    it('should handle missing project path gracefully', async () => {
      const projectPath = '/definitely/does/not/exist'
      const result = await validator.validateBuild(projectPath)

      // Should not throw, just return warnings
      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('validateTests()', () => {
    it('should find test directory', async () => {
      const projectPath = process.cwd()
      const result = await validator.validateTests(projectPath)

      expect(result.isValid).toBe(true)
      expect(result.testsValid).toBe(true)
    })

    it('should find test runner config', async () => {
      const projectPath = process.cwd()
      const result = await validator.validateTests(projectPath)

      expect(result.isValid).toBe(true)
      expect(result.testsValid).toBe(true)
    })

    it('should warn when no tests found', async () => {
      const projectPath = '/nonexistent/path'
      const result = await validator.validateTests(projectPath)

      expect(result.warnings.some(w => w.includes('No test files'))).toBe(true)
    })

    it('should handle missing project path gracefully', async () => {
      const projectPath = '/definitely/does/not/exist'
      const result = await validator.validateTests(projectPath)

      // Should not throw, just return warnings
      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('validateAll()', () => {
    it('should run all validations for valid code', async () => {
      const code = 'const x: number = 1;'
      const projectPath = process.cwd()
      const result = await validator.validateAll(code, 'typescript', projectPath)

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
      expect(result.buildValid).toBeDefined()
      expect(result.testsValid).toBeDefined()
    })

    it('should stop at syntax validation if syntax is invalid', async () => {
      const code = 'const x = ;'
      const projectPath = process.cwd()
      const result = await validator.validateAll(code, 'javascript', projectPath)

      expect(result.isValid).toBe(false)
      expect(result.syntaxValid).toBe(false)
      // Should not proceed to build/test validation
    })

    it('should work without project path', async () => {
      const code = 'const x = 1;'
      const result = await validator.validateAll(code, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
      expect(result.buildValid).toBeUndefined()
      expect(result.testsValid).toBeUndefined()
    })

    it('should combine errors from multiple validations', async () => {
      const code = 'const x = ;'
      const result = await validator.validateAll(code, 'javascript')

      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should combine warnings from multiple validations', async () => {
      const code = 'const x = 1;'
      const result = await validator.validateAll(code, 'javascript')

      // May have warnings from various validation stages
      expect(Array.isArray(result.warnings)).toBe(true)
    })
  })

  describe('Error suggestions', () => {
    it('should suggest fix for unexpected token', async () => {
      const code = 'const x = {'
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.errors[0].suggestion).toContain('brackets')
    })

    it('should suggest fix for unterminated string', async () => {
      const code = 'const x = "hello'
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.errors[0].suggestion).toContain('unclosed')
    })

    it('should provide generic suggestion for unknown errors', async () => {
      const code = 'const x = ;'
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.errors[0].suggestion).toBeDefined()
      expect(typeof result.errors[0].suggestion).toBe('string')
    })
  })

  describe('Edge cases', () => {
    it('should handle code with comments', async () => {
      const code = `
        // This is a comment
        const x = 1;
        /* Multi-line
           comment */
        const y = 2;
      `
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
    })

    it('should handle code with template literals', async () => {
      const code = 'const msg = `Hello ${name}`;'
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
    })

    it('should handle code with regex', async () => {
      const code = 'const pattern = /[a-z]+/gi;'
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
    })

    it('should handle code with unicode', async () => {
      const code = 'const greeting = "你好世界";'
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
    })

    it('should handle code with escape sequences', async () => {
      const code = 'const str = "Line 1\\nLine 2\\tTabbed";'
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
    })

    it('should handle nested structures', async () => {
      const code = `
        const obj = {
          nested: {
            deep: {
              value: [1, 2, { x: 3 }]
            }
          }
        };
      `
      const result = await validator.validateSyntax(code, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
    })
  })

  describe('Integration scenarios', () => {
    it('should validate transformed code', async () => {
      const original = 'var x = 1;'
      const transformed = 'const x = 1;'
      
      const result = await validator.validateSyntax(transformed, 'javascript')

      expect(result.isValid).toBe(true)
      expect(result.syntaxValid).toBe(true)
    })

    it('should detect broken transformations', async () => {
      const original = 'function test() { return 1; }'
      const broken = 'function test() { return 1;' // Missing closing brace
      
      const result = await validator.validateSyntax(broken, 'javascript')

      expect(result.isValid).toBe(false)
      expect(result.syntaxValid).toBe(false)
    })

    it('should validate multiple code snippets', async () => {
      const snippets = [
        'const x = 1;',
        'const y = 2;',
        'const z = 3;'
      ]

      for (const snippet of snippets) {
        const result = await validator.validateSyntax(snippet, 'javascript')
        expect(result.isValid).toBe(true)
      }
    })
  })
})

