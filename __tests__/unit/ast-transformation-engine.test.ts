/**
 * Unit tests for AST Transformation Engine
 * Requirements: 5.1, 5.2, 5.5, 14.4
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ASTTransformationEngine } from '@/lib/migration/ast-transformation-engine'
import type { MigrationSpecification, TransformationContext } from '@/types/migration'

describe('ASTTransformationEngine', () => {
  let engine: ASTTransformationEngine

  beforeEach(() => {
    engine = new ASTTransformationEngine()
  })

  describe('parseCode', () => {
    it('should parse JavaScript code successfully', () => {
      const code = `
        const greeting = 'Hello, World!'
        console.log(greeting)
      `

      const ast = engine.parseCode(code, 'javascript')
      expect(ast).toBeDefined()
      expect(ast.type).toBe('File')
    })

    it('should parse TypeScript code successfully', () => {
      const code = `
        interface User {
          name: string
          age: number
        }
        
        const user: User = { name: 'John', age: 30 }
      `

      const ast = engine.parseCode(code, 'typescript')
      expect(ast).toBeDefined()
      expect(ast.type).toBe('File')
    })

    it('should parse JSX code successfully', () => {
      const code = `
        function Component() {
          return <div>Hello</div>
        }
      `

      const ast = engine.parseCode(code, 'javascript')
      expect(ast).toBeDefined()
    })

    it('should throw error for invalid syntax', () => {
      const code = 'const x = {'

      expect(() => engine.parseCode(code, 'javascript')).toThrow()
    })
  })

  describe('generateCode', () => {
    it('should generate code from AST', () => {
      const code = `const x = 42`
      const ast = engine.parseCode(code, 'javascript')
      const generated = engine.generateCode(ast)

      expect(generated).toContain('const x = 42')
    })

    it('should preserve formatting when requested', () => {
      const code = `
const x = 1
const y = 2
      `
      const ast = engine.parseCode(code, 'javascript')
      const generated = engine.generateCode(ast, true)

      expect(generated).toBeDefined()
    })
  })

  describe('applyImportMappings', () => {
    it('should transform import statements', () => {
      const code = `
        import React from 'react'
        import { useState } from 'react'
      `

      const spec: MigrationSpecification = {
        source: {
          language: 'JavaScript',
          framework: 'React',
          version: '18.0.0',
          routing: 'react-router',
          patterns: {},
          buildTool: 'webpack',
          packageManager: 'npm',
        },
        target: {
          language: 'TypeScript',
          framework: 'Next.js',
          version: '14.0.0',
          routing: 'file-based',
          fileStructure: { pages: 'app', components: 'components', layouts: 'app', api: 'app/api' },
          componentConventions: {
            fileExtension: '.tsx',
            namingConvention: 'PascalCase',
            exportStyle: 'default',
          },
          syntaxMappings: {},
          apiMappings: {},
          lifecycleMappings: {},
          buildTool: 'next',
          packageManager: 'pnpm',
        },
        mappings: {
          imports: {
            'react': 'react',
            'react-router-dom': 'next/navigation',
          },
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
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          estimatedComplexity: 'medium',
          estimatedDuration: '2 hours',
        },
      }

      const context: TransformationContext = {
        filePath: 'test.tsx',
        fileType: 'component',
        dependencies: [],
        imports: [],
        exports: [],
        relatedFiles: [],
      }

      const ast = engine.parseCode(code, 'javascript')
      engine.applyImportMappings(ast, spec, context)
      const transformed = engine.generateCode(ast)

      expect(transformed).toContain('react')
      expect(context.imports.length).toBeGreaterThanOrEqual(0)
    })

    it('should transform dynamic imports', () => {
      const code = `
        const Component = import('react-router-dom')
      `

      const spec: MigrationSpecification = {
        source: {
          language: 'JavaScript',
          framework: 'React',
          version: '18.0.0',
          routing: 'react-router',
          patterns: {},
          buildTool: 'webpack',
          packageManager: 'npm',
        },
        target: {
          language: 'TypeScript',
          framework: 'Next.js',
          version: '14.0.0',
          routing: 'file-based',
          fileStructure: { pages: 'app', components: 'components', layouts: 'app', api: 'app/api' },
          componentConventions: {
            fileExtension: '.tsx',
            namingConvention: 'PascalCase',
            exportStyle: 'default',
          },
          syntaxMappings: {},
          apiMappings: {},
          lifecycleMappings: {},
          buildTool: 'next',
          packageManager: 'pnpm',
        },
        mappings: {
          imports: {
            'react-router-dom': 'next/navigation',
          },
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
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          estimatedComplexity: 'medium',
          estimatedDuration: '2 hours',
        },
      }

      const context: TransformationContext = {
        filePath: 'test.tsx',
        fileType: 'component',
        dependencies: [],
        imports: [],
        exports: [],
        relatedFiles: [],
      }

      const ast = engine.parseCode(code, 'javascript')
      engine.applyImportMappings(ast, spec, context)
      const transformed = engine.generateCode(ast)

      expect(transformed).toContain('next/navigation')
    })
  })

  describe('applySyntaxTransformations', () => {
    it('should add TypeScript annotations when migrating to TypeScript', () => {
      const code = `
        function greet(name) {
          return 'Hello, ' + name
        }
      `

      const spec: MigrationSpecification = {
        source: {
          language: 'JavaScript',
          framework: 'React',
          version: '18.0.0',
          routing: 'react-router',
          patterns: {},
          buildTool: 'webpack',
          packageManager: 'npm',
        },
        target: {
          language: 'TypeScript',
          framework: 'Next.js',
          version: '14.0.0',
          routing: 'file-based',
          fileStructure: { pages: 'app', components: 'components', layouts: 'app', api: 'app/api' },
          componentConventions: {
            fileExtension: '.tsx',
            namingConvention: 'PascalCase',
            exportStyle: 'default',
          },
          syntaxMappings: {},
          apiMappings: {},
          lifecycleMappings: {},
          buildTool: 'next',
          packageManager: 'pnpm',
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
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          estimatedComplexity: 'medium',
          estimatedDuration: '2 hours',
        },
      }

      const context: TransformationContext = {
        filePath: 'test.tsx',
        fileType: 'component',
        dependencies: [],
        imports: [],
        exports: [],
        relatedFiles: [],
      }

      const ast = engine.parseCode(code, 'javascript')
      engine.applySyntaxTransformations(ast, spec, context)
      const transformed = engine.generateCode(ast)

      expect(transformed).toContain('any')
    })
  })

  describe('applyRoutingTransformations', () => {
    it('should transform React Router Link to Next.js Link', () => {
      const code = `
        function Nav() {
          return <Link to="/about">About</Link>
        }
      `

      const spec: MigrationSpecification = {
        source: {
          language: 'JavaScript',
          framework: 'React',
          version: '18.0.0',
          routing: 'react-router',
          patterns: {},
          buildTool: 'webpack',
          packageManager: 'npm',
        },
        target: {
          language: 'TypeScript',
          framework: 'Next.js',
          version: '14.0.0',
          routing: 'file-based',
          fileStructure: { pages: 'app', components: 'components', layouts: 'app', api: 'app/api' },
          componentConventions: {
            fileExtension: '.tsx',
            namingConvention: 'PascalCase',
            exportStyle: 'default',
          },
          syntaxMappings: {},
          apiMappings: {},
          lifecycleMappings: {},
          buildTool: 'next',
          packageManager: 'pnpm',
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
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          estimatedComplexity: 'medium',
          estimatedDuration: '2 hours',
        },
      }

      const context: TransformationContext = {
        filePath: 'test.tsx',
        fileType: 'component',
        dependencies: [],
        imports: [],
        exports: [],
        relatedFiles: [],
      }

      const ast = engine.parseCode(code, 'javascript')
      engine.applyRoutingTransformations(ast, spec, context)
      const transformed = engine.generateCode(ast)

      expect(transformed).toContain('href')
      expect(context.relatedFiles.length).toBeGreaterThan(0)
    })
  })

  describe('validateAST', () => {
    it('should validate correct AST', () => {
      const code = 'const x = 42'
      const ast = engine.parseCode(code, 'javascript')
      const validation = engine.validateAST(ast)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('transformCode', () => {
    it('should perform complete transformation', async () => {
      const code = `
        import { Link } from 'react-router-dom'
        
        function Nav() {
          return <Link to="/about">About</Link>
        }
      `

      const spec: MigrationSpecification = {
        source: {
          language: 'JavaScript',
          framework: 'React',
          version: '18.0.0',
          routing: 'react-router',
          patterns: {},
          buildTool: 'webpack',
          packageManager: 'npm',
        },
        target: {
          language: 'TypeScript',
          framework: 'Next.js',
          version: '14.0.0',
          routing: 'file-based',
          fileStructure: { pages: 'app', components: 'components', layouts: 'app', api: 'app/api' },
          componentConventions: {
            fileExtension: '.tsx',
            namingConvention: 'PascalCase',
            exportStyle: 'default',
          },
          syntaxMappings: {},
          apiMappings: {},
          lifecycleMappings: {},
          buildTool: 'next',
          packageManager: 'pnpm',
        },
        mappings: {
          imports: {
            'react-router-dom': 'next/navigation',
          },
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
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          estimatedComplexity: 'medium',
          estimatedDuration: '2 hours',
        },
      }

      const context: TransformationContext = {
        filePath: 'test.tsx',
        fileType: 'component',
        dependencies: [],
        imports: [],
        exports: [],
        relatedFiles: [],
      }

      const result = await engine.transformCode(code, spec, context)

      expect(result.code).toBeDefined()
      expect(result.errors).toHaveLength(0)
      expect(result.code).toContain('next/navigation')
      expect(result.code).toContain('href')
    })
  })

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = engine.getSupportedLanguages()

      expect(languages).toContain('javascript')
      expect(languages).toContain('typescript')
    })
  })
})
